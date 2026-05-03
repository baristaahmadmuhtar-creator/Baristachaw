import type { ResponseMode } from '@baristachaw/shared';

export function getResponseModeContract(mode: ResponseMode) {
  switch (mode) {
    case 'fast':
      return [
        'Fast mode contract:',
        '- 3-5 bullets.',
        '- Answer the main question immediately.',
        '- No long intro.',
      ].join('\n');
    case 'deep':
      return [
        'Deep mode contract:',
        '- Start with "Jawaban singkat".',
        '- Then include "Analisis".',
        '- Then include "Trade-off / Risiko".',
        '- Then include "Rekomendasi".',
        '- Do not show a generic wizard if the question is already clear.',
      ].join('\n');
    case 'normal':
    default:
      return [
        'Normal mode contract:',
        '- Use clear markdown structure.',
        '- Cover every requested aspect.',
        '- Include practical recommendations.',
      ].join('\n');
  }
}

export function buildStrictRegenerationPrompt(params: {
  userMessage: string;
  missingEntities: string[];
  mode: ResponseMode;
}) {
  const required = params.missingEntities.length
    ? `Wajib sebut semua entitas ini: ${params.missingEntities.join(', ')}.`
    : 'Wajib jawab langsung sesuai pertanyaan user.';
  return [
    'Jawab pertanyaan user secara langsung.',
    'Jangan gunakan template lama, resep lama, atau contoh yang tidak diminta.',
    required,
    getResponseModeContract(params.mode),
    '',
    'Pertanyaan user:',
    params.userMessage,
  ].join('\n');
}

export function formatDirectFallbackAnswer(userMessage: string, missingEntities: string[]) {
  const entities = missingEntities.length ? missingEntities.join(', ') : 'poin yang Anda sebut';
  if (/\bharga terbaru|price today|hari ini|terbaru|stock|stok\b/i.test(userMessage)) {
    return [
      'Saya tidak bisa memastikan data terbaru tanpa sumber live yang valid.',
      '',
      `Untuk menjawab aman, saya perlu sumber harga/stok terkini atau izin pencarian langsung. Saya tidak akan mengarang angka untuk: ${userMessage}`,
    ].join('\n');
  }
  return [
    'Maaf, jawaban sebelumnya tidak relevan.',
    '',
    `Jawaban langsung harus membahas: ${entities}.`,
    'Silakan ulangi pertanyaan dengan konteks tambahan jika Anda ingin angka yang sangat spesifik.',
  ].join('\n');
}
