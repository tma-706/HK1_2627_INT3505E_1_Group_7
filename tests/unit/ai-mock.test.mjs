import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createAiMock } from '../../apps/core/dist/ai/mock.js';

const input = { bytes: Buffer.from('original-image-data'), contentType: 'image/jpeg' };

test('mock must be explicitly enabled and does not return original image bytes', async () => {
  assert.throws(() => createAiMock({}), /AI_PROVIDER=mock/);
  const mock = createAiMock({ AI_PROVIDER: 'mock' });
  const output = await mock.redactImage(input);
  assert.equal(output.mock, true);
  assert.equal(output.contentType, 'image/png');
  assert.deepEqual(output.bytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(output.bytes.includes(input.bytes), false);
  output.bytes.fill(0);
  assert.notEqual((await mock.redactImage(input)).bytes[0], 0);
});

test('scenarios can fail redaction without changing the search response', async () => {
  const mock = createAiMock({ AI_PROVIDER: 'mock', AI_MOCK_REDACT_SCENARIO: 'error' });
  await assert.rejects(mock.redactImage(input), { code: 'AI_UNAVAILABLE' });
  assert.deepEqual(await mock.suggestSearchKeywords({ query: ' Ví đen ' }), {
    mock: true,
    keywords: ['Ví đen'],
  });
  assert.deepEqual(await mock.suggestSearchKeywords({ query: ' ' }), {
    mock: true,
    keywords: [],
  });
});

test('a delayed response can complete or be cancelled', async () => {
  const mock = createAiMock({ AI_PROVIDER: 'mock', AI_MOCK_SEARCH_SCENARIO: 'slow', AI_MOCK_DELAY_MS: '25' });
  const query = { query: 'Mũ' };
  const controller = new AbortController();
  const pending = mock.suggestSearchKeywords(query, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.deepEqual(await mock.suggestSearchKeywords(query), { mock: true, keywords: ['Mũ'] });
});
