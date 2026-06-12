import { useSearchParams } from 'react-router-dom';
import { ContactForm } from '../components/ContactForm';

export function SupportPage({ language }: { language: 'id' | 'en' }) {
  const [params] = useSearchParams();
  const isId = language === 'id';
  return (
    <main className="utility-page">
      <div className="utility-hero">
        <p>Baristachaw Support</p>
        <h1>{isId ? 'Bantuan yang jelas, tanpa janji palsu.' : 'Clear support without false promises.'}</h1>
        <p>{isId ? 'Pilih topik dan buka laporan terstruktur. Untuk recipe, sertakan metode, dose, grinder, water, waktu, dan hasil rasa.' : 'Choose a topic and open a structured report. For recipes, include method, dose, grinder, water, time, and taste result.'}</p>
      </div>
      <div className="utility-content utility-two-column">
        <aside>
          <h2>{isId ? 'Sebelum mengirim' : 'Before submitting'}</h2>
          <ul>
            <li>{isId ? 'Jangan kirim password, API key, atau recovery code.' : 'Do not send passwords, API keys, or recovery codes.'}</li>
            <li>{isId ? 'Hapus data pribadi dari screenshot.' : 'Remove personal data from screenshots.'}</li>
            <li>{isId ? 'Untuk bug, tulis perangkat, browser, dan langkah reproduksi.' : 'For bugs, include device, browser, and reproduction steps.'}</li>
          </ul>
        </aside>
        <ContactForm language={language} initialTopic={params.get('topic') || 'general'} />
      </div>
    </main>
  );
}
