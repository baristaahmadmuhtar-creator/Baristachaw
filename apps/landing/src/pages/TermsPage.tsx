export function TermsPage({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <main className="utility-page legal-page">
      <div className="utility-hero">
        <p>Terms · Updated June 12, 2026</p>
        <h1>{isId ? 'Ketentuan penggunaan' : 'Terms of use'}</h1>
        <p>{isId ? 'Gunakan Baristachaw sebagai alat bantu workflow, bukan jaminan hasil cup.' : 'Use Baristachaw as a workflow tool, not a guarantee of cup quality.'}</p>
      </div>
      <article className="legal-copy">
        <h2>{isId ? 'Starting recipe' : 'Starting recipes'}</h2>
        <p>{isId ? 'AI Brew membantu menyusun titik awal berdasarkan input dan guardrail metode. Hasil fisik dipengaruhi beans, grinder, water, kettle, teknik, lingkungan, dan kondisi alat.' : 'AI Brew creates a starting point from inputs and method guardrails. Physical results depend on beans, grinder, water, kettle, technique, environment, and equipment condition.'}</p>
        <h2>{isId ? 'Tidak ada jaminan sensory' : 'No sensory guarantee'}</h2>
        <p>{isId ? 'Label confidence menjelaskan kekuatan bukti software, bukan menjamin rasa terbaik atau extraction sempurna.' : 'Confidence labels describe software evidence strength; they do not guarantee the best taste or perfect extraction.'}</p>
        <h2>{isId ? 'Akun dan keamanan' : 'Accounts and security'}</h2>
        <p>{isId ? 'Anda bertanggung jawab menjaga akses akun dan tidak menyalahgunakan layanan, API, atau konten pengguna lain.' : 'You are responsible for account access and must not misuse the service, APIs, or other users’ content.'}</p>
        <h2>{isId ? 'Perubahan MVP' : 'MVP changes'}</h2>
        <p>{isId ? 'Fitur beta, limit, provider, dan availability dapat berubah. Perubahan material akan dicatat pada release atau dokumen ini.' : 'Beta features, limits, providers, and availability may change. Material changes will be recorded in releases or this document.'}</p>
      </article>
    </main>
  );
}
