export function PrivacyPage({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <main className="utility-page legal-page">
      <div className="utility-hero">
        <p>Privacy · Updated June 12, 2026</p>
        <h1>{isId ? 'Privasi Baristachaw' : 'Baristachaw Privacy'}</h1>
        <p>{isId ? 'Ringkasan transparan untuk website, web app, PWA, dan aplikasi Android.' : 'A transparent summary for the website, web app, PWA, and Android app.'}</p>
      </div>
      <article className="legal-copy">
        <h2>{isId ? 'Data yang dapat diproses' : 'Data that may be processed'}</h2>
        <p>{isId ? 'Informasi akun, preferensi alat, recipe dan brew log, pesan AI, diagnostik kesalahan, serta foto atau audio hanya ketika Anda memilih fitur terkait.' : 'Account information, equipment preferences, recipes and brew logs, AI messages, error diagnostics, and photos or audio only when you choose the related feature.'}</p>
        <h2>{isId ? 'Kamera dan mikrofon' : 'Camera and microphone'}</h2>
        <p>{isId ? 'Izin CAMERA dan RECORD_AUDIO digunakan untuk scan, attachment, atau voice input. Baristachaw tidak meminta izin storage/media luas pada Android release.' : 'CAMERA and RECORD_AUDIO permissions support scanning, attachments, or voice input. The Android release does not request broad storage/media permissions.'}</p>
        <h2>{isId ? 'AI dan layanan pihak ketiga' : 'AI and third-party services'}</h2>
        <p>{isId ? 'Input yang Anda kirim ke fitur AI dapat diteruskan ke provider yang dikonfigurasi untuk menghasilkan jawaban. Jangan masukkan rahasia atau data sensitif.' : 'Input submitted to AI features may be sent to a configured provider to generate a response. Do not enter secrets or sensitive data.'}</p>
        <h2>{isId ? 'Kontrol pengguna' : 'User control'}</h2>
        <p>{isId ? 'Anda dapat menggunakan preview terbatas, menghapus data lokal dari perangkat, serta meminta bantuan penghapusan akun melalui halaman support.' : 'You can use a limited preview, clear local data from your device, and request account deletion help through the support page.'}</p>
        <h2>{isId ? 'Batas dokumen' : 'Document limits'}</h2>
        <p>{isId ? 'Dokumen ini menjelaskan perilaku MVP saat ini dan harus diperbarui ketika analytics, pembayaran, atau provider baru diaktifkan.' : 'This document describes current MVP behavior and must be updated when analytics, payments, or new providers are enabled.'}</p>
      </article>
    </main>
  );
}
