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
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { uiTokens } from '../theme/tokens';
import type { AuthProvider, EmailAuthPayload } from '../types';

type MobileAuthGateProps = {
  authBusyProvider: AuthProvider | null;
  authError: string | null;
  isOnline: boolean;
  supabaseAuthEnabled: boolean;
  enableAppleSignIn: boolean;
  onLoginGoogle: () => Promise<void>;
  onEmailAuth: (payload: EmailAuthPayload) => Promise<void>;
  onLoginApple: () => Promise<void>;
};

type AuthMode = EmailAuthPayload['mode'];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function MobileAuthGate({
  authBusyProvider,
  authError,
  isOnline,
  supabaseAuthEnabled,
  enableAppleSignIn,
  onLoginGoogle,
  onEmailAuth,
  onLoginApple,
}: MobileAuthGateProps) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [formError, setFormError] = useState('');

  const busy = Boolean(authBusyProvider);
  const googleBusy = authBusyProvider === 'google';
  const emailBusy = authBusyProvider === 'email';
  const appleBusy = authBusyProvider === 'apple';
  const copy = useMemo(() => ({
    title: 'Masuk / Daftar',
    subtitle: 'Login aman untuk membuka BaristaClaw MVP Android.',
    google: 'Lanjutkan dengan Google',
    googleBusy: 'Membuka Google...',
    emailSignIn: 'Masuk',
    emailSignUp: 'Daftar',
    name: 'Nama tampilan',
    namePlaceholder: 'Nama Anda',
    email: 'Email',
    emailPlaceholder: 'nama@email.com',
    password: 'Password',
    passwordPlaceholder: 'Minimal 8 karakter',
    hide: 'Sembunyikan',
    show: 'Tampilkan',
    submitSignIn: 'Masuk dengan email',
    submitSignUp: 'Buat akun',
    submittingSignIn: 'Memproses masuk...',
    submittingSignUp: 'Membuat akun...',
    divider: 'atau masuk/daftar dengan email',
    supabaseMissing: 'Email masuk/daftar siap dipakai setelah Supabase URL dan publishable key diisi. Google login server tetap aktif.',
    offline: 'Tidak ada koneksi internet. Sambungkan dulu untuk login.',
    invalidEmail: 'Masukkan email yang valid.',
    invalidPassword: 'Password minimal 8 karakter.',
    requiredName: 'Nama tampilan wajib untuk daftar.',
    security: 'Token login disimpan di SecureStore dan dikirim sebagai Bearer token ke API.',
    apple: 'Masuk dengan Apple',
    appleBusy: 'Membuka Apple...',
  }), []);

  const submitEmailAuth = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = displayName.trim();

    if (!isValidEmail(normalizedEmail)) {
      setFormError(copy.invalidEmail);
      return;
    }
    if (password.length < 8) {
      setFormError(copy.invalidPassword);
      return;
    }
    if (mode === 'signUp' && !normalizedName) {
      setFormError(copy.requiredName);
      return;
    }

    setFormError('');
    await onEmailAuth({
      mode,
      email: normalizedEmail,
      password,
      displayName: normalizedName || undefined,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(28, insets.top + 24),
            paddingBottom: Math.max(32, insets.bottom + 28),
            paddingLeft: Math.max(20, insets.left + 20),
            paddingRight: Math.max(20, insets.right + 20),
          },
        ]}
      >
        <View style={styles.brandCard}>
          <View style={styles.brandIcon}>
            <Ionicons name="cafe" size={26} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>

        {!isOnline ? (
          <View style={styles.warningCard}>
            <Ionicons name="cloud-offline-outline" size={16} color={uiTokens.colors.warning} />
            <Text style={styles.warningText}>{copy.offline}</Text>
          </View>
        ) : null}

        {authError ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={16} color={uiTokens.colors.danger} />
            <Text selectable style={styles.errorText}>{authError}</Text>
          </View>
        ) : null}

        <View style={styles.panel}>
          <Pressable
            disabled={!isOnline || busy}
            onPress={() => void onLoginGoogle()}
            style={({ pressed }) => [
              styles.googleButton,
              (!isOnline || busy) ? styles.disabled : null,
              pressed && !busy ? styles.pressed : null,
            ]}
          >
            {googleBusy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name="logo-google" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.googleText}>{googleBusy ? copy.googleBusy : copy.google}</Text>
          </Pressable>

          <Text style={styles.securityText}>{copy.security}</Text>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{copy.divider}</Text>
            <View style={styles.dividerLine} />
          </View>

          {supabaseAuthEnabled ? (
            <>
              <View style={styles.modeTabs}>
                {(['signIn', 'signUp'] as const).map((item) => {
                  const selected = mode === item;
                  return (
                    <Pressable
                      key={item}
                      disabled={emailBusy}
                      onPress={() => {
                        setMode(item);
                        setFormError('');
                      }}
                      style={[styles.modeTab, selected ? styles.modeTabActive : null]}
                    >
                      <Text style={[styles.modeTabText, selected ? styles.modeTabTextActive : null]}>
                        {item === 'signIn' ? copy.emailSignIn : copy.emailSignUp}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {mode === 'signUp' ? (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{copy.name}</Text>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder={copy.namePlaceholder}
                    placeholderTextColor={uiTokens.colors.textMuted}
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!emailBusy}
                    style={styles.input}
                  />
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{copy.email}</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={copy.emailPlaceholder}
                  placeholderTextColor={uiTokens.colors.textMuted}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  editable={!emailBusy}
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{copy.password}</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder={copy.passwordPlaceholder}
                    placeholderTextColor={uiTokens.colors.textMuted}
                    textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
                    autoCapitalize="none"
                    autoComplete={mode === 'signUp' ? 'new-password' : 'password'}
                    autoCorrect={false}
                    secureTextEntry={!passwordVisible}
                    editable={!emailBusy}
                    style={styles.passwordInput}
                  />
                  <Pressable onPress={() => setPasswordVisible((value) => !value)} style={styles.passwordToggle}>
                    <Text style={styles.passwordToggleText}>
                      {passwordVisible ? copy.hide : copy.show}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {formError ? <Text selectable style={styles.formError}>{formError}</Text> : null}

              <Pressable
                disabled={!isOnline || busy}
                onPress={() => void submitEmailAuth()}
                style={({ pressed }) => [
                  styles.emailButton,
                  (!isOnline || busy) ? styles.disabled : null,
                  pressed && !busy ? styles.pressed : null,
                ]}
              >
                {emailBusy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="mail-outline" size={17} color="#FFFFFF" />}
                <Text style={styles.emailButtonText}>
                  {emailBusy
                    ? (mode === 'signUp' ? copy.submittingSignUp : copy.submittingSignIn)
                    : (mode === 'signUp' ? copy.submitSignUp : copy.submitSignIn)}
                </Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={16} color={uiTokens.colors.accent} />
              <Text style={styles.infoText}>{copy.supabaseMissing}</Text>
            </View>
          )}

          {enableAppleSignIn ? (
            <Pressable
              disabled={!isOnline || busy}
              onPress={() => void onLoginApple()}
              style={({ pressed }) => [
                styles.appleButton,
                (!isOnline || busy) ? styles.disabled : null,
                pressed && !busy ? styles.pressed : null,
              ]}
            >
              {appleBusy ? <ActivityIndicator color={uiTokens.text.primary} /> : <Ionicons name="logo-apple" size={18} color={uiTokens.text.primary} />}
              <Text style={styles.appleText}>{appleBusy ? copy.appleBusy : copy.apple}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: uiTokens.colors.bgBase,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 16,
  },
  brandCard: {
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uiTokens.colors.accent,
    ...uiTokens.elevation.card,
  },
  title: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.bold,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  subtitle: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  panel: {
    gap: 14,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    borderRadius: 30,
    padding: 18,
    backgroundColor: uiTokens.surface.strong,
    ...uiTokens.elevation.card,
  },
  googleButton: {
    minHeight: 54,
    borderRadius: uiTokens.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: uiTokens.colors.accent,
  },
  googleText: {
    color: '#FFFFFF',
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  securityText: {
    color: uiTokens.text.muted,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: uiTokens.border.soft,
  },
  dividerText: {
    color: uiTokens.text.muted,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: 11,
    lineHeight: 15,
  },
  modeTabs: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    borderRadius: uiTokens.radius.pill,
    backgroundColor: uiTokens.surface.soft,
  },
  modeTab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: uiTokens.radius.pill,
  },
  modeTabActive: {
    backgroundColor: uiTokens.colors.accent,
  },
  modeTabText: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  modeTabTextActive: {
    color: uiTokens.text.inverse,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: uiTokens.colors.fieldBorder,
    borderRadius: uiTokens.radius.input,
    backgroundColor: uiTokens.colors.field,
    color: uiTokens.text.primary,
    paddingHorizontal: 14,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: 15,
  },
  passwordWrap: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: uiTokens.colors.fieldBorder,
    borderRadius: uiTokens.radius.input,
    backgroundColor: uiTokens.colors.field,
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    color: uiTokens.text.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: 15,
  },
  passwordToggle: {
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  passwordToggleText: {
    color: uiTokens.colors.accent,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: 12,
    fontWeight: '700',
  },
  emailButton: {
    minHeight: 50,
    borderRadius: uiTokens.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: uiTokens.colors.accentStrong,
  },
  emailButtonText: {
    color: '#FFFFFF',
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  appleButton: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    borderRadius: uiTokens.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: uiTokens.surface.soft,
  },
  appleText: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: 15,
    fontWeight: '700',
  },
  infoCard: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    borderRadius: 18,
    padding: 12,
    backgroundColor: uiTokens.surface.accent,
  },
  infoText: {
    flex: 1,
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: 12,
    lineHeight: 18,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    borderRadius: 18,
    padding: 12,
    backgroundColor: uiTokens.colors.warningSurface,
  },
  warningText: {
    flex: 1,
    color: uiTokens.colors.warning,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: 12,
    lineHeight: 18,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    borderRadius: 18,
    padding: 12,
    backgroundColor: uiTokens.surface.soft,
  },
  errorText: {
    flex: 1,
    color: uiTokens.colors.danger,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: 12,
    lineHeight: 18,
  },
  formError: {
    color: uiTokens.colors.warning,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: 12,
    lineHeight: 18,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});
