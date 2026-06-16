import { useSearchParams } from 'react-router-dom';
import { ShieldAlert, EyeOff, Bug } from 'lucide-react';
import { ContactForm } from '../components/ContactForm';
import type { Language } from '../i18n';

export function SupportPage({ language }: { language: Language }) {
  const [params] = useSearchParams();
  const isId = language === 'id';
  const isBn = language === 'bn';
  return (
    <main className="utility-page">
      <div className="utility-hero">
        <p>Baristachaw Support</p>
        <h1>
          {isBn
            ? 'Bantuan yang jelas, tanpa janji palsu.'
            : isId
            ? 'Bantuan yang jelas, tanpa janji palsu.'
            : 'Clear support without false promises.'}
        </h1>
        <p>
          {isBn
            ? 'Pilih topik dan buka laporan terstruktur. Untuk resipi, sila sertakan kaedah, dos, grinder, air, masa, dan hasil rasa biskita.'
            : isId
            ? 'Pilih topik dan buka laporan terstruktur. Untuk recipe, sertakan metode, dose, grinder, water, waktu, dan hasil rasa.'
            : 'Choose a topic and open a structured report. For recipes, include method, dose, grinder, water, time, and taste result.'}
        </p>
      </div>
      <div className="utility-content utility-two-column">
        <aside className="support-sidebar">
          <h2 className="support-sidebar-title">{isBn ? 'Sebelum Menghantar' : isId ? 'Sebelum mengirim' : 'Before submitting'}</h2>
          <ul className="support-checklist">
            <li className="support-checklist-item">
              <div className="support-checklist-icon-wrap security">
                <ShieldAlert />
              </div>
              <span className="support-checklist-text">
                {isBn
                  ? 'Jangan hantar password, API key, atau kod pemulihan biskita.'
                  : isId
                  ? 'Jangan kirim password, API key, atau recovery code.'
                  : 'Do not send passwords, API keys, or recovery codes.'}
              </span>
            </li>
            <li className="support-checklist-item">
              <div className="support-checklist-icon-wrap privacy">
                <EyeOff />
              </div>
              <span className="support-checklist-text">
                {isBn
                  ? 'Padam data peribadi daripada screenshot.'
                  : isId
                  ? 'Hapus data pribadi dari screenshot.'
                  : 'Remove personal data from screenshots.'}
              </span>
            </li>
            <li className="support-checklist-item">
              <div className="support-checklist-icon-wrap bug">
                <Bug />
              </div>
              <span className="support-checklist-text">
                {isBn
                  ? 'Untuk bug, sila nyatakan peranti, pelayar web, dan langkah reproduksi.'
                  : isId
                  ? 'Untuk bug, tulis perangkat, browser, dan langkah reproduksi.'
                  : 'For bugs, include device, browser, and reproduction steps.'}
              </span>
            </li>
          </ul>
        </aside>
        <ContactForm language={language} initialTopic={params.get('topic') || 'general'} />
      </div>
    </main>
  );
}
