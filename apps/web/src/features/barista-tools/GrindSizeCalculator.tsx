import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Gauge, Search, SlidersHorizontal } from 'lucide-react';
import { loadAiBrewCatalog } from '../ai-brew/catalog.ts';
import type { AiBrewCatalog } from '../ai-brew/types.ts';
import { useGlobalState } from '../../context/GlobalState';
import { BREW_METHOD_PROFILES } from './brewProfiles.ts';
import type { BrewMethodId, RoastLevel } from './types.ts';
import {
  buildGrindSizeAdvice,
  compactRangeLabel,
  formatMethodGrindBand,
  getGrindSizeCompatibility,
  getRatioMethodFamily,
  sortGrindersForMethod,
} from './grindSizeAdvisor.ts';
import type { GrindSizeAdvice } from './grindSizeAdvisor.ts';
import type { EspressoDialInAction } from './grindSizeAdvisor.ts';

interface GrindSizeCalculatorProps {
  methodId: BrewMethodId;
  roastLevel: RoastLevel;
  doseG: number;
  yieldG: number;
  onMethodChange: (methodId: BrewMethodId) => void;
  onRoastLevelChange: (roastLevel: RoastLevel) => void;
  getMethodLabel: (methodId: BrewMethodId) => string;
  getRoastLevelLabel: (roastLevel: RoastLevel) => string;
}

const GRIND_SIZE_GRINDER_STORAGE_KEY = 'BARISTA_TOOLS_GRIND_SIZE_GRINDER_V1';
const GRIND_SIZE_CONTEXT_STORAGE_KEY = 'BARISTA_TOOLS_GRIND_SIZE_CONTEXT_V1';
const ROAST_LEVELS: RoastLevel[] = ['light', 'medium_light', 'medium', 'medium_dark', 'dark'];
interface GrindSizeContextState {
  shotTimeSec: string;
  pressureBar: string;
  beanAgeDays: string;
  zeroPointKnown: boolean;
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readStoredGrinderId() {
  try {
    return localStorage.getItem(GRIND_SIZE_GRINDER_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function readStoredContext(): GrindSizeContextState {
  try {
    const parsed = JSON.parse(localStorage.getItem(GRIND_SIZE_CONTEXT_STORAGE_KEY) || '{}') as Partial<GrindSizeContextState>;
    return {
      shotTimeSec: String(parsed.shotTimeSec || '28'),
      pressureBar: String(parsed.pressureBar || '9'),
      beanAgeDays: String(parsed.beanAgeDays || '10'),
      zeroPointKnown: Boolean(parsed.zeroPointKnown),
    };
  } catch {
    return { shotTimeSec: '28', pressureBar: '9', beanAgeDays: '10', zeroPointKnown: false };
  }
}

function parsePositive(value: string | number | undefined) {
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function getConfidenceLabel(advice: GrindSizeAdvice, t: ReturnType<typeof useGlobalState>['t']) {
  switch (advice.confidenceKind) {
    case 'official':
      return t.toolsGrindSizeConfidenceOfficial;
    case 'community_verified':
      return t.toolsGrindSizeConfidenceCommunity;
    case 'curated':
      return t.toolsGrindSizeConfidenceCurated;
    case 'dataset_unverified':
      return t.toolsGrindSizeConfidenceUnverified;
    case 'directed_estimate':
      return t.toolsGrindSizeConfidenceDirected;
    case 'safe_baseline':
    default:
      return t.toolsGrindSizeConfidenceBaseline;
  }
}

function getSourceLabel(advice: GrindSizeAdvice, t: ReturnType<typeof useGlobalState>['t']) {
  if (advice.sourceKind === 'baseline_method') return t.toolsGrindSizeSourceBaselineMethod;
  return getConfidenceLabel(advice, t);
}

function getCapabilityLabel(advice: GrindSizeAdvice, t: ReturnType<typeof useGlobalState>['t']) {
  switch (advice.capabilityKind) {
    case 'select_grinder':
      return t.toolsGrindSizeCapabilitySelect;
    case 'espresso_baseline':
      return t.toolsGrindSizeCapabilityEspressoBaseline;
    case 'espresso_capable':
      return t.toolsGrindSizeCapabilityEspressoCapable;
    case 'check_fine':
      return t.toolsGrindSizeCapabilityCheckFine;
    case 'moka_fine_ready':
      return t.toolsGrindSizeCapabilityMokaReady;
    case 'moka_fine_baseline':
      return t.toolsGrindSizeCapabilityMokaBaseline;
    case 'wide_range':
      return t.toolsGrindSizeCapabilityWideRange;
    case 'focused_method':
    default:
      return t.toolsGrindSizeCapabilityFocused;
  }
}

function getWarningText(advice: GrindSizeAdvice, t: ReturnType<typeof useGlobalState>['t']) {
  switch (advice.warningKind) {
    case 'no_reference':
      return t.toolsGrindSizeWarningNoReference;
    case 'espresso_calibration':
      return t.toolsGrindSizeWarningEspresso;
    case 'calibration_required':
      return t.toolsGrindSizeWarningCalibration;
    case 'iced_adjustment':
      return t.toolsGrindSizeWarningIced;
    default:
      return '';
  }
}

function getCorrectionTip(advice: GrindSizeAdvice, t: ReturnType<typeof useGlobalState>['t']) {
  switch (advice.correctionKind) {
    case 'finer':
      return t.toolsGrindSizeCorrectionFiner;
    case 'coarser':
      return t.toolsGrindSizeCorrectionCoarser;
    case 'neutral':
    default:
      return t.toolsGrindSizeCorrectionNeutral;
  }
}

function getCompatibilityLabel(advice: GrindSizeAdvice, t: ReturnType<typeof useGlobalState>['t']) {
  switch (advice.compatibilityState) {
    case 'compatible':
      return t.toolsGrindSizeCompatibilityCompatible;
    case 'caution':
      return t.toolsGrindSizeCompatibilityCaution;
    case 'not_recommended':
      return t.toolsGrindSizeCompatibilityNotRecommended;
    case 'unsupported':
    default:
      return t.toolsGrindSizeCompatibilityUnsupported;
  }
}

function getEspressoActionLabel(action: EspressoDialInAction, t: ReturnType<typeof useGlobalState>['t']) {
  switch (action) {
    case 'calibrate_zero':
      return t.toolsGrindSizeActionCalibrateZero;
    case 'grind_finer':
      return t.toolsGrindSizeActionGrindFiner;
    case 'grind_coarser':
      return t.toolsGrindSizeActionGrindCoarser;
    case 'increase_yield':
      return t.toolsGrindSizeActionIncreaseYield;
    case 'reduce_yield':
      return t.toolsGrindSizeActionReduceYield;
    case 'check_pressure':
      return t.toolsGrindSizeActionCheckPressure;
    case 'wait_degas':
      return t.toolsGrindSizeActionWaitDegas;
    case 'older_bean_finer':
      return t.toolsGrindSizeActionOlderBean;
    case 'keep_range':
    default:
      return t.toolsGrindSizeActionKeepRange;
  }
}

export function GrindSizeCalculator({
  methodId,
  roastLevel,
  doseG,
  yieldG,
  onMethodChange,
  onRoastLevelChange,
  getMethodLabel,
  getRoastLevelLabel,
}: GrindSizeCalculatorProps) {
  const { t, language } = useGlobalState();
  const [catalog, setCatalog] = useState<AiBrewCatalog | null>(null);
  const [loadError, setLoadError] = useState('');
  const [selectedGrinderId, setSelectedGrinderId] = useState(readStoredGrinderId);
  const [query, setQuery] = useState('');
  const [context, setContext] = useState(readStoredContext);

  useEffect(() => {
    let cancelled = false;
    loadAiBrewCatalog()
      .then((loadedCatalog) => {
        if (!cancelled) setCatalog(loadedCatalog);
      })
      .catch(() => {
        if (!cancelled) setLoadError(t.toolsGrindSizeCatalogError);
      });
    return () => {
      cancelled = true;
    };
  }, [t.toolsGrindSizeCatalogError]);

  const sortedGrinders = useMemo(() => {
    if (!catalog) return [];
    return sortGrindersForMethod(catalog, methodId);
  }, [catalog, methodId]);

  useEffect(() => {
    if (!catalog) return;
    if (sortedGrinders.length === 0) return;
    setSelectedGrinderId((current) => {
      if (
        current
        && sortedGrinders.some((grinder) =>
          grinder.id === current
          && getGrindSizeCompatibility(catalog, methodId, grinder).selectable
        )
      ) return current;
      return sortedGrinders.find((grinder) => getGrindSizeCompatibility(catalog, methodId, grinder).selectable)?.id
        || sortedGrinders[0].id;
    });
  }, [catalog, methodId, sortedGrinders]);

  useEffect(() => {
    if (!selectedGrinderId) return;
    try {
      localStorage.setItem(GRIND_SIZE_GRINDER_STORAGE_KEY, selectedGrinderId);
    } catch {
      // Best-effort persistence only.
    }
  }, [selectedGrinderId]);

  useEffect(() => {
    try {
      localStorage.setItem(GRIND_SIZE_CONTEXT_STORAGE_KEY, JSON.stringify(context));
    } catch {
      // Best-effort persistence only.
    }
  }, [context]);

  const advice = useMemo(() => {
    if (!catalog || !selectedGrinderId) return null;
    return buildGrindSizeAdvice({
      catalog,
      methodId,
      grinderId: selectedGrinderId,
      roastLevel,
      espressoContext: {
        doseG,
        yieldG,
        shotTimeSec: parsePositive(context.shotTimeSec),
        pressureBar: parsePositive(context.pressureBar),
        beanAgeDays: parsePositive(context.beanAgeDays),
        zeroPointKnown: context.zeroPointKnown,
      },
    });
  }, [catalog, context.beanAgeDays, context.pressureBar, context.shotTimeSec, context.zeroPointKnown, doseG, methodId, roastLevel, selectedGrinderId, yieldG]);

  const filteredGrinders = useMemo(() => {
    const needle = normalizeSearch(query);
    if (!needle) return sortedGrinders;
    return sortedGrinders
      .filter((grinder) => normalizeSearch(`${grinder.name} ${grinder.brand || ''} ${grinder.typeLabel} ${grinder.searchText}`).includes(needle))
      .slice(0, 32);
  }, [query, sortedGrinders]);

  const grinderOptions = useMemo(() => {
    if (!catalog) return [];
    return filteredGrinders.map((grinder) => ({
      grinder,
      compatibility: getGrindSizeCompatibility(catalog, methodId, grinder),
    }));
  }, [catalog, filteredGrinders, methodId]);

  const family = getRatioMethodFamily(methodId);
  const confidenceLabel = advice ? getConfidenceLabel(advice, t) : '';
  const compatibilityLabel = advice ? getCompatibilityLabel(advice, t) : '';
  const capabilityLabel = advice ? getCapabilityLabel(advice, t) : '';
  const sourceLabel = advice ? getSourceLabel(advice, t) : '';
  const warningText = advice ? getWarningText(advice, t) : '';
  const correctionTip = advice ? getCorrectionTip(advice, t) : '';

  return (
    <div className="space-y-4" data-testid="grind-size-panel">
      <div className="panel-soft rounded-2xl border panel-divider-subtle p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">{t.toolsGrindSizeTitle}</p>
            <h2 className="text-xl font-semibold tracking-tight">{getMethodLabel(methodId)} - {getRoastLevelLabel(roastLevel)}</h2>
            <p className="mt-1 text-sm text-secondary">{t.toolsGrindSizeSubtitle}</p>
          </div>
          <span className="rounded-full bg-surface-alpha px-3 py-1.5 text-xs font-semibold text-secondary">
            {formatMethodGrindBand(family, language)}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" aria-label={t.toolsBrewMethodPresets}>
          {BREW_METHOD_PROFILES.map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => onMethodChange(method.id)}
              data-testid={`grind-method-${method.id}`}
              className={`whitespace-nowrap px-3 py-2 rounded-xl text-xs font-medium transition-all ${methodId === method.id
                ? 'bg-blue-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)]'
                : 'bg-surface-alpha text-secondary hover:text-primary'
              }`}
            >
              {getMethodLabel(method.id)}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" aria-label={t.toolsRoastProfile}>
          {ROAST_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onRoastLevelChange(level)}
              data-testid={`grind-roast-${level}`}
              className={`whitespace-nowrap px-3 py-2 rounded-xl text-xs font-medium transition-all ${roastLevel === level
                ? 'bg-slate-900 text-white shadow-[0_4px_14px_rgba(15,23,42,0.24)] dark:bg-white dark:text-black'
                : 'bg-surface-alpha text-secondary hover:text-primary'
              }`}
            >
              {getRoastLevelLabel(level)}
            </button>
          ))}
        </div>

      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="panel-soft rounded-2xl border panel-divider-subtle p-4 space-y-3 min-w-0">
          <label className="text-xs font-semibold uppercase tracking-widest text-secondary" htmlFor="grind-size-search">
            {t.toolsGrindSizeGrinder}
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
            <input
              id="grind-size-search"
              data-testid="grinder-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full glass-input pl-9 pr-3 py-3 text-sm"
              placeholder={t.toolsGrindSizeSearchPlaceholder}
            />
          </div>

          {loadError ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-600">
              {loadError}
            </div>
          ) : (
            <div className="grid gap-2 max-h-72 overflow-y-auto pr-1" data-testid="grinder-options">
              {grinderOptions.map(({ grinder, compatibility }) => (
                <button
                  key={grinder.id}
                  type="button"
                  onClick={() => {
                    if (compatibility.selectable) setSelectedGrinderId(grinder.id);
                  }}
                  disabled={!compatibility.selectable}
                  data-testid={`grinder-option-${grinder.id}`}
                  className={`min-w-0 rounded-xl border px-3 py-2 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${selectedGrinderId === grinder.id
                    ? 'border-blue-500 bg-blue-500/10 text-primary'
                    : compatibility.selectable
                      ? 'border-transparent bg-surface-alpha text-secondary hover:text-primary'
                      : 'border-rose-500/20 bg-rose-500/8 text-tertiary'
                  }`}
                  aria-describedby={!compatibility.selectable ? `grinder-compat-${grinder.id}` : undefined}
                >
                  <span className="flex min-w-0 items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{grinder.name}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${compatibility.state === 'compatible'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : compatibility.state === 'caution'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                    }`}>
                      {compatibility.state === 'compatible'
                        ? t.toolsGrindSizeCompatibilityCompatible
                        : compatibility.state === 'caution'
                          ? t.toolsGrindSizeCompatibilityCaution
                          : t.toolsGrindSizeCompatibilityNotRecommended}
                    </span>
                  </span>
                  <span className="block truncate text-[11px] text-tertiary">{grinder.typeLabel}</span>
                  {!compatibility.selectable && (
                    <span id={`grinder-compat-${grinder.id}`} className="mt-1 block text-[11px] text-rose-600 dark:text-rose-300">
                      {compatibility.reason}
                    </span>
                  )}
                </button>
              ))}
              {catalog && filteredGrinders.length === 0 && (
                <p className="rounded-xl bg-surface-alpha px-3 py-3 text-sm text-secondary">{t.toolsGrindSizeNoGrinder}</p>
              )}
              {!catalog && !loadError && (
                <p className="rounded-xl bg-surface-alpha px-3 py-3 text-sm text-secondary">{t.toolsGrindSizeLoading}</p>
              )}
            </div>
          )}
        </div>

        <div className="panel-soft rounded-2xl border panel-divider-subtle p-4 space-y-4 min-w-0" data-testid="grind-size-recommendation">
          {!advice ? (
            <p className="text-sm text-secondary">{t.toolsGrindSizeLoading}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{t.toolsGrindSizeRecommendation}</p>
                  <p className="mt-1 break-words text-3xl font-bold tracking-tight" data-testid="grind-primary-setting">
                    {compactRangeLabel(advice.primarySetting)}
                  </p>
                  <p className="mt-1 text-sm text-secondary">{advice.grinder?.name || t.toolsGrindSizeGrinder}</p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {confidenceLabel}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl bg-surface-alpha p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-tertiary">{t.toolsGrindSizeRange}</p>
                  <p className="mt-1 text-sm font-semibold">{compactRangeLabel(advice.grindBandLabel)}</p>
                </div>
                <div className="rounded-xl bg-surface-alpha p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-tertiary">{t.toolsGrindSizeCorrectionRange}</p>
                  <p className="mt-1 text-sm font-semibold">{advice.correctionRange || t.toolsGrindSizeOneStep}</p>
                </div>
                <div className="rounded-xl bg-surface-alpha p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-tertiary">{t.toolsGrindSizeCapability}</p>
                  <p className="mt-1 text-sm font-semibold">{capabilityLabel}</p>
                  <p className="mt-1 text-xs text-secondary">{compatibilityLabel}</p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/8 p-3 text-sm">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-300">
                    <SlidersHorizontal size={15} />
                    {t.toolsGrindSizeDialIn}
                  </div>
                  <p className="text-secondary">{correctionTip}</p>
                </div>
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/8 p-3 text-sm">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-300">
                    <Gauge size={15} />
                    {t.toolsRoastProfile}
                  </div>
                  <p className="font-semibold">{getRoastLevelLabel(roastLevel)}</p>
                  <p className="mt-1 text-xs text-secondary">
                    {advice.roastBiasKind === 'finer'
                      ? t.toolsGrindSizeCorrectionFiner
                      : advice.roastBiasKind === 'coarser'
                        ? t.toolsGrindSizeCorrectionCoarser
                        : t.toolsGrindSizeCorrectionNeutral}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-3 text-sm">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 size={15} />
                    {t.toolsGrindSizeSource}
                  </div>
                  <p className="text-secondary">{sourceLabel}</p>
                </div>
              </div>

              {advice.compatibilityState !== 'compatible' && (
                <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${advice.compatibilitySelectable
                  ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  : 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                }`}>
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>{advice.compatibilityReason}</span>
                </div>
              )}

              {warningText && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>{warningText}</span>
                </div>
              )}

              {advice.methodFamily === 'espresso' && advice.espressoInsight && (
                <div className="rounded-2xl border panel-divider-subtle bg-surface-alpha p-3" data-testid="espresso-dial-in-context">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{t.toolsGrindSizeEspressoContext}</p>
                      <p className="mt-1 text-sm text-secondary">{t.toolsGrindSizeEspressoContextHint}</p>
                    </div>
                    <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {t.toolsGrindSizeBrewRatio.replace('{ratio}', advice.espressoInsight.brewRatio ? `1:${advice.espressoInsight.brewRatio}` : '-')}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-4">
                    <div className="rounded-xl bg-background/60 p-2">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-tertiary">{t.toolsDoseLabel}</p>
                      <p className="mt-1 text-sm font-semibold">{Number.isFinite(doseG) ? `${doseG} g` : '-'}</p>
                    </div>
                    <div className="rounded-xl bg-background/60 p-2">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-tertiary">{t.toolsGrindSizeYield}</p>
                      <p className="mt-1 text-sm font-semibold">{Number.isFinite(yieldG) ? `${yieldG} g` : '-'}</p>
                    </div>
                    <label className="rounded-xl bg-background/60 p-2">
                      <span className="block text-[11px] font-semibold uppercase tracking-widest text-tertiary">{t.toolsGrindSizeShotTime}</span>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        inputMode="decimal"
                        value={context.shotTimeSec}
                        onChange={(event) => setContext((current) => ({ ...current, shotTimeSec: event.target.value }))}
                        className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"
                        data-testid="grind-shot-time"
                      />
                    </label>
                    <label className="rounded-xl bg-background/60 p-2">
                      <span className="block text-[11px] font-semibold uppercase tracking-widest text-tertiary">{t.toolsGrindSizeBeanAge}</span>
                      <input
                        type="number"
                        min="1"
                        max="180"
                        inputMode="decimal"
                        value={context.beanAgeDays}
                        onChange={(event) => setContext((current) => ({ ...current, beanAgeDays: event.target.value }))}
                        className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"
                        data-testid="grind-bean-age"
                      />
                    </label>
                    <label className="rounded-xl bg-background/60 p-2">
                      <span className="block text-[11px] font-semibold uppercase tracking-widest text-tertiary">{t.toolsGrindSizePressure}</span>
                      <input
                        type="number"
                        min="1"
                        max="15"
                        inputMode="decimal"
                        value={context.pressureBar}
                        onChange={(event) => setContext((current) => ({ ...current, pressureBar: event.target.value }))}
                        className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"
                        data-testid="grind-pressure"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setContext((current) => ({ ...current, zeroPointKnown: !current.zeroPointKnown }))}
                      className={`rounded-xl p-2 text-left transition-all ${context.zeroPointKnown
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      }`}
                      data-testid="grind-zero-point-toggle"
                      aria-pressed={context.zeroPointKnown}
                    >
                      <span className="block text-[11px] font-semibold uppercase tracking-widest">{t.toolsGrindSizeZeroPoint}</span>
                      <span className="mt-1 block text-sm font-semibold">
                        {context.zeroPointKnown ? t.toolsGrindSizeZeroPointKnown : t.toolsGrindSizeZeroPointUnknown}
                      </span>
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {advice.espressoInsight.actions.map((action) => (
                      <span key={action} className={`rounded-full px-2.5 py-1.5 text-xs font-semibold ${advice.espressoInsight?.severity === 'ok'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      }`}>
                        {getEspressoActionLabel(action, t)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 text-xs text-secondary">
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-alpha px-2.5 py-1.5">
                  <Gauge size={13} />
                  {advice.brewMode === 'iced' ? t.toolsGrindSizeIcedMode : t.toolsGrindSizeHotMode}
                </span>
                <span className="rounded-full bg-surface-alpha px-2.5 py-1.5">{t.toolsGrindSizeHonestBaseline}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
