import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, Bookmark, BookmarkCheck, Loader2, RefreshCw, Download, Copy, Check } from "lucide-react";
import Markdown from "react-markdown";
import { analyzeImage, editLatteArtImage, humanizeAiError, ServerAiError } from "../services/gemini";
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

interface ImageComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function ImageComparisonSlider({
  beforeImage,
  afterImage,
  beforeLabel = "Before",
  afterLabel = "After",
}: ImageComparisonSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(position);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    handleMove(clientX);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="relative select-none overflow-hidden rounded-[2rem] shadow-2xl bg-surface-alpha border border-white/10 mx-auto cursor-ew-resize"
      style={{ width: "100%", maxWidth: "600px" }}
      onMouseDown={handleStart}
      onTouchStart={handleStart}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
    >
      <img
        src={afterImage}
        alt={afterLabel}
        className="w-full h-auto block pointer-events-none rounded-[2rem]"
        draggable={false}
      />
      <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white/90 tracking-wide uppercase pointer-events-none">
        {afterLabel}
      </div>

      <div
        className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none border-r border-white/20"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="max-w-none h-full pointer-events-none"
          style={{ width: containerWidth || "100%" }}
          draggable={false}
        />
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white/90 tracking-wide uppercase pointer-events-none">
          {beforeLabel}
        </div>
      </div>

      <div
        className="absolute top-0 bottom-0 pointer-events-none flex items-center justify-center"
        style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
      >
        <div className="w-10 h-10 rounded-full bg-white text-gray-800 shadow-2xl border border-gray-200/50 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform pointer-events-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-700 pointer-events-none"
          >
            <path d="m9 18-6-6 6-6" />
            <path d="m15 6 6 6-6 6" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ScanningProgressTicker({ mode }: { mode: ScannerMode }) {
  const [stepIndex, setStepIndex] = useState(0);

  const autoSteps = [
    "🔍 Reading visual image matrix...",
    "☕ Detecting coffee extraction markers...",
    "⚖️ Parsing bean quality & roast levels...",
    "📜 Standardizing SCA quality records...",
    "✍️ Drafting barista action plan...",
  ];

  const ocrSteps = [
    "🔍 Reading label visual text...",
    "📝 Running optical character recognition...",
    "🏷️ Parsing roaster, origin & process...",
    "🧪 Calculating starter brew ratio...",
    "✍️ Formatting structured recipe...",
  ];

  const latteSteps = [
    "🖼️ Isolating cup and foam boundaries...",
    "🥛 Simulating microfoam fluid dynamics...",
    "🎨 Designing requested pattern layout...",
    "🖌️ Rendering photorealistic crema contrast...",
    "✨ Retouching lighting and textures...",
  ];

  const steps = mode === "latte" ? latteSteps : mode === "ocr" ? ocrSteps : autoSteps;

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }, 3200);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="flex flex-col items-center justify-center space-y-3 text-center select-none py-1">
      <div className="flex gap-2.5 items-center justify-center min-h-[30px] overflow-hidden">
        <Loader2 className="animate-spin text-blue-500 shrink-0" size={20} />
        <AnimatePresence mode="wait">
          <motion.span
            key={stepIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="text-sm font-semibold text-primary block"
          >
            {steps[stepIndex]}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="flex space-x-1.5 justify-center mt-2 w-full">
        {steps.map((_, idx) => (
          <span
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
              idx === stepIndex
                ? "w-6 bg-blue-500 shadow-[0_0_8px_#3b82f6]"
                : idx < stepIndex
                ? "w-2 bg-emerald-500/80"
                : "w-2 bg-gray-300 dark:bg-gray-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
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
  const [comparisonView, setComparisonView] = useState<"slider" | "side-by-side">("slider");
  const [error, setError] = useState<string | null>(null);
  const [latteRequest, setLatteRequest] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const {
    isAuthenticated,
    authChecking,
    authError,
    clearAuthError,
    openAuthModal,
  } = useAuthModal();
  const { ensureAiAccess, aiAccessGateModal, openGate } = useAiAccessGate("scanner");
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

  const lattePromptPresets = useMemo(() => {
    const isIndonesian = /^id(?:-|$)/i.test(language);
    return [
      {
        label: isIndonesian ? "🌷 Tulip Premium" : "🌷 Premium Tulip",
        prompt: isIndonesian
          ? "Ubah latte art ini menjadi bentuk tulip premium yang rapi, simetris, realistis, dengan microfoam halus dan presentasi kafe specialty."
          : "Turn this into a premium symmetrical tulip with realistic microfoam and specialty cafe presentation.",
      },
      {
        label: isIndonesian ? "🌿 Rosetta Tajam" : "🌿 Sharp Rosetta",
        prompt: isIndonesian
          ? "Buat rosetta yang tegas, realistis, tajam, dengan kontras crema natural dan tekstur susu halus."
          : "Create a sharp photorealistic rosetta with natural crema contrast and refined milk texture.",
      },
      {
        label: isIndonesian ? "💖 Hati Bersih" : "💖 Clean Heart",
        prompt: isIndonesian
          ? "Ubah latte art ini menjadi bentuk hati yang bersih, realistis, simetris, dan tampak seperti hasil tuangan barista profesional."
          : "Create a clean realistic heart that looks like a professional barista pour.",
      },
      {
        label: isIndonesian ? "🦢 Angsa Elegan" : "🦢 Elegant Swan",
        prompt: isIndonesian
          ? "Ubah latte art ini menjadi bentuk angsa (swan) yang elegan, artistik, realistis, dan bertekstur microfoam sangat halus."
          : "Edit this latte art to feature an elegant, artistic, photorealistic swan design with ultra-fine microfoam texture.",
      },
      {
        label: isIndonesian ? "🌿 Slow Rosetta" : "🌿 Slow Rosetta",
        prompt: isIndonesian
          ? "Ubah latte art ini menjadi slow pour rosetta dengan daun yang lebih lebar, gelombang yang tebal, dan crema yang sangat pekat."
          : "Transform this latte art into a slow pour rosetta with wider leaves, thick waves, and deep rich crema.",
      },
      {
        label: isIndonesian ? "🪽 Winged Tulip" : "🪽 Winged Tulip",
        prompt: isIndonesian
          ? "Ubah latte art ini menjadi winged tulip (tulip bersayap) yang sangat simetris, memukau, dengan lapisan dasar yang melingkar sempurna seperti sayap."
          : "Change this latte art into a stunning symmetrical winged tulip, with a perfectly wrapped base layer resembling wings.",
      },
      {
        label: isIndonesian ? "🐾 3D Cat/Bear" : "🐾 3D Cat/Bear",
        prompt: isIndonesian
          ? "Ubah gambar ini menjadi 3D latte art berbentuk kucing atau beruang lucu yang menyembul dari busa susu secara hiper-realistis."
          : "Turn this image into a hyper-realistic 3D latte art featuring a cute cat or bear popping out of the milk foam.",
      },
      {
        label: isIndonesian ? "🦄 Kuda Laut" : "🦄 Seahorse Art",
        prompt: isIndonesian
          ? "Ubah latte art ini menjadi bentuk kuda laut (seahorse) yang kreatif, realistis, artistik, dengan kontras crema yang natural."
          : "Change this latte art to a creative, photorealistic seahorse pattern with realistic crema contrast.",
      },
      {
        label: isIndonesian ? "🥞 Tulip 10 Tumpuk" : "🥞 10-Stack Tulip",
        prompt: isIndonesian
          ? "Ubah latte art ini menjadi tulip 10 tumpuk (10-stack tulip) yang simetris, realistis, presisi, dengan kontras crema yang tajam dan microfoam padat."
          : "Transform this latte art into a symmetrical, realistic 10-stack tulip with sharp crema contrast and dense microfoam.",
      },
      {
        label: isIndonesian ? "🥴 Tuangan Gagal" : "🥴 Messy Pour",
        prompt: isIndonesian
          ? "Ubah latte art ini menjadi bentuk tuangan susu yang gagal, berantakan, tidak beraturan, bergelembung besar, seperti buatan pemula yang baru belajar."
          : "Make this latte art look like a failed, messy, amateur pour with large bubbles and distorted shapes, like a beginner's first try.",
      },
    ];
  }, [language]);

  const finalLattePrompt = useMemo(() => {
    const isIndonesian = /^id(?:-|$)/i.test(language);
    const baseContext = isIndonesian
      ? "Perbaiki dan ubah gambar latte art ini secara presisi dan realistis sesuai instruksi berikut, pastikan kualitas visual setara kafe premium dengan kontras crema yang baik: "
      : "Improve and transform this latte art image realistically according to the following instruction, ensuring premium cafe visual quality and good crema contrast: ";
    
    const requestText = latteRequest.trim();
    if (!requestText) {
      return latteFallbackRequest;
    }
    
    // Check if it's already a preset (we don't need to wrap presets if they are already well-written)
    const isPreset = lattePromptPresets.some(p => p.prompt === requestText);
    if (isPreset) return requestText;

    return `${baseContext}"${requestText}"`;
  }, [latteRequest, language, latteFallbackRequest, lattePromptPresets]);

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
    setCopied(false);
  };

  const handlePickedFile = async (selectedFile?: File | null) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) {
      setError(`${t.scannerImageOnlyError} Credit tidak dikonsumsi.`);
      return;
    }
    if (selectedFile.size > MAX_SCANNER_SOURCE_IMAGE_BYTES) {
      setError(`${t.scannerFileTooLarge} Credit tidak dikonsumsi.`);
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
      setError(`${t.scannerFileTooLarge} Credit tidak dikonsumsi.`);
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
    setGeneratedImage(null);
    setResultMarkdown(null);
    try {
      if (isLatteMode) {
        const imageDataUrl = await editLatteArtImage(
          file,
          mimeType,
          finalLattePrompt,
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
      if (scanError instanceof ServerAiError) {
        console.error(`[Scanner] failed: requestId=${scanError.requestId || 'none'} provider=${scanError.provider || 'none'}`, scanError);
        if (scanError.errorCode === 'quota_exceeded' || scanError.errorCode === 'paid_plan_required') {
          openGate('upgrade', 'scanner');
          setLoading(false);
          return;
        }
      } else {
        console.error(scanError);
      }
      setGeneratedImage(null);
      setResultMarkdown(null);
      setError(
        scanError instanceof Error
          ? humanizeAiError(scanError)
          : (isLatteMode ? t.scannerLatteGenerateFailed : t.scannerAnalyzeFailed),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToCollection = async () => {
    if (savedToCollection) return;
    if (!isAuthenticated) {
      openAuthModal({ source: "scanner" });
      return;
    }
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

  const handleDownloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `latte-art-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyReport = async () => {
    if (!resultMarkdown) return;
    try {
      await navigator.clipboard.writeText(resultMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleDownloadReport = () => {
    if (!resultMarkdown) return;
    const blob = new Blob([resultMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `coffee-scan-${mode}-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        <div className="mb-4" />

        {authChecking && (
          <div className="mb-4 mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-surface-alpha px-3 py-2 text-xs font-medium text-secondary">
            <Loader2 size={14} className="animate-spin" />
            <span>{t.scannerCheckingSession}</span>
          </div>
        )}

        {!file ? (
          <div
            onClick={openPrimaryPicker}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
              if (e.dataTransfer.files?.length) {
                void handlePickedFile(e.dataTransfer.files[0]);
              }
            }}
            className={`focus-soft glass-card flex-1 flex flex-col items-center justify-center gap-4 cursor-pointer border-dashed border-2 transition-all duration-300 group min-h-[200px] ${
              isDraggingOver
                ? "border-blue-500 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.15)] scale-[1.01]"
                : "border-glass hover:border-blue-500/50"
            }`}
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
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="inline-flex p-1 bg-white/5 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
                    <button
                      type="button"
                      onClick={() => setComparisonView("slider")}
                      className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                        comparisonView === "slider"
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-secondary hover:text-primary"
                      }`}
                    >
                      ↔️ Slider
                    </button>
                    <button
                      type="button"
                      onClick={() => setComparisonView("side-by-side")}
                      className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                        comparisonView === "side-by-side"
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-secondary hover:text-primary"
                      }`}
                    >
                      🔲 Side-by-Side
                    </button>
                  </div>
                </div>

                {comparisonView === "slider" ? (
                  <div className="glass-card p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h3 className="text-sm font-semibold text-secondary uppercase tracking-widest">{t.scannerResults || "Scanner Results"}</h3>
                      <button
                        onClick={reset}
                        className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center text-white hover:bg-black/60 transition-colors shadow-lg"
                      >
                        <RefreshCw size={18} />
                      </button>
                    </div>
                    <ImageComparisonSlider
                      beforeImage={previewSrc || ""}
                      afterImage={generatedImage}
                      beforeLabel={t.scannerLatteBefore}
                      afterLabel={t.scannerLatteAfter}
                    />
                  </div>
                ) : (
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
                )}
              </div>
            ) : (
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl bg-surface-alpha flex justify-center w-full max-w-[600px] mx-auto border border-white/10">
                <style>{`
                  @keyframes scan-line {
                    0% { top: 0%; }
                    50% { top: 100%; }
                    100% { top: 0%; }
                  }
                  @keyframes pulse-soft {
                    0%, 100% { opacity: 0.15; }
                    50% { opacity: 0.35; }
                  }
                  @keyframes grid-glow {
                    0%, 100% { opacity: 0.2; }
                    50% { opacity: 0.45; }
                  }
                  @keyframes target-pulse {
                    0%, 100% { transform: scale(1); opacity: 0.7; }
                    50% { transform: scale(1.08); opacity: 1; }
                  }
                `}</style>
                <img src={previewSrc || undefined} alt={t.scanResult} className="w-full h-auto max-h-[50vh] object-contain rounded-[2rem]" />
                
                {loading && (
                  <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 z-10 transition-all duration-300">
                    {/* High-tech grid overlay */}
                    <div 
                      className="absolute inset-0 bg-[linear-gradient(to_right,rgba(59,130,246,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.08)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none"
                      style={{
                        animation: "grid-glow 4s ease-in-out infinite",
                      }}
                    />

                    {/* Corner Crosshairs */}
                    <div className="absolute inset-6 pointer-events-none border border-white/5">
                      {/* Top-Left */}
                      <div 
                        className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-blue-500 rounded-tl-md"
                        style={{ animation: "target-pulse 2s ease-in-out infinite" }}
                      />
                      {/* Top-Right */}
                      <div 
                        className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-blue-500 rounded-tr-md"
                        style={{ animation: "target-pulse 2s ease-in-out infinite 0.5s" }}
                      />
                      {/* Bottom-Left */}
                      <div 
                        className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-blue-500 rounded-bl-md"
                        style={{ animation: "target-pulse 2s ease-in-out infinite 1s" }}
                      />
                      {/* Bottom-Right */}
                      <div 
                        className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-blue-500 rounded-br-md"
                        style={{ animation: "target-pulse 2s ease-in-out infinite 1.5s" }}
                      />
                    </div>

                    {/* Glowing Laser line */}
                    <div
                      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.8),0_0_30px_rgba(59,130,246,0.5),0_0_6px_rgba(59,130,246,1)]"
                      style={{
                        animation: "scan-line 3.2s ease-in-out infinite",
                      }}
                    />
                    {/* Pulsing overlay */}
                    <div
                      className="absolute inset-0 bg-blue-500/10 pointer-events-none"
                      style={{
                        animation: "pulse-soft 2.5s ease-in-out infinite",
                      }}
                    />
                    {/* Status Info Box */}
                    <div className="glass-card px-5 py-4 rounded-2xl shadow-2xl max-w-sm w-full mx-4 border border-white/10 relative z-20">
                      <ScanningProgressTicker mode={mode} />
                    </div>
                  </div>
                )}

                {!loading && (
                  <button
                    onClick={reset}
                    className="absolute top-4 right-4 w-12 h-12 rounded-full bg-black/50 backdrop-blur-xl flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10 shadow-lg"
                  >
                    <RefreshCw size={24} />
                  </button>
                )}
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
                    className="w-full rounded-[1.35rem] border border-white/15 bg-white/55 dark:bg-white/5 px-4 py-3 text-[16px] md:text-sm text-primary dark:text-white placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  />
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {lattePromptPresets.map((preset) => {
                    const isActive = latteRequest === preset.prompt;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setLatteRequest(preset.prompt)}
                        className={`px-4 py-2.5 text-xs sm:text-sm font-medium rounded-xl transition-all duration-300 ${
                          isActive
                            ? "bg-blue-600 dark:bg-blue-500 text-white border-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.25)] scale-[1.03]"
                            : "glass-button opacity-80 hover:opacity-100"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
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
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={handleSaveToCollection}
                  disabled={savedToCollection || !generatedImage}
                  className={`py-4 flex items-center justify-center gap-2.5 text-base rounded-2xl font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${savedToCollection
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : "glass-button"
                  }`}
                >
                  {savedToCollection ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                  <span>{savedToCollection ? t.scannerSaved : t.saveToCollection}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={!generatedImage}
                  className="glass-button py-4 flex items-center justify-center gap-2.5 text-base rounded-2xl font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Download size={20} />
                  <span>{language === "id" ? "Unduh Gambar" : "Download Image"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleScan}
                  disabled={loading}
                  className="glass-button-primary py-4 flex items-center justify-center gap-2.5 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>{loadingLabel}</span>
                    </>
                  ) : (
                    <>
                      <AppSparklesIcon size={20} variant="glyph" tone="neutral" style={currentColorIconStyle} />
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className="text-sm font-semibold text-secondary uppercase tracking-widest">{t.scannerResults}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyReport}
                      disabled={!resultMarkdown}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 bg-white/5 hover:bg-white/10 text-primary border border-white/10 disabled:opacity-50"
                    >
                      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      <span>{copied ? (language === "id" ? "Tersalin!" : "Copied!") : (language === "id" ? "Salin" : "Copy")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadReport}
                      disabled={!resultMarkdown}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 bg-white/5 hover:bg-white/10 text-primary border border-white/10 disabled:opacity-50"
                    >
                      <Download size={14} />
                      <span>{language === "id" ? "Unduh" : "Download"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveToCollection}
                      disabled={savedToCollection}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${savedToCollection
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
                      }`}
                    >
                      {savedToCollection ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                      <span>{savedToCollection ? t.scannerSaved : t.saveToCollection}</span>
                    </button>
                  </div>
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
