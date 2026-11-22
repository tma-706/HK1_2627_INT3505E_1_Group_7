import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { httpSources, obligationKey } from './model.mjs';
import { zapIntegration } from './zap.mjs';

const statuses = ['PASS', 'FAIL', 'REVIEW', 'MISSING', 'N/A'];
const assertionLabel = /^[A-Za-z0-9-]{1,90}$/u;
const toolErrorCodes = new Set(['fixture-start-error', 'fixture-seed-error', 'case-execution-error', 'zap-execution-error',
  'zap-report-missing', 'zap-export-missing', 'zap-unexpected-origin', 'zap-unexpected-http', 'zap-invalid-rule',
  'zap-alert-without-exchange', 'fixture-cleanup-error', 'runner-error', 'interrupted']);
const resultReasons = new Set(['assertions-passed', 'fixture-unavailable', 'item-fixture-unavailable', 'session-fixture-unavailable',
  'case-execution-error', 'case-not-executed']);
const countFields = ['observedCount', 'expectedCount', 'mismatchCount'];
const priority = ['FAIL', 'REVIEW', 'MISSING', 'PASS', 'N/A'];
const outcomeFor = (items) => priority.find((state) => items.includes(state)) ?? 'MISSING';

function safeAssertions(values) {
  return (values ?? []).filter(({ assertion }) => assertionLabel.test(assertion)).map(({ assertion, ok, ...counts }) => ({
    assertion, ok: ok === true,
    ...Object.fromEntries(countFields.filter((name) => Number.isSafeInteger(counts[name]) && counts[name] >= 0)
      .map((name) => [name, counts[name]])),
  }));
}

function safeHttp(entries, model, fromZap = false) {
  return entries.flatMap(({ caseId, step, operation, method, path, status, source, sessionState, zapEvidence }) => {
    const definition = model.cases.get(caseId);
    const spec = definition?.http.find((item) => item.step === step);
    const route = model.operations.get(operation);
    if (!spec || spec.operation !== operation || spec.sessionState !== sessionState || definition.source !== source ||
      route?.method !== method || route?.path !== path || (fromZap && !['single', 'aggregate'].includes(zapEvidence)) ||
      !Number.isInteger(status) || status < 100 || status > 599) return [];
    return [{ caseId, step, operation, method, path, status, source, sessionState, ...(fromZap && { zapEvidence }) }];
  });
}

function exchangeKey({ source, operation, status }) {
  return `${source}/${operation}/${status}`;
}

function safeEvidence(entries, messages) {
  const expected = Map.groupBy(messages, exchangeKey);
  const valid = new Map();
  for (const entry of entries) {
    const group = expected.get(exchangeKey(entry));
    if (!group || entry.expectedCount !== group.length || !Number.isSafeInteger(entry.receivedCount) ||
      entry.receivedCount < 0 || entry.receivedCount > entry.expectedCount) continue;
    const { source, operation, method, path, status } = group[0];
    valid.set(exchangeKey(entry), { source, operation, method, path, status,
      expectedCount: entry.expectedCount, receivedCount: entry.receivedCount });
  }
  return [...valid.values()];
}

function safeFindings(zap, model, evidence) {
  return (zap?.findings ?? []).flatMap(({ rule, cwe, risk, operation, method, path, source }) => {
    const evidenceRefs = evidence.flatMap((row, index) => row.source === source && row.operation === operation &&
      row.method === method && row.path === path && row.receivedCount > 0 ? [`results.json#/zap/evidence/${index}`] : []);
    if (!/^\d{1,8}$/u.test(rule) || !evidenceRefs.length) return [];
    const known = model.review.get(rule);
    const reviewed = known && zap.addons?.[known.addon] === known.version ? known : null;
    const chunkIds = [...model.chunks.values()].filter(({ cwe_id }) => cwe === cwe_id).map(({ sec_id }) => sec_id);
    const surface = operation === 'getCoreReadiness' ? 'gateway-tls' : (reviewed?.catalogSurface ?? 'core');
    return [{
      rule, cwe: /^CWE-\d{1,6}$/u.test(cwe) ? cwe : null,
      risk: ['info', 'low', 'medium', 'high'].includes(risk) ? risk : 'unknown', operation, method, path, source,
      chunkIds,
      obligationIds: model.obligations.filter((row) => row.surface === surface && chunkIds.includes(row.chunkId)).map(obligationKey),
      evidenceRefs, attribution: 'source-and-route', outcome: 'REVIEW',
      reason: reviewed?.cause ?? 'Cảnh báo thụ động trên trao đổi fixture. Cần đối chiếu điều khoản và cấu hình tại SHA của build.',
      sourceRefs: reviewed?.refs.map(({ path, line }) => ({ path, line })) ?? [],
    }];
  });
}

function caseOutcome(definition, collected, http, received, assertions) {
  if (collected.outcome === 'FAIL' || assertions.some(({ ok }) => !ok)) return ['FAIL', 'assertion-failed'];
  for (const expected of definition.http) {
    const observed = http.filter((item) => item.step === expected.step);
    if (observed.some(({ status }) => status !== expected.status)) return ['FAIL', 'http-status-mismatch'];
  }
  if (collected.outcome !== 'PASS') return ['MISSING', resultReasons.has(collected.reason) ? collected.reason : 'case-not-executed'];
  if (!assertions.length) return ['MISSING', 'assertion-evidence-missing'];
  if (definition.http.some(({ step, status }) =>
    !http.some((item) => item.step === step && item.status === status) ||
    !received.some((item) => item.step === step && item.status === status))) return ['MISSING', 'http-evidence-missing'];
  return ['PASS', 'assertions-passed'];
}

function operationCoverage(model, cases, messages, evidence) {
  const steps = cases.flatMap(({ caseId, outcome, source, expectedHttp, observed, evidenceRef }) =>
    expectedHttp.map((step) => ({ ...step, caseId, source, evidenceRef, outcome,
      observed: observed.http.some((item) => item.step === step.step),
      received: observed.receivedByZap.some((item) => item.step === step.step),
    })));
  const cells = [...Map.groupBy(steps, ({ source, operation, sessionState }) => `${source}/${operation}/${sessionState}`).values()]
    .map((items) => {
      const { source, operation, sessionState } = items[0];
      return { source, operation, sessionState, outcome: items.some(({ outcome }) => outcome === 'FAIL') ? 'FAIL' :
        items.every(({ observed, received, outcome }) => observed && received && outcome === 'PASS') ? 'PASS' : 'MISSING',
      steps: items.map(({ caseId, step, evidenceRef }) => ({ caseId, step, evidenceRef })) };
    });
  cells.push(...model.manifest.unobservedCells.map((cell) => ({ ...cell, outcome: 'MISSING', steps: [] })));
  return {
    operations: [...model.operations].map(([operation, contract]) => ({ operation, ...contract, ...model.manifest.scope[operation],
      sources: Object.fromEntries(httpSources.map((source) => {
        const groups = evidence.filter((group) => group.operation === operation && group.source === source);
        return [source, {
          observed: messages.filter((row) => row.operation === operation && row.source === source).length,
          received: groups.reduce((sum, row) => sum + row.receivedCount, 0),
          evidence: groups.filter(({ receivedCount }) => receivedCount > 0).map(({ expectedCount }) => expectedCount > 1 ? 'aggregate' : 'single'),
        }];
      })),
    })),
    cells,
    counts: Object.fromEntries(httpSources.map((source) => [source, {
      applicable: cells.filter((cell) => cell.source === source).length,
      complete: cells.filter((cell) => cell.source === source && cell.outcome === 'PASS').length,
    }])),
  };
}

export function buildReport(model, run) {
  const { buildSha, caseResults, toolErrors } = run;
  if (!/^[a-f0-9]{40}$/u.test(buildSha)) throw new Error('Invalid build SHA');
  const messages = safeHttp(run.http, model);
  const evidence = safeEvidence(run.zap?.evidence ?? [], messages);
  const received = safeHttp(run.zap?.received ?? [], model, true).filter((row) =>
    evidence.some((group) => exchangeKey(group) === exchangeKey(row) && group.receivedCount === group.expectedCount));
  const findings = safeFindings(run.zap, model, evidence);
  const cases = [...model.cases.values()].map((definition, index) => {
    const { id, requiredForPilot, sourceRefs, expected, layer, preconditions, fixture, action, source } = definition;
    const collected = caseResults.get(id) ?? {};
    const assertions = safeAssertions(collected.assertions);
    const http = messages.filter(({ caseId }) => caseId === id);
    const inZap = received.filter(({ caseId }) => caseId === id);
    const [outcome, reason] = caseOutcome(definition, collected, http, inZap, assertions);
    return {
      caseId: id, outcome, reason, requiredForPilot, layer, preconditions, fixture, action, sourceRefs, ...(source && { source }),
      expected, expectedHttp: definition.http, observed: { assertions, http, receivedByZap: inZap },
      evidenceRef: `results.json#/cases/${index}/observed`, buildSha,
    };
  });
  const caseById = new Map(cases.map((result) => [result.caseId, result]));
  const obligations = model.obligations.map((row) => {
    let outcome;
    if (row.applicability === 'not-applicable') outcome = 'N/A';
    else if (row.applicability === 'missing') outcome = 'MISSING';
    else outcome = outcomeFor(row.caseIds.map((id) => caseById.get(id).outcome));
    if (outcome !== 'FAIL' && findings.some((entry) => entry.obligationIds.includes(obligationKey(row)))) outcome = 'REVIEW';
    return { ...row, id: obligationKey(row), outcome };
  });
  const criteria = [...model.chunks.values()].map(({ sec_id, cwe_id, owasp, static_review_scope_vi }) => {
    const rows = obligations.filter(({ chunkId }) => chunkId === sec_id);
    return { chunkId: sec_id, cwe: cwe_id, owasp, scope: static_review_scope_vi,
      outcome: outcomeFor(rows.map(({ outcome }) => outcome)), obligations: rows.map(({ id }) => id) };
  });
  const counts = Object.fromEntries(statuses.map((status) => [status, criteria.filter(({ outcome }) => outcome === status).length]));
  const failures = cases.filter(({ outcome }) => outcome === 'FAIL').map((item) => ({
    caseId: item.caseId, outcome: item.outcome, buildSha, reason: item.reason, evidenceRef: item.evidenceRef,
    assertions: item.observed.assertions.filter(({ ok }) => !ok).map(({ assertion }) => assertion),
    obligationIds: model.cases.get(item.caseId).obligations,
    cause: 'Sai lệch assertion hoặc trạng thái HTTP; cần lần theo xử lý tại buildSha để xác định nguyên nhân.',
  }));
  const errors = [...new Set(toolErrors)].filter((code) => toolErrorCodes.has(code));
  const zap = {
    ...zapIntegration,
    ok: run.zap?.ok === true,
    version: /^\d+\.\d+\.\d+$/u.test(run.zap?.version) ? run.zap.version : null,
    addons: Object.fromEntries(['automation', 'authhelper', 'exim', 'pscan', 'pscanrules', 'reports']
      .filter((key) => /^\d+(?:\.\d+)*$/u.test(run.zap?.addons?.[key])).map((key) => [key, run.zap.addons[key]])),
    exitCode: Number.isSafeInteger(run.zap?.exitCode) ? run.zap.exitCode : null,
    completedJobs: ['passiveScan-config', 'import', 'passiveScan-wait', 'export', 'report', 'exitStatus']
      .filter((job) => run.zap?.completedJobs?.includes(job)),
    passiveCheck: run.zap?.passiveSelfcheck === true ? 'pass' : 'missing',
    httpCount: messages.length, receivedCount: evidence.reduce((sum, group) => sum + group.receivedCount, 0), evidence,
    sources: (run.zap?.sources ?? []).filter(({ source }) => httpSources.includes(source)).map((scan) => ({
      source: scan.source, ok: scan.ok === true, passiveCheck: scan.passiveSelfcheck === true ? 'pass' : 'missing',
      exitCode: Number.isSafeInteger(scan.exitCode) ? scan.exitCode : null,
    })),
    findings: findings.map((item) => ({ ...item, buildSha })),
  };
  const fixtureState = { started: run.fixture?.started === true, cleaned: run.fixture?.cleaned === true };
  const passed = zap.ok && fixtureState.started && fixtureState.cleaned && errors.length === 0 && failures.length === 0 &&
    cases.every(({ requiredForPilot, outcome }) => !requiredForPilot || outcome === 'PASS');
  return {
    buildSha, suiteVersion: model.manifest.version, fixtureVersion: model.manifest.fixtureVersion,
    revisions: model.revisions, catalogCount: model.chunks.size, counts, passed, toolErrors: errors,
    fixture: fixtureState, zap, coverage: operationCoverage(model, cases, messages, evidence),
    criteria, obligations, cases, failures, openQuestions: model.openQuestions,
  };
}

function renderSummary(report) {
  const lines = ['# Nghiệm thu bảo mật UC-01/02', '', `- Build \`${report.buildSha}\``,
    `- Gate **${report.passed ? 'PASS' : 'FAIL'}**`, `- Catalog ${report.catalogCount} chunk, ${report.obligations.length} nghĩa vụ`,
    `- Fixture đã dựng ${report.fixture.started ? 'có' : 'chưa'}, đã dọn ${report.fixture.cleaned ? 'có' : 'chưa'}`,
    `- ZAP ${report.zap.version ?? 'chưa có'} · ${report.zap.mode} · đối soát ${report.zap.receivedCount}/${report.zap.httpCount} trao đổi · tín hiệu thụ động ${report.zap.passiveCheck}`,
    `- Add-on ${Object.entries(report.zap.addons).map(([id, version]) => id + ' ' + version).join(', ') || 'chưa có'}`,
    `- ${statuses.map((state) => `${state} **${report.counts[state]}**`).join(' · ')}`,
    '', '## Độ phủ OpenAPI qua gateway', '',
    ...Object.entries(report.coverage.counts).map(([source, { complete, applicable }]) => `- ${source} đủ bằng chứng ${complete}/${applicable} ô áp dụng`),
    '', '| Operation | Contract qua gateway | Runner quan sát | UI quan sát | ZAP nhận (runner / UI) | Bằng chứng |',
    '| --- | --- | ---: | ---: | ---: | --- |'];
  for (const row of report.coverage.operations) {
    const auth = row.security.length ? row.security.map((requirement) => Object.keys(requirement).join(' + ') || 'không yêu cầu').join(' hoặc ') : 'không yêu cầu';
    const { runner, ui } = row.sources;
    const types = [...new Set([...runner.evidence, ...ui.evidence])].map((type) => type === 'aggregate' ? 'tổng hợp' : 'đơn lẻ');
    const qualifier = row.kind === 'readiness' ? ' (readiness)' : '';
    lines.push(`| \`${row.operation}\`${qualifier} | \`${row.method} ${row.path}\` · ${auth} | ${runner.observed} | ${ui.observed} | ${runner.received} / ${ui.received} | ${row.kind === 'excluded' ? row.reason : types.join(', ') || 'chưa quan sát'} |`);
  }
  lines.push('', 'Bằng chứng tổng hợp đối soát số trao đổi cùng nguồn, method, path và status. Cảnh báo liên kết theo nguồn và route.', '');
  for (const { outcome, operation, sessionState, source, reason } of report.coverage.cells) {
    if (outcome !== 'PASS') lines.push(`- ${outcome} · ${source} · ${operation} · ${sessionState}${reason ? ' · ' + reason : ''}`);
  }
  lines.push('', '## Ca kiểm', '');
  for (const item of report.cases) {
    const status = item.observed.http.map(({ operation, status }) => `${operation} ${status}`).join(', ');
    const sources = item.sourceRefs.map(({ input, locator, version }) => `${locator} (${input} ${version})`).join(', ');
    lines.push(`- **${item.caseId} · ${item.outcome}** · ${item.layer} · ${item.observed.assertions.length} assertion${status ? ' · ' + status : ''}`,
      `  - ${item.expected}`, `  - Nguồn ${sources}`);
    if (item.outcome !== 'PASS') lines.push(`  - Sai lệch hoặc thiếu bằng chứng \`${item.reason}\``);
  }
  lines.push('', '## Cảnh báo và sai lệch', '');
  const findingsByRule = Map.groupBy(report.zap.findings, (item) => item.rule);
  for (const [rule, items] of findingsByRule) {
    const first = items[0];
    const routes = items.map(({ operation, source }) => `${operation} (${source})`).join(', ');
    lines.push(`- REVIEW · ZAP ${rule} · ${first.risk} · ${first.cwe ?? 'chưa ánh xạ CWE'}`,
      `  - ${routes}`, `  - ${first.reason}`);
    if (first.sourceRefs.length) lines.push(`  - Nguồn tại build SHA: ${first.sourceRefs.map(({ path, line }) => `\`${path}:${line}\``).join(', ')}`);
  }
  for (const item of report.failures) lines.push(`- FAIL · ${item.caseId} · ${item.assertions.join(', ') || item.reason} · ${item.obligationIds.join(', ')}`);
  for (const error of report.toolErrors) lines.push(`- Lỗi công cụ · ${error}`);
  if (!report.zap.findings.length && !report.failures.length && !report.toolErrors.length) lines.push('- Không có mục cần điều tra trong lượt chạy.');
  for (const state of statuses) {
    lines.push('', `## ${state} · ${report.counts[state]} tiêu chí`, '');
    for (const criterion of report.criteria.filter(({ outcome }) => outcome === state)) {
      lines.push(`- **${criterion.chunkId} · ${criterion.cwe}**`);
      for (const row of report.obligations.filter(({ chunkId }) => chunkId === criterion.chunkId)) {
        lines.push(`  - ${row.surface} · ${row.outcome} · ${row.reason} ${row.caseIds.join(', ')}`.trimEnd());
      }
    }
  }
  lines.push('', '## Quyết định còn mở', '');
  for (const { sourcePath, locator, question, evidenceNeeded } of report.openQuestions) {
    lines.push(`- ${question} (${sourcePath} · ${locator})`, `  - Cần ${evidenceNeeded}`);
  }
  lines.push('', '## Revision và bằng chứng', '', `- Suite SHA-256 \`${report.revisions.suite}\``,
    `- Fixture SHA-256 \`${report.revisions.fixture}\``, `- Image \`${report.zap.image}\``);
  for (const source of Object.values(report.revisions.sources)) lines.push(`- \`${source.path}\` · ${source.version} · \`${source.sha256}\``);
  lines.push('', 'Xem results.json để đối chiếu từng bước HTTP, assertion và nghĩa vụ.', '');
  return lines.join('\n');
}

export function writeReports(dir, scratch, report) {
  mkdirSync(dir, { recursive: true });
  for (const [name, value] of [
    ['results.json', JSON.stringify(report, null, 2) + '\n'],
    ['summary.md', renderSummary(report)],
  ]) {
    writeFileSync(scratch + '/' + name, value, { mode: 0o600 });
    renameSync(scratch + '/' + name, dir + '/' + name);
  }
  return report.passed ? 0 : 1;
}
