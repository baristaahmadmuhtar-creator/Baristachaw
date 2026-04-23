import type { ChatAttachment, ChatMessage } from '../types';

function hasValue(value?: string) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function resolveAudioPlaybackUrl(message: ChatMessage, attachment?: ChatAttachment) {
  if (hasValue(message.audioUrl)) return message.audioUrl;
  if (!attachment || attachment.kind !== 'audio') return undefined;
  if (hasValue(attachment.objectUrl)) return attachment.objectUrl;
  if (!hasValue(attachment.inlineBase64)) return undefined;

  const mimeType = hasValue(attachment.mimeType) ? attachment.mimeType : 'audio/webm';
  return `data:${mimeType};base64,${attachment.inlineBase64}`;
}
