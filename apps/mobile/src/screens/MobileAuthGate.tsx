import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { uiTokens } from '../theme/tokens';
import type { AuthProvider, EmailAuthPayload, PasswordResetPayload, PasswordUpdatePayload } from '../types';

type MobileAuthGateProps = {
  authBusyProvider: AuthProvider | null;
  authError: string | null;
  isOnline: boolean;
  supabaseAuthEnabled: boolean;
  enableAppleSignIn: boolean;
  passwordRecoveryActive?: boolean;
  recoveryEmail?: string;
  onLoginGoogle: () => Promise<void>;
  onEmailAuth: (payload: EmailAuthPayload) => Promise<void>;
  onPasswordReset: (payload: PasswordResetPayload) => Promise<string>;
  onPasswordUpdate: (payload: PasswordUpdatePayload) => Promise<void>;
  onLoginApple: () => Promise<void>;
};

type AuthMode = EmailAuthPayload['mode'] | 'resetPassword' | 'accountHelp';
type ActiveAuthMode = AuthMode | 'newPassword';

type AuthTheme = {
  background: string;
  backgroundAlt: string;
  panel: string;
  panelSoft: string;
  text: string;
  textSoft: string;
  muted: string;
  border: string;
  input: string;
  inputBorder: string;
  accent: string;
  accentStrong: string;
  accentText: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  shadow: string;
};

const AUTH_THEMES: Record<'light' | 'dark', AuthTheme> = {
  light: {
    background: '#F8F2E7',
    backgroundAlt: '#EFE1CF',
    panel: '#FFF9F0',
    panelSoft: '#F5EADB',
    text: '#231A13',
    textSoft: '#5D4B3B',
    muted: '#8B7663',
    border: 'rgba(86, 58, 38, 0.14)',
    input: '#FFFCF7',
    inputBorder: 'rgba(86, 58, 38, 0.18)',
    accent: '#9C5B28',
    accentStrong: '#613414',
    accentText: '#FFFFFF',
    success: '#27734D',
    successSoft: 'rgba(39, 115, 77, 0.12)',
    danger: '#B33A2B',
    dangerSoft: 'rgba(179, 58, 43, 0.11)',
    warning: '#946111',
    warningSoft: 'rgba(148, 97, 17, 0.12)',
    shadow: '#6B4120',
  },
  dark: {
    background: '#10100D',
    backgroundAlt: '#1D1711',
    panel: '#1B1712',
    panelSoft: '#251D16',
    text: '#FFF3E3',
    textSoft: '#D6C2AA',
    muted: '#9B8770',
    border: 'rgba(255, 228, 196, 0.14)',
    input: '#13110E',
    inputBorder: 'rgba(255, 228, 196, 0.18)',
    accent: '#D88B45',
    accentStrong: '#F2B06D',
    accentText: '#1D120A',
    success: '#79D39A',
    successSoft: 'rgba(121, 211, 154, 0.13)',
    danger: '#FF8A78',
    dangerSoft: 'rgba(255, 138, 120, 0.12)',
    warning: '#F3C06D',
    warningSoft: 'rgba(243, 192, 109, 0.13)',
    shadow: '#000000',
  },
};

const COPY: Record<ActiveAuthMode, { title: string; subtitle: string; submit: string; submitting: string }> = {
  signIn: {
    title: 'Masuk ke BaristaClaw',
    subtitle: 'Lanjutkan pekerjaan, catatan, dan chat AI dari akun yang sama.',
    submit: 'Masuk dengan email',
    submitting: 'Memeriksa akun...',
  },
  signUp: {
    title: 'Buat akun barista',
    subtitle: 'Satu akun untuk menyimpan workflow, koleksi, dan riwayat kerja.',
    submit: 'Buat akun',
    submitting: 'Membuat akun...',
  },
  resetPassword: {
    title: 'Pulihkan akses akun',
    subtitle: 'Masukkan email akun. Tautan aman akan dikirim ke inbox Anda.',
    submit: 'Kirim tautan pemulihan',
    submitting: 'Mengirim tautan...',
  },
  accountHelp: {
    title: 'Bantuan akun',
    subtitle: 'Temukan cara masuk paling cepat tanpa menebak-nebak data akun.',
    submit: 'Kembali masuk',
    submitting: 'Menyiapkan...',
  },
  newPassword: {
    title: 'Buat password baru',
    subtitle: 'Gunakan password baru untuk menyelesaikan pemulihan akun.',
    submit: 'Simpan password baru',
    submitting: 'Menyimpan password...',
  },
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function MobileAuthGate({
  authBusyProvider,
  authError,
  isOnline,
  supabaseAuthEnabled,
  enableAppleSignIn,
  passwordRecoveryActive = false,
  recoveryEmail,
  onLoginGoogle,
  onEmailAuth,
  onPasswordReset,
  onPasswordUpdate,
  onLoginApple,
}: MobileAuthGateProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = AUTH_THEMES[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const activeMode: ActiveAuthMode = passwordRecoveryActive ? 'newPassword' : mode;
  const copy = COPY[activeMode];
  const heroTitle = !supabaseAuthEnabled && activeMode === 'signIn' ? 'Masuk atau daftar' : copy.title;
  const heroSubtitle = !supabaseAuthEnabled && activeMode === 'signIn'
    ? 'Gunakan Google untuk membuka atau membuat akun BaristaClaw dengan aman.'
    : copy.subtitle;
  const busy = Boolean(authBusyProvider);
  const googleBusy = authBusyProvider === 'google';
  const emailBusy = authBusyProvider === 'email';
  const appleBusy = authBusyProvider === 'apple';
  const primaryBusy = activeMode === 'newPassword' || activeMode === 'resetPassword' || activeMode === 'signIn' || activeMode === 'signUp'
    ? emailBusy
    : busy;

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setFormError('');
    setSuccessMessage('');
  };

  const validatePasswordPair = (value: string, confirmation: string) => {
    if (value.length < 8) {
      return 'Password minimal 8 karakter.';
    }
    if (value !== confirmation) {
      return 'Konfirmasi password belum sama.';
    }
    return '';
  };

  const submitEmailFlow = async () => {
    if (!supabaseAuthEnabled || activeMode === 'accountHelp' || activeMode === 'newPassword') return;

    const normalizedEmail = normalizeEmail(email);
    const normalizedName = displayName.trim();

    if (!isValidEmail(normalizedEmail)) {
      setFormError('Masukkan email yang valid.');
      return;
    }

    if (activeMode === 'resetPassword') {
      setFormError('');
      setSuccessMessage('');
      try {
        const result = await onPasswordReset({ email: normalizedEmail });
        setSuccessMessage(result);
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Tautan pemulihan belum bisa dikirim.');
      }
      return;
    }

    if (password.length < 8) {
      setFormError('Password minimal 8 karakter.');
      return;
    }
    if (activeMode === 'signUp') {
      if (!normalizedName) {
        setFormError('Nama tampilan wajib diisi.');
        return;
      }
      const passwordError = validatePasswordPair(password, confirmPassword);
      if (passwordError) {
        setFormError(passwordError);
        return;
      }
    }

    setFormError('');
    setSuccessMessage('');
    await onEmailAuth({
      mode: activeMode,
      email: normalizedEmail,
      password,
      displayName: normalizedName || undefined,
    });
  };

  const submitNewPassword = async () => {
    const passwordError = validatePasswordPair(newPassword, newPasswordConfirm);
    if (passwordError) {
      setFormError(passwordError);
      return;
    }

    setFormError('');
    setSuccessMessage('');
    try {
      await onPasswordUpdate({ password: newPassword });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Password baru belum bisa disimpan.');
    }
  };

  const renderEmailInput = () => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>Email</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="mail-outline" size={18} color={theme.muted} />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="nama@email.com"
          placeholderTextColor={theme.muted}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          editable={!emailBusy}
          selectionColor={theme.accent}
          style={styles.textInput}
        />
      </View>
    </View>
  );

  const renderPasswordInput = (
    value: string,
    onChangeText: (value: string) => void,
    visible: boolean,
    onToggleVisible: () => void,
    placeholder: string,
    textContentType: 'password' | 'newPassword',
    autoComplete: 'password' | 'new-password',
  ) => (
    <View style={styles.inputWrap}>
      <Ionicons name="lock-closed-outline" size={18} color={theme.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        textContentType={textContentType}
        autoCapitalize="none"
        autoComplete={autoComplete}
        autoCorrect={false}
        secureTextEntry={!visible}
        editable={!emailBusy}
        selectionColor={theme.accent}
        style={styles.textInput}
      />
      <Pressable
        accessibilityRole="button"
        disabled={emailBusy}
        onPress={onToggleVisible}
        style={styles.passwordToggle}
      >
        <Text style={styles.passwordToggleText}>{visible ? 'Sembunyikan' : 'Tampilkan'}</Text>
      </Pressable>
    </View>
  );

  const renderPrimaryProviders = () => {
    if (activeMode === 'newPassword') return null;

    return (
      <>
        <Pressable
          accessibilityRole="button"
          disabled={!isOnline || busy}
          onPress={() => void onLoginGoogle()}
          style={({ pressed }) => [
            styles.googleButton,
            (!isOnline || busy) ? styles.disabled : null,
            pressed && !busy ? styles.pressed : null,
          ]}
        >
          {googleBusy ? (
            <ActivityIndicator color={theme.accentText} />
          ) : (
            <Ionicons name="logo-google" size={18} color={theme.accentText} />
          )}
          <Text style={styles.googleText}>
            {googleBusy ? 'Membuka Google...' : (supabaseAuthEnabled ? 'Lanjutkan dengan Google' : 'Masuk / daftar dengan Google')}
          </Text>
        </Pressable>

        {enableAppleSignIn ? (
          <Pressable
            accessibilityRole="button"
            disabled={!isOnline || busy}
            onPress={() => void onLoginApple()}
            style={({ pressed }) => [
              styles.appleButton,
              (!isOnline || busy) ? styles.disabled : null,
              pressed && !busy ? styles.pressed : null,
            ]}
          >
            {appleBusy ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <Ionicons name="logo-apple" size={18} color={theme.text} />
            )}
            <Text style={styles.appleText}>{appleBusy ? 'Membuka Apple...' : 'Masuk dengan Apple'}</Text>
          </Pressable>
        ) : null}

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>atau gunakan email</Text>
          <View style={styles.dividerLine} />
        </View>
      </>
    );
  };

  const renderModeTabs = () => {
    if (activeMode === 'newPassword' || !supabaseAuthEnabled) return null;

    const tabs: Array<{ value: AuthMode; label: string }> = [
      { value: 'signIn', label: 'Masuk' },
      { value: 'signUp', label: 'Daftar' },
      { value: 'resetPassword', label: 'Pulihkan' },
    ];

    return (
      <View style={styles.modeTabs}>
        {tabs.map((item) => {
          const selected = mode === item.value;
          return (
            <Pressable
              key={item.value}
              accessibilityRole="button"
              disabled={emailBusy}
              onPress={() => switchMode(item.value)}
              style={[styles.modeTab, selected ? styles.modeTabActive : null]}
            >
              <Text style={[styles.modeTabText, selected ? styles.modeTabTextActive : null]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderAccountHelp = () => (
    <View style={styles.helpCard}>
      <View style={styles.helpItem}>
        <Ionicons name="person-circle-outline" size={18} color={theme.accent} />
        <Text style={styles.helpText}>
          BaristaClaw tidak memakai username terpisah. Akun dikenali dari Google atau email yang dipakai saat daftar.
        </Text>
      </View>
      <View style={styles.helpItem}>
        <Ionicons name="search-outline" size={18} color={theme.accent} />
        <Text style={styles.helpText}>
          Jika lupa email, coba masuk dengan Google terlebih dahulu atau cari email verifikasi dari BaristaClaw di inbox.
        </Text>
      </View>
      <View style={styles.helpItem}>
        <Ionicons name="shield-checkmark-outline" size={18} color={theme.accent} />
        <Text style={styles.helpText}>
          Demi keamanan, aplikasi tidak menampilkan daftar akun yang pernah dipakai di perangkat ini.
        </Text>
      </View>
      <View style={styles.helpActions}>
        <Pressable accessibilityRole="button" onPress={() => switchMode('signIn')} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Kembali masuk</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => switchMode('resetPassword')} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Pulihkan password</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderEmailForm = () => {
    if (!supabaseAuthEnabled && activeMode !== 'newPassword') {
      return (
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={theme.accent} />
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>Email belum tersedia untuk perangkat ini</Text>
            <Text style={styles.infoText}>
              Gunakan Google untuk masuk cepat dan aman. Tim dapat mengaktifkan akses email untuk akun barista saat sudah siap.
            </Text>
          </View>
        </View>
      );
    }

    if (activeMode === 'accountHelp') {
      return renderAccountHelp();
    }

    if (activeMode === 'newPassword') {
      return (
        <>
          {recoveryEmail ? (
            <View style={styles.recoveryBadge}>
              <Ionicons name="mail-open-outline" size={16} color={theme.accent} />
              <Text style={styles.recoveryBadgeText}>{recoveryEmail}</Text>
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password baru</Text>
            {renderPasswordInput(
              newPassword,
              setNewPassword,
              newPasswordVisible,
              () => setNewPasswordVisible((value) => !value),
              'Minimal 8 karakter',
              'newPassword',
              'new-password',
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Konfirmasi password baru</Text>
            {renderPasswordInput(
              newPasswordConfirm,
              setNewPasswordConfirm,
              newPasswordVisible,
              () => setNewPasswordVisible((value) => !value),
              'Ulangi password baru',
              'newPassword',
              'new-password',
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={!isOnline || busy}
            onPress={() => void submitNewPassword()}
            style={({ pressed }) => [
              styles.emailButton,
              (!isOnline || busy) ? styles.disabled : null,
              pressed && !busy ? styles.pressed : null,
            ]}
          >
            {emailBusy ? <ActivityIndicator color={theme.accentText} /> : <Ionicons name="checkmark-circle-outline" size={18} color={theme.accentText} />}
            <Text style={styles.emailButtonText}>{emailBusy ? copy.submitting : copy.submit}</Text>
          </Pressable>
        </>
      );
    }

    return (
      <>
        {activeMode === 'signUp' ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nama tampilan</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color={theme.muted} />
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Nama Anda"
                placeholderTextColor={theme.muted}
                autoCapitalize="words"
                autoComplete="name"
                autoCorrect={false}
                editable={!emailBusy}
                selectionColor={theme.accent}
                style={styles.textInput}
              />
            </View>
          </View>
        ) : null}

        {renderEmailInput()}

        {activeMode !== 'resetPassword' ? (
          <View style={styles.fieldGroup}>
            <View style={styles.fieldHeaderRow}>
              <Text style={styles.fieldLabel}>Password</Text>
              {activeMode === 'signIn' ? (
                <Pressable accessibilityRole="button" disabled={emailBusy} onPress={() => switchMode('resetPassword')}>
                  <Text style={styles.linkText}>Lupa password?</Text>
                </Pressable>
              ) : null}
            </View>
            {renderPasswordInput(
              password,
              setPassword,
              passwordVisible,
              () => setPasswordVisible((value) => !value),
              'Minimal 8 karakter',
              activeMode === 'signUp' ? 'newPassword' : 'password',
              activeMode === 'signUp' ? 'new-password' : 'password',
            )}
          </View>
        ) : null}

        {activeMode === 'signUp' ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Konfirmasi password</Text>
            {renderPasswordInput(
              confirmPassword,
              setConfirmPassword,
              passwordVisible,
              () => setPasswordVisible((value) => !value),
              'Ulangi password',
              'newPassword',
              'new-password',
            )}
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={!isOnline || busy}
          onPress={() => void submitEmailFlow()}
          style={({ pressed }) => [
            styles.emailButton,
            (!isOnline || busy) ? styles.disabled : null,
            pressed && !busy ? styles.pressed : null,
          ]}
        >
          {primaryBusy ? <ActivityIndicator color={theme.accentText} /> : <Ionicons name={activeMode === 'resetPassword' ? 'send-outline' : 'mail-outline'} size={18} color={theme.accentText} />}
          <Text style={styles.emailButtonText}>{primaryBusy ? copy.submitting : copy.submit}</Text>
        </Pressable>

        <View style={styles.footLinks}>
          {activeMode === 'signIn' ? (
            <>
              <Pressable accessibilityRole="button" disabled={emailBusy} onPress={() => switchMode('signUp')}>
                <Text style={styles.linkText}>Belum punya akun? Daftar</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={emailBusy} onPress={() => switchMode('accountHelp')}>
                <Text style={styles.linkText}>Lupa email atau butuh bantuan?</Text>
              </Pressable>
            </>
          ) : null}
          {activeMode === 'signUp' ? (
            <Pressable accessibilityRole="button" disabled={emailBusy} onPress={() => switchMode('signIn')}>
              <Text style={styles.linkText}>Sudah punya akun? Masuk</Text>
            </Pressable>
          ) : null}
          {activeMode === 'resetPassword' ? (
            <>
              <Pressable accessibilityRole="button" disabled={emailBusy} onPress={() => switchMode('signIn')}>
                <Text style={styles.linkText}>Ingat password? Masuk</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={emailBusy} onPress={() => switchMode('accountHelp')}>
                <Text style={styles.linkText}>Lupa email?</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <View pointerEvents="none" style={styles.backgroundGlowTop} />
      <View pointerEvents="none" style={styles.backgroundGlowBottom} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(30, insets.top + 24),
            paddingBottom: Math.max(34, insets.bottom + 30),
            paddingLeft: Math.max(20, insets.left + 20),
            paddingRight: Math.max(20, insets.right + 20),
          },
        ]}
      >
        <View style={styles.brandBlock}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Ionicons name="cafe" size={25} color={theme.accentText} />
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.brandName}>BaristaClaw</Text>
              <Text style={styles.brandLabel}>Ruang kerja barista</Text>
            </View>
          </View>
          <Text style={styles.title}>{heroTitle}</Text>
          <Text style={styles.subtitle}>{heroSubtitle}</Text>
        </View>

        {!isOnline ? (
          <View style={styles.warningCard}>
            <Ionicons name="cloud-offline-outline" size={17} color={theme.warning} />
            <Text style={styles.warningText}>Tidak ada koneksi internet. Sambungkan dulu untuk masuk.</Text>
          </View>
        ) : null}

        {authError ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={17} color={theme.danger} />
            <Text selectable style={styles.errorText}>{authError}</Text>
          </View>
        ) : null}

        {formError ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={17} color={theme.danger} />
            <Text selectable style={styles.errorText}>{formError}</Text>
          </View>
        ) : null}

        {successMessage ? (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle-outline" size={17} color={theme.success} />
            <Text selectable style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        <View style={styles.panel}>
          {renderPrimaryProviders()}
          {renderModeTabs()}
          {renderEmailForm()}

          <View style={styles.securityStrip}>
            <Ionicons name="shield-checkmark-outline" size={16} color={theme.muted} />
            <Text style={styles.securityText}>Sesi disimpan aman di perangkat ini dan bisa keluar kapan saja.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: AuthTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      overflow: 'hidden',
      backgroundColor: theme.background,
    },
    backgroundGlowTop: {
      position: 'absolute',
      top: -150,
      right: -130,
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: theme.backgroundAlt,
      opacity: 0.85,
    },
    backgroundGlowBottom: {
      position: 'absolute',
      left: -120,
      bottom: -170,
      width: 320,
      height: 320,
      borderRadius: 160,
      backgroundColor: theme.accent,
      opacity: 0.13,
    },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      gap: 16,
    },
    brandBlock: {
      gap: 14,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    brandMark: {
      width: 58,
      height: 58,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accent,
      shadowColor: theme.shadow,
      shadowOpacity: 0.2,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    brandCopy: {
      flex: 1,
      gap: 2,
    },
    brandName: {
      color: theme.text,
      fontFamily: uiTokens.fontFamily.bold,
      fontSize: 22,
      lineHeight: 27,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    brandLabel: {
      color: theme.muted,
      fontFamily: uiTokens.fontFamily.medium,
      fontSize: 13,
      lineHeight: 18,
    },
    title: {
      color: theme.text,
      fontFamily: uiTokens.fontFamily.bold,
      fontSize: 34,
      lineHeight: 39,
      fontWeight: '800',
      letterSpacing: -1,
    },
    subtitle: {
      color: theme.textSoft,
      fontFamily: uiTokens.fontFamily.medium,
      fontSize: 15,
      lineHeight: 22,
      maxWidth: 340,
    },
    panel: {
      gap: 14,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 30,
      padding: 17,
      backgroundColor: theme.panel,
      shadowColor: theme.shadow,
      shadowOpacity: 0.16,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 16 },
      elevation: 5,
    },
    googleButton: {
      minHeight: 54,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 10,
      backgroundColor: theme.accent,
    },
    googleText: {
      color: theme.accentText,
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '800',
    },
    appleButton: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 10,
      backgroundColor: theme.panelSoft,
    },
    appleText: {
      color: theme.text,
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '800',
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.border,
    },
    dividerText: {
      color: theme.muted,
      fontFamily: uiTokens.fontFamily.medium,
      fontSize: 11,
      lineHeight: 16,
    },
    modeTabs: {
      flexDirection: 'row',
      gap: 6,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      backgroundColor: theme.panelSoft,
    },
    modeTab: {
      flex: 1,
      minHeight: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
    },
    modeTabActive: {
      backgroundColor: theme.text,
    },
    modeTabText: {
      color: theme.textSoft,
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '800',
    },
    modeTabTextActive: {
      color: theme.background,
    },
    fieldGroup: {
      gap: 7,
    },
    fieldHeaderRow: {
      minHeight: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    fieldLabel: {
      color: theme.textSoft,
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '800',
    },
    inputWrap: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      borderWidth: 1,
      borderColor: theme.inputBorder,
      borderRadius: 18,
      backgroundColor: theme.input,
      paddingHorizontal: 13,
    },
    textInput: {
      flex: 1,
      minHeight: 50,
      color: theme.text,
      paddingVertical: 12,
      fontFamily: uiTokens.fontFamily.medium,
      fontSize: 15,
      lineHeight: 20,
    },
    passwordToggle: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: 8,
    },
    passwordToggleText: {
      color: theme.accent,
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '800',
    },
    emailButton: {
      minHeight: 52,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 10,
      backgroundColor: theme.accentStrong,
    },
    emailButtonText: {
      color: theme.accentText,
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '800',
    },
    footLinks: {
      alignItems: 'center',
      gap: 10,
      paddingTop: 2,
    },
    linkText: {
      color: theme.accent,
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '800',
      textAlign: 'center',
    },
    helpCard: {
      gap: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      padding: 14,
      backgroundColor: theme.panelSoft,
    },
    helpItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    helpText: {
      flex: 1,
      color: theme.textSoft,
      fontFamily: uiTokens.fontFamily.medium,
      fontSize: 13,
      lineHeight: 19,
    },
    helpActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingTop: 2,
    },
    secondaryButton: {
      minHeight: 42,
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      paddingHorizontal: 12,
      backgroundColor: theme.panel,
    },
    secondaryButtonText: {
      color: theme.text,
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '800',
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 13,
      backgroundColor: theme.panelSoft,
    },
    infoCopy: {
      flex: 1,
      gap: 3,
    },
    infoTitle: {
      color: theme.text,
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '800',
    },
    infoText: {
      color: theme.textSoft,
      fontFamily: uiTokens.fontFamily.medium,
      fontSize: 12,
      lineHeight: 18,
    },
    recoveryBadge: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      paddingHorizontal: 12,
      backgroundColor: theme.panelSoft,
    },
    recoveryBadgeText: {
      flex: 1,
      color: theme.textSoft,
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '700',
    },
    securityStrip: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.panelSoft,
    },
    securityText: {
      flex: 1,
      color: theme.muted,
      fontFamily: uiTokens.fontFamily.medium,
      fontSize: 12,
      lineHeight: 17,
    },
    warningCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      padding: 12,
      backgroundColor: theme.warningSoft,
    },
    warningText: {
      flex: 1,
      color: theme.warning,
      fontFamily: uiTokens.fontFamily.medium,
      fontSize: 12,
      lineHeight: 18,
    },
    errorCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      padding: 12,
      backgroundColor: theme.dangerSoft,
    },
    errorText: {
      flex: 1,
      color: theme.danger,
      fontFamily: uiTokens.fontFamily.medium,
      fontSize: 12,
      lineHeight: 18,
    },
    successCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      padding: 12,
      backgroundColor: theme.successSoft,
    },
    successText: {
      flex: 1,
      color: theme.success,
      fontFamily: uiTokens.fontFamily.medium,
      fontSize: 12,
      lineHeight: 18,
    },
    disabled: {
      opacity: 0.55,
    },
    pressed: {
      transform: [{ scale: 0.985 }],
    },
  });
}
