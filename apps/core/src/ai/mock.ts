import { setTimeout } from 'node:timers/promises';

import { redactedFixturePng } from './redacted-fixture.js';

type MockScenario = 'success' | 'error' | 'slow';

export class AiMockError extends Error {
  readonly code = 'AI_UNAVAILABLE';

  constructor() {
    super('Simulated AI service failure');
    this.name = 'AiMockError';
  }
}

function mockScenario(value: string | undefined, setting: string): MockScenario {
  if (value === undefined || value === 'success') return 'success';
  if (value === 'error' || value === 'slow') return value;
  throw new Error(`${setting} must be success, error, or slow`);
}

async function simulate(scenario: MockScenario, delayMs: number, signal?: AbortSignal) {
  signal?.throwIfAborted();
  if (scenario === 'error') throw new AiMockError();
  if (scenario === 'slow') await setTimeout(delayMs, undefined, { signal });
}

export function createAiMock(env: NodeJS.ProcessEnv = process.env) {
  if (env.AI_PROVIDER !== 'mock') throw new Error('Set AI_PROVIDER=mock to enable the AI fixture');
  const redactScenario = mockScenario(env.AI_MOCK_REDACT_SCENARIO, 'AI_MOCK_REDACT_SCENARIO');
  const searchScenario = mockScenario(env.AI_MOCK_SEARCH_SCENARIO, 'AI_MOCK_SEARCH_SCENARIO');
  const delayMs = Number(env.AI_MOCK_DELAY_MS ?? 1500);
  if (!Number.isSafeInteger(delayMs) || delayMs < 1 || delayMs > 30_000) {
    throw new Error('AI_MOCK_DELAY_MS must be an integer from 1 to 30000');
  }

  return {
    // The mock returns a fresh copy of a known fixture and never reads the uploaded bytes.
    async redactImage(_input: { bytes: Uint8Array; contentType: string }, signal?: AbortSignal) {
      await simulate(redactScenario, delayMs, signal);
      return {
        mock: true as const,
        bytes: Buffer.from(redactedFixturePng, 'base64'),
        contentType: 'image/png',
      };
    },

    async suggestSearchKeywords(input: { query: string }, signal?: AbortSignal) {
      await simulate(searchScenario, delayMs, signal);
      const query = input.query.trim();
      return { mock: true as const, keywords: query ? [query] : [] };
    },
  };
}
