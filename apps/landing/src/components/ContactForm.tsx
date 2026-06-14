import { FormEvent, useState } from 'react';
import { ExternalLink, LoaderCircle } from 'lucide-react';
import { SUPPORT_ISSUE_URL } from '../config';
import type { Language } from '../i18n';

type ContactFormProps = {
  language: Language;
  initialTopic?: string;
};

export function ContactForm({ language, initialTopic = 'general' }: ContactFormProps) {
  const isId = language === 'id';
  const isBn = language === 'bn';
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim();
    const topic = String(form.get('topic') || '').trim();
    const message = String(form.get('message') || '').trim();

    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 12) {
      setError(
        isBn
          ? 'Sila periksa nama, email, dan isi mesej sekurang-kurangnya 12 karakter.'
          : isId
          ? 'Periksa nama, email, dan isi pesan minimal 12 karakter.'
          : 'Check your name, email, and a message of at least 12 characters.'
      );
      return;
    }

    setStatus('loading');
    const title = `[${topic}] ${message.slice(0, 72)}`;
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Topic: ${topic}`,
      '',
      message,
      '',
      'Screenshot: attach it manually to this GitHub issue if needed.',
    ].join('\n');
    const target = `${SUPPORT_ISSUE_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    window.setTimeout(() => {
      window.open(target, '_blank', 'noopener,noreferrer');
      setStatus('success');
    }, 280);
  };

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <label>
          <span>{isBn ? 'Nama' : isId ? 'Nama' : 'Name'}</span>
          <input name="name" autoComplete="name" required minLength={2} />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
      </div>
      <label>
        <span>{isBn ? 'Topik' : isId ? 'Topik' : 'Topic'}</span>
        <select name="topic" defaultValue={initialTopic}>
          <option value="general">{isBn ? 'Pertanyaan umum' : isId ? 'Pertanyaan umum' : 'General question'}</option>
          <option value="account">{isBn ? 'Masalah akaun' : isId ? 'Masalah akun' : 'Account issue'}</option>
          <option value="download">Download APK</option>
          <option value="brew">AI Brew recipe</option>
          <option value="bug">{isBn ? 'Laporan bug' : isId ? 'Laporan bug' : 'Bug report'}</option>
          <option value="waitlist">Play Store / App Store waitlist</option>
        </select>
      </label>
      <label>
        <span>{isBn ? 'Mesej' : isId ? 'Pesan' : 'Message'}</span>
        <textarea name="message" rows={6} required minLength={12} />
      </label>
      <label className="file-field">
        <span>{isBn ? 'Screenshot pilihan' : isId ? 'Screenshot opsional' : 'Optional screenshot'}</span>
        <input name="screenshot" type="file" accept="image/png,image/jpeg,image/webp" />
        <small>{isBn ? 'Sila lampirkan secara manual selepas halaman GitHub dibuka.' : isId ? 'Lampirkan secara manual setelah halaman GitHub terbuka.' : 'Attach it manually after the GitHub page opens.'}</small>
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {status === 'success' ? (
        <p className="form-success" role="status">
          {isBn
            ? 'Borang disahkan. Halaman laporan GitHub telah dibuka; sila hantar selepas biskita meninjau isinya.'
            : isId
            ? 'Form tervalidasi. Halaman laporan GitHub telah dibuka; kirim setelah Anda meninjau isinya.'
            : 'Form validated. The GitHub report page opened; submit it after reviewing the content.'}
        </p>
      ) : null}
      <button className="button button-primary form-submit" type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? <LoaderCircle className="spin" size={18} /> : <ExternalLink size={18} />}
        {isBn ? 'Buka laporan sokongan' : isId ? 'Buka laporan support' : 'Open support report'}
      </button>
      <p className="form-disclosure">
        {isBn
          ? 'Baristachaw tidak menjanjikan sokongan pelanggan 24/7. Borang ini akan membuka saluran isu awam GitHub dan tidak memuat naik fail secara automatik.'
          : isId
          ? 'Baristachaw belum mengklaim human support 24/7. Form ini membuka kanal issue publik GitHub dan tidak mengunggah file otomatis.'
          : 'Baristachaw does not claim 24/7 human support. This form opens the public GitHub issue channel and does not upload files automatically.'}
      </p>
    </form>
  );
}
