import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';

export function command(file, args, options = {}) {
  const { input, ...settings } = options;
  return new Promise((resolve) => {
    const child = execFile(file, args, { maxBuffer: 8 * 1024 * 1024, ...settings }, (error, stdout, stderr) =>
      resolve({ status: error ? (Number.isSafeInteger(error.code) ? error.code : null) : 0, stdout, stderr }));
    child.stdin?.on('error', () => {});
    child.stdin?.end(input);
  });
}

const projectPattern = /^lf-security-[a-f0-9]{32}$/u;
export const ciKey = () => process.env.GITHUB_ACTIONS === 'true' &&
  /^\d+$/u.test(process.env.GITHUB_RUN_ID ?? '') && /^\d+$/u.test(process.env.GITHUB_RUN_ATTEMPT ?? '')
  ? `github-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}` : null;

export function claimRun(root) {
  mkdirSync(root + '/dist', { recursive: true });
  const dir = root + '/dist/.security-run';
  mkdirSync(dir, { mode: 0o700 });
  const project = 'lf-security-' + randomUUID().replaceAll('-', '');
  const key = ciKey() ?? randomUUID();
  const owner = { key, project, root };
  writeFileSync(dir + '/owner.json', JSON.stringify(owner), { flag: 'wx', mode: 0o600 });
  return runEnvironment(owner);
}

function runEnvironment(owner) {
  const { key, project, root } = owner;
  const dir = root + '/dist/.security-run';
  const fixtureDir = dir + '/fixture';
  const port = Number(process.env.UC01_HTTPS_PORT || 8443);
  const env = {
    ...process.env,
    AI_PROVIDER: '', LF_UC01_FIXTURE_PROJECT: project, LF_UC01_FIXTURE_DIR: fixtureDir, UC01_HTTPS_PORT: String(port),
  };
  for (const name of ['GOOGLE_CLIENT_ID', 'SESSION_REPLAY_KEY_VERSION', 'SESSION_REPLAY_KEYS',
    'POSTGRES_USER', 'POSTGRES_DB', 'POSTGRES_PASSWORD']) delete env[name];
  return { key, project, root, dir, fixtureDir, env, port, origin: `https://127.0.0.1:${port}`, scanner: project + '-zap' };
}

export async function startFixture(run) {
  if (!Number.isSafeInteger(run.port) || run.port < 1024 || run.port > 65535) return false;
  const result = await command('bash', ['infra/uc01-local/run.sh', 'up'], { env: run.env, timeout: 240_000 });
  return result.status === 0;
}

export async function seedFixture(run, input) {
  const { project, fixtureDir, env } = run;
  const result = await command('docker', [
    'compose', '-p', project, '--env-file', '.env.example', '--env-file', fixtureDir + '/compose.env',
    '-f', 'compose.yaml', '-f', 'infra/uc01-local/compose.yaml', 'exec', '-T', 'db',
    'psql', '-q', '-v', 'ON_ERROR_STOP=1', '-U', 'lost_found', '-d', 'lost_found',
  ], { input, env, timeout: 30_000 });
  if (result.status !== 0) throw new Error('fixture-seed-error');
}

export async function cleanupOwned(root, key, release = true) {
  const dir = root + '/dist/.security-run';
  if (!existsSync(dir)) return true;
  const ownerPath = dir + '/owner.json';
  if (!key || !existsSync(ownerPath)) return false;
  const owner = JSON.parse(readFileSync(ownerPath, 'utf8'));
  if (owner.key !== key || owner.root !== root || !projectPattern.test(owner.project)) return false;
  const run = runEnvironment(owner);
  let success = true;
  if (existsSync(dir + '/zap-started')) {
    const scanner = await command('docker', ['ps', '-aq', '--filter', `label=lf.security.owner=${run.project}`], { timeout: 30_000 });
    const ids = scanner.stdout.trim().split('\n').filter(Boolean);
    success = scanner.status === 0 && ids.every((id) => /^[a-f0-9]{12,64}$/u.test(id));
    if (success && ids.length > 0) {
      success = (await command('docker', ['rm', '--force', ...ids], { timeout: 30_000 })).status === 0;
    }
  }
  if (existsSync(run.fixtureDir + '/compose.env')) {
    const result = await command('bash', ['infra/uc01-local/run.sh', 'down-isolated'], { env: run.env, timeout: 60_000 });
    success = result.status === 0 && success;
  }
  // Scrub raw exchanges even when Docker cleanup has to be retried.
  rmSync(dir + '/zap', { recursive: true, force: true });
  rmSync(dir + '/web', { recursive: true, force: true });
  if (success) {
    rmSync(run.fixtureDir, { recursive: true, force: true });
    rmSync(dir + '/zap-started', { force: true });
    if (release) releaseRun({ dir });
  }
  return success;
}

export function releaseRun({ dir }) {
  rmSync(dir + '/owner.json');
  rmdirSync(dir);
}
