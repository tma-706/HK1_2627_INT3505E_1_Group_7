import { db } from './db.js';

// Placeholder: chưa nhận hoặc xử lý job cho đến khi giao thức lease được triển khai.
async function main() {
  await db.query('SELECT 1');
  console.log('Core worker connected; no job handlers are implemented yet');
  const timer = setInterval(() => {}, 60_000);
  const stop = async () => { clearInterval(timer); await db.end(); };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
}
main().catch((error: unknown) => { console.error('Worker startup failed', error); process.exitCode = 1; });
