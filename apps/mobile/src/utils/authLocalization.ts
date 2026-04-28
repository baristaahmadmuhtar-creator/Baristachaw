import type { Language } from '../web-shared/types';
import { DEFAULT_LANGUAGE } from '../web-shared/constants';
import { resolveMobileLanguage } from './localization';

export type MobileAuthMode = 'signIn' | 'signUp' | 'resetPassword' | 'accountHelp' | 'newPassword';

type MobileAuthModeCopy = {
  title: string;
  subtitle: string;
  submit: string;
  submitting: string;
};

export type MobileAuthCopy = {
  modes: Record<MobileAuthMode, MobileAuthModeCopy>;
  unavailableSignInTitle: string;
  unavailableSignUpTitle: string;
  invalidEmail: string;
  passwordMin: string;
  passwordMismatch: string;
  resetSendFailed: string;
  displayNameRequired: string;
  newPasswordSaveFailed: string;
  googleOpening: string;
  googleContinue: string;
  facebookOpening: string;
  facebookContinue: string;
  guestContinue: string;
  showPassword: string;
  hidePassword: string;
  tabSignIn: string;
  tabSignUp: string;
  tabReset: string;
  accountHelpTitle: string;
  accountHelpBody: string;
  backSignIn: string;
  recoverPassword: string;
  newPasswordLabel: string;
  confirmNewPasswordLabel: string;
  passwordMinPlaceholder: string;
  repeatNewPasswordPlaceholder: string;
  displayNameLabel: string;
  displayNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  confirmPasswordLabel: string;
  repeatPasswordPlaceholder: string;
  forgotPassword: string;
  signUpPrompt: string;
  accountHelpPrompt: string;
  alreadyHaveAccount: string;
  rememberPassword: string;
  forgotEmail: string;
  openSignIn: string;
  openSignUp: string;
  offlineNotice: string;
  appleOpening: string;
  appleSignIn: string;
};

const EN_AUTH_COPY: MobileAuthCopy = {
  modes: {
    signIn: {
      title: 'Baristachaw',
      subtitle: 'Use Google for protected AI features, or continue as a guest for the free workspace.',
      submit: 'Sign in with email',
      submitting: 'Checking account...',
    },
    signUp: {
      title: 'Baristachaw',
      subtitle: 'Start with Google or guest mode. You can upgrade the account when payments are active.',
      submit: 'Create account',
      submitting: 'Creating account...',
    },
    resetPassword: {
      title: 'Baristachaw',
      subtitle: 'Recover account access with a secure link sent to your email.',
      submit: 'Send recovery link',
      submitting: 'Sending link...',
    },
    accountHelp: {
      title: 'Baristachaw',
      subtitle: 'Account help for finding the safest sign-in path.',
      submit: 'Back to sign in',
      submitting: 'Preparing...',
    },
    newPassword: {
      title: 'Baristachaw',
      subtitle: 'Create a new password to finish account recovery.',
      submit: 'Save new password',
      submitting: 'Saving password...',
    },
  },
  unavailableSignInTitle: 'Sign in to Baristachaw',
  unavailableSignUpTitle: 'Join Baristachaw',
  invalidEmail: 'Enter a valid email.',
  passwordMin: 'Password must be at least 8 characters.',
  passwordMismatch: 'Password confirmation does not match.',
  resetSendFailed: 'The recovery link could not be sent yet.',
  displayNameRequired: 'Display name is required.',
  newPasswordSaveFailed: 'The new password could not be saved yet.',
  googleOpening: 'Opening...',
  googleContinue: 'Continue with Google',
  facebookOpening: 'Opening Facebook...',
  facebookContinue: 'Continue with Facebook',
  guestContinue: 'Continue as guest',
  showPassword: 'Show',
  hidePassword: 'Hide',
  tabSignIn: 'Sign in',
  tabSignUp: 'Register',
  tabReset: 'Recover',
  accountHelpTitle: 'Account help',
  accountHelpBody: 'Baristachaw uses Google or email, not a separate username. If you forgot the email, try Google first or search for the Baristachaw verification email.',
  backSignIn: 'Back to sign in',
  recoverPassword: 'Recover password',
  newPasswordLabel: 'New password',
  confirmNewPasswordLabel: 'Confirm new password',
  passwordMinPlaceholder: 'Minimum 8 characters',
  repeatNewPasswordPlaceholder: 'Repeat new password',
  displayNameLabel: 'Display name',
  displayNamePlaceholder: 'Your name',
  emailLabel: 'Email',
  emailPlaceholder: 'name@email.com',
  passwordLabel: 'Password',
  confirmPasswordLabel: 'Confirm password',
  repeatPasswordPlaceholder: 'Repeat password',
  forgotPassword: 'Forgot password?',
  signUpPrompt: 'Need an account? Register',
  accountHelpPrompt: 'Forgot email or username?',
  alreadyHaveAccount: 'Already have an account? Sign in',
  rememberPassword: 'Remember password? Sign in',
  forgotEmail: 'Forgot email?',
  openSignIn: 'Already have access? Sign in',
  openSignUp: 'Need an account? Open register',
  offlineNotice: 'You are offline. Sign-in is unavailable until the connection returns.',
  appleOpening: 'Opening Apple...',
  appleSignIn: 'Sign in with Apple',
};

function makeAuthCopy(overrides: Partial<Omit<MobileAuthCopy, 'modes'>> & { modes?: Partial<Record<MobileAuthMode, Partial<MobileAuthModeCopy>>> }): MobileAuthCopy {
  const modes = { ...EN_AUTH_COPY.modes };
  for (const key of Object.keys(overrides.modes || {}) as MobileAuthMode[]) {
    modes[key] = { ...modes[key], ...overrides.modes?.[key] };
  }
  return {
    ...EN_AUTH_COPY,
    ...overrides,
    modes,
  };
}

const AUTH_COPY: Record<Language, MobileAuthCopy> = {
  en: EN_AUTH_COPY,
  id: makeAuthCopy({
    modes: {
      signIn: { subtitle: 'Gunakan Google untuk fitur AI terlindungi, atau lanjut sebagai tamu untuk ruang kerja gratis.', submit: 'Masuk dengan email', submitting: 'Memeriksa akun...' },
      signUp: { subtitle: 'Mulai dengan Google atau mode tamu. Akun bisa ditingkatkan saat pembayaran sudah aktif.', submit: 'Buat akun', submitting: 'Membuat akun...' },
      resetPassword: { subtitle: 'Pulihkan akses akun dengan tautan aman ke email.', submit: 'Kirim tautan pemulihan', submitting: 'Mengirim tautan...' },
      accountHelp: { subtitle: 'Bantuan akun untuk menemukan cara masuk paling aman.', submit: 'Kembali masuk', submitting: 'Menyiapkan...' },
      newPassword: { subtitle: 'Buat password baru untuk menyelesaikan pemulihan akun.', submit: 'Simpan password baru', submitting: 'Menyimpan password...' },
    },
    unavailableSignInTitle: 'Masuk ke Baristachaw',
    unavailableSignUpTitle: 'Daftar ke Baristachaw',
    invalidEmail: 'Masukkan email yang valid.',
    passwordMin: 'Password minimal 8 karakter.',
    passwordMismatch: 'Konfirmasi password belum sama.',
    resetSendFailed: 'Tautan pemulihan belum bisa dikirim.',
    displayNameRequired: 'Nama tampilan wajib diisi.',
    newPasswordSaveFailed: 'Password baru belum bisa disimpan.',
    googleOpening: 'Membuka...',
    googleContinue: 'Lanjutkan dengan Google',
    facebookOpening: 'Membuka Facebook...',
    facebookContinue: 'Lanjutkan dengan Facebook',
    guestContinue: 'Lanjutkan sebagai tamu',
    showPassword: 'Tampilkan',
    hidePassword: 'Sembunyikan',
    tabSignIn: 'Masuk',
    tabSignUp: 'Daftar',
    tabReset: 'Pulihkan',
    accountHelpTitle: 'Bantuan akun',
    accountHelpBody: 'Baristachaw memakai Google atau email, bukan username terpisah. Jika lupa email, coba Google dulu atau cari email verifikasi Baristachaw.',
    backSignIn: 'Kembali masuk',
    recoverPassword: 'Pulihkan password',
    newPasswordLabel: 'Password baru',
    confirmNewPasswordLabel: 'Konfirmasi password baru',
    passwordMinPlaceholder: 'Minimal 8 karakter',
    repeatNewPasswordPlaceholder: 'Ulangi password baru',
    displayNameLabel: 'Nama tampilan',
    displayNamePlaceholder: 'Nama Anda',
    emailPlaceholder: 'nama@email.com',
    confirmPasswordLabel: 'Konfirmasi password',
    repeatPasswordPlaceholder: 'Ulangi password',
    forgotPassword: 'Lupa password?',
    signUpPrompt: 'Belum punya akun? Daftar',
    accountHelpPrompt: 'Lupa email atau username?',
    alreadyHaveAccount: 'Sudah punya akun? Masuk',
    rememberPassword: 'Ingat password? Masuk',
    forgotEmail: 'Lupa email?',
    openSignIn: 'Sudah punya akses? Masuk',
    openSignUp: 'Belum punya akun? Buka daftar',
    offlineNotice: 'Anda sedang offline. Masuk tidak tersedia sampai koneksi kembali.',
    appleOpening: 'Membuka Apple...',
    appleSignIn: 'Masuk dengan Apple',
  }),
  ar: makeAuthCopy({
    modes: {
      signIn: { subtitle: 'استخدم Google للميزات المحمية أو تابع كضيف لمساحة العمل المجانية.', submit: 'تسجيل الدخول بالبريد', submitting: 'جار فحص الحساب...' },
      signUp: { subtitle: 'ابدأ باستخدام Google أو وضع الضيف. يمكنك ترقية الحساب عند تفعيل الدفع.', submit: 'إنشاء حساب', submitting: 'جار إنشاء الحساب...' },
      resetPassword: { subtitle: 'استعد الوصول عبر رابط آمن يرسل إلى بريدك.', submit: 'إرسال رابط الاستعادة', submitting: 'جار إرسال الرابط...' },
      accountHelp: { subtitle: 'مساعدة الحساب لاختيار طريقة الدخول الأكثر أمانًا.', submit: 'العودة لتسجيل الدخول', submitting: 'جار التجهيز...' },
      newPassword: { subtitle: 'أنشئ كلمة مرور جديدة لإكمال استعادة الحساب.', submit: 'حفظ كلمة المرور الجديدة', submitting: 'جار حفظ كلمة المرور...' },
    },
    unavailableSignInTitle: 'تسجيل الدخول إلى Baristachaw',
    unavailableSignUpTitle: 'إنشاء حساب Baristachaw',
    googleContinue: 'المتابعة باستخدام Google',
    guestContinue: 'المتابعة كضيف',
    tabSignIn: 'دخول',
    tabSignUp: 'تسجيل',
    tabReset: 'استعادة',
    emailLabel: 'البريد الإلكتروني',
    passwordLabel: 'كلمة المرور',
    offlineNotice: 'أنت غير متصل. تسجيل الدخول غير متاح حتى تعود الشبكة.',
    appleSignIn: 'تسجيل الدخول باستخدام Apple',
  }),
  zh: makeAuthCopy({
    modes: {
      signIn: { subtitle: '使用 Google 开启受保护的 AI 功能，或以访客身份使用免费工作区。', submit: '用邮箱登录', submitting: '正在检查账户...' },
      signUp: { subtitle: '可使用 Google 或访客模式开始，付款启用后再升级账户。', submit: '创建账户', submitting: '正在创建账户...' },
      resetPassword: { subtitle: '通过发送到邮箱的安全链接恢复账户访问。', submit: '发送恢复链接', submitting: '正在发送...' },
      accountHelp: { subtitle: '账户帮助会引导你选择最安全的登录方式。', submit: '返回登录', submitting: '准备中...' },
      newPassword: { subtitle: '创建新密码以完成账户恢复。', submit: '保存新密码', submitting: '正在保存...' },
    },
    unavailableSignInTitle: '登录 Baristachaw',
    unavailableSignUpTitle: '注册 Baristachaw',
    googleContinue: '使用 Google 继续',
    guestContinue: '以访客继续',
    tabSignIn: '登录',
    tabSignUp: '注册',
    tabReset: '恢复',
    offlineNotice: '你当前离线，连接恢复前无法登录。',
    appleSignIn: '使用 Apple 登录',
  }),
  ja: makeAuthCopy({
    modes: {
      signIn: { subtitle: '保護されたAI機能はGoogleで利用できます。無料ワークスペースはゲストでも続行できます。', submit: 'メールでログイン', submitting: 'アカウント確認中...' },
      signUp: { subtitle: 'Googleまたはゲストモードで開始できます。決済が有効になったらアップグレードできます。', submit: 'アカウント作成', submitting: '作成中...' },
      resetPassword: { subtitle: 'メールに送られる安全なリンクでアカウントを復旧します。', submit: '復旧リンクを送信', submitting: '送信中...' },
      accountHelp: { subtitle: '最も安全なログイン方法を見つけるためのアカウントヘルプです。', submit: 'ログインに戻る', submitting: '準備中...' },
      newPassword: { subtitle: '新しいパスワードを作成して復旧を完了します。', submit: '新しいパスワードを保存', submitting: '保存中...' },
    },
    unavailableSignInTitle: 'Baristachaw にログイン',
    unavailableSignUpTitle: 'Baristachaw に登録',
    googleContinue: 'Googleで続行',
    guestContinue: 'ゲストとして続行',
    tabSignIn: 'ログイン',
    tabSignUp: '登録',
    tabReset: '復旧',
    offlineNotice: 'オフラインです。接続が戻るまでログインできません。',
    appleSignIn: 'Appleでログイン',
  }),
  ko: makeAuthCopy({
    modes: {
      signIn: { subtitle: '보호된 AI 기능은 Google로 사용하거나 무료 작업공간은 게스트로 계속하세요.', submit: '이메일로 로그인', submitting: '계정 확인 중...' },
      signUp: { subtitle: 'Google 또는 게스트 모드로 시작하고 결제 활성화 후 업그레이드할 수 있습니다.', submit: '계정 만들기', submitting: '계정 생성 중...' },
      resetPassword: { subtitle: '이메일로 전송되는 안전 링크로 계정을 복구하세요.', submit: '복구 링크 보내기', submitting: '전송 중...' },
      accountHelp: { subtitle: '가장 안전한 로그인 방법을 찾는 계정 도움말입니다.', submit: '로그인으로 돌아가기', submitting: '준비 중...' },
      newPassword: { subtitle: '계정 복구를 완료하려면 새 비밀번호를 만드세요.', submit: '새 비밀번호 저장', submitting: '저장 중...' },
    },
    unavailableSignInTitle: 'Baristachaw 로그인',
    unavailableSignUpTitle: 'Baristachaw 가입',
    googleContinue: 'Google로 계속',
    guestContinue: '게스트로 계속',
    tabSignIn: '로그인',
    tabSignUp: '가입',
    tabReset: '복구',
    offlineNotice: '오프라인입니다. 연결이 돌아올 때까지 로그인할 수 없습니다.',
    appleSignIn: 'Apple로 로그인',
  }),
  th: makeAuthCopy({
    modes: {
      signIn: { subtitle: 'ใช้ Google สำหรับฟีเจอร์ AI ที่ป้องกันไว้ หรือใช้โหมดผู้เยี่ยมชมสำหรับพื้นที่ทำงานฟรี', submit: 'เข้าสู่ระบบด้วยอีเมล', submitting: 'กำลังตรวจบัญชี...' },
      signUp: { subtitle: 'เริ่มด้วย Google หรือโหมดผู้เยี่ยมชม แล้วอัปเกรดเมื่อระบบชำระเงินพร้อม', submit: 'สร้างบัญชี', submitting: 'กำลังสร้างบัญชี...' },
      resetPassword: { subtitle: 'กู้คืนบัญชีด้วยลิงก์ปลอดภัยที่ส่งไปยังอีเมลของคุณ', submit: 'ส่งลิงก์กู้คืน', submitting: 'กำลังส่งลิงก์...' },
      accountHelp: { subtitle: 'ช่วยหาวิธีเข้าสู่ระบบที่ปลอดภัยที่สุด', submit: 'กลับไปเข้าสู่ระบบ', submitting: 'กำลังเตรียม...' },
      newPassword: { subtitle: 'สร้างรหัสผ่านใหม่เพื่อกู้คืนบัญชีให้เสร็จ', submit: 'บันทึกรหัสผ่านใหม่', submitting: 'กำลังบันทึก...' },
    },
    unavailableSignInTitle: 'เข้าสู่ Baristachaw',
    unavailableSignUpTitle: 'สมัคร Baristachaw',
    googleContinue: 'ดำเนินการต่อด้วย Google',
    guestContinue: 'ดำเนินการต่อแบบผู้เยี่ยมชม',
    tabSignIn: 'เข้าสู่ระบบ',
    tabSignUp: 'สมัคร',
    tabReset: 'กู้คืน',
    offlineNotice: 'คุณออฟไลน์อยู่ จึงยังเข้าสู่ระบบไม่ได้จนกว่าจะเชื่อมต่ออีกครั้ง',
    appleSignIn: 'เข้าสู่ระบบด้วย Apple',
  }),
  vi: makeAuthCopy({
    modes: {
      signIn: { subtitle: 'Dùng Google cho tính năng AI được bảo vệ, hoặc tiếp tục ở chế độ khách cho không gian miễn phí.', submit: 'Đăng nhập bằng email', submitting: 'Đang kiểm tra tài khoản...' },
      signUp: { subtitle: 'Bắt đầu bằng Google hoặc chế độ khách. Có thể nâng cấp khi thanh toán đã bật.', submit: 'Tạo tài khoản', submitting: 'Đang tạo tài khoản...' },
      resetPassword: { subtitle: 'Khôi phục tài khoản bằng liên kết an toàn gửi tới email.', submit: 'Gửi liên kết khôi phục', submitting: 'Đang gửi...' },
      accountHelp: { subtitle: 'Trợ giúp tài khoản để chọn cách đăng nhập an toàn nhất.', submit: 'Quay lại đăng nhập', submitting: 'Đang chuẩn bị...' },
      newPassword: { subtitle: 'Tạo mật khẩu mới để hoàn tất khôi phục tài khoản.', submit: 'Lưu mật khẩu mới', submitting: 'Đang lưu...' },
    },
    unavailableSignInTitle: 'Đăng nhập Baristachaw',
    unavailableSignUpTitle: 'Đăng ký Baristachaw',
    googleContinue: 'Tiếp tục với Google',
    guestContinue: 'Tiếp tục với khách',
    tabSignIn: 'Đăng nhập',
    tabSignUp: 'Đăng ký',
    tabReset: 'Khôi phục',
    offlineNotice: 'Bạn đang ngoại tuyến. Không thể đăng nhập cho đến khi kết nối trở lại.',
    appleSignIn: 'Đăng nhập với Apple',
  }),
  ms: makeAuthCopy({
    modes: {
      signIn: { subtitle: 'Gunakan Google untuk ciri AI terlindung, atau terus sebagai tetamu untuk ruang kerja percuma.', submit: 'Log masuk dengan email', submitting: 'Menyemak akaun...' },
      signUp: { subtitle: 'Mula dengan Google atau mod tetamu. Akaun boleh dinaik taraf apabila pembayaran aktif.', submit: 'Cipta akaun', submitting: 'Mencipta akaun...' },
      resetPassword: { subtitle: 'Pulihkan akses akaun dengan pautan selamat ke email.', submit: 'Hantar pautan pemulihan', submitting: 'Menghantar pautan...' },
      accountHelp: { subtitle: 'Bantuan akaun untuk mencari cara log masuk paling selamat.', submit: 'Kembali log masuk', submitting: 'Menyediakan...' },
      newPassword: { subtitle: 'Cipta kata laluan baharu untuk melengkapkan pemulihan akaun.', submit: 'Simpan kata laluan baharu', submitting: 'Menyimpan kata laluan...' },
    },
    unavailableSignInTitle: 'Log masuk ke Baristachaw',
    unavailableSignUpTitle: 'Daftar Baristachaw',
    invalidEmail: 'Masukkan email yang sah.',
    passwordMin: 'Kata laluan minimum 8 aksara.',
    passwordMismatch: 'Pengesahan kata laluan tidak sama.',
    displayNameRequired: 'Nama paparan wajib diisi.',
    googleContinue: 'Teruskan dengan Google',
    guestContinue: 'Teruskan sebagai tetamu',
    showPassword: 'Tunjuk',
    hidePassword: 'Sembunyi',
    tabSignIn: 'Log masuk',
    tabSignUp: 'Daftar',
    tabReset: 'Pulih',
    offlineNotice: 'Anda sedang luar talian. Log masuk tidak tersedia sehingga sambungan kembali.',
    appleSignIn: 'Log masuk dengan Apple',
  }),
};

export function resolveMobileAuthBundle(language?: string | null): MobileAuthCopy {
  const normalized = resolveMobileLanguage(language);
  return AUTH_COPY[normalized] || AUTH_COPY[DEFAULT_LANGUAGE];
}

export function resolveMobileAuthCopy(activeMode: MobileAuthMode, language?: string | null): MobileAuthModeCopy {
  return resolveMobileAuthBundle(language).modes[activeMode];
}

export function resolveMobileAuthUnavailableCopy(activeMode: MobileAuthMode, language?: string | null) {
  const bundle = resolveMobileAuthBundle(language);
  const copy = resolveMobileAuthCopy(activeMode, language);
  return {
    title: activeMode === 'signUp' ? bundle.unavailableSignUpTitle : bundle.unavailableSignInTitle,
    subtitle: copy.subtitle,
  };
}
