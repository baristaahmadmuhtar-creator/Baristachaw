import type { Language } from '../i18n';

export function PrivacyPage({ language }: { language: Language }) {
  const isId = language === 'id';
  const isBn = language === 'bn';
  return (
    <main className="utility-page legal-page">
      <div className="utility-hero">
        <p>Privacy · Updated June 12, 2026</p>
        <h1>{isBn ? 'Privasi Baristachaw' : isId ? 'Privasi Baristachaw' : 'Baristachaw Privacy'}</h1>
        <p>
          {isBn
            ? 'Ringkasan telus untuk website, web app, PWA, dan aplikasi Android.'
            : isId
            ? 'Ringkasan transparan untuk website, web app, PWA, dan aplikasi Android.'
            : 'A transparent summary for the website, web app, PWA, and Android app.'}
        </p>
      </div>
      <article className="legal-copy">
        <h2>{isBn ? 'Data yang mungkin diproses' : isId ? 'Data yang dapat diproses' : 'Data that may be processed'}</h2>
        <p>
          {isBn
            ? 'Maklumat akaun, pilihan alat seduh, resep dan log seduhan, mesej AI, diagnostik ralat, serta gambar atau audio hanya apabila biskita memilih ciri berkaitan.'
            : isId
            ? 'Informasi akun, preferensi alat, recipe dan brew log, pesan AI, diagnostik kesalahan, serta foto atau audio hanya ketika Anda memilih fitur terkait.'
            : 'Account information, equipment preferences, recipes and brew logs, AI messages, error diagnostics, and photos or audio only when you choose the related feature.'}
        </p>
        <h2>{isBn ? 'Kamera dan mikrofon' : isId ? 'Kamera dan mikrofon' : 'Camera and microphone'}</h2>
        <p>
          {isBn
            ? 'Kebenaran CAMERA dan RECORD_AUDIO digunakan untuk mengimbas, lampiran, atau input suara. Versi Android tidak meminta kebenaran storage/media yang luas.'
            : isId
            ? 'Izin CAMERA dan RECORD_AUDIO digunakan untuk scan, attachment, atau voice input. Baristachaw tidak meminta izin storage/media luas pada Android release.'
            : 'CAMERA and RECORD_AUDIO permissions support scanning, attachments, or voice input. The Android release does not request broad storage/media permissions.'}
        </p>
        <h2>{isBn ? 'AI dan perkhidmatan pihak ketiga' : isId ? 'AI dan layanan pihak ketiga' : 'AI and third-party services'}</h2>
        <p>
          {isBn
            ? 'Input yang biskita hantar ke ciri AI boleh dihantar ke penyedia perkhidmatan yang dikonfigurasikan untuk menghasilkan jawapan. Jangan masukkan rahasia atau data sensitif.'
            : isId
            ? 'Input yang Anda kirim ke fitur AI dapat diteruskan ke provider yang dikonfigurasi untuk menghasilkan jawaban. Jangan masukkan rahasia atau data sensitif.'
            : 'Input submitted to AI features may be sent to a configured provider to generate a response. Do not enter secrets or sensitive data.'}
        </p>
        <h2>{isBn ? 'Kawalan pengguna' : isId ? 'Kontrol pengguna' : 'User control'}</h2>
        <p>
          {isBn
            ? 'Biskita boleh menggunakan preview terhad, memadam data tempatan daripada peranti biskita, serta meminta bantuan pemadaman akaun melalui halaman sokongan.'
            : isId
            ? 'Anda dapat menggunakan preview terbatas, menghapus data lokal dari perangkat, serta meminta bantuan penghapusan akun melalui halaman support.'
            : 'You can use a limited preview, clear local data from your device, and request account deletion help through the support page.'}
        </p>
        <h2>{isBn ? 'Had dokumen' : isId ? 'Batas dokumen' : 'Document limits'}</h2>
        <p>
          {isBn
            ? 'Dokumen ini menerangkan tingkah laku MVP semasa dan mesti dikemas kini apabila analitik, pembayaran, atau penyedia perkhidmatan baru diaktifkan.'
            : isId
            ? 'Dokumen ini menjelaskan perilaku MVP saat ini dan harus diperbarui ketika analytics, pembayaran, atau provider baru diaktifkan.'
            : 'This document describes current MVP behavior and must be updated when analytics, payments, or new providers are enabled.'}
        </p>
      </article>
    </main>
  );
}
