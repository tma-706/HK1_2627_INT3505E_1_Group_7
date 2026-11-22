import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { assertionId, httpSources, obligationKey, sentinelPath } from './model.mjs';
import { addonIds, zapErrorCodes, zapIntegration, zapJobs } from './zap.mjs';

const statuses = ['PASS', 'FAIL', 'REVIEW', 'MISSING', 'N/A'];
const toolErrorCodes = new Set(['fixture-start-error', 'fixture-seed-error', 'case-execution-error', 'zap-execution-error',
  'fixture-owner-conflict', 'fixture-invalid-port', 'fixture-docker-unavailable', 'fixture-cleanup-error', 'runner-error',
  'interrupted', 'build-input-changed', ...zapErrorCodes]);
const resultReasons = new Set(['assertions-passed', 'fixture-unavailable', 'item-fixture-unavailable', 'session-fixture-unavailable',
  'case-execution-error', 'case-not-executed', 'ui-core-evidence-missing', 'ui-build-failed', 'ui-ca-setup-failed',
  'ui-browser-failed', 'ui-har-invalid', 'ui-gateway-unavailable']);
const countFields = ['observedCount', 'expectedCount', 'mismatchCount'];
const priority = ['FAIL', 'REVIEW', 'MISSING', 'PASS', 'N/A'];
const outcomeFor = (items) => priority.find((state) => items.includes(state)) ?? 'MISSING';

function safeAssertions(values, definition) {
  const declared = new Map(definition.oracle?.assertions.map(({ id, step }) => [id, step]));
  const diagnostics = new Map(definition.http.map(({ step }) => [step + '-json', step]));
  return (values ?? []).filter(({ assertion }) => typeof assertion === 'string' && assertionId.test(assertion) &&
    (!definition.oracle || declared.has(assertion) || diagnostics.has(assertion))).map(({ assertion, ok, ...counts }) => ({
    assertion, ok: ok === true,
    ...((declared.get(assertion) ?? diagnostics.get(assertion)) && { step: declared.get(assertion) ?? diagnostics.get(assertion) }),
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

function safeFindings(zap, model, evidence, cases) {
  return (zap?.findings ?? []).flatMap(({ rule, cwe, risk, operation, method, path, source }) => {
    const evidenceRefs = evidence.flatMap((row, index) => row.source === source && row.operation === operation &&
      row.method === method && row.path === path && row.receivedCount > 0 ? [`results.json#/zap/evidence/${index}`] : []);
    if (!/^\d{1,8}$/u.test(rule) || path === sentinelPath || !evidenceRefs.length) return [];
    const known = model.review.get(rule);
    const scan = zap.sources?.find((scan) => scan.source === source);
    const addon = known?.addon ?? (rule === '10015' ? 'pscanrules' : null);
    const version = safeVersion(scan?.addons?.[addon]);
    const reviewed = known && version === known.version ? known : null;
    const chunkIds = [...model.chunks.values()].filter(({ cwe_id }) => cwe === cwe_id).map(({ sec_id }) => sec_id);
    const surface = operation === 'getCoreReadiness' ? 'gateway-tls' : (reviewed?.catalogSurface ?? 'core');
    const cache = rule === '10015' ? cacheOracle(cases, model, operation, source, evidence) : null;
    return [{
      rule, cwe: /^CWE-\d{1,6}$/u.test(cwe) ? cwe : null,
      risk: ['info', 'low', 'medium', 'high'].includes(risk) ? risk : 'unknown', operation, method, path, source,
      chunkIds,
      obligationIds: model.obligations.filter((row) => row.surface === surface && chunkIds.includes(row.chunkId)).map(obligationKey),
      addon, addonVersion: version, reviewMatched: Boolean(reviewed), evidenceRefs, attribution: 'source-and-route', outcome: 'REVIEW',
      ...(cache && { cache }),
      reason: reviewed && rule === '10015' && !cache ?
        'HTTP 200 của operation này không khai báo AuthNoStore. Cần đối chiếu chính sách cache của gateway triển khai.' :
        reviewed?.cause ?? 'Cảnh báo thụ động trên trao đổi fixture. Cần đối chiếu điều khoản và cấu hình tại SHA của build.',
      sourceRefs: reviewed?.refs.map(({ path, line }) => ({ path, line })) ?? [],
    }];
  });
}

function cacheOracle(cases, model, operation, source, evidence) {
  const contract = model.operations.get(operation)?.cacheControl?.[200];
  if (!contract) return null;
  const checks = cases.flatMap(({ caseId, expectedHttp, observed, evidenceRef }) => {
    const labels = source === 'runner' && caseId === 'CORE-HTTP-PRIVACY' ? [operation + '-no-store'] :
      source === 'ui' && caseId === 'UC01-02-WEB-E2E'
        ? expectedHttp.filter((step) => step.operation === operation && step.status === 200).map(({ step }) => step + '-no-store') : [];
    return labels.map((assertion) => {
      const index = observed.assertions.findIndex((item) => item.assertion === assertion);
      return { caseId, assertion, outcome: index < 0 ? 'MISSING' : observed.assertions[index].ok ? 'PASS' : 'FAIL',
        evidenceRef: index < 0 ? evidenceRef : `${evidenceRef}/assertions/${index}` };
    });
  });
  return { contract, sourcePath: model.manifest.inputs.openapi.path, locator: '#/components/headers/AuthNoStore',
    groups: evidence.flatMap((row, index) => row.operation === operation && row.source === source && row.status === 200
      ? [`results.json#/zap/evidence/${index}`] : []),
    outcome: outcomeFor(checks.map(({ outcome }) => outcome)), checks, native: 'MISSING' };
}

const safeVersion = (value) => typeof value === 'string' && /^\d+(?:\.\d+)*$/u.test(value) ? value : null;

function caseOutcome(definition, collected, http, received, assertions, missingAssertions, sourceCheck) {
  if (collected.outcome === 'FAIL' || assertions.some(({ ok }) => !ok)) return ['FAIL', 'assertion-failed'];
  for (const expected of definition.http) {
    const observed = http.filter((item) => item.step === expected.step);
    if (observed.some(({ status }) => status !== expected.status)) return ['FAIL', 'http-status-mismatch'];
  }
  if (collected.outcome !== 'PASS') return ['MISSING', resultReasons.has(collected.reason) ? collected.reason : 'case-not-executed'];
  if (!assertions.length || missingAssertions.length) return ['MISSING', 'assertion-evidence-missing'];
  if (definition.http.some(({ step, status }) =>
    http.filter((item) => item.step === step && item.status === status).length !== 1 ||
    received.filter((item) => item.step === step && item.status === status).length !== 1)) return ['MISSING', 'http-evidence-missing'];
  if (definition.http.length && !sourceCheck) return ['MISSING', 'zap-source-selfcheck-missing'];
  return ['PASS', 'assertions-passed'];
}

function sourceResults(zap, messages, evidence) {
  return httpSources.map((source) => {
    const scan = zap?.sources?.find((item) => item.source === source);
    const expectedCount = messages.filter((item) => item.source === source).length;
    const receivedCount = evidence.filter((item) => item.source === source).reduce((sum, item) => sum + item.receivedCount, 0);
    const completedJobs = zapJobs.filter((job) => scan?.completedJobs?.includes(job));
    const started = scan?.started === true || completedJobs.length > 0;
    const passiveCheck = scan?.passiveSelfcheck === true ? 'pass' : 'missing';
    const errors = zapErrorCodes.filter((code) => scan?.errors?.includes(code));
    if (expectedCount && !started && !errors.includes('zap-launch-error')) errors.push('zap-launch-error');
    if (started && passiveCheck !== 'pass' && !errors.includes('zap-selfcheck-missing')) errors.push('zap-selfcheck-missing');
    if (started && receivedCount !== expectedCount && !errors.includes('zap-reconciliation-incomplete')) {
      errors.push('zap-reconciliation-incomplete');
    }
    const version = safeVersion(scan?.version);
    const addons = Object.fromEntries(addonIds.filter((id) => safeVersion(scan?.addons?.[id])).map((id) => [id, scan.addons[id]]));
    const exitCode = Number.isSafeInteger(scan?.exitCode) ? scan.exitCode : null;
    const ok = scan?.ok === true && exitCode === 0 && completedJobs.length === zapJobs.length && passiveCheck === 'pass' &&
      expectedCount > 0 && receivedCount === expectedCount && Boolean(version) && Object.keys(addons).length === addonIds.length && !errors.length;
    return { source, attempted: Boolean(scan), started, ok, version, addons, exitCode, completedJobs,
      import: completedJobs.includes('import') ? 'complete' : 'missing',
      passiveWait: completedJobs.includes('passiveScan-wait') ? 'complete' : 'missing',
      passiveCheck, expectedCount, receivedCount, errors };
  });
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
  const sources = sourceResults(run.zap, messages, evidence);
  const sourceById = new Map(sources.map((scan) => [scan.source, scan]));
  const received = safeHttp(run.zap?.received ?? [], model, true).filter((row) =>
    evidence.some((group) => exchangeKey(group) === exchangeKey(row) && group.receivedCount === group.expectedCount));
  const cases = [...model.cases.values()].map((definition, index) => {
    const { id, requiredForPilot, sourceRefs, expected, layer, preconditions, fixture, action, source, oracle } = definition;
    const collected = caseResults.get(id) ?? {};
    const assertions = safeAssertions(collected.assertions, definition);
    const missingAssertions = oracle?.assertions.filter(({ id }) =>
      assertions.filter(({ assertion }) => assertion === id).length !== 1).map(({ id }) => id) ?? [];
    const http = messages.filter(({ caseId }) => caseId === id);
    const inZap = received.filter(({ caseId }) => caseId === id);
    const [outcome, reason] = caseOutcome(definition, collected, http, inZap, assertions, missingAssertions,
      sourceById.get(source)?.passiveCheck === 'pass');
    return {
      caseId: id, outcome, reason, requiredForPilot, layer, preconditions, fixture, action, sourceRefs, ...(source && { source }),
      expected, expectedHttp: definition.http, ...(oracle && { oracle }), obligationIds: definition.obligations, missingAssertions,
      observed: { assertions, http, receivedByZap: inZap },
      evidenceRef: `results.json#/cases/${index}/observed`, buildSha,
    };
  });
  const caseById = new Map(cases.map((result) => [result.caseId, result]));
  for (const result of cases) {
    result.controls = (result.oracle?.controls ?? []).map((control) => {
      const other = caseById.get(control.caseId);
      const spec = other.oracle.assertions.find((item) => item.id === control.assertion);
      const values = other.observed.assertions.filter((item) => item.assertion === control.assertion);
      const index = other.observed.assertions.indexOf(values[0]);
      const matches = !spec.step || (other.observed.receivedByZap.filter(({ step, status }) => step === spec.step &&
        other.expectedHttp.some((expected) => expected.step === step && expected.status === status)).length === 1 &&
        sourceById.get(other.source)?.passiveCheck === 'pass');
      return { ...control, ...(spec.step && { step: spec.step }), complete: values.length === 1 && values[0].ok && matches,
        evidenceRef: index < 0 ? other.evidenceRef : `${other.evidenceRef}/assertions/${index}` };
    });
    if (result.outcome === 'PASS' && result.controls.some(({ complete }) => !complete)) {
      result.outcome = 'MISSING';
      result.reason = 'control-evidence-missing';
    }
  }
  const findings = safeFindings(run.zap, model, evidence, cases);
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
    checks: item.observed.assertions.flatMap(({ assertion, ok, step }, index) => ok ? [] :
      [{ assertion, ...(step && { step }), evidenceRef: `${item.evidenceRef}/assertions/${index}` }]),
    obligationIds: item.obligationIds,
    cause: 'Sai lệch assertion hoặc trạng thái HTTP; cần lần theo xử lý tại buildSha để xác định nguyên nhân.',
  }));
  const errors = [...new Set([...toolErrors, ...sources.flatMap((scan) => scan.errors)])].filter((code) => toolErrorCodes.has(code));
  const startedScans = sources.filter(({ started }) => started);
  const primaryScan = startedScans[0];
  const zap = {
    ...zapIntegration,
    ok: run.zap?.ok === true && sources.every((scan) => scan.ok),
    method: startedScans.some((scan) => scan.import === 'complete' && scan.passiveWait === 'complete') ?
      'har-import-passive' : startedScans.length ? 'automation-incomplete' : 'not-run',
    version: primaryScan?.version ?? null,
    addons: primaryScan?.addons ?? {},
    exitCode: primaryScan?.exitCode ?? null,
    completedJobs: zapJobs.filter((job) => sources.every((scan) => scan.completedJobs.includes(job))),
    passiveCheck: sources.every((scan) => scan.passiveCheck === 'pass') ? 'pass' : 'missing',
    httpCount: messages.length, receivedCount: evidence.reduce((sum, group) => sum + group.receivedCount, 0), evidence,
    sources,
    findings: findings.map((item) => ({ ...item, buildSha })),
  };
  const retries = run.fixture?.readinessRetries;
  const fixtureState = { started: run.fixture?.started === true, cleaned: run.fixture?.cleaned === true,
    readinessRetries: Number.isSafeInteger(retries) && retries >= 0 ? retries : null };
  const passed = zap.ok && fixtureState.started && fixtureState.cleaned && errors.length === 0 && failures.length === 0 &&
    cases.every(({ requiredForPilot, outcome }) => !requiredForPilot || outcome === 'PASS');
  const checkout = { dirty: run.checkout?.dirty === true,
    sha256: /^[a-f0-9]{64}$/u.test(run.checkout?.sha256) ? run.checkout.sha256 : null };
  const timingMs = Object.fromEntries(['validate', 'fixture', 'cases', 'web-build', 'firefox-preview', 'firefox-fixture',
    'zap-runner', 'zap-ui', 'cleanup'].filter((stage) => Number.isSafeInteger(run.timingMs?.[stage]) && run.timingMs[stage] >= 0)
    .map((stage) => [stage, run.timingMs[stage]]));
  return {
    buildSha, checkout, suiteVersion: model.manifest.version, fixtureVersion: model.manifest.fixtureVersion,
    revisions: model.revisions, catalogCount: model.chunks.size, counts, passed, toolErrors: errors,
    scope: {
      fixture: 'Dữ liệu tổng hợp UC-01/02 qua HTTPS loopback.',
      requests: sources.map(({ source, expectedCount }) => ({ source, count: expectedCount,
        producer: source === 'runner' ? 'Node.js · ca nghiệp vụ HTTPS' : 'Firefox · thao tác trên web fixture' })),
      businessOracle: 'Assertion của ca từ SCN, OpenAPI và fixture. ZAP đối soát và phân tích thụ động các trao đổi đã ghi.',
      authenticatedActiveDast: { status: 'not-performed' },
    },
    timingMs,
    fixture: fixtureState, zap, coverage: operationCoverage(model, cases, messages, evidence),
    criteria, obligations, cases, failures, openQuestions: model.openQuestions,
  };
}

function renderSummary(report) {
  const method = { 'har-import-passive': 'nhập HAR và chờ phân tích thụ động',
    'automation-incomplete': 'Automation Framework dở dang', 'not-run': 'chưa chạy' }[report.zap.method];
  const lines = ['# Nghiệm thu bảo mật UC-01/02', '', `- HEAD \`${report.buildSha}\` · cây ${report.checkout.dirty ? 'có thay đổi local' : 'sạch'}`,
    `- Dấu vân tay checkout SHA-256 \`${report.checkout.sha256 ?? 'chưa có'}\``,
    `- Gate **${report.passed ? 'PASS' : 'FAIL'}**`, `- Catalog ${report.catalogCount} chunk, ${report.obligations.length} nghĩa vụ`,
    `- Phạm vi ${report.scope.fixture}`,
    `- Fixture đã dựng ${report.fixture.started ? 'có' : 'chưa'}, đã dọn ${report.fixture.cleaned ? 'có' : 'chưa'} · retry readiness ${report.fixture.readinessRetries ?? 'chưa đo'}`,
    ...report.scope.requests.map(({ source, producer, count }) => `- Nguồn request ${source} · ${producer} · ${count} trao đổi`),
    `- Oracle nghiệp vụ · ${report.scope.businessOracle}`,
    `- ZAP thực chạy · ${method} · đối soát ${report.zap.receivedCount}/${report.zap.httpCount} trao đổi`,
    `- Chế độ cấu hình \`${report.zap.mode}\` · network \`${report.zap.network}\``,
    '- Authenticated active DAST · **chưa thực hiện**.',
    `- ${statuses.map((state) => `${state} **${report.counts[state]}**`).join(' · ')}`,
    '', '## Đối soát ZAP theo nguồn', '',
    ...report.zap.sources.map((scan, index) => `- ${scan.source} · ${scan.started ? 'AF đã khởi động' : 'AF chưa khởi động'} · import ${scan.import} · chờ passive ${scan.passiveWait} · self-check ${scan.passiveCheck} · ${scan.receivedCount}/${scan.expectedCount} · ${scan.errors.join(', ') || (scan.ok ? 'đạt' : 'chưa đủ bằng chứng')} · \`results.json#/zap/sources/${index}\``),
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
  const profile = report.cases.find(({ caseId }) => caseId === 'UC01-SESSION');
  if (profile) {
    const check = profile.observed.assertions.findIndex(({ assertion }) => assertion === 'profile-a-identity');
    const group = report.zap.evidence.findIndex(({ source, operation, status }) =>
      source === 'runner' && operation === 'getMyProfile' && status === 200);
    const exchange = report.zap.evidence[group];
    lines.push(`- Quyền đọc hồ sơ · runner tạo GET /api/me/profile. \`profile-a-identity\` so tên, email và avatar với A · ${check < 0 ? 'MISSING' : profile.observed.assertions[check].ok ? 'PASS' : 'FAIL'} · ZAP nhận ${exchange ? `${exchange.receivedCount}/${exchange.expectedCount} trong nhóm HTTP 200` : 'chưa có nhóm HTTP 200'} · \`${profile.evidenceRef}${check >= 0 ? '/assertions/' + check : ''}\`${group >= 0 ? ` · \`results.json#/zap/evidence/${group}\`` : ''}`);
  }
  for (const { outcome, operation, sessionState, source, reason } of report.coverage.cells) {
    if (outcome !== 'PASS') lines.push(`- ${outcome} · ${source} · ${operation} · ${sessionState}${reason ? ' · ' + reason : ''}`);
  }
  lines.push('', '## Ca kiểm', '');
  for (const item of report.cases) {
    const status = item.observed.http.map(({ operation, status }) => `${operation} ${status}`).join(', ');
    const sources = item.sourceRefs.map(({ input, locator, version }) => `${locator} (${input} ${version})`).join(', ');
    lines.push(`- **${item.caseId} · ${item.outcome}** · ${item.layer} · ${item.observed.assertions.length} assertion${status ? ' · ' + status : ''} · \`${item.evidenceRef}\``,
      `  - ${item.expected}`, `  - Nguồn ${sources}`);
    if (item.oracle) {
      lines.push(`  - ${item.oracle.question} ${item.oracle.limits}`,
        `  - Oracle ${item.oracle.assertions.map(({ id }) => `\`${id}\``).join(', ')}`);
    }
    for (const control of item.controls) {
      lines.push(`  - Đối chứng \`${control.caseId}/${control.assertion}\` · ${control.complete ? 'đủ' : 'thiếu'} · \`${control.evidenceRef}\``);
    }
    if (item.outcome !== 'PASS') lines.push(`  - Sai lệch hoặc thiếu bằng chứng \`${item.reason}\``);
    if (item.missingAssertions.length) lines.push(`  - Assertion thiếu hoặc trùng ${item.missingAssertions.join(', ')}`);
  }
  lines.push('', '## Cảnh báo và sai lệch', '');
  const findingsByRule = Map.groupBy(report.zap.findings, (item) => item.rule);
  for (const [rule, items] of findingsByRule) {
    const first = items[0];
    const routes = items.map(({ operation, source }) => `${operation} (${source})`).join(', ');
    lines.push(`- REVIEW · ZAP ${rule} · ${first.risk} · ${first.cwe ?? 'chưa ánh xạ CWE'}`, `  - ${routes}`);
    for (const item of items) {
      lines.push(`  - ${item.source}/${item.operation} · ${item.addon ?? 'add-on chưa xác định'} ${item.addonVersion ?? ''} · ${item.reviewMatched ? 'nhận định khớp nguồn và phiên bản' : 'cần phân loại lại'} · ${item.evidenceRefs.map((ref) => `\`${ref}\``).join(', ')}`);
      lines.push(`    - ${item.reason}`);
      if (item.cache) lines.push(`    - HTTP 200 · ${item.cache.sourcePath}${item.cache.locator} yêu cầu \`${item.cache.contract}\` · assertion ${item.cache.outcome} · ${item.cache.checks.map(({ assertion, evidenceRef }) => `\`${assertion}\` (\`${evidenceRef}\`)`).join(', ')} · cache native MISSING`);
      if (item.sourceRefs.length) lines.push(`    - Nguồn cùng build ${item.sourceRefs.map(({ path, line }) => `\`${path}:${line}\``).join(', ')}`);
    }
  }
  for (const item of report.failures) {
    lines.push(`- FAIL · ${item.caseId} · ${item.assertions.join(', ') || item.reason} · ${item.obligationIds.join(', ')} · \`${item.evidenceRef}\``);
    for (const { assertion, step, evidenceRef } of item.checks) {
      lines.push(`  - ${step ?? 'ca'} · ${assertion} · \`${evidenceRef}\``);
    }
  }
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
  for (const [stage, ms] of Object.entries(report.timingMs)) lines.push(`- ${stage} · ${ms} ms`);
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
