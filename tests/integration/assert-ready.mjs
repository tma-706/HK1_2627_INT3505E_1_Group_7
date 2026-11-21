import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [status, state] = process.argv.slice(2);
const spec = JSON.parse(await readFile(new URL('../../docs/api/core/openapi.json', import.meta.url)));
const path = '/health/ready';
const response = await fetch('http://127.0.0.1:' + process.env.PORT + path, {signal: AbortSignal.timeout(10000)});
const example = spec.paths[path].get.responses[status].content['application/json'].example;
assert.equal(response.status, Number(status));
assert.equal(example.status, state);
assert.deepEqual(await response.json(), example);
console.log('Core readiness', status, state);
