import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Coffee, Languages, Loader2 } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalState';
import { loadAiBrewCatalog } from '../../features/ai-brew/catalog';
import type { AiBrewCatalog } from '../../features/ai-brew/types';
import type { Language } from '../../types';
import {
  loadEquipmentPreferences,
  saveEquipmentPreferences,
  submitCatalogSuggestion,
} from '../../services/equipmentPreferences';

type OnboardingStep = 'language' | 'equipment';

const LANGUAGE_OPTIONS: Array<{
  id: Extract<Language, 'id' | 'en'>;
  label: string;
  detail: string;
}> = [
  { id: 'id', label: 'Bahasa Indonesia', detail: 'Gunakan Bahasa Indonesia di seluruh aplikasi' },
  { id: 'en', label: 'English', detail: 'Use English throughout the app' },
];

export function FirstRunOnboarding() {
  const { language, setLanguage } = useGlobalState();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<OnboardingStep>('language');
  const [selectedLanguage, setSelectedLanguage] = useState<Extract<Language, 'id' | 'en'>>(
    language === 'id' ? 'id' : 'en',
  );
  const [catalog, setCatalog] = useState<AiBrewCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [preferredDripperId, setPreferredDripperId] = useState('');
  const [preferredGrinderId, setPreferredGrinderId] = useState('');
  const [customDripperName, setCustomDripperName] = useState('');
  const [customGrinderName, setCustomGrinderName] = useState('');
  const [saving, setSaving] = useState(false);

  const id = selectedLanguage === 'id';
  const copy = useMemo(() => ({
    languageTitle: id ? 'Pilih bahasa' : 'Choose your language',
    languageBody: id
      ? 'Pilihan ini akan digunakan di seluruh aplikasi dan dapat diubah lagi di pengaturan.'
      : 'This choice applies across the app and can be changed later in settings.',
    continue: id ? 'Lanjut' : 'Continue',
    equipmentTitle: id ? 'Atur alat favorit' : 'Set your favorite equipment',
    equipmentBody: id
      ? 'Pilihan ini akan tampil paling atas dan menjadi default awal di AI Brew. Anda tetap dapat menggantinya kapan saja.'
      : 'These choices appear first and become the starting defaults in AI Brew. You can change them at any time.',
    dripper: id ? 'Dripper atau alat seduh' : 'Brewer or dripper',
    grinder: 'Grinder',
    choose: id ? 'Pilih dari katalog' : 'Choose from catalog',
    manualDripper: id ? 'Dripper tidak ada? Tulis nama lengkap' : 'Brewer not listed? Enter its full name',
    manualGrinder: id ? 'Grinder tidak ada? Tulis nama lengkap' : 'Grinder not listed? Enter its full name',
    reviewNote: id
      ? 'Nama manual akan dikirim untuk ditinjau sebelum masuk ke katalog.'
      : 'Manual entries are submitted for review before they are added to the catalog.',
    finish: id ? 'Simpan dan mulai' : 'Save and start',
    skip: id ? 'Lewati' : 'Skip',
    loading: id ? 'Memuat katalog...' : 'Loading catalog...',
  }), [id]);

  useEffect(() => {
    setVisible(loadEquipmentPreferences() === null);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  async function continueToEquipment() {
    setLanguage(selectedLanguage);
    setStep('equipment');
    if (catalog || catalogLoading) return;
    setCatalogLoading(true);
    try {
      setCatalog(await loadAiBrewCatalog());
    } finally {
      setCatalogLoading(false);
    }
  }

  async function completeEquipment(skipped: boolean) {
    if (saving) return;
    setSaving(true);
    const completedAt = Date.now();
    const cleanDripper = customDripperName.trim();
    const cleanGrinder = customGrinderName.trim();

    const submissions: Promise<void>[] = [];
    if (cleanDripper) {
      submissions.push(submitCatalogSuggestion({
        kind: 'dripper',
        model: cleanDripper,
        notes: 'Submitted from first-run equipment preferences.',
      }));
    }
    if (cleanGrinder) {
      submissions.push(submitCatalogSuggestion({
        kind: 'grinder',
        model: cleanGrinder,
        notes: 'Submitted from first-run equipment preferences.',
      }));
    }
    if (submissions.length > 0) {
      await Promise.allSettled(submissions);
    }

    saveEquipmentPreferences({
      completedAt,
      preferredDripperId: skipped ? undefined : preferredDripperId || undefined,
      preferredGrinderId: skipped ? undefined : preferredGrinderId || undefined,
      customDripperName: skipped ? undefined : cleanDripper || undefined,
      customGrinderName: skipped ? undefined : cleanGrinder || undefined,
      skippedEquipmentAt: skipped ? completedAt : undefined,
    });
    setSaving(false);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-[var(--bg-base)] px-4 py-[max(1rem,env(safe-area-inset-top))]"
      data-testid="first-run-onboarding"
    >
      <main className="w-full max-w-lg">
        <div className="mb-8 flex items-center justify-center gap-2 text-sm font-semibold text-primary">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Coffee size={17} />
          </span>
          <span>Baristachaw</span>
        </div>

        {step === 'language' ? (
          <section data-testid="onboarding-language-step">
            <div className="text-center">
              <Languages size={24} className="mx-auto text-blue-500" />
              <h1 className="mt-4 text-2xl font-semibold text-primary">{copy.languageTitle}</h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-secondary">{copy.languageBody}</p>
            </div>
            <div className="mt-7 grid gap-3">
              {LANGUAGE_OPTIONS.map((option) => {
                const active = selectedLanguage === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedLanguage(option.id)}
                    className={`flex min-h-[72px] w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                      active
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-glass bg-surface-alpha hover:border-blue-500/35'
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      active ? 'bg-blue-600 text-white' : 'bg-[var(--bg-base)] text-secondary'
                    }`}>
                      {active ? <Check size={17} /> : option.id.toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-primary">{option.label}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-secondary">{option.detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => { void continueToEquipment(); }}
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {copy.continue}
              <ChevronRight size={17} />
            </button>
          </section>
        ) : (
          <section data-testid="onboarding-equipment-step">
            <div className="text-center">
              <Coffee size={24} className="mx-auto text-blue-500" />
              <h1 className="mt-4 text-2xl font-semibold text-primary">{copy.equipmentTitle}</h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-secondary">{copy.equipmentBody}</p>
            </div>

            {catalogLoading ? (
              <div className="mt-8 flex min-h-36 items-center justify-center gap-2 text-sm text-secondary">
                <Loader2 size={17} className="animate-spin" />
                {copy.loading}
              </div>
            ) : (
              <div className="mt-7 grid gap-5">
                <label className="grid gap-2 text-sm font-semibold text-primary">
                  {copy.dripper}
                  <select
                    value={preferredDripperId}
                    onChange={(event) => setPreferredDripperId(event.target.value)}
                    className="h-12 w-full rounded-lg border border-glass bg-surface-alpha px-3 text-sm font-normal text-primary outline-none focus:border-blue-500"
                  >
                    <option value="">{copy.choose}</option>
                    {(catalog?.drippers || []).filter((item) => !item.hidden && !item.deprecated).map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <input
                    value={customDripperName}
                    onChange={(event) => setCustomDripperName(event.target.value)}
                    maxLength={100}
                    placeholder={copy.manualDripper}
                    className="h-12 w-full rounded-lg border border-glass bg-surface-alpha px-3 text-sm font-normal text-primary outline-none placeholder:text-tertiary focus:border-blue-500"
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-primary">
                  {copy.grinder}
                  <select
                    value={preferredGrinderId}
                    onChange={(event) => setPreferredGrinderId(event.target.value)}
                    className="h-12 w-full rounded-lg border border-glass bg-surface-alpha px-3 text-sm font-normal text-primary outline-none focus:border-blue-500"
                  >
                    <option value="">{copy.choose}</option>
                    {(catalog?.grinders || []).filter((item) => !item.hidden && !item.deprecated).map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <input
                    value={customGrinderName}
                    onChange={(event) => setCustomGrinderName(event.target.value)}
                    maxLength={100}
                    placeholder={copy.manualGrinder}
                    className="h-12 w-full rounded-lg border border-glass bg-surface-alpha px-3 text-sm font-normal text-primary outline-none placeholder:text-tertiary focus:border-blue-500"
                  />
                </label>

                {(customDripperName.trim() || customGrinderName.trim()) ? (
                  <p className="rounded-lg border border-blue-500/20 bg-blue-500/8 px-3 py-2 text-xs leading-5 text-secondary">
                    {copy.reviewNote}
                  </p>
                ) : null}
              </div>
            )}

            <div className="mt-6 grid grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] gap-2">
              <button
                type="button"
                onClick={() => { void completeEquipment(true); }}
                disabled={saving}
                className="h-12 rounded-lg border border-glass bg-surface-alpha px-3 text-sm font-semibold text-secondary hover:text-primary disabled:opacity-50"
                data-testid="onboarding-skip-equipment"
              >
                {copy.skip}
              </button>
              <button
                type="button"
                onClick={() => { void completeEquipment(false); }}
                disabled={saving || catalogLoading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
                {copy.finish}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
