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
      case 'ar':
        return { auto: 'تحليل القهوة', ocr: 'قراءة الملصق', video: 'فيديو التحضير', mediaInput: 'إدخال الوسائط', authHint: 'سجل الدخول للمسح وحفظ النتائج.' };
      case 'zh':
        return { auto: '咖啡分析', ocr: '读取标签', video: '冲煮视频', mediaInput: '媒体输入', authHint: '登录后即可扫描并保存结果。' };
      case 'ja':
        return { auto: 'コーヒー分析', ocr: 'ラベル読取', video: '抽出ビデオ', mediaInput: 'メディア入力', authHint: 'スキャンと保存にはサインインが必要です。' };
      case 'ko':
        return { auto: '커피 분석', ocr: '라벨 읽기', video: '브루 비디오', mediaInput: '미디어 입력', authHint: '스캔하고 결과를 저장하려면 로그인하세요.' };
      case 'th':
        return { auto: 'วิเคราะห์กาแฟ', ocr: 'อ่านฉลาก', video: 'วิดีโอการชง', mediaInput: 'อินพุตสื่อ', authHint: 'ลงชื่อเข้าใช้เพื่อสแกนและบันทึกผลลัพธ์' };
      case 'vi':
        return { auto: 'Phân tích cà phê', ocr: 'Đọc nhãn', video: 'Video pha', mediaInput: 'Dữ liệu phương tiện', authHint: 'Đăng nhập để quét và lưu kết quả.' };
      case 'ms':
        return { auto: 'Analisis Kopi', ocr: 'Baca Label', video: 'Video Bancuhan', mediaInput: 'Input Media', authHint: 'Log masuk untuk mengimbas dan menyimpan hasil.' };
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
        videoParity: 'Brew Video terlihat untuk paritas roadmap, tetapi analisis belum aktif.',
        inputAttached: 'Input sudah terpasang. Jalankan analisis saat siap.',
        analyzing: 'Menganalisis media dan menyiapkan hasil terstruktur...',
        reviewResult: 'Tinjau hasilnya, lalu simpan atau bagikan.',
        analyzeRetry: 'Analisis belum selesai. Tinjau input lalu coba lagi.',
        choosePrompt: 'Pilih foto, frame kamera langsung, atau file yang kompatibel untuk memulai.',
        comingSoon: 'Segera hadir',
        videoInactive: 'Brew Video belum aktif di build ini. Gunakan Analisis Kopi atau Baca Label.',
        needsAttention: 'Perlu perhatian',
        signInToScan: 'Masuk untuk memindai',
        offlineMode: 'Mode offline',
        stageMedia: 'Anda bisa menyiapkan media sekarang. Analisis dilanjutkan setelah tersambung.',
      };
    }
    if (language === 'ar') {
      return {
        ocrDescription: 'استخرج نص الملصق أو القائمة أو العبوة ببنية أوضح.',
        ocrPhase: 'اختر صورة أو ملفًا ثم استخرج النص الظاهر وبيانات القهوة.',
        videoDescription: 'قريبًا. مراجعة مقطع التحضير غير مفعلة في هذا الإصدار.',
        videoPhase: 'استخدم تحليل القهوة أو قراءة الملصق لمسار مسح جاهز للإنتاج.',
        autoDescription: 'حلل صور القهوة بملاحظات موجهة للباريستا ونصائح تحسين.',
        autoPhase: 'اختر صورة ثم راجعها وشغّل تحليلًا منظمًا للقهوة.',
        previewReady: 'المعاينة جاهزة',
        resultReady: 'النتيجة جاهزة',
        needsRetry: 'تحتاج إلى إعادة المحاولة',
        chooseInput: 'اختر الإدخال',
        videoParity: 'ميزة فيديو التحضير ظاهرة للمحاكاة، لكن التحليل غير مفعّل بعد.',
        inputAttached: 'تم إرفاق الإدخال. شغّل التحليل عندما تصبح جاهزًا.',
        analyzing: 'جارٍ تحليل الوسائط وتحضير نتيجة منظمة...',
        reviewResult: 'راجع النتيجة ثم احفظها أو شاركها.',
        analyzeRetry: 'لم يكتمل التحليل. راجع الإدخال ثم حاول مرة أخرى.',
        choosePrompt: 'اختر صورة أو لقطة كاميرا مباشرة أو ملفًا متوافقًا للبدء.',
        comingSoon: 'قريبًا',
        videoInactive: 'فيديو التحضير غير نشط في هذا الإصدار. استخدم تحليل القهوة أو قراءة الملصق.',
        needsAttention: 'يتطلب الانتباه',
        signInToScan: 'سجّل الدخول للمسح',
        offlineMode: 'وضع عدم الاتصال',
        stageMedia: 'يمكنك تجهيز الوسائط الآن. يُستأنف التحليل بعد إعادة الاتصال.',
      };
    }
    if (language === 'zh') {
      return {
        ocrDescription: '提取标签、菜单或包装文字，并整理为更清晰的结构。',
        ocrPhase: '选择图片或文件，然后提取可见文字和咖啡元数据。',
        videoDescription: '即将推出。此版本尚未启用冲煮视频分析。',
        videoPhase: '请使用咖啡分析或读取标签，获得可正式使用的扫描流程。',
        autoDescription: '以咖啡师视角分析咖啡图片，并给出改进建议。',
        autoPhase: '选择图片、确认内容，然后运行结构化咖啡分析。',
        previewReady: '预览已就绪',
        resultReady: '结果已就绪',
        needsRetry: '需要重试',
        chooseInput: '选择输入',
        videoParity: '冲煮视频目前仅用于路线图展示，分析尚未启用。',
        inputAttached: '输入已附加，准备好后即可开始分析。',
        analyzing: '正在分析媒体并准备结构化结果...',
        reviewResult: '查看结果，然后保存或分享。',
        analyzeRetry: '分析未完成。请检查输入后重试。',
        choosePrompt: '选择照片、实时相机画面或兼容文件以开始。',
        comingSoon: '即将推出',
        videoInactive: '此版本尚未启用冲煮视频。请改用咖啡分析或读取标签。',
        needsAttention: '需要关注',
        signInToScan: '登录后可扫描',
        offlineMode: '离线模式',
        stageMedia: '你现在可以先准备媒体内容，重新连接后会继续分析。',
      };
    }
    if (language === 'ja') {
      return {
        ocrDescription: 'ラベル、メニュー、包装の文字をより整理された形で抽出します。',
        ocrPhase: '画像またはファイルを選び、表示テキストとコーヒー情報を抽出します。',
        videoDescription: '近日公開。このリリースでは抽出動画レビューは未対応です。',
        videoPhase: '本番向けのスキャンはコーヒー分析またはラベル読取を使ってください。',
        autoDescription: 'バリスタ視点の観察と改善メモでコーヒー画像を分析します。',
        autoPhase: '画像を選択して確認し、構造化されたコーヒー分析を実行します。',
        previewReady: 'プレビュー準備完了',
        resultReady: '結果の準備完了',
        needsRetry: '再試行が必要です',
        chooseInput: '入力を選択',
        videoParity: '抽出ビデオはロードマップ表示用で、分析はまだ有効化されていません。',
        inputAttached: '入力を添付しました。準備ができたら分析を実行してください。',
        analyzing: 'メディアを分析し、構造化された結果を準備しています...',
        reviewResult: '結果を確認してから保存または共有してください。',
        analyzeRetry: '分析が完了しませんでした。入力を見直して再試行してください。',
        choosePrompt: '写真、ライブカメラのフレーム、または対応ファイルを選んで開始します。',
        comingSoon: '近日公開',
        videoInactive: 'このビルドでは抽出ビデオは利用できません。コーヒー分析またはラベル読取を使ってください。',
        needsAttention: '要確認',
        signInToScan: 'スキャンするにはサインイン',
        offlineMode: 'オフラインモード',
        stageMedia: 'メディアは今のうちに用意できます。再接続後に分析を再開します。',
      };
    }
    if (language === 'ko') {
      return {
        ocrDescription: '라벨, 메뉴, 포장 텍스트를 더 깔끔한 구조로 추출합니다.',
        ocrPhase: '이미지나 파일을 선택한 뒤 보이는 텍스트와 커피 메타데이터를 추출합니다.',
        videoDescription: '곧 제공됩니다. 이 릴리스에서는 브루 영상 검토가 아직 비활성화되어 있습니다.',
        videoPhase: '실사용 가능한 스캔 흐름은 커피 분석 또는 라벨 읽기를 사용하세요.',
        autoDescription: '바리스타 관찰 포인트와 개선 메모로 커피 이미지를 분석합니다.',
        autoPhase: '이미지를 고르고 검토한 뒤 구조화된 커피 분석을 실행하세요.',
        previewReady: '미리보기 준비됨',
        resultReady: '결과 준비됨',
        needsRetry: '재시도가 필요합니다',
        chooseInput: '입력 선택',
        videoParity: '브루 비디오는 로드맵 표시용이며 분석은 아직 활성화되지 않았습니다.',
        inputAttached: '입력이 첨부되었습니다. 준비되면 분석을 실행하세요.',
        analyzing: '미디어를 분석하고 구조화된 결과를 준비하는 중...',
        reviewResult: '결과를 검토한 뒤 저장하거나 공유하세요.',
        analyzeRetry: '분석이 완료되지 않았습니다. 입력을 확인한 뒤 다시 시도하세요.',
        choosePrompt: '사진, 실시간 카메라 프레임 또는 호환 파일을 선택해 시작하세요.',
        comingSoon: '곧 제공',
        videoInactive: '이 빌드에서는 브루 비디오가 비활성화되어 있습니다. 커피 분석 또는 라벨 읽기를 사용하세요.',
        needsAttention: '확인이 필요함',
        signInToScan: '스캔하려면 로그인',
        offlineMode: '오프라인 모드',
        stageMedia: '미디어는 지금 준비할 수 있으며, 다시 연결되면 분석이 이어집니다.',
      };
    }
    if (language === 'th') {
      return {
        ocrDescription: 'ดึงข้อความจากฉลาก เมนู หรือบรรจุภัณฑ์ให้อยู่ในโครงสร้างที่ชัดเจนขึ้น',
        ocrPhase: 'เลือกรูปภาพหรือไฟล์ แล้วดึงข้อความที่มองเห็นและข้อมูลเมตาของกาแฟ',
        videoDescription: 'เร็ว ๆ นี้ การรีวิววิดีโอการชงยังไม่เปิดใช้ในรุ่นนี้',
        videoPhase: 'ใช้วิเคราะห์กาแฟหรืออ่านฉลากสำหรับขั้นตอนสแกนที่พร้อมใช้งานจริง',
        autoDescription: 'วิเคราะห์ภาพกาแฟด้วยข้อสังเกตแบบบาริสต้าและคำแนะนำเพื่อการปรับปรุง',
        autoPhase: 'เลือกรูปภาพ ตรวจสอบ แล้วเริ่มการวิเคราะห์กาแฟแบบมีโครงสร้าง',
        previewReady: 'ตัวอย่างพร้อมแล้ว',
        resultReady: 'ผลลัพธ์พร้อมแล้ว',
        needsRetry: 'ต้องลองอีกครั้ง',
        chooseInput: 'เลือกอินพุต',
        videoParity: 'วิดีโอการชงแสดงไว้เพื่อความสอดคล้องตามโรดแมป แต่ยังไม่เปิดใช้การวิเคราะห์',
        inputAttached: 'แนบอินพุตแล้ว พร้อมเมื่อไรค่อยเริ่มวิเคราะห์',
        analyzing: 'กำลังวิเคราะห์สื่อและเตรียมผลลัพธ์แบบมีโครงสร้าง...',
        reviewResult: 'ตรวจสอบผลลัพธ์ แล้วบันทึกหรือแชร์ต่อ',
        analyzeRetry: 'การวิเคราะห์ยังไม่เสร็จสมบูรณ์ ตรวจสอบอินพุตแล้วลองใหม่',
        choosePrompt: 'เลือกภาพถ่าย เฟรมจากกล้องสด หรือไฟล์ที่รองรับเพื่อเริ่มต้น',
        comingSoon: 'เร็ว ๆ นี้',
        videoInactive: 'วิดีโอการชงยังไม่พร้อมใช้งานในบิลด์นี้ ให้ใช้วิเคราะห์กาแฟหรืออ่านฉลากแทน',
        needsAttention: 'ต้องใส่ใจ',
        signInToScan: 'ลงชื่อเข้าใช้เพื่อสแกน',
        offlineMode: 'โหมดออฟไลน์',
        stageMedia: 'คุณสามารถเตรียมสื่อไว้ก่อนได้ การวิเคราะห์จะทำต่อเมื่อกลับมาเชื่อมต่อ',
      };
    }
    if (language === 'vi') {
      return {
        ocrDescription: 'Trích xuất chữ trên nhãn, menu hoặc bao bì với cấu trúc rõ ràng hơn.',
        ocrPhase: 'Chọn ảnh hoặc tệp, rồi trích xuất văn bản hiển thị và dữ liệu cà phê.',
        videoDescription: 'Sắp ra mắt. Bản phát hành này chưa bật xem lại video pha.',
        videoPhase: 'Hãy dùng Phân tích cà phê hoặc Đọc nhãn cho quy trình quét sẵn sàng sử dụng.',
        autoDescription: 'Phân tích ảnh cà phê với nhận xét theo góc nhìn barista và gợi ý cải thiện.',
        autoPhase: 'Chọn ảnh, xem lại, rồi chạy phân tích cà phê có cấu trúc.',
        previewReady: 'Bản xem trước đã sẵn sàng',
        resultReady: 'Kết quả đã sẵn sàng',
        needsRetry: 'Cần thử lại',
        chooseInput: 'Chọn đầu vào',
        videoParity: 'Video pha chỉ hiển thị để giữ đồng nhất lộ trình, chưa bật phân tích.',
        inputAttached: 'Đã đính kèm đầu vào. Hãy chạy phân tích khi bạn sẵn sàng.',
        analyzing: 'Đang phân tích phương tiện và chuẩn bị kết quả có cấu trúc...',
        reviewResult: 'Xem lại kết quả rồi lưu hoặc chia sẻ.',
        analyzeRetry: 'Phân tích chưa hoàn tất. Hãy xem lại đầu vào rồi thử lại.',
        choosePrompt: 'Chọn ảnh, khung hình camera trực tiếp hoặc tệp tương thích để bắt đầu.',
        comingSoon: 'Sắp ra mắt',
        videoInactive: 'Video pha chưa hoạt động trong bản dựng này. Hãy dùng Phân tích cà phê hoặc Đọc nhãn.',
        needsAttention: 'Cần chú ý',
        signInToScan: 'Đăng nhập để quét',
        offlineMode: 'Chế độ ngoại tuyến',
        stageMedia: 'Bạn có thể chuẩn bị phương tiện ngay bây giờ. Phân tích sẽ tiếp tục sau khi kết nối lại.',
      };
    }
    if (language === 'ms') {
      return {
        ocrDescription: 'Ekstrak teks label, menu, atau bungkusan dengan struktur yang lebih kemas.',
        ocrPhase: 'Pilih imej atau fail, kemudian ekstrak teks yang kelihatan dan metadata kopi.',
        videoDescription: 'Akan datang. Semakan klip bancuhan belum aktif dalam keluaran ini.',
        videoPhase: 'Gunakan Analisis Kopi atau Baca Label untuk aliran imbasan yang sedia digunakan.',
        autoDescription: 'Analisis imej kopi dengan pemerhatian berfokuskan barista dan nota penambahbaikan.',
        autoPhase: 'Pilih imej, semak, kemudian jalankan analisis kopi berstruktur.',
        previewReady: 'Pratonton sedia',
        resultReady: 'Hasil sedia',
        needsRetry: 'Perlu cuba lagi',
        chooseInput: 'Pilih input',
        videoParity: 'Video Bancuhan dipaparkan untuk pariti pelan hala tuju, tetapi analisis belum diaktifkan.',
        inputAttached: 'Input telah dilampirkan. Jalankan analisis apabila anda bersedia.',
        analyzing: 'Sedang menganalisis media dan menyediakan hasil berstruktur...',
        reviewResult: 'Semak hasil, kemudian simpan atau kongsi.',
        analyzeRetry: 'Analisis tidak selesai. Semak input dan cuba lagi.',
        choosePrompt: 'Pilih foto, bingkai kamera langsung, atau fail yang serasi untuk bermula.',
        comingSoon: 'Akan datang',
        videoInactive: 'Video Bancuhan tidak aktif dalam binaan ini. Gunakan Analisis Kopi atau Baca Label.',
        needsAttention: 'Perlu perhatian',
        signInToScan: 'Log masuk untuk mengimbas',
        offlineMode: 'Mod luar talian',
        stageMedia: 'Anda boleh sediakan media sekarang. Analisis akan disambung selepas sambungan pulih.',
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
      change: 'Change',
      videoBuildError: 'Use Files or Gallery for video scan in this build.',
      captureFrameFailed: 'Failed to capture camera frame.',
      captureImageFailed: 'Failed to capture image.',
      cameraFront: 'Front',
      cameraBack: 'Back',
      capture: 'Capture',
    };
    if (language === 'zh') return { ...fallback, gallery: '相册', files: '文件', liveCamera: '实时相机', openCamera: '打开相机', preview: '预览', attachedFile: '已附文件', attached: '已附加', saved: '已保存', shareResultTitle: 'Baristachaw 扫描结果', change: '更换', videoBuildError: '此版本的视频扫描请改用文件或相册。', captureFrameFailed: '无法捕捉相机画面。', captureImageFailed: '无法拍摄图片。', cameraFront: '前置', cameraBack: '后置', capture: '拍摄' };
    if (language === 'ja') return { ...fallback, gallery: 'ギャラリー', files: 'ファイル', liveCamera: 'ライブカメラ', openCamera: 'カメラを開く', preview: 'プレビュー', attachedFile: '添付ファイル', attached: '添付済み', saved: '保存済み', shareResultTitle: 'Baristachaw スキャン結果', change: '変更', videoBuildError: 'このビルドの動画スキャンではファイルまたはギャラリーを使ってください。', captureFrameFailed: 'カメラフレームを取得できませんでした。', captureImageFailed: '画像を撮影できませんでした。', cameraFront: '前面', cameraBack: '背面', capture: '撮影' };
    if (language === 'ko') return { ...fallback, gallery: '갤러리', files: '파일', liveCamera: '실시간 카메라', openCamera: '카메라 열기', preview: '미리보기', attachedFile: '첨부 파일', attached: '첨부됨', saved: '저장됨', shareResultTitle: 'Baristachaw 스캔 결과', change: '변경', videoBuildError: '이 빌드의 영상 스캔은 파일 또는 갤러리를 사용하세요.', captureFrameFailed: '카메라 프레임을 캡처할 수 없습니다.', captureImageFailed: '이미지를 캡처할 수 없습니다.', cameraFront: '전면', cameraBack: '후면', capture: '캡처' };
    if (language === 'th') return { ...fallback, gallery: 'แกลเลอรี', files: 'ไฟล์', liveCamera: 'กล้องสด', openCamera: 'เปิดกล้อง', preview: 'ตัวอย่าง', attachedFile: 'ไฟล์ที่แนบ', attached: 'แนบแล้ว', saved: 'บันทึกแล้ว', shareResultTitle: 'ผลการสแกน Baristachaw', change: 'เปลี่ยน', videoBuildError: 'การสแกนวิดีโอในบิลด์นี้ให้ใช้ไฟล์หรือแกลเลอรี', captureFrameFailed: 'จับภาพจากกล้องไม่สำเร็จ', captureImageFailed: 'ถ่ายภาพไม่สำเร็จ', cameraFront: 'หน้า', cameraBack: 'หลัง', capture: 'ถ่ายภาพ' };
    if (language === 'vi') return { ...fallback, gallery: 'Thư viện', files: 'Tệp', liveCamera: 'Camera trực tiếp', openCamera: 'Mở camera', preview: 'Xem trước', attachedFile: 'Tệp đính kèm', attached: 'Đã đính kèm', saved: 'Đã lưu', shareResultTitle: 'Kết quả quét Baristachaw', change: 'Thay đổi', videoBuildError: 'Quét video trong bản dựng này hãy dùng Tệp hoặc Thư viện.', captureFrameFailed: 'Không thể chụp khung hình từ camera.', captureImageFailed: 'Không thể chụp ảnh.', cameraFront: 'Trước', cameraBack: 'Sau', capture: 'Chụp' };
    if (language === 'ms') return { ...fallback, gallery: 'Galeri', files: 'Fail', liveCamera: 'Kamera Langsung', openCamera: 'Buka Kamera', preview: 'Pratonton', attachedFile: 'Fail dilampirkan', attached: 'Dilampirkan', saved: 'Disimpan', shareResultTitle: 'Hasil imbasan Baristachaw', change: 'Tukar', videoBuildError: 'Imbasan video dalam binaan ini perlu menggunakan Fail atau Galeri.', captureFrameFailed: 'Gagal menangkap bingkai kamera.', captureImageFailed: 'Gagal menangkap imej.', cameraFront: 'Depan', cameraBack: 'Belakang', capture: 'Tangkap' };
    return fallback;
  }, [language]);
  const mediaTooLargeMessage = useMemo(() => {
    if (language === 'id') return `Media terlalu besar (maks ${MAX_INLINE_ATTACHMENT_LABEL}).`;
    if (language === 'ar') return `الوسائط كبيرة جدًا (الحد الأقصى ${MAX_INLINE_ATTACHMENT_LABEL}).`;
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
      const responseLanguage = language === 'id'
        ? 'Bahasa Indonesia'
        : language === 'ar'
          ? 'Arabic'
          : language;
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
            label: webT.copySummary || 'Share',
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
