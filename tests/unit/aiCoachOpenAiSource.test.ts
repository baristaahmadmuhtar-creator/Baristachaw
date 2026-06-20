import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const SHARED_SOURCE = readFileSync('packages/shared/src/domain.ts', 'utf8');
const AI_SOURCE = readFileSync('server-api/ai.ts', 'utf8');
const WEB_AI_SOURCE = readFileSync('apps/web/src/services/gemini.ts', 'utf8');
const ENV_EXAMPLE = readFileSync('.env.example', 'utf8');

test('AI Coach has a dedicated OpenAI action and server-only Responses route', () => {
  assert.match(SHARED_SOURCE, /\| 'ai_coach'/);
  assert.match(AI_SOURCE, /OPENAI_AI_COACH_MODEL/);
  assert.match(AI_SOURCE, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(AI_SOURCE, /action === 'ai_coach'/);
  assert.match(AI_SOURCE, /callOpenAiCoachResponse/);
  assert.match(AI_SOURCE, /software coding|source code|API keys|passwords/i);
  assert.match(WEB_AI_SOURCE, /aiCoachResponseDetailed/);
  assert.match(ENV_EXAMPLE, /OPENAI_AI_COACH_MODEL=gpt-5\.4-mini/);
  assert.match(ENV_EXAMPLE, /OPENAI_AI_COACH_MAX_OUTPUT_TOKENS=360/);
});
