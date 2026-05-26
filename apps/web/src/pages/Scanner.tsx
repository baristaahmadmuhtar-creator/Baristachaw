import { useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { AlertCircle, Bookmark, BookmarkCheck, Loader2, RefreshCw } from "lucide-react";
import Markdown from "react-markdown";
import { analyzeImage, editLatteArtImage } from "../services/gemini";
import { getByFeatureKey, setByFeatureKey } from "../services/offlineCache";
import { saveCollectionItem } from "../services/storageService";
import { useAuthModal } from "../context/AuthModalContext";
import { useGlobalState } from "../context/GlobalState";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useRuntimeDisplayMode } from "../hooks/useRuntimeDisplayMode";
import { ensureCameraPermission, type CameraPermissionResult } from "../utils/cameraPermission";
import { getLanguageLocale, getLanguageMeta } from "../constants";
import { buildScannerPrompt } from "../features/scanner/buildScannerPrompt";
import {
  Camera as AppCameraIcon,
  GoogleMark,
  Sparkles as AppSparklesIcon,
  Wand2 as AppWand2Icon,
} from "../components/icons";
import { useAiAccessGate } from "../components/billing/AiAccessGate";

type ScannerMode = "auto" | "ocr" | "latte";

const MAX_SCANNER_SOURCE_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_SCANNER_INLINE_IMAGE_BYTES = 2_500_000;
const SCANNER_IMAGE_MAX_DIMENSION = 1600;
const LATTE_REQUEST_MAX_CHARS = 420;
const currentColorIconStyle = { '--icon-glyph-color': 'currentColor' } as CSSProperties;
const scannerModeActiveStyle = {
  backgroundColor: '#dbeafe',
  color: '#111827',
  transitionProperty: 'transform, box-shadow',
} as CSSProperties;

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function estimateBase64Bytes(base64: string) {
  const normalized = String(base64 || "").replace(/\s/g, "");
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Failed to read image"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = dataUrl;
  });
}

async function prepareScannerImage(file: File) {
  const originalDataUrl = await readFileAsDataUrl(file);
  const parsedOriginal = parseDataUrl(originalDataUrl);
  if (!parsedOriginal) throw new Error("invalid_image_payload");
  if (estimateBase64Bytes(parsedOriginal.base64) <= MAX_SCANNER_INLINE_IMAGE_BYTES) {
    return {
      mimeType: parsedOriginal.mimeType,
      base64: parsedOriginal.base64,
      sizeBytes: estimateBase64Bytes(parsedOriginal.base64),
    };
  }

  const image = await loadImage(originalDataUrl);
  const scale = Math.min(1, SCANNER_IMAGE_MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(image, 0, 0, width, height);

  const preferredMimes = parsedOriginal.mimeType === "image/webp"
    ? ["image/webp", "image/jpeg"]
    : ["image/jpeg", "image/webp"];
  const qualities = [0.82, 0.74, 0.66, 0.58, 0.5, 0.42];
  let best: { mimeType: string; base64: string; sizeBytes: number } | null = null;

  for (const mime of preferredMimes) {
    for (const quality of qualities) {
      const dataUrl = canvas.toDataURL(mime, quality);
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) continue;
      const sizeBytes = estimateBase64Bytes(parsed.base64);
      best = { mimeType: parsed.mimeType, base64: parsed.base64, sizeBytes };
      if (sizeBytes <= MAX_SCANNER_INLINE_IMAGE_BYTES) return best;
    }
  }

  if (best && best.sizeBytes <= MAX_SCANNER_INLINE_IMAGE_BYTES) return best;
  throw new Error("scanner_image_too_large");
}

export function Scanner() {
  const { t, language } = useGlobalState();
  const [file, setFile] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [resultMarkdown, setResultMarkdown] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ScannerMode>("auto");
  const [savedToCollection, setSavedToCollection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latteRequest, setLatteRequest] = useState("");
  const {
    isAuthenticated,
    authChecking,
    authBusy,
    authError,
    clearAuthError,
    openAuthModal,
  } = useAuthModal();
  const { ensureAiAccess, aiAccessGateModal } = useAiAccessGate("scanner");
  const { isOffline } = useNetworkStatus();
  const { isIosStandalone } = useRuntimeDisplayMode();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const locale = getLanguageLocale(language);
  const responseLanguage = getLanguageMeta(language).aiName;
  const isLatteMode = mode === "latte";
  const previewSrc = file && mimeType ? `data:${mimeType};base64,${file}` : null;
  const cameraSupported = typeof window !== "undefined"
    && window.isSecureContext !== false
    && typeof navigator !== "undefined"
    && Boolean(navigator.mediaDevices?.getUserMedia);

  const latteFallbackRequest = useMemo(() => {
    if (/^id(?:-|$)/i.test(language)) {
      return "Perbaiki latte art ini menjadi lebih rapi, simetris, realistis, dengan microfoam halus, kontras crema natural, dan kualitas visual setara barista specialty cafe premium.";
    }
    return "Improve this latte art into a cleaner, symmetrical, photorealistic specialty cafe result with refined microfoam, natural crema contrast, and believable barista-level pour quality.";
  }, [language]);

  const lattePromptPresets = useMemo(() => ([
    {
      label: t.scannerLattePresetTulip,
      prompt: /^id(?:-|$)/i.test(language)
        ? "Ubah menjadi tulip premium yang rapi, simetris, realistis, dengan microfoam halus dan presentasi kafe specialty."
        : "Turn this into a premium symmetrical tulip with realistic microfoam and specialty cafe presentation.",
    },
    {
      label: t.scannerLattePresetRosetta,
      prompt: /^id(?:-|$)/i.test(language)
        ? "Buat rosetta yang tegas, realistis, tajam, dengan kontras crema natural dan tekstur susu halus."
        : "Create a sharp photorealistic rosetta with natural crema contrast and refined milk texture.",
    },
    {
      label: t.scannerLattePresetHeart,
      prompt: /^id(?:-|$)/i.test(language)
        ? "Buat hati yang bersih, realistis, simetris, dan tampak seperti hasil pour barista profesional."
        : "Create a clean realistic heart that looks like a professional barista pour.",
    },
  ]), [
    language,
    t.scannerLattePresetHeart,
    t.scannerLattePresetRosetta,
    t.scannerLattePresetTulip,
  ]);

  const selectedImageMeta = useMemo(() => {
    if (!fileName && !fileSize) return null;
    return [fileName, fileSize ? formatFileSize(fileSize) : null].filter(Boolean).join(" - ");
  }, [fileName, fileSize]);

  const clearMediaState = () => {
    setFile(null);
    setMimeType(null);
    setFileName(null);
    setFileSize(null);
    setResultMarkdown(null);
    setGeneratedImage(null);
    setError(null);
    setSavedToCollection(false);
  };

  const handlePickedFile = async (selectedFile?: File | null) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) {
      setError(t.scannerImageOnlyError);
      return;
    }
    if (selectedFile.size > MAX_SCANNER_SOURCE_IMAGE_BYTES) {
      setError(t.scannerFileTooLarge);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const prepared = await prepareScannerImage(selectedFile);
      setMimeType(prepared.mimeType);
      setFile(prepared.base64);
      setFileName(selectedFile.name || "image");
      setFileSize(prepared.sizeBytes || selectedFile.size || 0);
      setResultMarkdown(null);
      setGeneratedImage(null);
      setSavedToCollection(false);
    } catch {
      setError(t.scannerFileTooLarge);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void handlePickedFile(e.target.files?.[0]);
    e.currentTarget.value = "";
  };

  const handleScan = async () => {
    if (!ensureAiAccess("scanner")) {
      return;
    }
    if (!file || !mimeType) return;

    if (isOffline) {
      if (isLatteMode) {
        setError(t.scannerOfflineRequiresInternet);
        return;
      }
      const latest = await getByFeatureKey<{ result: string }>("scanner_result", mode);
      if (latest?.result) {
        setResultMarkdown(latest.result);
        setGeneratedImage(null);
        setError(t.scannerOfflineCached);
      } else {
        setError(t.scannerOfflineRequiresInternet);
      }
      return;
    }

    setError(null);
    setLoading(true);
    setSavedToCollection(false);
    try {
      if (isLatteMode) {
        const imageDataUrl = await editLatteArtImage(
          file,
          mimeType,
          latteRequest.trim() || latteFallbackRequest,
        );
        setGeneratedImage(imageDataUrl);
        setResultMarkdown(null);
      } else {
        const prompt = buildScannerPrompt(mode, responseLanguage, language);
        const res = await analyzeImage(file, mimeType, prompt);
        setResultMarkdown(res);
        setGeneratedImage(null);
        await setByFeatureKey("scanner_result", mode, { result: res });
      }
    } catch (scanError) {
      console.error(scanError);
      setGeneratedImage(null);
      setResultMarkdown(null);
      setError(
        scanError instanceof Error
          ? scanError.message
          : (isLatteMode ? t.scannerLatteGenerateFailed : t.scannerAnalyzeFailed),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToCollection = async () => {
    if (savedToCollection) return;
    if (isLatteMode) {
      if (!generatedImage) return;
      const title = t.scannerLatteAfter || "AI Latte Art Result";
      const request = latteRequest.trim() || latteFallbackRequest;
      await saveCollectionItem({
        id: `latte_${Date.now()}`,
        type: "ai_canvas",
        title: `${title} - ${new Date().toLocaleDateString(locale)}`,
        content: {
          markdown: [
            "## AI Latte Art",
            "",
            `Prompt: ${request}`,
            "",
            "Saved from Vision Scan Latte Art.",
          ].join("\n"),
          kind: "latte_art",
          prompt: request,
          imageDataUrl: generatedImage,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setSavedToCollection(true);
      return;
    }
    if (!resultMarkdown) return;
    const kind = mode === "ocr" ? "note" as const : "qa_context" as const;
    const title = mode === "ocr" ? t.scannerSavedTitleOcr : t.scannerSavedTitleAuto;
    await saveCollectionItem({
      id: `scan_${Date.now()}`,
      type: "ai_canvas",
      title: `${title} - ${new Date().toLocaleDateString(locale)}`,
      content: {
        markdown: resultMarkdown,
        kind,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setSavedToCollection(true);
  };

  const reset = () => {
    clearMediaState();
  };

  const setModeAndReset = (nextMode: ScannerMode) => {
    setMode(nextMode);
    clearMediaState();
  };

  const openPrimaryPicker = () => {
    fileInputRef.current?.click();
  };

  const resolveCameraPermissionError = (permission: CameraPermissionResult) => {
    if (permission.code === "unsupported" || !cameraSupported) return t.scannerCameraUnsupported;
    if (permission.code === "insecure_context") return t.scannerCameraSecureContext;
    return t.scannerCameraDenied;
  };

  const openCameraPicker = async () => {
    const permission = await ensureCameraPermission();
    if (permission.granted) {
      cameraInputRef.current?.click();
      return;
    }
    setError(resolveCameraPermissionError(permission));
  };

  const loadingLabel = isLatteMode ? (t.chatGeneratingImage || t.analyzing) : t.analyzing;
  const actionLabel = isLatteMode ? t.scannerGenerateLatte : t.scannerAnalyzeImage;
  const readyLabel = isLatteMode ? t.scannerReadyToGenerate : t.scannerReadyToAnalyze;

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={isIosStandalone ? { duration: 0 } : { duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="page-container desktop-noise-bg w-full"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-1 flex-col">
        <header className="mb-6 text-center shrink-0 panel-soft rounded-3xl px-5 py-5 lg:py-6">
          <AppCameraIcon size={56} variant="tile" tone="amber" className="mx-auto mb-3" />
          <h1 className="text-3xl font-semibold tracking-tight mb-2">{t.scannerTitle}</h1>
          <p className="text-secondary text-base">{t.scannerSubtitle}</p>
        </header>

        {authError && (
          <div className="mb-4 glass-card px-4 py-3 flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle size={16} />
            <span>{authError}</span>
            <button onClick={clearAuthError} className="ml-auto p-1 rounded-full hover:bg-surface-alpha">
              <RefreshCw size={12} />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 glass-card px-4 py-3 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto p-1 rounded-full hover:bg-surface-alpha">
              <RefreshCw size={12} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-4 p-1.5 panel-soft rounded-[1.25rem] max-w-md lg:max-w-2xl mx-auto shrink-0 w-full" role="group" aria-label={t.scannerTitle}>
          <button
            type="button"
            onClick={() => setModeAndReset("auto")}
            aria-pressed={mode === "auto"}
            style={mode === "auto" ? scannerModeActiveStyle : undefined}
            className={`focus-soft min-w-0 min-h-[52px] px-2 py-2.5 text-[11px] sm:text-sm font-medium rounded-xl transition-all duration-300 ease-out flex items-center justify-center text-center leading-tight ${mode === "auto" ? "scanner-mode-active shadow-md scale-[1.02]" : "text-secondary hover:text-primary"}`}
          >
            <span className={mode === "auto" ? "scanner-mode-active-label" : undefined}>{t.scannerModeAuto}</span>
          </button>
          <button
            type="button"
            onClick={() => setModeAndReset("ocr")}
            aria-pressed={mode === "ocr"}
            style={mode === "ocr" ? scannerModeActiveStyle : undefined}
            className={`focus-soft min-w-0 min-h-[52px] px-2 py-2.5 text-[11px] sm:text-sm font-medium rounded-xl transition-all duration-300 ease-out flex items-center justify-center text-center leading-tight ${mode === "ocr" ? "scanner-mode-active shadow-md scale-[1.02]" : "text-secondary hover:text-primary"}`}
          >
            <span className={mode === "ocr" ? "scanner-mode-active-label" : undefined}>{t.scannerModeOcr}</span>
          </button>
          <button
            type="button"
            onClick={() => setModeAndReset("latte")}
            aria-pressed={mode === "latte"}
            style={mode === "latte" ? scannerModeActiveStyle : undefined}
            className={`focus-soft min-w-0 min-h-[52px] px-2 py-2.5 text-[11px] sm:text-sm font-medium rounded-xl transition-all duration-300 ease-out flex items-center justify-center text-center leading-tight ${mode === "latte" ? "scanner-mode-active shadow-md scale-[1.02]" : "text-secondary hover:text-primary"}`}
          >
            <span className={mode === "latte" ? "scanner-mode-active-label" : undefined}>{t.scannerModeLatte}</span>
          </button>
        </div>

        {authChecking ? (
          <div className="glass-card flex-1 flex flex-col items-center justify-center gap-3 text-center min-h-[220px]">
            <Loader2 size={24} className="animate-spin text-secondary" />
            <p className="text-secondary text-sm">{t.scannerCheckingSession}</p>
          </div>
        ) : !isAuthenticated ? (
          <div className="glass-card flex-1 flex flex-col items-center justify-center gap-4 text-center min-h-[220px]">
            <h2 className="text-xl font-semibold">{t.signInRequired}</h2>
            <p className="text-secondary text-sm max-w-sm">{t.scannerProtectedBody}</p>
            {isOffline && (
              <p className="text-xs text-amber-600 dark:text-amber-400">{t.scannerOfflineSignin}</p>
            )}
            <button
              onClick={() => openAuthModal({ source: "scanner" })}
              disabled={authBusy}
              className="glass-button-primary px-5 py-3.5 text-sm font-medium flex items-center gap-2"
            >
              {authBusy ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> {t.opening}
                </>
              ) : (
                <>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white">
                    <GoogleMark className="h-4 w-4" />
                  </span>
                  {t.continueWithGoogle}
                </>
              )}
            </button>
          </div>
        ) : !file ? (
          <div
            onClick={openPrimaryPicker}
            className="focus-soft glass-card flex-1 flex flex-col items-center justify-center gap-4 cursor-pointer border-dashed border-2 border-glass hover:border-blue-500/50 transition-colors group min-h-[200px]"
            style={{ touchAction: "pan-y" }}
          >
            {isLatteMode ? (
              <AppWand2Icon size={80} variant="tile" tone="purple" className="transition-transform duration-300 ease-out group-hover:scale-110" />
            ) : (
              <AppCameraIcon size={80} variant="tile" tone="blue" className="transition-transform duration-300 ease-out group-hover:scale-110" />
            )}
            <div className="text-center">
              <p className="font-semibold text-xl">{t.scannerTapToScan}</p>
              <p className="text-base text-secondary mt-2">{t.scannerChooseSource}</p>
            </div>
            <div className="w-full max-w-sm px-4 pt-2" onClick={(e) => e.stopPropagation()}>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={openPrimaryPicker}
                  aria-label={t.scannerGalleryFile}
                  data-testid="scanner-gallery-picker"
                  className="glass-button py-3 text-sm font-medium"
                >
                  {t.scannerGalleryFile}
                </button>
                <button
                  type="button"
                  onClick={() => { void openCameraPicker(); }}
                  disabled={!cameraSupported}
                  aria-label={t.scannerCamera}
                  data-testid="scanner-camera-picker"
                  className={`py-3 text-sm font-medium ${cameraSupported ? "glass-button" : "glass-button opacity-60 cursor-not-allowed"}`}
                >
                  {t.scannerCamera}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="panel-soft rounded-[1.5rem] p-4 border panel-divider-subtle flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">{readyLabel}</p>
                <p className="text-sm text-secondary break-words">
                  {t.scannerSelectedImage}
                  {selectedImageMeta ? `: ${selectedImageMeta}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={openPrimaryPicker}
                  className="glass-button px-4 py-2.5 text-sm font-medium"
                >
                  {t.scannerChangeImage}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="glass-button px-4 py-2.5 text-sm font-medium"
                >
                  {t.reset}
                </button>
              </div>
            </div>

            {isLatteMode && generatedImage ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-sm font-semibold text-secondary uppercase tracking-widest">{t.scannerLatteBefore}</h3>
                    <button
                      onClick={reset}
                      className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center text-white hover:bg-black/60 transition-colors shadow-lg"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                  <div className="rounded-[1.75rem] overflow-hidden shadow-xl bg-surface-alpha flex justify-center">
                    <img src={previewSrc || undefined} alt={t.scannerLatteBefore} className="w-full h-auto max-h-[50vh] object-contain rounded-[1.75rem]" />
                  </div>
                </div>
                <div className="glass-card p-4">
                  <h3 className="text-sm font-semibold text-secondary uppercase tracking-widest mb-3">{t.scannerLatteAfter}</h3>
                  <div className="rounded-[1.75rem] overflow-hidden shadow-xl bg-surface-alpha flex justify-center">
                    <img src={generatedImage} alt={t.scannerLatteAfter} className="w-full h-auto max-h-[50vh] object-contain rounded-[1.75rem]" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl bg-surface-alpha flex justify-center">
                <img src={previewSrc || undefined} alt={t.scanResult} className="w-full h-auto max-h-[50vh] object-contain rounded-[2rem]" />
                <button
                  onClick={reset}
                  className="absolute top-4 right-4 w-12 h-12 rounded-full bg-black/50 backdrop-blur-xl flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10 shadow-lg"
                >
                  <RefreshCw size={24} />
                </button>
              </div>
            )}

            {isLatteMode && (
              <div className="glass-card p-5 sm:p-6 space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <label htmlFor="latte-art-request" className="block text-sm font-semibold text-primary">
                      {t.scannerLattePromptLabel}
                    </label>
                    <span className="text-xs text-secondary">{t.scannerLatteRequestOptional}</span>
                  </div>
                  <textarea
                    id="latte-art-request"
                    value={latteRequest}
                    onChange={(event) => setLatteRequest(event.target.value.slice(0, LATTE_REQUEST_MAX_CHARS))}
                    rows={4}
                    placeholder={t.scannerLattePromptPlaceholder}
                    className="w-full rounded-[1.35rem] border border-white/15 bg-white/55 dark:bg-white/5 px-4 py-3 text-sm text-primary dark:text-white placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {lattePromptPresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setLatteRequest(preset.prompt)}
                      className="glass-button px-3 py-2 text-xs sm:text-sm font-medium"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-secondary">{t.scannerLattePromptHelp}</p>
                  <span className="text-xs text-secondary shrink-0">{latteRequest.length}/{LATTE_REQUEST_MAX_CHARS}</span>
                </div>
              </div>
            )}

            {!resultMarkdown && !generatedImage ? (
              <button
                onClick={handleScan}
                disabled={loading || !file}
                className="w-full glass-button-primary py-5 flex items-center justify-center gap-3 text-xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" style={{ animation: "coffee-ripple 1.4s ease-in-out infinite" }} />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600/70" style={{ animation: "coffee-ripple 1.4s ease-in-out infinite 0.2s" }} />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-700/70" style={{ animation: "coffee-ripple 1.4s ease-in-out infinite 0.4s" }} />
                    </div>
                    <span>{loadingLabel}</span>
                  </>
                ) : (
                  <>
                    <AppSparklesIcon size={28} variant="glyph" tone="neutral" style={currentColorIconStyle} />
                    <span>{actionLabel}</span>
                  </>
                )}
              </button>
            ) : isLatteMode ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={handleSaveToCollection}
                  disabled={savedToCollection || !generatedImage}
                  className={`py-5 flex items-center justify-center gap-3 text-lg rounded-2xl font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${savedToCollection
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "glass-button"
                  }`}
                >
                  {savedToCollection ? <BookmarkCheck size={22} /> : <Bookmark size={22} />}
                  <span>{savedToCollection ? t.scannerSaved : t.saveToCollection}</span>
                </button>
                <button
                  onClick={handleScan}
                  disabled={loading}
                  className="glass-button-primary py-5 flex items-center justify-center gap-3 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={22} className="animate-spin" />
                      <span>{loadingLabel}</span>
                    </>
                  ) : (
                    <>
                      <AppSparklesIcon size={24} variant="glyph" tone="neutral" style={currentColorIconStyle} />
                      <span>{actionLabel}</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-semibold text-secondary uppercase tracking-widest">{t.scannerResults}</h3>
                  <button
                    onClick={handleSaveToCollection}
                    disabled={savedToCollection}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${savedToCollection
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
                    }`}
                  >
                    {savedToCollection ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                    {savedToCollection ? t.scannerSaved : t.saveToCollection}
                  </button>
                </div>
                <div className="prose prose-lg max-w-none text-primary chat-markdown search-result-markdown">
                  <Markdown>{resultMarkdown}</Markdown>
                </div>
              </motion.div>
            )}
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={cameraInputRef}
          onChange={handleFileChange}
        />
      </div>
      {aiAccessGateModal}
    </motion.div>
  );
}
