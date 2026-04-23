import test from 'node:test';
import assert from 'node:assert/strict';

import type { ChatAttachment, ChatMessage } from '../../apps/web/src/types.ts';
import { resolveAudioPlaybackUrl } from '../../apps/web/src/utils/chatAudio.ts';

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    role: 'user',
    text: 'voice',
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeAudioAttachment(overrides: Partial<ChatAttachment> = {}): ChatAttachment {
  return {
    id: 'att-1',
    kind: 'audio',
    mimeType: 'audio/webm',
    fileName: 'voice.webm',
    sizeBytes: 512,
    ...overrides,
  };
}

test('resolveAudioPlaybackUrl prefers message audioUrl when present', () => {
  const message = makeMessage({ audioUrl: 'blob:https://app.local/123' });
  const attachment = makeAudioAttachment({ inlineBase64: 'AAA=' });
  assert.equal(resolveAudioPlaybackUrl(message, attachment), 'blob:https://app.local/123');
});

test('resolveAudioPlaybackUrl falls back to attachment objectUrl for audio attachments', () => {
  const message = makeMessage();
  const attachment = makeAudioAttachment({ objectUrl: 'blob:https://app.local/456' });
  assert.equal(resolveAudioPlaybackUrl(message, attachment), 'blob:https://app.local/456');
});

test('resolveAudioPlaybackUrl reconstructs persisted inline audio as data URL', () => {
  const message = makeMessage();
  const attachment = makeAudioAttachment({ mimeType: 'audio/mp4', inlineBase64: 'ZmFrZS1iYXNlNjQ=' });
  assert.equal(resolveAudioPlaybackUrl(message, attachment), 'data:audio/mp4;base64,ZmFrZS1iYXNlNjQ=');
});

test('resolveAudioPlaybackUrl returns undefined for non-audio attachments', () => {
  const message = makeMessage();
  const attachment = {
    ...makeAudioAttachment(),
    kind: 'file' as const,
    inlineBase64: 'AAA=',
  };
  assert.equal(resolveAudioPlaybackUrl(message, attachment), undefined);
});
