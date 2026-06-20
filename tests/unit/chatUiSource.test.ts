import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const CHAT_SOURCE = readFileSync('apps/web/src/pages/Chat.tsx', 'utf8');
const MOBILE_CHAT_SOURCE = readFileSync('apps/mobile/src/screens/ChatScreen.tsx', 'utf8');

test('chat production UI hides internal guard metadata and feedback chips', () => {
  assert.doesNotMatch(CHAT_SOURCE, /mode:\s*\{msg\.responseMode\}/);
  assert.doesNotMatch(CHAT_SOURCE, /relevance:\s*\{typeof msg\.relevanceScore/);
  assert.doesNotMatch(CHAT_SOURCE, /regenerated:\s*\{msg\.regenerated/);
  assert.doesNotMatch(CHAT_SOURCE, /guard:\s*\{msg\.guardRisk/);
  assert.doesNotMatch(CHAT_SOURCE, /Helpful['"]/);
  assert.doesNotMatch(CHAT_SOURCE, /Not relevant/);
  assert.doesNotMatch(CHAT_SOURCE, /Factual issue/);
  assert.doesNotMatch(CHAT_SOURCE, /Too long/);
  assert.doesNotMatch(CHAT_SOURCE, /Too short/);
});

test('web voice note sends transcript internally without rendering a duplicate user text bubble', () => {
  assert.match(CHAT_SOURCE, /transcribeAudio\(match\[2\], match\[1\]\)/);
  assert.match(CHAT_SOURCE, /transcriptRequestContext/);
  assert.match(CHAT_SOURCE, /internalTranscriptMsg/);
  assert.doesNotMatch(CHAT_SOURCE, /const userTextMsg: ChatMessage = \{/);
  assert.doesNotMatch(CHAT_SOURCE, /setMessages\(\(prev: ChatMessage\[\]\) => \[\.\.\.prev, userTextMsg\]\)/);
});

test('native voice note keeps transcript internal and renders the voice-note label', () => {
  assert.match(MOBILE_CHAT_SOURCE, /draftAttachment\?\.kind === 'audio'\s*\?\s*webT\.chatVoiceNoteLabel/);
  assert.match(MOBILE_CHAT_SOURCE, /transcriptText: draftAttachment\?\.kind === 'txt' \? draftAttachment\.textContent : undefined/);
  assert.match(MOBILE_CHAT_SOURCE, /item\.transcriptText && !hasVoiceAttachment/);
});
