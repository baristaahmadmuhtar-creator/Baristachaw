import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Languages, Loader2, Search, X } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalState';
import { loadAiBrewCatalog } from '../../features/ai-brew/catalog';
import type { AiBrewCatalog } from '../../features/ai-brew/types';
import type { Language, Region } from '../../types';
import {
  loadEquipmentPreferences,
  saveEquipmentPreferences,
  submitCatalogSuggestion,
} from '../../services/equipmentPreferences';

type OnboardingStep = 'language' | 'equipment';
type PickerKind = 'dripper' | 'grinder';

interface CatalogEquipmentItem {
  id: string;
  name: string;
  brand?: string;
  hidden?: boolean;
  deprecated?: boolean;
}

const LANGUAGE_OPTIONS: Array<{
  id: Extract<Language, 'id' | 'en'>;
  label: string;
  detail: string;
}> = [
  { id: 'id', label: 'Bahasa Indonesia', detail: 'Gunakan Bahasa Indonesia di seluruh aplikasi' },
  { id: 'en', label: 'English', detail: 'Use English throughout the app' },
];

const REGION_OPTIONS = [
  { id: 'id', label: 'Indonesia', detail: 'IDR (Rp)' },
  { id: 'bn', label: 'Brunei', detail: 'BND (B$)' },
  { id: 'my', label: 'Malaysia', detail: 'MYR (RM)' },
  { id: 'sg', label: 'Singapore', detail: 'SGD (S$)' },
  { id: 'au', label: 'Australia', detail: 'AUD (A$)' },
  { id: 'eu', label: 'Europe', detail: 'EUR (€)' },
  { id: 'us', label: 'United States', detail: 'USD ($)' },
  { id: 'global', label: 'Global', detail: 'USD ($)' },
] as const;

const FAVORITE_DRIPPER_IDS = [
  'hario-v60',
  'kalita-wave-185',
  'kalita-wave-155',
  'origami-dripper-s-m',
  'april-brewer',
  'clever-dripper',
  'chemex-six-cup',
  'aeropress',
  'hario-switch-02',
  'hario-switch-03',
  'mugen-x-switch',
  'french-press',
  'bialetti-moka-pot',
  'toddy-cold-brew',
];

const FAVORITE_GRINDER_IDS = [
  '1zpresso-k-ultra',
  'comandante-c40-mk4',
  'kingrinder-k6',
  'timemore-c2',
  'timemore-c3',
  'baratza-encore',
  'fellow-ode-gen-2',
  'df64',
  'feima-600n',
];

function favoriteFirstEquipment<T extends CatalogEquipmentItem>(items: readonly T[], kind: PickerKind): T[] {
  const priority = kind === 'dripper' ? FAVORITE_DRIPPER_IDS : FAVORITE_GRINDER_IDS;
  const priorityIndex = new Map(priority.map((id, index) => [id, index]));
  return [...items]
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftPriority = priorityIndex.get(left.item.id);
      const rightPriority = priorityIndex.get(right.item.id);
      if (leftPriority !== undefined && rightPriority !== undefined) return leftPriority - rightPriority;
      if (leftPriority !== undefined) return -1;
      if (rightPriority !== undefined) return 1;
      return left.index - right.index;
    })
    .map(({ item }) => item);
}

function filterVisibleEquipment<T extends CatalogEquipmentItem>(items: readonly T[] | undefined, kind: PickerKind): T[] {
  return favoriteFirstEquipment((items || []).filter((item) => !item.hidden && !item.deprecated), kind);
}

function EquipmentPickerDialog({
  kind,
  items,
  selectedId,
  language,
  onClose,
  onSelect,
}: {
  kind: PickerKind;
  items: CatalogEquipmentItem[];
  selectedId: string;
  language: Extract<Language, 'id' | 'en'>;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);
  const id = language === 'id';
  const title = kind === 'dripper'
    ? (id ? 'Pilih alat seduh favorit' : 'Choose favorite brewer')
    : (id ? 'Pilih grinder favorit' : 'Choose favorite grinder');
  const body = kind === 'dripper'
    ? (id ? 'Favorit umum tampil paling atas, lalu katalog sesuai urutan data.' : 'Common favorites appear first, then the catalog order.')
    : (id ? 'Grinder populer tampil paling atas, lalu katalog sesuai urutan data.' : 'Popular grinders appear first, then the catalog order.');
  const placeholder = id ? 'Cari model atau brand' : 'Search model or brand';
  const clearCopy = id ? 'Tanpa pilihan katalog' : 'No catalog selection';
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => `${item.name} ${item.brand || ''}`.toLowerCase().includes(normalized));
  }, [items, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => searchRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[1110] flex items-end justify-center bg-black/45 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center">
      <div
        className="flex max-h-[min(88dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-glass bg-[var(--bg-elevated)] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="shrink-0 border-b border-glass px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/12">
              <img src="/icons/icon-192.png" alt="" className="h-7 w-7 rounded-lg object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-primary">{title}</h2>
              <p className="mt-1 text-xs leading-5 text-secondary">{body}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-glass text-secondary hover:text-primary"
              aria-label={id ? 'Tutup' : 'Close'}
            >
              <X size={18} />
            </button>
          </div>
          <label className="mt-4 flex h-11 items-center gap-2 rounded-xl border border-glass bg-surface-alpha px-3 text-sm text-secondary focus-within:border-blue-500">
            <Search size={16} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-tertiary"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <button
            type="button"
            onClick={() => {
              onSelect('');
              onClose();
            }}
            data-testid={`onboarding-${kind}-picker-clear`}
            className={`mb-2 flex min-h-[52px] w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm ${
              selectedId
                ? 'border-glass bg-surface-alpha text-secondary'
                : 'border-blue-500 bg-blue-500/10 text-primary'
            }`}
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${selectedId ? 'bg-[var(--bg-base)]' : 'bg-blue-600 text-white'}`}>
              {!selectedId ? <Check size={15} /> : '-'}
            </span>
            <span className="font-semibold">{clearCopy}</span>
          </button>

          {filtered.map((item) => {
            const active = selectedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
                data-testid={`onboarding-${kind}-picker-option-${item.id}`}
                className={`mb-2 flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                  active
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-glass bg-surface-alpha hover:border-blue-500/35'
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${active ? 'bg-blue-600 text-white' : 'bg-[var(--bg-base)] text-secondary'}`}>
                  {active ? <Check size={15} /> : item.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-primary">{item.name}</span>
                  {item.brand ? <span className="block truncate text-xs text-secondary">{item.brand}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function FirstRunOnboarding() {
  const { language, setLanguage, region, setRegion } = useGlobalState();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<OnboardingStep>('language');
  const [selectedLanguage, setSelectedLanguage] = useState<Extract<Language, 'id' | 'en'>>(
    language === 'id' ? 'id' : 'en',
  );
  const [selectedRegion, setSelectedRegion] = useState<Region>(region);
  const [catalog, setCatalog] = useState<AiBrewCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [preferredDripperId, setPreferredDripperId] = useState('');
  const [preferredGrinderId, setPreferredGrinderId] = useState('');
  const [customDripperName, setCustomDripperName] = useState('');
  const [customGrinderName, setCustomGrinderName] = useState('');
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<PickerKind | null>(null);

  const id = selectedLanguage === 'id';
  const copy = useMemo(() => ({
    languageTitle: id ? 'Pilih bahasa' : 'Choose your language',
    languageBody: id
      ? 'Pilihan ini akan digunakan di seluruh aplikasi dan dapat diubah lagi di pengaturan.'
      : 'This choice applies across the app and can be changed later in settings.',
    regionTitle: id ? 'Pilih negara Anda' : 'Choose your country',
    regionBody: id
      ? 'Negara Anda akan digunakan untuk menyesuaikan harga plan yang ditampilkan.'
      : 'Your country will be used to adjust the displayed plan pricing.',
    continue: id ? 'Lanjut' : 'Continue',
    equipmentTitle: id ? 'Atur alat favorit' : 'Set your favorite equipment',
    equipmentBody: id
      ? 'Pilihan ini akan tampil paling atas dan menjadi default awal di AI Brew. Anda tetap dapat menggantinya kapan saja.'
      : 'These choices appear first and become the starting defaults in AI Brew. You can change them at any time.',
    dripper: id ? 'Dripper atau alat seduh' : 'Brewer or dripper',
    grinder: 'Grinder',
    choose: id ? 'Pilih dari katalog' : 'Choose from catalog',
    manualDripper: id ? 'Alat seduh tidak ada? Tulis model alat seduh Anda' : 'Brewer not listed? Enter your brewer model',
    manualGrinder: id ? 'Grinder tidak ada? Tulis model grinder Anda' : 'Grinder not listed? Enter your grinder model',
    reviewNote: id
      ? 'Nama manual akan dikirim untuk ditinjau sebelum masuk ke katalog.'
      : 'Manual entries are submitted for review before they are added to the catalog.',
    finish: id ? 'Simpan dan mulai' : 'Save and start',
    skip: id ? 'Lewati' : 'Skip',
    loading: id ? 'Memuat katalog...' : 'Loading catalog...',
    selected: id ? 'Dipilih' : 'Selected',
  }), [id]);

  const dripperItems = useMemo(() => filterVisibleEquipment(catalog?.drippers, 'dripper'), [catalog]);
  const grinderItems = useMemo(() => filterVisibleEquipment(catalog?.grinders, 'grinder'), [catalog]);
  const selectedDripper = dripperItems.find((item) => item.id === preferredDripperId);
  const selectedGrinder = grinderItems.find((item) => item.id === preferredGrinderId);

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
    setRegion(selectedRegion);
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
          <img
            data-testid="onboarding-logo"
            src="/icons/icon-192.png"
            alt="BaristaChaw"
            className="h-8 w-8 rounded-lg object-cover"
          />
          <span>Baristachaw</span>
        </div>

        {step === 'language' ? (
          <section data-testid="onboarding-language-step">
            <div className="text-center">
              <Languages
                data-testid="onboarding-language-icon"
                aria-hidden="true"
                className="mx-auto h-7 w-7 text-blue-500"
              />
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

            <div className="mt-8 border-t border-glass pt-6">
              <h2 className="text-sm font-semibold text-primary">{copy.regionTitle}</h2>
              <p className="text-xs text-secondary mt-1">{copy.regionBody}</p>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {REGION_OPTIONS.map((opt) => {
                  const active = selectedRegion === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedRegion(opt.id)}
                      className={`flex min-h-[58px] items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        active
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-glass bg-surface-alpha hover:border-blue-500/35'
                      }`}
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                        active ? 'bg-blue-600 text-white' : 'bg-[var(--bg-base)] text-secondary'
                      }`}>
                        {opt.id === 'global' ? 'GL' : opt.id.toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-primary truncate">{opt.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
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
              <img src="/icons/icon-192.png" alt="" className="mx-auto h-6 w-6 rounded-md object-cover" />
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
                  <button
                    type="button"
                    onClick={() => setPicker('dripper')}
                    className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-glass bg-surface-alpha px-3 text-left text-sm font-normal text-primary outline-none hover:border-blue-500/40 focus:border-blue-500"
                    data-testid="onboarding-dripper-picker"
                  >
                    <span className={selectedDripper ? 'text-primary' : 'text-tertiary'}>
                      {selectedDripper ? `${copy.selected}: ${selectedDripper.name}` : copy.choose}
                    </span>
                    <ChevronRight size={17} className="text-secondary" />
                  </button>
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
                  <button
                    type="button"
                    onClick={() => setPicker('grinder')}
                    className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-glass bg-surface-alpha px-3 text-left text-sm font-normal text-primary outline-none hover:border-blue-500/40 focus:border-blue-500"
                    data-testid="onboarding-grinder-picker"
                  >
                    <span className={selectedGrinder ? 'text-primary' : 'text-tertiary'}>
                      {selectedGrinder ? `${copy.selected}: ${selectedGrinder.name}` : copy.choose}
                    </span>
                    <ChevronRight size={17} className="text-secondary" />
                  </button>
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

      {picker ? (
        <EquipmentPickerDialog
          kind={picker}
          items={picker === 'dripper' ? dripperItems : grinderItems}
          selectedId={picker === 'dripper' ? preferredDripperId : preferredGrinderId}
          language={selectedLanguage}
          onClose={() => setPicker(null)}
          onSelect={picker === 'dripper' ? setPreferredDripperId : setPreferredGrinderId}
        />
      ) : null}
    </div>
  );
}
