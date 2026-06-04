import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Share, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { buildScannerPrompt } from '@baristachaw/shared';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import {
  ActionButton,
  AppShell,
  BottomActionDock,
  HeroHeader,
  InfoPill,
  ResultSheet,
  SectionCard,
  SegmentedControl,
} from '../design-system';
import { ApiClient, ApiError } from '../services/apiClient';
import { usePreferredMobileLanguage } from '../hooks/usePreferredMobileLanguage';
import { ensureCameraPermission, ensureMediaLibraryPermission } from '../services/permissions';
import { hapticError, hapticSuccess, hapticWarning } from '../services/haptics';
import { trackEvent } from '../services/telemetry';
import { uiTokens } from '../theme/tokens';
import type { AuthSession, MobileQuickSavePayload } from '../types';
import { getMobileLocalization } from '../utils/localization';

type ScannerMode = 'auto' | 'ocr' | 'video';
type ScannerPhase = 'choose_input' | 'ready' | 'analyzing' | 'done' | 'failed';

type ScannerScreenProps = {
  apiClient: ApiClient;
  session: AuthSession | null;
  isOnline: boolean;
  guestModeEnabled: boolean;
  onSaveToCollection: (payload: MobileQuickSavePayload) => Promise<void>;
};

const MAX_INLINE_ATTACHMENT_BYTES = 2_500_000;
const MAX_INLINE_ATTACHMENT_LABEL = '2.5MB';

async function readBase64FromUri(uri: string): Promise<string> {
  return new FileSystem.File(uri).base64();
}

function estimateBase64ByteSize(base64: string): number {
  const normalized = String(base64 || '').replace(/\s/g, '');
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

export function ScannerScreen({ apiClient, session, isOnline, guestModeEnabled, onSaveToCollection }: ScannerScreenProps) {
  const preferredLanguage = usePreferredMobileLanguage(session?.user.id);
  const { direction, language, web: webT } = useMemo(() => getMobileLocalization(preferredLanguage), [preferredLanguage]);
  const isRtl = direction === 'rtl';
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mode, setMode] = useState<ScannerMode>('auto');
  const [mediaBase64, setMediaBase64] = useState('');
  const [mediaMimeType, setMediaMimeType] = useState('image/jpeg');
  const [mediaUri, setMediaUri] = useState('');
  const [inputSourceLabel, setInputSourceLabel] = useState('');
  const [liveCameraOpen, setLiveCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [phase, setPhase] = useState<ScannerPhase>('choose_input');
  const modeLabels = useMemo(() => {
    switch (language) {
      case 'id':
        return { auto: 'Analisis Kopi', ocr: 'Baca Label', video: 'Video Seduh', mediaInput: 'Input Media', authHint: 'Masuk untuk memindai dan menyimpan hasil.' };
      default:
        return { auto: 'Coffee Analysis', ocr: 'Read Label', video: 'Brew Video', mediaInput: 'Media Input', authHint: 'Sign in to scan and save results.' };
    }
  }, [language]);
  const copy = useMemo(() => {
    if (language === 'id') {
      return {
        ocrDescription: 'Ekstrak teks label, menu, atau kemasan dengan struktur yang lebih rapi.',
        ocrPhase: 'Pilih gambar atau file, lalu ekstrak teks yang terlihat dan metadata kopi.',
        videoDescription: 'Segera hadir. Review klip seduh belum aktif di rilis ini.',
        videoPhase: 'Gunakan Analisis Kopi atau Baca Label untuk alur scan yang siap produksi.',
        autoDescription: 'Analisis gambar kopi dengan observasi khusus barista dan catatan perbaikan.',
        autoPhase: 'Pilih gambar, tinjau, lalu jalankan analisis kopi terstruktur.',
        previewReady: 'Pratinjau siap',
        resultReady: 'Hasil siap',
        needsRetry: 'Perlu coba lagi',
        chooseInput: 'Pilih input',
        videoParity: 'Video seduh terlihat untuk paritas peta jalan, tetapi analisis belum aktif.',
        inputAttached: 'Input sudah terpasang. Jalankan analisis saat siap.',
        analyzing: 'Menganalisis media dan menyiapkan hasil terstruktur...',
        reviewResult: 'Tinjau hasilnya, lalu simpan atau bagikan.',
        analyzeRetry: 'Analisis belum selesai. Tinjau input lalu coba lagi.',
        choosePrompt: 'Pilih foto, tangkapan kamera langsung, atau file yang kompatibel untuk memulai.',
        comingSoon: 'Segera hadir',
        videoInactive: 'Video seduh belum aktif di versi ini. Gunakan Analisis Kopi atau Baca Label.',
        needsAttention: 'Perlu perhatian',
        signInToScan: 'Masuk untuk memindai',
        offlineMode: 'Mode offline',
        stageMedia: 'Anda bisa menyiapkan media sekarang. Analisis dilanjutkan setelah tersambung.',
      };
    }
    return {
      ocrDescription: 'Extract label, menu, or packaging text with cleaner structure.',
      ocrPhase: 'Pick an image or file, then extract visible text and coffee metadata.',
      videoDescription: 'Coming soon. Brew clip review is not enabled in this release.',
      videoPhase: 'Use Coffee Analysis or Read Label for the production-ready scan flow.',
      autoDescription: 'Analyze coffee images with barista-focused observations and improvement notes.',
      autoPhase: 'Choose an image, review it, then run a structured coffee analysis.',
      previewReady: 'Preview ready',
      resultReady: 'Result ready',
      needsRetry: 'Needs retry',
      chooseInput: 'Choose input',
      videoParity: 'Brew Video is visible for roadmap parity, but analysis is not enabled yet.',
      inputAttached: 'Input is attached. Run analysis when you are ready.',
      analyzing: 'Analyzing media and preparing a structured result...',
      reviewResult: 'Review the result, then save or share it.',
      analyzeRetry: 'Analysis did not complete. Review the input and retry.',
      choosePrompt: 'Choose a photo, live camera frame, or compatible file to begin.',
      comingSoon: 'Coming Soon',
      videoInactive: 'Brew Video is not active in this build. Use Coffee Analysis or Read Label instead.',
      needsAttention: 'Needs attention',
      signInToScan: 'Sign in to scan',
      offlineMode: 'Offline mode',
      stageMedia: 'You can stage media now. Analysis resumes after reconnect.',
    };
  }, [language]);
  const uiCopy = useMemo(() => {
    const fallback = {
      gallery: 'Gallery',
      files: 'Files',
      liveCamera: 'Live Camera',
      openCamera: 'Open Camera',
      preview: 'Preview',
      attachedFile: 'Attached file',
      attached: 'Attached',
      saved: 'Saved',
      shareResultTitle: 'Baristachaw Scan Result',
      shareAction: 'Share',
      change: 'Change',
      videoBuildError: 'Use Files or Gallery for video scan in this build.',
      captureFrameFailed: 'Failed to capture camera frame.',
      captureImageFailed: 'Failed to capture image.',
      cameraFront: 'Front',
      cameraBack: 'Back',
      capture: 'Capture',
    };
    if (language === 'id') return { ...fallback, gallery: 'Galeri', files: 'Berkas', liveCamera: 'Kamera Langsung', openCamera: 'Buka Kamera', preview: 'Pratinjau', attachedFile: 'Berkas terlampir', attached: 'Terlampir', saved: 'Tersimpan', shareResultTitle: 'Hasil Pemindaian Baristachaw', shareAction: 'Bagikan', change: 'Ganti', videoBuildError: 'Gunakan Berkas atau Galeri untuk pemindaian video pada versi ini.', captureFrameFailed: 'Gagal mengambil tangkapan dari kamera.', captureImageFailed: 'Gagal mengambil foto.', cameraFront: 'Depan', cameraBack: 'Belakang', capture: 'Ambil Foto' };
    return fallback;
  }, [language]);
  const mediaTooLargeMessage = useMemo(() => {
    if (language === 'id') return `Media terlalu besar (maks ${MAX_INLINE_ATTACHMENT_LABEL}).`;
    return `Media too large (max ${MAX_INLINE_ATTACHMENT_LABEL}).`;
  }, [language]);

  const resetDraft = () => {
    setMediaBase64('');
    setMediaMimeType('image/jpeg');
    setMediaUri('');
    setInputSourceLabel('');
    setLiveCameraOpen(false);
    setResult('');
    setError('');
    setSaved(false);
    setPhase('choose_input');
  };

  useEffect(() => {
    trackEvent('screen_ready', { screen: 'scanner', hasSession: Boolean(session) });
    if (!session) {
      trackEvent('auth_gate_seen', { surface: 'scanner', guestModeEnabled });
    }
  }, [guestModeEnabled, session]);

  useEffect(() => {
    if (!isOnline) {
      trackEvent('offline_gate_seen', { surface: 'scanner', hasSession: Boolean(session) });
    }
  }, [isOnline, session]);

  useEffect(() => {
    if (mode === 'video' && liveCameraOpen) {
      setLiveCameraOpen(false);
    }
  }, [liveCameraOpen, mode]);

  const modeMeta = useMemo(() => {
    switch (mode) {
      case 'ocr':
      return {
          title: modeLabels.ocr,
          description: copy.ocrDescription,
          phaseCopy: copy.ocrPhase,
        };
      case 'video':
        return {
          title: modeLabels.video,
          description: copy.videoDescription,
          phaseCopy: copy.videoPhase,
        };
      default:
        return {
          title: modeLabels.auto,
          description: copy.autoDescription,
          phaseCopy: copy.autoPhase,
        };
    }
  }, [copy, mode, modeLabels.auto, modeLabels.ocr, modeLabels.video]);

  const phaseLabel = useMemo(() => {
    switch (phase) {
      case 'ready':
        return copy.previewReady;
      case 'analyzing':
        return webT.analyzing;
      case 'done':
        return copy.resultReady;
      case 'failed':
        return copy.needsRetry;
      default:
        return copy.chooseInput;
    }
  }, [copy, phase, webT.analyzing]);

  const phaseDescription = useMemo(() => {
    if (mode === 'video') {
      return copy.videoParity;
    }
    switch (phase) {
      case 'ready':
        return copy.inputAttached;
      case 'analyzing':
        return copy.analyzing;
      case 'done':
        return copy.reviewResult;
      case 'failed':
        return error || copy.analyzeRetry;
      default:
        return copy.choosePrompt;
    }
  }, [copy, error, mode, phase]);

  const statusCard = useMemo(() => {
    if (mode === 'video') {
      return {
        tone: 'accent' as const,
        title: copy.comingSoon,
        subtitle: copy.videoInactive,
      };
    }
    if (error && phase !== 'done') {
      return {
        tone: 'warning' as const,
        title: copy.needsAttention,
        subtitle: error,
      };
    }
    if (!session) {
      return {
        tone: 'accent' as const,
        title: copy.signInToScan,
        subtitle: modeLabels.authHint,
      };
    }
    if (!isOnline) {
      return {
        tone: 'warning' as const,
        title: copy.offlineMode,
        subtitle: copy.stageMedia,
      };
    }
    return null;
  }, [copy, error, isOnline, mode, phase, session]);

  const pickFromLibrary = async () => {
    setError('');

    if (mode === 'video') {
      setError(copy.videoInactive);
      await hapticWarning();
      return;
    }

    const mediaPermission = await ensureMediaLibraryPermission();
    if (!mediaPermission.granted) {
      setError(webT.chatCameraDeniedUsePhotoFile || 'Photo library permission is required to pick from gallery.');
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      allowsEditing: false,
      base64: true,
      quality: 0.55,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    };

    const response = await ImagePicker.launchImageLibraryAsync(options);

    if (response.canceled || !response.assets.length) return;
    const asset = response.assets[0];

    let base64 = asset.base64 || '';
    if (!base64 && asset.uri) {
      base64 = await readBase64FromUri(asset.uri);
    }

    if (!base64) {
      setError(webT.chatAttachmentPrepareFailed || 'Selected file is missing base64 payload.');
      await hapticWarning();
      return;
    }
    if (estimateBase64ByteSize(base64) > MAX_INLINE_ATTACHMENT_BYTES) {
      setError(mediaTooLargeMessage);
      await hapticWarning();
      return;
    }

    setMediaBase64(base64);
    setMediaMimeType(asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
    setMediaUri(asset.uri);
    setInputSourceLabel(webT.chatComposerPhoto || uiCopy.gallery);
    setSaved(false);
    setResult('');
    setPhase('ready');
    trackEvent('feature_used', { feature: 'scanner_pick_library', mode });
  };

  const openLiveCamera = async () => {
    setError('');

    if (mode === 'video') {
      setError(uiCopy.videoBuildError);
      return;
    }

    const pickerPermission = await ensureCameraPermission();
    if (!pickerPermission.granted) {
      setError(webT.chatCameraDeniedUsePhotoFile || 'Camera permission is required to scan using the camera.');
      return;
    }

    const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
    if (!permission?.granted) {
      setError(webT.chatCameraDeniedUsePhotoFile || 'Camera permission is required to open live scanner.');
      return;
    }

    setLiveCameraOpen(true);
    setInputSourceLabel(webT.scannerCamera || uiCopy.liveCamera);
    trackEvent('feature_used', { feature: 'scanner_open_camera', mode });
  };

  const captureLiveFrame = async () => {
    if (!cameraRef.current) return;

    try {
      const captured = await cameraRef.current.takePictureAsync({ quality: 0.55, base64: true });
      if (!captured?.base64) {
        setError(uiCopy.captureFrameFailed);
        await hapticWarning();
        return;
      }
      if (estimateBase64ByteSize(captured.base64) > MAX_INLINE_ATTACHMENT_BYTES) {
        setError(mediaTooLargeMessage);
        await hapticWarning();
        return;
      }

      setMediaBase64(captured.base64);
      setMediaMimeType('image/jpeg');
      setMediaUri(captured.uri || '');
      setInputSourceLabel(webT.scannerCamera || uiCopy.liveCamera);
      setSaved(false);
      setResult('');
      setLiveCameraOpen(false);
      setPhase('ready');
      trackEvent('action_succeeded', { action: 'scanner_capture_frame', mode });
      await hapticSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : uiCopy.captureImageFailed);
      setPhase('failed');
      trackEvent('action_failed', { action: 'scanner_capture_frame', mode });
      await hapticError();
    }
  };

  const pickFromFiles = async () => {
    setError('');

    if (mode === 'video') {
      setError(copy.videoInactive);
      await hapticWarning();
      return;
    }

    const selection = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['image/*', 'application/pdf', 'text/*', 'audio/*'],
    });

    if (selection.canceled || !selection.assets.length) return;

    const asset = selection.assets[0];
    const uri = asset.uri;
    const base64 = await readBase64FromUri(uri);

    if (!base64) {
      setError(webT.chatAttachmentPrepareFailed || 'Unable to read selected file.');
      await hapticWarning();
      return;
    }
    if (estimateBase64ByteSize(base64) > MAX_INLINE_ATTACHMENT_BYTES) {
      setError(mediaTooLargeMessage);
      await hapticWarning();
      return;
    }

    setMediaBase64(base64);
    setMediaMimeType(asset.mimeType || 'image/jpeg');
    setMediaUri(uri);
    setInputSourceLabel(webT.chatComposerFile || uiCopy.files);
    setSaved(false);
    setResult('');
    setPhase('ready');
    trackEvent('feature_used', { feature: 'scanner_pick_file', mode });
  };

  const analyzeMedia = async () => {
    if (mode === 'video') {
      setError(copy.videoInactive);
      setPhase('failed');
      await hapticWarning();
      return;
    }
    if (!session) {
      setError(copy.signInToScan);
      setPhase('failed');
      trackEvent('auth_gate_seen', { surface: 'scanner', trigger: 'analyze_without_session' });
      return;
    }
    if (!isOnline) {
      setError(copy.stageMedia);
      setPhase('failed');
      trackEvent('offline_gate_seen', { surface: 'scanner', trigger: 'analyze' });
      return;
    }
    if (!mediaBase64) {
      setError(copy.choosePrompt);
      setPhase('failed');
      return;
    }
    if (estimateBase64ByteSize(mediaBase64) > MAX_INLINE_ATTACHMENT_BYTES) {
      setError(mediaTooLargeMessage);
      setPhase('failed');
      return;
    }

    setLoading(true);
    setError('');
    setSaved(false);
    setPhase('analyzing');

    try {
      const responseLanguage = language === 'id' ? 'Bahasa Indonesia' : 'English';
      const prompt = buildScannerPrompt(mode === 'ocr' ? 'ocr' : 'auto', responseLanguage, language);

      const action = mediaMimeType.startsWith('image/') ? 'analyze_image' : 'analyze_attachment';
      const response = await apiClient.runAiAction(action, prompt, {
        image: mediaBase64,
        mimeType: mediaMimeType,
        clientContext: {
          platform: 'mobile',
          surface: 'scanner',
        },
      });
      const text = response.text?.trim() || response.error || '';
      if (!text) {
        setError(webT.homeLiveSearchRetry || 'Analysis finished without usable output. Please retry with a clearer input.');
        setPhase('failed');
        trackEvent('screen_error', { screen: 'scanner', reason: 'empty_result', mode });
        return;
      }
      setResult(text);
      setPhase('done');
      trackEvent('action_succeeded', { action: 'scanner_analyze_media', mode });
      await hapticSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(webT.scannerAnalyzeFailed || 'Failed to analyze media.');
      }
      setPhase('failed');
      trackEvent('action_failed', {
        action: 'scanner_analyze_media',
        mode,
        errorCode: err instanceof ApiError ? err.errorCode || 'api_error' : 'unknown',
      });
      await hapticError();
    } finally {
      setLoading(false);
    }
  };

  const saveResult = async () => {
    if (!result.trim()) return;
    await onSaveToCollection({
      title:
        mode === 'ocr'
          ? (webT.scannerSavedTitleOcr || 'Read Label Result')
          : (webT.scannerSavedTitleAuto || 'Coffee Analysis Result'),
      markdown: result,
      source: 'scanner',
      sources: [],
    });
    setSaved(true);
    trackEvent('action_succeeded', { action: 'scanner_save_result', mode });
    await hapticSuccess();
  };

  const shareResult = async () => {
    if (!result.trim()) return;
    await Share.share({
      title: uiCopy.shareResultTitle,
      message: result,
    });
    trackEvent('action_succeeded', { action: 'scanner_share_result', mode });
  };

  const bottomDock = useMemo(() => {
    if (liveCameraOpen || phase === 'done') return undefined;

    if (mode === 'video') {
      return (
        <BottomActionDock
          primaryAction={{ label: copy.comingSoon, onPress: () => undefined, disabled: true }}
          secondaryActions={[
            { label: modeLabels.auto, onPress: () => setMode('auto') },
            { label: modeLabels.ocr, onPress: () => setMode('ocr') },
          ]}
        />
      );
    }

    if (phase === 'ready') {
      return (
        <BottomActionDock
          primaryAction={{ label: loading ? webT.analyzing : webT.analyze, onPress: () => void analyzeMedia(), disabled: loading }}
          secondaryActions={[
            { label: webT.edit || uiCopy.change, onPress: () => { void pickFromLibrary(); } },
            { label: webT.reset, onPress: resetDraft, disabled: !mediaBase64 && !result && !error },
          ]}
        />
      );
    }

    if (phase === 'failed' && mediaBase64) {
      return (
        <BottomActionDock
          primaryAction={{ label: webT.retry, onPress: () => void analyzeMedia() }}
          secondaryActions={[
            { label: webT.edit || uiCopy.change, onPress: () => { void pickFromLibrary(); } },
            { label: webT.reset, onPress: resetDraft },
          ]}
        />
      );
    }

    return (
      <BottomActionDock
        primaryAction={{
          label: webT.scannerCamera || uiCopy.openCamera,
          onPress: () => { void openLiveCamera(); },
        }}
        secondaryActions={[
          { label: webT.chatComposerPhoto || uiCopy.gallery, onPress: () => { void pickFromLibrary(); } },
          { label: webT.chatComposerFile || uiCopy.files, onPress: () => { void pickFromFiles(); } },
        ]}
      />
    );
  }, [error, liveCameraOpen, loading, mediaBase64, mode, phase, result]);

  return (
    <>
      <AppShell
        header={(
          <HeroHeader
            eyebrow={webT.visionScan}
            title={modeMeta.title}
            subtitle={modeMeta.description}
            direction={direction}
            status={(
              <>
                <InfoPill label={phaseLabel} tone={phase === 'failed' ? 'warning' : phase === 'done' ? 'success' : 'accent'} />
                {inputSourceLabel ? <InfoPill label={inputSourceLabel} /> : null}
              </>
            )}
          />
        )}
        bottomDock={bottomDock}
      >
        {statusCard ? (
          <SectionCard tone={statusCard.tone} title={statusCard.title} subtitle={statusCard.subtitle} compact />
        ) : null}

        <SegmentedControl
          items={[
            { value: 'auto', label: modeLabels.auto },
            { value: 'ocr', label: modeLabels.ocr },
            { value: 'video', label: modeLabels.video },
          ]}
          value={mode}
          direction={direction}
          onChange={(value) => {
            resetDraft();
            setMode(value);
            setError('');
          }}
        />

        {liveCameraOpen ? (
          <SectionCard title={webT.scannerCamera || uiCopy.liveCamera} subtitle={copy.inputAttached} tone="accent">
            <View style={styles.cameraWrap}>
              <CameraView ref={cameraRef} style={styles.cameraPreview} facing={cameraFacing} />
            </View>
            <View style={[styles.inlineButtonRow, isRtl ? styles.rowRtl : null]}>
              <ActionButton label={webT.close} tone="ghost" compact onPress={() => setLiveCameraOpen(false)} />
              <ActionButton
                label={cameraFacing === 'back' ? uiCopy.cameraFront : uiCopy.cameraBack}
                tone="ghost"
                compact
                onPress={() => setCameraFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
              />
              <ActionButton label={uiCopy.capture} tone="primary" compact onPress={() => void captureLiveFrame()} />
            </View>
          </SectionCard>
        ) : mediaUri ? (
          <SectionCard title={webT.copySummary || uiCopy.preview} subtitle={phaseDescription} tone="accent">
            {mediaMimeType.startsWith('image/') ? (
              <Image source={{ uri: mediaUri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={styles.filePreview}>
                <Text style={[styles.filePreviewTitle, isRtl ? styles.textRtl : null]}>{webT.chatAttachmentLabel || uiCopy.attachedFile}</Text>
                <Text style={styles.filePreviewBody}>{mediaMimeType}</Text>
              </View>
            )}
            <View style={[styles.inlineInfoRow, isRtl ? styles.rowRtl : null]}>
              <InfoPill label={inputSourceLabel || webT.chatAttachmentLabel || uiCopy.attached} tone="accent" />
              <InfoPill label={modeMeta.title} />
            </View>
          </SectionCard>
        ) : (
          <SectionCard title={modeLabels.mediaInput} subtitle={modeMeta.phaseCopy} tone="accent">
            <View style={[styles.inlineInfoRow, isRtl ? styles.rowRtl : null]}>
              <InfoPill label={modeMeta.title} tone="accent" />
              {mode === 'video' ? <InfoPill label={copy.comingSoon} tone="warning" /> : <InfoPill label={`${webT.scannerCamera || uiCopy.openCamera} / ${webT.chatComposerPhoto || uiCopy.gallery} / ${webT.chatComposerFile || uiCopy.files}`} />}
            </View>
          </SectionCard>
        )}

        {phase === 'failed' ? (
          <SectionCard title={webT.retry} subtitle={error || copy.analyzeRetry} tone="warning" compact>
            <View style={[styles.inlineButtonRow, isRtl ? styles.rowRtl : null]}>
              {mediaBase64 ? <ActionButton label={webT.retry} tone="primary" compact onPress={() => void analyzeMedia()} /> : null}
              <ActionButton label={webT.reset} tone="ghost" compact onPress={resetDraft} />
            </View>
          </SectionCard>
        ) : null}
      </AppShell>

      <ResultSheet
        visible={phase === 'done' && Boolean(result)}
        direction={direction}
        title={webT.scanResult}
        subtitle={`${modeMeta.title}${inputSourceLabel ? ` • ${inputSourceLabel}` : ''}`}
        onClose={() => setPhase(result ? 'ready' : 'choose_input')}
        actions={[
          {
            label: saved ? webT.savedRecipes || uiCopy.saved : webT.saveResult,
            tone: 'primary',
            disabled: saved,
            onPress: () => { void saveResult(); },
          },
          {
            label: uiCopy.shareAction,
            onPress: () => { void shareResult(); },
          },
        ]}
        content={(
          <View style={styles.sheetStack}>
            <SectionCard title={webT.analyze} subtitle={copy.reviewResult} compact>
              <Text style={[styles.resultText, isRtl ? styles.textRtl : null]}>{result}</Text>
            </SectionCard>
            {error ? (
              <SectionCard tone="warning" title={webT.retry} subtitle={error} compact />
            ) : null}
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  statusCopy: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
  },
  bodyCopy: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight + 1,
  },
  inlineButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  inlineInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  cameraWrap: {
    borderRadius: uiTokens.radius.input,
    overflow: 'hidden',
    backgroundColor: '#0B0F19',
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
  },
  cameraPreview: {
    width: '100%',
    height: 280,
  },
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: uiTokens.radius.input,
    backgroundColor: uiTokens.surface.soft,
  },
  filePreview: {
    borderRadius: uiTokens.radius.input,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    backgroundColor: uiTokens.surface.strong,
    padding: 16,
    gap: 6,
  },
  filePreviewTitle: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
  filePreviewBody: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
    fontWeight: '600',
  },
  sheetStack: {
    gap: 12,
  },
  resultText: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight + 2,
  },
  textRtl: {
    textAlign: 'right',
  },
});
