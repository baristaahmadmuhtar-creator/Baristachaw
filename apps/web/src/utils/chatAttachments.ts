import type { ChatAttachment, ChatAttachmentKind } from '../types';

export const CHAT_ATTACHMENT_LIMITS = {
  imageMaxBytesAfterCompress: 1_800_000,
  pdfMaxBytes: 2_000_000,
  txtMaxCharsRaw: 80_000,
  txtMaxCharsAi: 30_000,
  txtMaxCharsPersist: 20_000,
  audioMaxBytes: 1_500_000,
  imageMaxDimension: 1600,
} as const;

export type SupportedChatFileKind = 'image' | 'pdf' | 'txt';

export type PreparedAttachmentDraft = {
  attachment: ChatAttachment;
  aiTextContent?: string;
};

export function isSupportedChatAttachmentFile(file: File): { ok: true; kind: SupportedChatFileKind } | { ok: false; reason: string } {
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  if (type.startsWith('image/')) return { ok: true, kind: 'image' };
  if (type === 'application/pdf' || name.endsWith('.pdf')) return { ok: true, kind: 'pdf' };
  if (type === 'text/plain' || name.endsWith('.txt')) return { ok: true, kind: 'txt' };
  return { ok: false, reason: 'Unsupported file type. Supported: image, PDF, TXT.' };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

export function extractBase64FromDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

export async function readTxtFile(file: File) {
  const raw = await file.text();
  const normalized = raw.replace(/\r\n?/g, '\n').trim();
  return {
    raw: normalized.slice(0, CHAT_ATTACHMENT_LIMITS.txtMaxCharsRaw),
    ai: normalized.slice(0, CHAT_ATTACHMENT_LIMITS.txtMaxCharsAi),
    persisted: normalized.slice(0, CHAT_ATTACHMENT_LIMITS.txtMaxCharsPersist),
  };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

export async function compressImageForChat(file: File): Promise<{
  previewDataUrl: string;
  inlineBase64: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
}> {
  const originalDataUrl = await readFileAsDataUrl(file);
  const loaded = await loadImage(originalDataUrl);

  const maxDim = CHAT_ATTACHMENT_LIMITS.imageMaxDimension;
  const scale = Math.min(1, maxDim / Math.max(loaded.width, loaded.height));
  const targetWidth = Math.max(1, Math.round(loaded.width * scale));
  const targetHeight = Math.max(1, Math.round(loaded.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');

  ctx.drawImage(loaded, 0, 0, targetWidth, targetHeight);

  const preferredMime = file.type && file.type.startsWith('image/png') ? 'image/jpeg' : (file.type || 'image/jpeg');
  const candidateMimes = preferredMime === 'image/webp'
    ? ['image/webp', 'image/jpeg']
    : ['image/jpeg', 'image/webp'];

  let bestDataUrl = '';
  let bestMime = 'image/jpeg';
  const qualities = [0.82, 0.75, 0.68, 0.6, 0.52];

  outer:
  for (const mime of candidateMimes) {
    for (const q of qualities) {
      const dataUrl = canvas.toDataURL(mime, q);
      const payload = extractBase64FromDataUrl(dataUrl);
      if (!payload) continue;
      const approxBytes = Math.floor((payload.base64.length * 3) / 4);
      bestDataUrl = dataUrl;
      bestMime = payload.mimeType;
      if (approxBytes <= CHAT_ATTACHMENT_LIMITS.imageMaxBytesAfterCompress) {
        break outer;
      }
    }
  }

  const parsed = extractBase64FromDataUrl(bestDataUrl);
  if (!parsed) throw new Error('Failed to encode image');

  const sizeBytes = Math.floor((parsed.base64.length * 3) / 4);
  if (sizeBytes > CHAT_ATTACHMENT_LIMITS.imageMaxBytesAfterCompress) {
    throw new Error('Image too large after compression. Please choose a smaller image.');
  }

  return {
    previewDataUrl: bestDataUrl,
    inlineBase64: parsed.base64,
    mimeType: parsed.mimeType,
    width: targetWidth,
    height: targetHeight,
    sizeBytes,
  };
}

function makeAttachmentId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function prepareAttachmentDraftFromFile(
  file: File,
  sourceKind: 'photo' | 'camera' | 'file'
): Promise<PreparedAttachmentDraft> {
  const support = isSupportedChatAttachmentFile(file);
  if (!support.ok) throw new Error((support as { ok: false; reason: string }).reason);

  if (support.kind === 'image') {
    const compressed = await compressImageForChat(file);
    return {
      attachment: {
        id: makeAttachmentId('att'),
        kind: sourceKind === 'camera' ? 'camera' : 'image',
        mimeType: compressed.mimeType,
        fileName: file.name || (sourceKind === 'camera' ? 'camera.jpg' : 'image'),
        sizeBytes: compressed.sizeBytes,
        previewDataUrl: compressed.previewDataUrl,
        inlineBase64: compressed.inlineBase64,
        width: compressed.width,
        height: compressed.height,
        aiMode: 'smart_analyze',
        status: 'draft',
      },
    };
  }

  if (support.kind === 'pdf') {
    if (file.size > CHAT_ATTACHMENT_LIMITS.pdfMaxBytes) {
      throw new Error('PDF too large. Maximum 2MB for chat attachments.');
    }
    const dataUrl = await readFileAsDataUrl(file);
    const parsed = extractBase64FromDataUrl(dataUrl);
    if (!parsed) throw new Error('Failed to read PDF');
    return {
      attachment: {
        id: makeAttachmentId('att'),
        kind: 'file',
        mimeType: 'application/pdf',
        fileName: file.name || 'document.pdf',
        sizeBytes: file.size,
        inlineBase64: parsed.base64,
        aiMode: 'smart_analyze',
        status: 'draft',
      },
    };
  }

  const txt = await readTxtFile(file);
  if (!txt.raw) throw new Error('Text file is empty.');

  return {
    attachment: {
      id: makeAttachmentId('att'),
      kind: 'file',
      mimeType: 'text/plain',
      fileName: file.name || 'document.txt',
      sizeBytes: file.size,
      extractedText: txt.persisted,
      aiMode: 'smart_analyze',
      status: 'draft',
    },
    aiTextContent: txt.ai,
  };
}

export function buildAudioAttachment(params: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  audioUrl?: string;
  inlineBase64?: string;
  durationMs?: number;
}): ChatAttachment {
  return {
    id: makeAttachmentId('att'),
    kind: 'audio',
    mimeType: params.mimeType,
    fileName: params.fileName,
    sizeBytes: params.sizeBytes,
    previewDataUrl: undefined,
    objectUrl: params.audioUrl,
    inlineBase64: params.inlineBase64,
    durationMs: params.durationMs,
    aiMode: 'transcribe',
    status: 'sent',
  };
}

export function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value >= 10 || idx === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[idx]}`;
}

export function attachmentKindLabel(kind: ChatAttachmentKind, mimeType?: string) {
  if (kind === 'camera') return 'Camera';
  if (kind === 'image') return 'Photo';
  if (kind === 'audio') return 'Voice Note';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType?.startsWith('text/')) return 'Text';
  return 'File';
}
