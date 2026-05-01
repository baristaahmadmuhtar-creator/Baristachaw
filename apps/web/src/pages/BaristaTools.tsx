import { Suspense, lazy, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Calculator,
  CheckSquare,
  Clock3,
  Info,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Thermometer,
  Timer,
  X,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles as AppSparklesIcon } from '../components/icons';
import { BREW_METHOD_MAP, BREW_METHOD_PROFILES } from '../features/barista-tools/brewProfiles';
import {
  buildBrewOutputs,
  buildRoastAdjustedTargets,
  calcDoseFromWaterRatio,
  calcWaterFromDoseRatio,
  mapAgtronToRoastLevel,
  roundTo,
} from '../features/barista-tools/calculations';
import { evaluateConformance, validateBrewInputs } from '../features/barista-tools/standards';
import type {
  BrewCategory,
  BrewCalcMode,
  BrewMethodId,
  RoastLevel,
  ShotPresetId,
} from '../features/barista-tools/types';
import { getMethodEvidenceProfile } from '../features/barista-tools/evidence/pack';
import {
  loadRatioSettingsFromStorage,
  RATIO_STORAGE_KEY,
  type RatioSettingsState,
} from '../features/barista-tools/ratioState';
import { parseTodoItemsFromStorage, type TodoItemState } from '../features/barista-tools/todoState';
import type { BrewPlan } from '../features/ai-brew/types';
import { useGlobalState } from '../context/GlobalState';
import { useNavbar } from '../context/NavbarContext';
import { useIOSKeyboardFix } from '../hooks/useIOSKeyboardFix';
import { useRuntimeDisplayMode } from '../hooks/useRuntimeDisplayMode';

type ToolsTab = 'ai_brew' | 'timer' | 'ratio' | 'todo';
type LastEditedField = 'dose' | 'water' | 'ratio';

type TodoItem = TodoItemState;
type ImportedAiBrewIcedSplit = {
  methodId: BrewMethodId;
  doseG: number;
  totalWaterMl: number;
  hotWaterMl: number;
  iceMl: number;
  finalBeverageRatio: number;
  hotExtractionRatio: number;
  hotWaterSharePercent: number;
  iceSharePercent: number;
};

const TODO_STORAGE_KEY = 'BARISTA_TOOLS_TODO_V1';
const LEGACY_RATIO_STORAGE_KEY_V4 = 'BARISTA_TOOLS_RATIO_V4';
const TIMER_PRESETS = [120, 150, 180, 240];
const TAB_QUERY_KEY = 'tab';
const TOOLS_TAB_ORDER: ToolsTab[] = ['ai_brew', 'timer', 'ratio', 'todo'];
const ROAST_LEVEL_OPTIONS: RoastLevel[] = ['light', 'medium_light', 'medium', 'medium_dark', 'dark'];

const DEFAULT_ESPRESSO_SHOT_PRESET: ShotPresetId = 'espresso';
const AiBrewPanel = lazy(() =>
  import('../features/ai-brew/AiBrewPanel').then((module) => ({ default: module.AiBrewPanel }))
);

function parseToolsTab(value: string | null): ToolsTab {
  if (value === 'timer' || value === 'ratio' || value === 'todo') return value;
  if (value === 'ai-brew' || value === 'ai_brew') return 'ai_brew';
  return 'ai_brew';
}

function serializeToolsTab(value: ToolsTab): string {
  return value === 'ai_brew' ? 'ai-brew' : value;
}

const formatClock = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

function roundAiBrewRatioForTools(value: number) {
  if (!Number.isFinite(value)) return value;
  return Math.round(value * 10) / 10;
}

export function BaristaTools() {
  const { t } = useGlobalState();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ToolsTab>(() => parseToolsTab(searchParams.get(TAB_QUERY_KEY)));
  const tabRefs = useRef<Record<ToolsTab, HTMLButtonElement | null>>({
    ai_brew: null,
    timer: null,
    ratio: null,
    todo: null,
  });
  const { hideNav, showNav } = useNavbar();
  const { isIosStandalone } = useRuntimeDisplayMode();
  const disableEntranceMotion = isIosStandalone || (typeof navigator !== 'undefined' && navigator.webdriver);
  const pageRef = useRef<HTMLDivElement | null>(null);
  useIOSKeyboardFix({
    focusScopeRef: pageRef,
    hideNav,
    showNav,
    navHideWhenKeyboard: true,
    navHideWhenFocusWithin: false,
    enableScrollIntoViewOnFocus: false,
  });

  // Timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerDuration, setTimerDuration] = useState(180);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ratio calculator
  const [ratioState, setRatioState] = useState<RatioSettingsState>(loadRatioSettingsFromStorage);
  const [lastEditedField, setLastEditedField] = useState<LastEditedField>('dose');
  const [importedAiBrewIcedSplit, setImportedAiBrewIcedSplit] = useState<ImportedAiBrewIcedSplit | null>(null);

  // Todo
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    return parseTodoItemsFromStorage(localStorage.getItem(TODO_STORAGE_KEY));
  });
  const [newTodo, setNewTodo] = useState('');

  const getRoastLevelLabel = (level: RoastLevel): string => {
    if (level === 'light') return t.toolsRoastLight;
    if (level === 'medium_light') return t.toolsRoastMediumLight;
    if (level === 'medium') return t.toolsRoastMedium;
    if (level === 'medium_dark') return t.toolsRoastMediumDark;
    return t.toolsRoastDark;
  };

  const getMethodLabel = (methodId: BrewMethodId): string => {
    const labelMap: Record<BrewMethodId, string> = {
      espresso: t.toolsMethodEspresso,
      v60: t.toolsMethodV60,
      v60_japanese_iced: t.toolsMethodV60JapaneseIced,
      chemex: t.toolsMethodChemex,
      chemex_iced: t.toolsMethodChemexIced,
      kalita_wave: t.toolsMethodKalitaWave,
      kalita_wave_iced: t.toolsMethodKalitaWaveIced,
      melitta: t.toolsMethodMelitta,
      melitta_iced: t.toolsMethodMelittaIced,
      french_press: t.toolsMethodFrenchPress,
      aeropress: t.toolsMethodAeropress,
      clever_dripper: t.toolsMethodCleverDripper,
      clever_dripper_iced: t.toolsMethodCleverDripperIced,
      origami: t.toolsMethodOrigami,
      origami_iced: t.toolsMethodOrigamiIced,
      april: t.toolsMethodApril,
      april_iced: t.toolsMethodAprilIced,
      kono: t.toolsMethodKono,
      kono_iced: t.toolsMethodKonoIced,
      siphon: t.toolsMethodSiphon,
      moka_pot: t.toolsMethodMokaPot,
      cold_brew: t.toolsMethodColdBrew,
      batch_brew: t.toolsMethodBatchBrew,
    };
    return labelMap[methodId];
  };

  const getShotLabel = (shotId: ShotPresetId): string => {
    const labelMap: Record<ShotPresetId, string> = {
      ristretto: t.toolsShotRistretto,
      espresso: t.toolsShotEspresso,
      lungo: t.toolsShotLungo,
      doppio: t.toolsShotDoppio,
    };
    return labelMap[shotId];
  };

  const getPolicyLabel = (category: BrewCategory): string => {
    if (category === 'espresso') return t.toolsPolicyEspressoBaseline;
    if (category === 'batch') return t.toolsPolicyBatchBaseline;
    return t.toolsPolicyFilterBaseline;
  };

  const getGrindGuidanceLabel = (category: BrewCategory): string => {
    if (category === 'espresso') return t.toolsGrindGuidanceEspresso;
    if (category === 'batch') return t.toolsGrindGuidanceBatch;
    return t.toolsGrindGuidanceFilter;
  };

  const getGrindDirectionLabel = (value: string): string => {
    if (value === 'finer') return t.toolsDirectionFiner;
    if (value === 'coarser') return t.toolsDirectionCoarser;
    return value;
  };

  const formatStandardsMessage = (key: string, params: Record<string, string | undefined>): string => {
    if (key === 'invalidNumericInput') {
      return t.toolsStdInvalidNumericInput.replace('{fields}', params.fields || '');
    }
    if (key === 'ratioOutsideBaseline') {
      return t.toolsStdRatioOutsideBaseline
        .replace('{ratio}', params.ratio || '')
        .replace('{policy}', params.policyLabel || '')
        .replace('{min}', params.min || '')
        .replace('{max}', params.max || '');
    }
    if (key === 'ratioInsideBaseline') {
      return t.toolsStdRatioInsideBaseline.replace('{policy}', params.policyLabel || '');
    }
    if (key === 'ratioOutsideTarget') {
      return t.toolsStdRatioOutsideTarget
        .replace('{roastLevel}', params.roastLevel || '')
        .replace('{min}', params.min || '')
        .replace('{max}', params.max || '');
    }
    if (key === 'ratioInsideTarget') {
      return t.toolsStdRatioInsideTarget.replace('{roastLevel}', params.roastLevel || '');
    }
    if (key === 'tdsOutsideTypicalFilter') {
      return t.toolsStdTdsOutsideTypical
        .replace('{tds}', params.tds || '')
        .replace('{min}', params.min || '')
        .replace('{max}', params.max || '');
    }
    if (key === 'tdsInsideTypicalFilter') return t.toolsStdTdsInsideTypical;
    if (key === 'tempTooHighRoast') return t.toolsStdTempTooHigh.replace('{roastLevel}', params.roastLevel || '');
    if (key === 'tempTooLowRoast') return t.toolsStdTempTooLow.replace('{roastLevel}', params.roastLevel || '');
    if (key === 'tempGuidanceAlignsRoast') return t.toolsStdTempAligns.replace('{roastLevel}', params.roastLevel || '');
    if (key === 'doseMustBePositive') return t.toolsStdDosePositive;
    if (key === 'waterMustBePositive') return t.toolsStdWaterPositive;
    if (key === 'ratioMustBePositive') return t.toolsStdRatioPositive;
    if (key === 'doseUnusuallyHigh') return t.toolsStdDoseHigh;
    if (key === 'waterUnusuallyHigh') return t.toolsStdWaterHigh;
    if (key === 'tdsMustBeFinite') return t.toolsStdTdsFinite;
    if (key === 'tdsMustBePositive') return t.toolsStdTdsPositive;
    return '';
  };


  const selectedMethod = BREW_METHOD_MAP[ratioState.methodId];
  const methodEvidence = getMethodEvidenceProfile(selectedMethod.id);
  const effectiveAgtronRange = methodEvidence?.roastSupport.agtronRange ?? selectedMethod.roastSupport?.agtronRange;
  const agtronNumber = Number.parseFloat(ratioState.agtronValue);
  const agtronMappedRoastLevel = Number.isFinite(agtronNumber)
    ? mapAgtronToRoastLevel(agtronNumber, effectiveAgtronRange)
    : undefined;
  const effectiveRoastLevel = ratioState.mode === 'basic'
    ? 'medium'
    : ratioState.roastInputMode === 'agtron'
    ? (agtronMappedRoastLevel ?? ratioState.roastLevel)
    : ratioState.roastLevel;
  const roastAdjustedTargets = buildRoastAdjustedTargets(selectedMethod, effectiveRoastLevel);
  const selectedEspressoShotPreset = selectedMethod.id === 'espresso'
    ? selectedMethod.shotPresets?.find((preset) => preset.id === ratioState.espressoShotPresetId)
    : undefined;
  const quickRatioPresets = selectedMethod.recommendedRatios?.length
    ? selectedMethod.recommendedRatios.map((ratio) =>
      ratioState.applyRoastAdaptiveDefaults ? roundTo(Math.max(0.5, ratio + roastAdjustedTargets.adjustment.ratioDelta), 2) : ratio
    )
    : [14, 15, 16, 16.67, 17, 18];
  const brewTimeRangeForDisplay = selectedEspressoShotPreset
    ? [
      Math.max(15, Math.round(selectedEspressoShotPreset.timeSeconds.min + roastAdjustedTargets.adjustment.brewTimeDeltaSec)),
      Math.max(20, Math.round(selectedEspressoShotPreset.timeSeconds.max + roastAdjustedTargets.adjustment.brewTimeDeltaSec)),
    ] as [number, number]
    : roastAdjustedTargets.adjustedBrewTimeRangeSec;
  const tempGuidanceRange = roastAdjustedTargets.adjustedTempRangeC;
  const roastRatioRange = roastAdjustedTargets.adjustedRatioRange;
  const brewTimeGuidanceLabel = brewTimeRangeForDisplay[1] < 120
    ? t.toolsSecondsRange.replace('{min}', String(brewTimeRangeForDisplay[0])).replace('{max}', String(brewTimeRangeForDisplay[1]))
    : t.toolsMinutesRange.replace('{min}', String(Math.round(brewTimeRangeForDisplay[0] / 60))).replace('{max}', String(Math.round(brewTimeRangeForDisplay[1] / 60)));

  const parsedDoseRaw = Number.parseFloat(ratioState.dose);
  const parsedDose = Number.isFinite(parsedDoseRaw) ? parsedDoseRaw : 0;
  const parsedWaterRaw = Number.parseFloat(ratioState.water);
  const parsedWater = Number.isFinite(parsedWaterRaw) ? parsedWaterRaw : 0;
  const parsedRatioRaw = Number.parseFloat(ratioState.ratio);
  const parsedRatio = Number.isFinite(parsedRatioRaw) ? parsedRatioRaw : 0;
  const parsedTds = Number.parseFloat(ratioState.tdsPercent);
  const parsedMeasuredOutput = Number.parseFloat(ratioState.measuredOutput);
  const tdsValue = Number.isFinite(parsedTds) ? parsedTds : undefined;
  const measuredOutputValue = Number.isFinite(parsedMeasuredOutput) ? parsedMeasuredOutput : undefined;
  const activeImportedAiBrewIcedSplit = importedAiBrewIcedSplit
    && ratioState.methodId === importedAiBrewIcedSplit.methodId
    && Math.abs(parsedDose - importedAiBrewIcedSplit.doseG) <= 0.05
    && Math.abs(parsedWater - importedAiBrewIcedSplit.totalWaterMl) <= 0.75
    && Math.abs(parsedRatio - importedAiBrewIcedSplit.finalBeverageRatio) <= 0.05
      ? importedAiBrewIcedSplit
      : null;
  const outputRenderKey = `${ratioState.methodId}-${ratioState.mode}-${ratioState.unitMode}-${ratioState.dose}-${ratioState.water}-${ratioState.ratio}-${ratioState.measuredOutput}`;

  // Timer logic
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev >= timerDuration) {
            setTimerRunning(false);
            return timerDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timerDuration]);

  // Persist todo
  useEffect(() => {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  // Persist ratio tool state
  useEffect(() => {
    localStorage.setItem(RATIO_STORAGE_KEY, JSON.stringify(ratioState));
    localStorage.removeItem(LEGACY_RATIO_STORAGE_KEY_V4);
  }, [ratioState]);

  useEffect(() => {
    const requestedTab = parseToolsTab(searchParams.get(TAB_QUERY_KEY));
    setActiveTab((prev) => (prev === requestedTab ? prev : requestedTab));
  }, [searchParams]);

  const selectTab = (nextTab: ToolsTab) => {
    setActiveTab(nextTab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set(TAB_QUERY_KEY, serializeToolsTab(nextTab));
    setSearchParams(nextParams, { replace: true });
  };

  const focusTab = (nextTab: ToolsTab) => {
    window.requestAnimationFrame(() => tabRefs.current[nextTab]?.focus());
  };

  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, currentTab: ToolsTab) => {
    const currentIndex = TOOLS_TAB_ORDER.indexOf(currentTab);
    if (currentIndex < 0) return;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const nextTab = TOOLS_TAB_ORDER[(currentIndex + 1) % TOOLS_TAB_ORDER.length];
      selectTab(nextTab);
      focusTab(nextTab);
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const nextTab = TOOLS_TAB_ORDER[(currentIndex - 1 + TOOLS_TAB_ORDER.length) % TOOLS_TAB_ORDER.length];
      selectTab(nextTab);
      focusTab(nextTab);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      selectTab(TOOLS_TAB_ORDER[0]);
      focusTab(TOOLS_TAB_ORDER[0]);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      const nextTab = TOOLS_TAB_ORDER[TOOLS_TAB_ORDER.length - 1];
      selectTab(nextTab);
      focusTab(nextTab);
    }
  };

  const brewOutputs = useMemo(() => {
    if (parsedDose <= 0 || parsedWater <= 0 || parsedRatio <= 0) return null;
    return buildBrewOutputs({
      method: selectedMethod,
      doseG: parsedDose,
      waterMl: parsedWater,
      ratio: parsedRatio,
      tdsPercent: ratioState.mode === 'advanced' ? tdsValue : undefined,
      measuredOutputMl: ratioState.mode === 'advanced' ? measuredOutputValue : undefined,
    });
  }, [parsedDose, parsedWater, parsedRatio, selectedMethod, ratioState.mode, tdsValue, measuredOutputValue]);

  const guardrails = useMemo(() => {
    if (parsedDose <= 0 || parsedWater <= 0 || parsedRatio <= 0) {
      return { errors: [t.toolsYieldEnterValid], warnings: [] as string[] };
    }
    return validateBrewInputs({
      method: selectedMethod,
      doseG: parsedDose,
      waterMl: parsedWater,
      ratio: parsedRatio,
      tdsPercent: ratioState.mode === 'advanced' ? tdsValue : undefined,
      measuredOutputMl: ratioState.mode === 'advanced' ? measuredOutputValue : undefined,
    }, {
      roastLevel: effectiveRoastLevel,
      agtronValue: ratioState.roastInputMode === 'agtron' && Number.isFinite(agtronNumber) ? agtronNumber : undefined,
      formatMessage: formatStandardsMessage,
      resolvePolicyLabel: (_policy, method) => getPolicyLabel(method.category),
      resolveRoastLevelLabel: getRoastLevelLabel,
    });
  }, [
    parsedDose,
    parsedWater,
    parsedRatio,
    selectedMethod,
    ratioState.mode,
    ratioState.roastInputMode,
    effectiveRoastLevel,
    agtronNumber,
    tdsValue,
    measuredOutputValue,
    t,
  ]);
  const compactWarnings = ratioState.mode === 'advanced' ? guardrails.warnings : guardrails.warnings.slice(0, 2);
  const conformance = useMemo(() => {
    if (parsedDose <= 0 || parsedWater <= 0 || parsedRatio <= 0) {
      return { warnings: [] as string[], standardsHits: [] as string[], standardsMisses: [] as string[] };
    }
    return evaluateConformance({
      method: selectedMethod,
      doseG: parsedDose,
      waterMl: parsedWater,
      ratio: parsedRatio,
      tdsPercent: ratioState.mode === 'advanced' ? tdsValue : undefined,
      measuredOutputMl: ratioState.mode === 'advanced' ? measuredOutputValue : undefined,
    }, {
      roastLevel: effectiveRoastLevel,
      agtronValue: ratioState.roastInputMode === 'agtron' && Number.isFinite(agtronNumber) ? agtronNumber : undefined,
      formatMessage: formatStandardsMessage,
      resolvePolicyLabel: (_policy, method) => getPolicyLabel(method.category),
      resolveRoastLevelLabel: getRoastLevelLabel,
    });
  }, [parsedDose, parsedWater, parsedRatio, selectedMethod, ratioState.mode, ratioState.roastInputMode, effectiveRoastLevel, agtronNumber, tdsValue, measuredOutputValue, t]);

  const updateRatioState = (patch: Partial<RatioSettingsState>) => {
    if ('methodId' in patch || 'dose' in patch || 'water' in patch || 'ratio' in patch) {
      setImportedAiBrewIcedSplit(null);
    }
    setRatioState((prev) => ({ ...prev, ...patch }));
  };

  const handleDoseChange = (value: string) => {
    setLastEditedField('dose');
    const d = Number.parseFloat(value);
    if (Number.isFinite(d) && d > 0 && parsedRatio > 0) {
      const waterMl = calcWaterFromDoseRatio(d, parsedRatio);
      updateRatioState({ dose: value, water: String(waterMl) });
      return;
    }
    updateRatioState({ dose: value });
  };

  const handleWaterChange = (value: string) => {
    setLastEditedField('water');
    const w = Number.parseFloat(value);
    if (Number.isFinite(w) && w > 0 && parsedRatio > 0) {
      const doseG = calcDoseFromWaterRatio(w, parsedRatio);
      updateRatioState({ water: value, dose: String(doseG) });
      return;
    }
    updateRatioState({ water: value });
  };

  const handleRatioChange = (value: string) => {
    setLastEditedField('ratio');
    const r = Number.parseFloat(value);
    if (!Number.isFinite(r) || r <= 0) {
      updateRatioState({ ratio: value });
      return;
    }
    if (lastEditedField === 'water' && parsedWater > 0) {
      const doseG = calcDoseFromWaterRatio(parsedWater, r);
      updateRatioState({ ratio: value, dose: String(doseG) });
    } else {
      const waterMl = calcWaterFromDoseRatio(parsedDose > 0 ? parsedDose : 18, r);
      updateRatioState({ ratio: value, water: String(waterMl) });
    }
  };

  const applyMethodPreset = (methodId: BrewMethodId) => {
    const method = BREW_METHOD_MAP[methodId];
    const methodRoastLevel = ratioState.mode === 'basic'
      ? 'medium'
      : ratioState.roastInputMode === 'agtron' && Number.isFinite(agtronNumber)
      ? mapAgtronToRoastLevel(agtronNumber, getMethodEvidenceProfile(method.id)?.roastSupport.agtronRange ?? method.roastSupport?.agtronRange)
      : ratioState.roastLevel;
    const methodTargets = buildRoastAdjustedTargets(method, methodRoastLevel);
    const defaultShotPreset = method.id === 'espresso'
      ? (method.shotPresets?.find((preset) => preset.id === DEFAULT_ESPRESSO_SHOT_PRESET) ?? method.shotPresets?.[0])
      : undefined;
    const defaultRatio = defaultShotPreset?.ratio ?? method.ratioDefault;
    const nextRatio = ratioState.applyRoastAdaptiveDefaults
      ? roundTo(Math.max(0.5, defaultRatio + methodTargets.adjustment.ratioDelta), 2)
      : defaultRatio;
    const anchorDose = parsedDose > 0 ? parsedDose : 18;
    const waterMl = calcWaterFromDoseRatio(anchorDose, nextRatio);
    updateRatioState({
      methodId,
      espressoShotPresetId: defaultShotPreset?.id ?? ratioState.espressoShotPresetId,
      ratio: String(roundTo(nextRatio, 2)),
      dose: String(anchorDose),
      water: String(waterMl),
    });
  };

  const applyRatioPreset = (nextRatio: number) => {
    const anchorDose = parsedDose > 0 ? parsedDose : 18;
    const waterMl = calcWaterFromDoseRatio(anchorDose, nextRatio);
    updateRatioState({ ratio: String(nextRatio), water: String(waterMl) });
  };

  const applyEspressoShotPreset = (shotPresetId: ShotPresetId) => {
    if (selectedMethod.id !== 'espresso') return;
    const shotPreset = selectedMethod.shotPresets?.find((preset) => preset.id === shotPresetId);
    if (!shotPreset) return;
    const anchorDose = parsedDose > 0 ? parsedDose : 18;
    const nextRatio = ratioState.applyRoastAdaptiveDefaults
      ? roundTo(Math.max(0.5, shotPreset.ratio + roastAdjustedTargets.adjustment.ratioDelta), 2)
      : shotPreset.ratio;
    const waterMl = calcWaterFromDoseRatio(anchorDose, nextRatio);
    updateRatioState({
      espressoShotPresetId: shotPreset.id,
      ratio: String(nextRatio),
      water: String(waterMl),
    });
  };

  const handleRoastLevelChange = (nextRoastLevel: RoastLevel) => {
    const patch: Partial<RatioSettingsState> = {
      roastLevel: nextRoastLevel,
      roastInputMode: 'level',
    };
    if (ratioState.applyRoastAdaptiveDefaults) {
      const nextTargets = buildRoastAdjustedTargets(selectedMethod, nextRoastLevel);
      const baseRatio = selectedEspressoShotPreset?.ratio ?? selectedMethod.ratioDefault;
      const nextRatio = roundTo(Math.max(0.5, baseRatio + nextTargets.adjustment.ratioDelta), 2);
      const anchorDose = parsedDose > 0 ? parsedDose : 18;
      patch.ratio = String(nextRatio);
      patch.water = String(calcWaterFromDoseRatio(anchorDose, nextRatio));
    }
    updateRatioState(patch);
  };

  const handleAgtronChange = (value: string) => {
    const patch: Partial<RatioSettingsState> = { agtronValue: value, roastInputMode: 'agtron' };
    const parsed = Number.parseFloat(value);
    if (ratioState.applyRoastAdaptiveDefaults && Number.isFinite(parsed)) {
      const mappedLevel = mapAgtronToRoastLevel(parsed, effectiveAgtronRange);
      const nextTargets = buildRoastAdjustedTargets(selectedMethod, mappedLevel);
      const baseRatio = selectedEspressoShotPreset?.ratio ?? selectedMethod.ratioDefault;
      const nextRatio = roundTo(Math.max(0.5, baseRatio + nextTargets.adjustment.ratioDelta), 2);
      const anchorDose = parsedDose > 0 ? parsedDose : 18;
      patch.ratio = String(nextRatio);
      patch.water = String(calcWaterFromDoseRatio(anchorDose, nextRatio));
    }
    updateRatioState(patch);
  };

  const modePillClass = (mode: BrewCalcMode) =>
    `px-3 py-2 rounded-xl text-sm font-medium transition-all ${ratioState.mode === mode
      ? 'bg-blue-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.32)]'
      : 'bg-surface-alpha text-secondary hover:text-primary'
    }`;

  // Todo helpers
  const addTodo = () => {
    if (!newTodo.trim()) return;
    setTodos([...todos, { id: Date.now().toString(), text: newTodo.trim(), done: false }]);
    setNewTodo('');
  };
  const toggleTodo = (id: string) => setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const removeTodo = (id: string) => setTodos(todos.filter((t) => t.id !== id));
  const clearCompleted = () => setTodos(todos.filter((t) => !t.done));

  const tabClass = (tab: ToolsTab) =>
    `min-w-0 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-xl transition-all duration-300 ease-out ${activeTab === tab
      ? 'bg-white shadow-md text-black scale-[1.02] dark:bg-white/20 dark:text-white'
      : 'text-secondary hover:text-primary'
    }`;

  const timerProgress = timerDuration > 0 ? (timerSeconds / timerDuration) * 100 : 0;

  const handleUsePlanInTimer = (durationSeconds: number) => {
    setTimerDuration(Math.max(1, Math.round(durationSeconds)));
    setTimerSeconds(0);
    setTimerRunning(false);
    selectTab('timer');
  };

  const handleUsePlanInRatio = (plan: BrewPlan) => {
    const finalBeverageRatio = roundAiBrewRatioForTools(
      Number.isFinite(plan.finalBeverageRatio) ? plan.finalBeverageRatio : plan.recommendedRatio,
    );
    setLastEditedField('ratio');
    setRatioState((prev) => ({
      ...prev,
      methodId: plan.ratioToolMethodId,
      mode: 'advanced',
      roastInputMode: 'level',
      roastLevel: plan.roastLevel,
      agtronValue: '',
      applyRoastAdaptiveDefaults: false,
      dose: String(plan.doseG),
      water: String(plan.totalWaterMl),
      ratio: String(finalBeverageRatio),
      tdsPercent: '',
      measuredOutput: '',
    }));
    setImportedAiBrewIcedSplit(plan.iceMl > 0 ? {
      methodId: plan.ratioToolMethodId,
      doseG: plan.doseG,
      totalWaterMl: plan.totalWaterMl,
      hotWaterMl: plan.hotWaterMl,
      iceMl: plan.iceMl,
      finalBeverageRatio,
      hotExtractionRatio: roundAiBrewRatioForTools(plan.hotExtractionRatio),
      hotWaterSharePercent: plan.hotWaterSharePercent,
      iceSharePercent: plan.iceSharePercent,
    } : null);
    selectTab('ratio');
  };

  return (
    <motion.div
      ref={pageRef}
      initial={disableEntranceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={disableEntranceMotion ? { duration: 0 } : { duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="page-container desktop-noise-bg w-full"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-1 flex-col">
      <header className="mb-4 text-center shrink-0 panel-soft rounded-3xl px-4 py-5">
        <AppSparklesIcon size={56} variant="tile" tone="blue" className="mx-auto mb-3" />
        <h1 className="text-3xl font-semibold tracking-tight mb-1">{t.toolsTitle}</h1>
        <p className="text-secondary text-base">{t.toolsSubtitle}</p>
      </header>

      <div
        className="grid grid-cols-2 gap-2 mb-4 p-1.5 panel-soft rounded-[1.25rem] max-w-md lg:max-w-3xl mx-auto shrink-0 w-full sm:grid-cols-4"
        role="tablist"
        aria-label={t.toolsSectionsAria}
      >
        <button
          ref={(node) => { tabRefs.current.ai_brew = node; }}
          id="tools-tab-ai_brew"
          type="button"
          role="tab"
          aria-selected={activeTab === 'ai_brew'}
          aria-controls="tools-panel-ai_brew"
          tabIndex={activeTab === 'ai_brew' ? 0 : -1}
          onClick={() => selectTab('ai_brew')}
          onKeyDown={(event) => handleTabKeyDown(event, 'ai_brew')}
          className={tabClass('ai_brew')}
        >
          <Sparkles size={16} className="shrink-0" />
          <span className="truncate">{t.toolsTabAiBrew}</span>
        </button>
        <button
          ref={(node) => { tabRefs.current.timer = node; }}
          id="tools-tab-timer"
          type="button"
          role="tab"
          aria-selected={activeTab === 'timer'}
          aria-controls="tools-panel-timer"
          tabIndex={activeTab === 'timer' ? 0 : -1}
          onClick={() => selectTab('timer')}
          onKeyDown={(event) => handleTabKeyDown(event, 'timer')}
          className={tabClass('timer')}
        >
          <Timer size={16} className="shrink-0" />
          <span className="truncate">{t.toolsTabTimer}</span>
        </button>
        <button
          ref={(node) => { tabRefs.current.ratio = node; }}
          id="tools-tab-ratio"
          type="button"
          role="tab"
          aria-selected={activeTab === 'ratio'}
          aria-controls="tools-panel-ratio"
          tabIndex={activeTab === 'ratio' ? 0 : -1}
          onClick={() => selectTab('ratio')}
          onKeyDown={(event) => handleTabKeyDown(event, 'ratio')}
          className={tabClass('ratio')}
        >
          <Calculator size={16} className="shrink-0" />
          <span className="truncate">{t.toolsTabRatio}</span>
        </button>
        <button
          ref={(node) => { tabRefs.current.todo = node; }}
          id="tools-tab-todo"
          type="button"
          role="tab"
          aria-selected={activeTab === 'todo'}
          aria-controls="tools-panel-todo"
          tabIndex={activeTab === 'todo' ? 0 : -1}
          onClick={() => selectTab('todo')}
          onKeyDown={(event) => handleTabKeyDown(event, 'todo')}
          className={tabClass('todo')}
        >
          <CheckSquare size={16} className="shrink-0" />
          <span className="truncate">{t.toolsTabTodo}</span>
        </button>
      </div>

      {activeTab === 'ai_brew' && (
        <motion.section
          initial={disableEntranceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          id="tools-panel-ai_brew"
          role="tabpanel"
          aria-labelledby="tools-tab-ai_brew"
          tabIndex={0}
          className="flex-1"
        >
          <Suspense fallback={
            <div className="glass-card p-6 text-sm text-secondary" role="status" aria-live="polite">
              {t.toolsLoadingAiBrew}
            </div>
          }>
            <AiBrewPanel onUseInTimer={handleUsePlanInTimer} onUseInRatio={handleUsePlanInRatio} />
          </Suspense>
        </motion.section>
      )}

      {activeTab === 'timer' && (
        <motion.section
          initial={disableEntranceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          id="tools-panel-timer"
          role="tabpanel"
          aria-labelledby="tools-tab-timer"
          tabIndex={0}
          className="glass-card p-6 text-center flex-1 flex flex-col justify-center"
        >
          <div className="relative w-44 h-44 mx-auto mb-6">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--surface-alpha)" strokeWidth="4" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={timerRunning ? '#007AFF' : 'var(--surface-alpha-hover)'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - timerProgress / 100)}`}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold tracking-tight tabular-nums">{formatClock(timerSeconds)}</span>
              <span className="text-sm text-secondary mt-1">{formatClock(timerDuration)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {TIMER_PRESETS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setTimerDuration(s);
                  setTimerSeconds(0);
                  setTimerRunning(false);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${timerDuration === s
                  ? 'bg-blue-700 text-white shadow-[0_4px_16px_rgba(0,82,204,0.25)]'
                  : 'bg-surface-alpha text-secondary hover:text-primary'
                  }`}
              >
                {formatClock(s)}
              </button>
            ))}
          </div>

          <div className="flex gap-4 justify-center pb-4">
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-[0_4px_16px_rgba(0,122,255,0.3)] hover:scale-110 active:scale-95 transition-transform"
              aria-label={timerRunning ? t.pause : t.start}
            >
              {timerRunning ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </button>
            <button
              onClick={() => {
                setTimerSeconds(0);
                setTimerRunning(false);
              }}
              className="w-16 h-16 rounded-full glass-button flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
              aria-label={t.toolsResetTimerAria}
            >
              <RotateCcw size={24} />
            </button>
          </div>
        </motion.section>
      )}

      {activeTab === 'ratio' && (
        <motion.section
          initial={disableEntranceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          id="tools-panel-ratio"
          role="tabpanel"
          aria-labelledby="tools-tab-ratio"
          tabIndex={0}
          className="glass-card p-6 space-y-5 flex-1"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{t.toolsBrewMethodPresets}</p>
              <button
                type="button"
                onClick={() => updateRatioState({ unitMode: ratioState.unitMode === 'metric' ? 'imperial' : 'metric' })}
                className="px-2.5 py-1.5 rounded-lg bg-surface-alpha text-xs text-secondary hover:text-primary"
                title={t.toolsToggleUnit}
              >
                {ratioState.unitMode === 'metric' ? 'ml' : 'oz'}
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" data-testid="brew-method-chips">
              {BREW_METHOD_PROFILES.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => applyMethodPreset(method.id)}
                  data-testid={`brew-method-${method.id}`}
                  className={`whitespace-nowrap px-3 py-2 rounded-xl text-xs font-medium transition-all ${ratioState.methodId === method.id
                    ? 'bg-blue-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)]'
                    : 'bg-surface-alpha text-secondary hover:text-primary'
                    }`}
                >
                  {getMethodLabel(method.id)}
                </button>
              ))}
            </div>
          </div>

          {selectedMethod.id === 'espresso' && selectedMethod.shotPresets && selectedMethod.shotPresets.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{t.toolsEspressoShotStyle}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="espresso-shot-presets">
                {selectedMethod.shotPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyEspressoShotPreset(preset.id)}
                    data-testid={`espresso-shot-${preset.id}`}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${ratioState.espressoShotPresetId === preset.id
                      ? 'bg-blue-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)]'
                      : 'bg-surface-alpha text-secondary hover:text-primary'
                      }`}
                  >
                    {getShotLabel(preset.id)}
                  </button>
                ))}
              </div>
              {selectedEspressoShotPreset && (
                <p className="text-xs text-secondary">
                  {t.toolsEspressoShotSummary
                    .replace('{label}', getShotLabel(selectedEspressoShotPreset.id))
                    .replace('{ratioMin}', String(selectedEspressoShotPreset.ratioRange.min))
                    .replace('{ratioMax}', String(selectedEspressoShotPreset.ratioRange.max))
                    .replace('{timeMin}', String(selectedEspressoShotPreset.timeSeconds.min))
                    .replace('{timeMax}', String(selectedEspressoShotPreset.timeSeconds.max))}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 w-full">
            <button type="button" onClick={() => updateRatioState({ mode: 'basic' })} className={modePillClass('basic')}>
              {t.toolsModeBasic}
            </button>
            <button type="button" onClick={() => updateRatioState({ mode: 'advanced' })} className={modePillClass('advanced')}>
              {t.toolsModeAdvanced}
            </button>
          </div>

          {ratioState.mode === 'advanced' && (
            <div className="space-y-3 panel-soft rounded-2xl p-3 border panel-divider-subtle">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{t.toolsRoastProfile}</p>
                <label className="inline-flex items-center gap-2 text-xs text-secondary">
                  <input
                    type="checkbox"
                    checked={ratioState.applyRoastAdaptiveDefaults}
                    onChange={(e) => updateRatioState({ applyRoastAdaptiveDefaults: e.target.checked })}
                  />
                  {t.toolsAdaptiveDefaults}
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {ROAST_LEVEL_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleRoastLevelChange(opt)}
                    data-testid={`roast-level-${opt}`}
                    className={`px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${effectiveRoastLevel === opt
                      ? 'bg-blue-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)]'
                      : 'bg-surface-alpha text-secondary hover:text-primary'
                      }`}
                  >
                    {getRoastLevelLabel(opt)}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => updateRatioState({ roastInputMode: ratioState.roastInputMode === 'agtron' ? 'level' : 'agtron' })}
                  data-testid="agtron-toggle"
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-surface-alpha text-secondary"
                >
                  {ratioState.roastInputMode === 'agtron' ? t.toolsAdvancedAgtronOn : t.toolsAdvancedAgtronOff}
                </button>
                {ratioState.roastInputMode === 'agtron' && (
                  <input
                    type="number"
                    inputMode="decimal"
                    value={ratioState.agtronValue}
                    onChange={(e) => handleAgtronChange(e.target.value)}
                    className="w-28 glass-input h-9 px-3 text-sm text-center"
                    placeholder={t.toolsAgtronPlaceholder}
                    data-testid="agtron-input"
                  />
                )}
              </div>
              <p className="text-[11px] text-secondary">
                {t.toolsRoastAdjustmentNote}
                {ratioState.roastInputMode === 'agtron' && agtronMappedRoastLevel && (
                  <> {t.toolsAgtronMapsToPrefix} <span className="font-semibold">{getRoastLevelLabel(agtronMappedRoastLevel)}</span>.</>
                )}
              </p>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <label className="text-sm font-semibold text-secondary uppercase tracking-widest mb-2 block">{t.toolsDoseLabel}</label>
              <input
                type="number"
                inputMode="decimal"
                value={ratioState.dose}
                onChange={(e) => handleDoseChange(e.target.value)}
                className="w-full glass-input px-4 py-3 text-xl font-semibold text-center"
                min="0"
                step="0.1"
                data-testid="dose-input"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-secondary uppercase tracking-widest mb-2 block">{t.toolsWaterLabel}</label>
              <input
                type="number"
                inputMode="decimal"
                value={ratioState.water}
                onChange={(e) => handleWaterChange(e.target.value)}
                className="w-full glass-input px-4 py-3 text-xl font-semibold text-center"
                min="0"
                step="1"
                data-testid="water-input"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-secondary uppercase tracking-widest mb-2 block">{t.toolsRatioLabel.replace('{ratio}', ratioState.ratio || '-')}</label>
              <input
                type="number"
                inputMode="decimal"
                value={ratioState.ratio}
                onChange={(e) => handleRatioChange(e.target.value)}
                className="w-full glass-input px-4 py-3 text-xl font-semibold text-center"
                min="1"
                step="0.1"
                data-testid="ratio-input"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickRatioPresets.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => applyRatioPreset(r)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${Math.abs(parsedRatio - r) < 0.01
                  ? 'bg-blue-500 text-white'
                  : 'bg-surface-alpha text-secondary'
                  }`}
              >
                1:{r}
              </button>
            ))}
          </div>

          {ratioState.mode === 'advanced' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-secondary uppercase tracking-widest mb-2 block">{t.toolsTdsLabel}</label>
                <input
                  type="number"
                  value={ratioState.tdsPercent}
                  onChange={(e) => updateRatioState({ tdsPercent: e.target.value })}
                  className="w-full glass-input px-4 py-3 text-lg font-semibold text-center"
                  min="0"
                  step="0.01"
                  placeholder={t.toolsTdsPlaceholder}
                  data-testid="tds-input"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-secondary uppercase tracking-widest mb-2 block">{t.toolsMeasuredOutputLabel}</label>
                <input
                  type="number"
                  value={ratioState.measuredOutput}
                  onChange={(e) => updateRatioState({ measuredOutput: e.target.value })}
                  className="w-full glass-input px-4 py-3 text-lg font-semibold text-center"
                  min="0"
                  step="0.1"
                  placeholder={t.toolsMeasuredOutputPlaceholder}
                  data-testid="measured-output-input"
                />
              </div>
            </div>
          )}

          <div
            key={outputRenderKey}
            className="panel-soft rounded-2xl p-4 border panel-divider-subtle space-y-3 ratio-output-stability"
            data-testid="yield-breakdown"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-secondary uppercase tracking-widest">{t.toolsYieldEstimate}</p>
              <div className="flex items-center gap-1.5 text-xs text-tertiary">
                <Info size={13} />
                <span>{t.toolsYieldFormula}</span>
              </div>
            </div>

            {!brewOutputs ? (
              <p className="text-sm text-tertiary">{t.toolsYieldEnterValid}</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-surface-alpha p-2">
                    <p className="text-[11px] text-tertiary">{t.toolsInputWater}</p>
                    <p className="font-semibold ratio-numeric-stable">{roundTo(parsedWater, 1)} ml</p>
                  </div>
                  <div className="rounded-xl bg-surface-alpha p-2">
                    <p className="text-[11px] text-tertiary">{t.toolsRetained}</p>
                    <p className="font-semibold ratio-numeric-stable">-{brewOutputs.waterRetainedMl} ml</p>
                  </div>
                  <div className="rounded-xl bg-surface-alpha p-2">
                    <p className="text-[11px] text-tertiary">{t.toolsProcessLoss}</p>
                    <p className="font-semibold ratio-numeric-stable">-{brewOutputs.processLossMl} ml</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-blue-500/8 border border-blue-500/20 p-3 text-center">
                  <p className="text-xs text-secondary">{t.toolsEstimatedBeverageOutput}</p>
                  <p className="text-2xl font-bold text-blue-500 mt-0.5 ratio-numeric-output" data-testid="beverage-output-value">
                    {ratioState.unitMode === 'metric' ? `${brewOutputs.beverageOutputMl} ml` : `${brewOutputs.beverageOutputOz} oz`}
                  </p>
                </div>
              </>
            )}

            <div className="text-xs text-secondary space-y-1">
              {selectedEspressoShotPreset && ratioState.mode === 'advanced' && (
                <p>
                  {t.toolsShotStyleSummary
                    .replace('{label}', getShotLabel(selectedEspressoShotPreset.id))
                    .replace('{ratioMin}', String(selectedEspressoShotPreset.ratioRange.min))
                    .replace('{ratioMax}', String(selectedEspressoShotPreset.ratioRange.max))}
                </p>
              )}
              <p className="flex items-center gap-1.5"><Thermometer size={12} /> {t.toolsTempGuidance.replace('{min}', String(tempGuidanceRange[0])).replace('{max}', String(tempGuidanceRange[1]))}</p>
              <p className="flex items-center gap-1.5"><Clock3 size={12} /> {t.toolsBrewTimeGuidance.replace('{value}', brewTimeGuidanceLabel)}</p>
              <p>{t.toolsGrindGuidance.replace('{value}', getGrindGuidanceLabel(selectedMethod.category))}</p>
              {ratioState.mode === 'advanced' && (
                <p>{t.toolsRoastAdjustedRatioTarget.replace('{min}', String(roastRatioRange[0])).replace('{max}', String(roastRatioRange[1])).replace('{roastLevel}', getRoastLevelLabel(effectiveRoastLevel))}</p>
              )}
              {ratioState.mode === 'advanced' && (
                <p>{t.toolsGrindBiasSuggestion.replace('{value}', roastAdjustedTargets.suggestedGrindBias === 'same' ? t.toolsGrindBiasKeepSame : t.toolsGrindBiasGoOneClick.replace('{direction}', getGrindDirectionLabel(roastAdjustedTargets.suggestedGrindBias)))}</p>
              )}
              <p>{t.toolsScaReference}</p>
              {activeImportedAiBrewIcedSplit && ratioState.mode === 'advanced' && (
                <p data-testid="ai-brew-iced-ratio-split">
                  {t.toolsIceBrewSplitGuide
                    .replace('{hotWater}', String(Math.round(activeImportedAiBrewIcedSplit.hotWaterSharePercent)))
                    .replace('{ice}', String(Math.round(activeImportedAiBrewIcedSplit.iceSharePercent)))} AI Brew: {Math.round(activeImportedAiBrewIcedSplit.hotWaterMl)} ml air panas / {Math.round(activeImportedAiBrewIcedSplit.iceMl)} ml es, konsentrat 1:{roundTo(activeImportedAiBrewIcedSplit.hotExtractionRatio, 1)}.
                </p>
              )}
              {!activeImportedAiBrewIcedSplit && selectedMethod.japaneseSplit && ratioState.mode === 'advanced' && (
                <p>
                  {t.toolsIceBrewSplitGuide.replace('{hotWater}', String(Math.round(selectedMethod.japaneseSplit.hotWaterShare * 100))).replace('{ice}', String(Math.round(selectedMethod.japaneseSplit.iceShare * 100)))}
                </p>
              )}
            </div>
          </div>

          {ratioState.mode === 'advanced' && (conformance.standardsHits.length > 0 || conformance.standardsMisses.length > 0) && (
            <div className="panel-soft rounded-2xl p-4 border panel-divider-subtle space-y-2" data-testid="conformance-panel">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{t.toolsStandardsConformance}</p>
              {conformance.standardsHits.slice(0, 4).map((hit) => (
                <p key={hit} className="text-xs text-emerald-600">+ {hit}</p>
              ))}
              {conformance.standardsMisses.slice(0, 4).map((miss) => (
                <p key={miss} className="text-xs text-amber-700 dark:text-amber-400">! {miss}</p>
              ))}
            </div>
          )}

          {ratioState.mode === 'advanced' && brewOutputs?.extractionYieldPct !== undefined && (
            <div className="panel-soft rounded-2xl p-4 border panel-divider-subtle" data-testid="advanced-results">
              <p className="text-sm font-semibold text-secondary uppercase tracking-widest mb-2">{t.toolsAdvancedExtraction}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface-alpha p-3 text-center">
                  <p className="text-[11px] text-tertiary">{t.toolsBrewStrength}</p>
                  <p className="text-xl font-bold ratio-numeric-stable">{brewOutputs.brewStrengthPct?.toFixed(2)}%</p>
                </div>
                <div className="rounded-xl bg-surface-alpha p-3 text-center">
                  <p className="text-[11px] text-tertiary">{t.toolsExtractionYield}</p>
                  <p className="text-xl font-bold ratio-numeric-stable" data-testid="extraction-yield-value">{brewOutputs.extractionYieldPct.toFixed(2)}%</p>
                </div>
              </div>
              <p className={`mt-3 text-sm font-medium ${brewOutputs.extractionBand === 'target'
                ? 'text-emerald-600'
                : brewOutputs.extractionBand === 'under'
                  ? 'text-amber-600'
                  : 'text-rose-600'
                }`}>
                {t.toolsExtractionStatus}{' ' }
                {brewOutputs.extractionBand === 'target'
                  ? t.toolsExtractionTarget
                  : brewOutputs.extractionBand === 'under'
                    ? t.toolsExtractionUnder
                    : t.toolsExtractionOver}
              </p>
            </div>
          )}

          {(guardrails.errors.length > 0 || guardrails.warnings.length > 0) && (
            <div className="space-y-2" data-testid="guardrails-panel">
              {guardrails.errors.map((error) => (
                <div key={error} className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              ))}
              {compactWarnings.map((warning) => (
                <div key={warning} className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
              {ratioState.mode === 'basic' && guardrails.warnings.length > compactWarnings.length && (
                <p className="text-xs text-secondary px-1">
                  {t.toolsOpenAdvancedDiagnostics.replace('{count}', String(guardrails.warnings.length - compactWarnings.length))}
                </p>
              )}
            </div>
          )}
        </motion.section>
      )}

      {activeTab === 'todo' && (
        <motion.section
          initial={disableEntranceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          id="tools-panel-todo"
          role="tabpanel"
          aria-labelledby="tools-tab-todo"
          tabIndex={0}
          className="glass-card p-6 space-y-5 flex-1 flex flex-col"
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              placeholder={t.toolsAddTaskPlaceholder}
              className="flex-1 glass-input px-5 py-3 text-base"
            />
            <button onClick={addTodo} disabled={!newTodo.trim()} className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center disabled:opacity-50 hover:scale-105 active:scale-95 transition-transform">
              <Plus size={24} />
            </button>
          </div>

          <div className="space-y-2">
            {todos.length === 0 ? (
              <p className="text-center text-secondary py-8 text-base">{t.toolsNoTasksYet}</p>
            ) : (
              todos.map((todo) => (
                <motion.div
                  key={todo.id}
                  initial={disableEntranceMotion ? false : { opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-alpha group"
                >
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${todo.done ? 'bg-blue-500 border-blue-500 text-white' : 'border-glass'
                      }`}
                  >
                    {todo.done && <span className="text-sm">✓</span>}
                  </button>
                  <span className={`flex-1 text-base ${todo.done ? 'line-through text-tertiary' : ''}`}>{todo.text}</span>
                  <button onClick={() => removeTodo(todo.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-tertiary hover:text-red-500 transition-all">
                    <X size={16} />
                  </button>
                </motion.div>
              ))
            )}
          </div>

          {todos.some((t) => t.done) && (
            <button onClick={clearCompleted} className="w-full py-3 text-sm text-secondary hover:text-red-500 transition-colors">
              {t.toolsClearCompleted.replace('{count}', String(todos.filter((t) => t.done).length))}
            </button>
          )}
        </motion.section>
      )}
      </div>
    </motion.div>
  );
}





