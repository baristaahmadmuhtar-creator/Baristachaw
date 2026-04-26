import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { usePreferredMobileLanguage } from '../hooks/usePreferredMobileLanguage';
import {
  resolveMobileAuthBundle,
  resolveMobileAuthUnavailableCopy,
} from '../utils/authLocalization';
import type { AuthProvider, EmailAuthPayload, PasswordResetPayload, PasswordUpdatePayload } from '../types';

export { resolveMobileAuthCopy, resolveMobileAuthUnavailableCopy } from '../utils/authLocalization';

type MobileAuthGateProps = {
  authBusyProvider: AuthProvider | null;
  authError: string | null;
  isOnline: boolean;
  supabaseAuthEnabled: boolean;
  enableAppleSignIn: boolean;
  guestModeEnabled?: boolean;
  passwordRecoveryActive?: boolean;
  recoveryEmail?: string;
  onLoginGoogle: () => Promise<void>;
  onEmailAuth: (payload: EmailAuthPayload) => Promise<void>;
  onPasswordReset: (payload: PasswordResetPayload) => Promise<string>;
  onPasswordUpdate: (payload: PasswordUpdatePayload) => Promise<void>;
  onLoginApple: () => Promise<void>;
  onContinueGuest?: () => void;
};

type AuthMode = EmailAuthPayload['mode'] | 'resetPassword' | 'accountHelp';
type ActiveAuthMode = AuthMode | 'newPassword';
export type MobileAuthActiveMode = ActiveAuthMode;

const AUTH_BRAND_ICON = require('../../assets/splash-icon.png');
const GOOGLE_MARK_ICON = require('../../assets/google-g.png');

type WebParityAuthTheme = {
  bgBase: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  glassBg: string;
  glassBgHover: string;
  glassBorder: string;
  panelBorderSoft: string;
  surfaceAlpha: string;
  blue: string;
  blueBorder: string;
  blueShadow: string;
  brandTileBg: string;
  brandTileBorder: string;
  brandTileShadow: string;
  white: string;
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  success: string;
  successBg: string;
  successBorder: string;
  warning: string;
  warningBg: string;
  warningBorder: string;
  glowBlue: string;
  glowIndigo: string;
  shadow: string;
};

const WEB_AUTH_THEMES: Record<'light' | 'dark', WebParityAuthTheme> = {
  light: {
    bgBase: '#F2F2F7',
    textPrimary: '#000000',
    textSecondary: '#3C3C43',
    textTertiary: 'rgba(60, 60, 67, 0.6)',
    glassBg: 'rgba(255, 255, 255, 0.6)',
    glassBgHover: 'rgba(255, 255, 255, 0.75)',
    glassBorder: 'rgba(255, 255, 255, 0.6)',
    panelBorderSoft: 'rgba(15, 23, 42, 0.08)',
    surfaceAlpha: 'rgba(0, 0, 0, 0.05)',
    blue: 'rgba(29, 78, 216, 0.96)',
    blueBorder: 'rgba(59, 130, 246, 0.42)',
    blueShadow: 'rgba(29, 78, 216, 0.24)',
    brandTileBg: 'rgba(255, 255, 255, 0.86)',
    brandTileBorder: 'rgba(0, 0, 0, 0.06)',
    brandTileShadow: 'rgba(0, 0, 0, 0.08)',
    white: '#FFFFFF',
    danger: '#DC2626',
    dangerBg: 'rgba(239, 68, 68, 0.10)',
    dangerBorder: 'rgba(239, 68, 68, 0.20)',
    success: '#059669',
    successBg: 'rgba(16, 185, 129, 0.10)',
    successBorder: 'rgba(16, 185, 129, 0.20)',
    warning: '#B45309',
    warningBg: 'rgba(245, 158, 11, 0.12)',
    warningBorder: 'rgba(245, 158, 11, 0.25)',
    glowBlue: 'rgba(0, 122, 255, 0.06)',
    glowIndigo: 'rgba(88, 86, 214, 0.06)',
    shadow: 'rgba(0, 0, 0, 0.08)',
  },
  dark: {
    bgBase: '#000000',
    textPrimary: '#FFFFFF',
    textSecondary: '#EBEBF5',
    textTertiary: 'rgba(235, 235, 245, 0.75)',
    glassBg: 'rgba(28, 28, 30, 0.6)',
    glassBgHover: 'rgba(44, 44, 46, 0.75)',
    glassBorder: 'rgba(148, 163, 184, 0.10)',
    panelBorderSoft: 'rgba(148, 163, 184, 0.12)',
    surfaceAlpha: 'rgba(148, 163, 184, 0.08)',
    blue: 'rgba(29, 78, 216, 0.96)',
    blueBorder: 'rgba(59, 130, 246, 0.42)',
    blueShadow: 'rgba(29, 78, 216, 0.32)',
    brandTileBg: '#1D4ED8',
    brandTileBorder: 'rgba(147, 197, 253, 0.22)',
    brandTileShadow: 'rgba(29, 78, 216, 0.32)',
    white: '#FFFFFF',
    danger: '#F87171',
    dangerBg: 'rgba(239, 68, 68, 0.10)',
    dangerBorder: 'rgba(239, 68, 68, 0.25)',
    success: '#34D399',
    successBg: 'rgba(16, 185, 129, 0.10)',
    successBorder: 'rgba(16, 185, 129, 0.22)',
    warning: '#FCD34D',
    warningBg: 'rgba(245, 158, 11, 0.12)',
    warningBorder: 'rgba(245, 158, 11, 0.25)',
    glowBlue: 'transparent',
    glowIndigo: 'transparent',
    shadow: 'rgba(0, 0, 0, 0.42)',
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
  guestModeEnabled = false,
  passwordRecoveryActive = false,
  recoveryEmail,
  onLoginGoogle,
  onEmailAuth,
  onPasswordReset,
  onPasswordUpdate,
  onLoginApple,
  onContinueGuest,
}: MobileAuthGateProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = WEB_AUTH_THEMES[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(theme), [theme]);
  const preferredLanguage = usePreferredMobileLanguage();
  const authCopy = useMemo(() => resolveMobileAuthBundle(preferredLanguage), [preferredLanguage]);
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
  const copy = authCopy.modes[activeMode];
  const busy = Boolean(authBusyProvider);
  const googleBusy = authBusyProvider === 'google';
  const emailBusy = authBusyProvider === 'email';
  const appleBusy = authBusyProvider === 'apple';
  const emailActionBusy = emailBusy && ['signIn', 'signUp', 'resetPassword', 'newPassword'].includes(activeMode);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setFormError('');
    setSuccessMessage('');
  };

  const validatePasswordPair = (value: string, confirmation: string) => {
    if (value.length < 8) return authCopy.passwordMin;
    if (value !== confirmation) return authCopy.passwordMismatch;
    return '';
  };

  const submitEmailFlow = async () => {
    if (!supabaseAuthEnabled || activeMode === 'accountHelp' || activeMode === 'newPassword') return;

    const normalizedEmail = normalizeEmail(email);
    const normalizedName = displayName.trim();

    if (!isValidEmail(normalizedEmail)) {
      setFormError(authCopy.invalidEmail);
      return;
    }

    if (activeMode === 'resetPassword') {
      setFormError('');
      setSuccessMessage('');
      try {
        const result = await onPasswordReset({ email: normalizedEmail });
        setSuccessMessage(result);
      } catch (error) {
        setFormError(error instanceof Error ? error.message : authCopy.resetSendFailed);
      }
      return;
    }

    if (password.length < 8) {
      setFormError(authCopy.passwordMin);
      return;
    }

    if (activeMode === 'signUp') {
      if (!normalizedName) {
        setFormError(authCopy.displayNameRequired);
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
      setFormError(error instanceof Error ? error.message : authCopy.newPasswordSaveFailed);
    }
  };

  const renderNotice = (
    message: string,
    tone: 'error' | 'success' | 'warning',
    icon: keyof typeof Ionicons.glyphMap,
  ) => {
    const noticeStyle = tone === 'error'
      ? styles.errorNotice
      : tone === 'success'
        ? styles.successNotice
        : styles.warningNotice;
    const textStyle = tone === 'error'
      ? styles.errorNoticeText
      : tone === 'success'
        ? styles.successNoticeText
        : styles.warningNoticeText;
    const color = tone === 'error' ? theme.danger : tone === 'success' ? theme.success : theme.warning;

    return (
      <View style={[styles.notice, noticeStyle]}>
        <Ionicons name={icon} size={18} color={color} />
        <Text selectable style={[styles.noticeText, textStyle]}>{message}</Text>
      </View>
    );
  };

  const renderPrimaryButton = (
    label: string,
    busyLabel: string,
    isBusy: boolean,
    onPress: () => void,
    icon: keyof typeof Ionicons.glyphMap,
  ) => (
    <Pressable
      accessibilityRole="button"
      disabled={!isOnline || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        (!isOnline || busy) ? styles.disabled : null,
        pressed && !busy ? styles.pressed : null,
      ]}
    >
      {isBusy ? (
        <ActivityIndicator color={theme.white} />
      ) : (
        <Ionicons name={icon} size={18} color={theme.white} />
      )}
      <Text style={styles.primaryButtonText}>{isBusy ? busyLabel : label}</Text>
    </Pressable>
  );

  const renderGoogleButton = () => (
    <Pressable
      accessibilityRole="button"
      disabled={!isOnline || busy}
      onPress={() => void onLoginGoogle()}
      style={({ pressed }) => [
        styles.primaryButton,
        (!isOnline || busy) ? styles.disabled : null,
        pressed && !busy ? styles.pressed : null,
      ]}
    >
      {googleBusy ? (
        <ActivityIndicator color={theme.white} />
      ) : (
        <View style={styles.googleIconBadge}>
          <Image source={GOOGLE_MARK_ICON} style={styles.googleIcon} resizeMode="contain" />
        </View>
      )}
      <Text style={styles.primaryButtonText}>{googleBusy ? authCopy.googleOpening : authCopy.googleContinue}</Text>
    </Pressable>
  );

  const renderGuestButton = () => {
    if (!guestModeEnabled || !onContinueGuest || activeMode === 'newPassword') return null;

    return (
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={onContinueGuest}
        style={({ pressed }) => [
          styles.secondaryButton,
          busy ? styles.disabled : null,
          pressed && !busy ? styles.pressed : null,
        ]}
      >
        <Ionicons name="person-circle-outline" size={18} color={theme.textPrimary} />
        <Text style={styles.secondaryButtonText}>{authCopy.guestContinue}</Text>
      </Pressable>
    );
  };

  const renderInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    icon,
    keyboardType,
    textContentType,
    autoComplete,
    secureTextEntry,
    visible,
    onToggleVisible,
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder: string;
    icon: keyof typeof Ionicons.glyphMap;
    keyboardType?: 'default' | 'email-address';
    textContentType?: 'emailAddress' | 'name' | 'password' | 'newPassword';
    autoComplete?: 'email' | 'name' | 'password' | 'new-password';
    secureTextEntry?: boolean;
    visible?: boolean;
    onToggleVisible?: () => void;
  }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={18} color={theme.textTertiary} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textTertiary}
          keyboardType={keyboardType || 'default'}
          textContentType={textContentType}
          autoComplete={autoComplete}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          autoCorrect={false}
          editable={!emailBusy}
          secureTextEntry={secureTextEntry}
          selectionColor="#3B82F6"
          style={styles.textInput}
        />
        {onToggleVisible ? (
          <Pressable
            accessibilityRole="button"
            disabled={emailBusy}
            onPress={onToggleVisible}
            style={styles.passwordToggle}
          >
            <Text style={styles.passwordToggleText}>{visible ? authCopy.hidePassword : authCopy.showPassword}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const renderModeTabs = () => {
    if (!supabaseAuthEnabled || activeMode === 'newPassword') return null;
    const tabs: Array<{ value: AuthMode; label: string }> = [
      { value: 'signIn', label: authCopy.tabSignIn },
      { value: 'signUp', label: authCopy.tabSignUp },
      { value: 'resetPassword', label: authCopy.tabReset },
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

  const renderEmailForm = () => {
    if (!supabaseAuthEnabled && activeMode !== 'newPassword') {
      const unavailableCopy = resolveMobileAuthUnavailableCopy(activeMode, preferredLanguage);
      return (
        <View style={styles.infoPanel}>
          <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>{unavailableCopy.title}</Text>
            <Text style={styles.infoText}>
              {unavailableCopy.subtitle}
            </Text>
          </View>
        </View>
      );
    }

    if (activeMode === 'accountHelp') {
      return (
        <View style={styles.infoPanel}>
          <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>{authCopy.accountHelpTitle}</Text>
            <Text style={styles.infoText}>
              {authCopy.accountHelpBody}
            </Text>
            <View style={styles.inlineActions}>
              <Pressable accessibilityRole="button" onPress={() => switchMode('signIn')} style={styles.inlineButton}>
                <Text style={styles.inlineButtonText}>{authCopy.backSignIn}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => switchMode('resetPassword')} style={styles.inlineButton}>
                <Text style={styles.inlineButtonText}>{authCopy.recoverPassword}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    if (activeMode === 'newPassword') {
      return (
        <View style={styles.formStack}>
          {recoveryEmail ? (
            <View style={styles.infoPanel}>
              <Ionicons name="mail-open-outline" size={16} color={theme.textSecondary} />
              <Text style={styles.infoText}>{recoveryEmail}</Text>
            </View>
          ) : null}
          {renderInput({
            label: authCopy.newPasswordLabel,
            value: newPassword,
            onChangeText: setNewPassword,
            placeholder: authCopy.passwordMinPlaceholder,
            icon: 'lock-closed-outline',
            textContentType: 'newPassword',
            autoComplete: 'new-password',
            secureTextEntry: !newPasswordVisible,
            visible: newPasswordVisible,
            onToggleVisible: () => setNewPasswordVisible((value) => !value),
          })}
          {renderInput({
            label: authCopy.confirmNewPasswordLabel,
            value: newPasswordConfirm,
            onChangeText: setNewPasswordConfirm,
            placeholder: authCopy.repeatNewPasswordPlaceholder,
            icon: 'lock-closed-outline',
            textContentType: 'newPassword',
            autoComplete: 'new-password',
            secureTextEntry: !newPasswordVisible,
            visible: newPasswordVisible,
            onToggleVisible: () => setNewPasswordVisible((value) => !value),
          })}
          {renderPrimaryButton(copy.submit, copy.submitting, emailBusy, () => void submitNewPassword(), 'checkmark-circle-outline')}
        </View>
      );
    }

    return (
      <View style={styles.formStack}>
        {activeMode === 'signUp' ? renderInput({
          label: authCopy.displayNameLabel,
          value: displayName,
          onChangeText: setDisplayName,
          placeholder: authCopy.displayNamePlaceholder,
          icon: 'person-outline',
          textContentType: 'name',
          autoComplete: 'name',
        }) : null}

        {renderInput({
          label: authCopy.emailLabel,
          value: email,
          onChangeText: setEmail,
          placeholder: authCopy.emailPlaceholder,
          icon: 'mail-outline',
          keyboardType: 'email-address',
          textContentType: 'emailAddress',
          autoComplete: 'email',
        })}

        {activeMode !== 'resetPassword' ? (
          <>
            {renderInput({
              label: authCopy.passwordLabel,
              value: password,
              onChangeText: setPassword,
              placeholder: authCopy.passwordMinPlaceholder,
              icon: 'lock-closed-outline',
              textContentType: activeMode === 'signUp' ? 'newPassword' : 'password',
              autoComplete: activeMode === 'signUp' ? 'new-password' : 'password',
              secureTextEntry: !passwordVisible,
              visible: passwordVisible,
              onToggleVisible: () => setPasswordVisible((value) => !value),
            })}
          </>
        ) : null}

        {activeMode === 'signUp' ? renderInput({
          label: authCopy.confirmPasswordLabel,
          value: confirmPassword,
          onChangeText: setConfirmPassword,
          placeholder: authCopy.repeatPasswordPlaceholder,
          icon: 'lock-closed-outline',
          textContentType: 'newPassword',
          autoComplete: 'new-password',
          secureTextEntry: !passwordVisible,
          visible: passwordVisible,
          onToggleVisible: () => setPasswordVisible((value) => !value),
        }) : null}

        {renderPrimaryButton(copy.submit, copy.submitting, emailActionBusy, () => void submitEmailFlow(), activeMode === 'resetPassword' ? 'send-outline' : 'mail-outline')}

        <View style={styles.footerLinks}>
          {activeMode === 'signIn' ? (
            <>
              <Pressable accessibilityRole="button" disabled={emailBusy} onPress={() => switchMode('resetPassword')}>
                <Text style={styles.linkText}>{authCopy.forgotPassword}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={emailBusy} onPress={() => switchMode('signUp')}>
                <Text style={styles.linkText}>{authCopy.signUpPrompt}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={emailBusy} onPress={() => switchMode('accountHelp')}>
                <Text style={styles.linkText}>{authCopy.accountHelpPrompt}</Text>
              </Pressable>
            </>
          ) : null}
          {activeMode === 'signUp' ? (
            <Pressable accessibilityRole="button" disabled={emailBusy} onPress={() => switchMode('signIn')}>
              <Text style={styles.linkText}>{authCopy.alreadyHaveAccount}</Text>
            </Pressable>
          ) : null}
          {activeMode === 'resetPassword' ? (
            <>
              <Pressable accessibilityRole="button" disabled={emailBusy} onPress={() => switchMode('signIn')}>
                <Text style={styles.linkText}>{authCopy.rememberPassword}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={emailBusy} onPress={() => switchMode('accountHelp')}>
                <Text style={styles.linkText}>{authCopy.forgotEmail}</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    );
  };

  const renderAuthRouteSwitch = () => {
    if (
      supabaseAuthEnabled
      || activeMode === 'newPassword'
      || activeMode === 'resetPassword'
      || activeMode === 'accountHelp'
    ) {
      return null;
    }
    const isSignUpMode = activeMode === 'signUp';

    return (
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => switchMode(isSignUpMode ? 'signIn' : 'signUp')}
        style={({ pressed }) => [
          styles.authRouteSwitch,
          busy ? styles.disabled : null,
          pressed && !busy ? styles.pressed : null,
        ]}
      >
        <Text style={styles.authRouteSwitchText}>
          {isSignUpMode ? authCopy.openSignIn : authCopy.openSignUp}
        </Text>
      </Pressable>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <View pointerEvents="none" style={styles.lightGlowOne} />
      <View pointerEvents="none" style={styles.lightGlowTwo} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(16, insets.top + 12),
            paddingBottom: Math.max(16, insets.bottom + 12),
            paddingLeft: Math.max(16, insets.left + 16),
            paddingRight: Math.max(16, insets.right + 16),
          },
        ]}
      >
        <View style={styles.container}>
          <View style={styles.hero}>
            <View style={styles.brandTile}>
              <Image source={AUTH_BRAND_ICON} style={styles.brandIcon} resizeMode="contain" />
            </View>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </View>

          {authError ? renderNotice(authError, 'error', 'alert-circle-outline') : null}
          {formError ? renderNotice(formError, 'error', 'alert-circle-outline') : null}
          {successMessage ? renderNotice(successMessage, 'success', 'checkmark-circle-outline') : null}
          {!isOnline ? renderNotice(authCopy.offlineNotice, 'warning', 'cloud-offline-outline') : null}

          <View style={styles.card}>
            {activeMode !== 'newPassword' ? renderGoogleButton() : null}

            {activeMode !== 'newPassword' && enableAppleSignIn ? (
              <Pressable
                accessibilityRole="button"
                disabled={!isOnline || busy}
                onPress={() => void onLoginApple()}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  (!isOnline || busy) ? styles.disabled : null,
                  pressed && !busy ? styles.pressed : null,
                ]}
              >
                {appleBusy ? (
                  <ActivityIndicator color={theme.textPrimary} />
                ) : (
                  <Ionicons name="logo-apple" size={17} color={theme.textPrimary} />
                )}
                <Text style={styles.secondaryButtonText}>{appleBusy ? authCopy.appleOpening : authCopy.appleSignIn}</Text>
              </Pressable>
            ) : null}

            {renderModeTabs()}
            {renderEmailForm()}
            {renderGuestButton()}
            {renderAuthRouteSwitch()}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: WebParityAuthTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.bgBase,
      overflow: 'hidden',
    },
    lightGlowOne: {
      position: 'absolute',
      top: -120,
      left: -120,
      width: 290,
      height: 290,
      borderRadius: 145,
      backgroundColor: theme.glowBlue,
    },
    lightGlowTwo: {
      position: 'absolute',
      right: -130,
      bottom: -130,
      width: 310,
      height: 310,
      borderRadius: 155,
      backgroundColor: theme.glowIndigo,
    },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    container: {
      width: '100%',
      maxWidth: 448,
      alignSelf: 'center',
      gap: 16,
    },
    hero: {
      alignItems: 'center',
      marginBottom: 24,
    },
    brandTile: {
      width: 80,
      height: 80,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      backgroundColor: theme.brandTileBg,
      borderWidth: 1,
      borderColor: theme.brandTileBorder,
      shadowColor: theme.brandTileShadow,
      shadowOpacity: 1,
      shadowRadius: 32,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    brandIcon: {
      width: 64,
      height: 64,
    },
    googleIconBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.white,
    },
    googleIcon: {
      width: 18,
      height: 18,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: uiTokens.fontFamily.bold,
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '800',
      letterSpacing: -0.8,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      color: theme.textSecondary,
      fontFamily: uiTokens.fontFamily.medium,
      fontSize: 16,
      lineHeight: 23,
      textAlign: 'center',
      maxWidth: 340,
    },
    card: {
      gap: 12,
      borderWidth: 1,
      borderColor: theme.glassBorder,
      borderRadius: 32,
      padding: 32,
      backgroundColor: theme.glassBg,
      shadowColor: theme.shadow,
      shadowOpacity: 1,
      shadowRadius: 32,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },
    primaryButton: {
      minHeight: 56,
      borderWidth: 1,
      borderColor: theme.blueBorder,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 12,
      backgroundColor: theme.blue,
      shadowColor: theme.blueShadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    primaryButtonText: {
      color: theme.white,
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '700',
    },
    secondaryButton: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: theme.glassBorder,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 10,
      backgroundColor: theme.glassBgHover,
    },
    secondaryButtonText: {
      color: theme.textPrimary,
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
    },
    modeTabs: {
      flexDirection: 'row',
      gap: 6,
      borderWidth: 1,
      borderColor: theme.panelBorderSoft,
      borderRadius: 18,
      padding: 4,
      backgroundColor: theme.surfaceAlpha,
    },
    modeTab: {
      flex: 1,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
    },
    modeTabActive: {
      backgroundColor: theme.glassBgHover,
      borderWidth: 1,
      borderColor: theme.glassBorder,
    },
    modeTabText: {
      color: theme.textSecondary,
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '700',
    },
    modeTabTextActive: {
      color: theme.textPrimary,
    },
    formStack: {
      gap: 12,
    },
    fieldGroup: {
      gap: 7,
    },
    fieldLabel: {
      color: theme.textSecondary,
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '700',
    },
    inputWrap: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      borderWidth: 1,
      borderColor: theme.glassBorder,
      borderRadius: 24,
      backgroundColor: theme.glassBgHover,
      paddingHorizontal: 14,
      shadowColor: theme.shadow,
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    textInput: {
      flex: 1,
      minHeight: 52,
      color: theme.textPrimary,
      paddingVertical: 12,
      fontFamily: uiTokens.fontFamily.medium,
      fontSize: 16,
      lineHeight: 22,
    },
    passwordToggle: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: 8,
    },
    passwordToggleText: {
      color: '#3B82F6',
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '700',
    },
    infoPanel: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      borderWidth: 1,
      borderColor: theme.panelBorderSoft,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 13,
      backgroundColor: theme.surfaceAlpha,
    },
    infoCopy: {
      flex: 1,
      gap: 4,
    },
    infoTitle: {
      color: theme.textPrimary,
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: '700',
    },
    infoText: {
      flex: 1,
      color: theme.textSecondary,
      fontFamily: uiTokens.fontFamily.medium,
      fontSize: 13,
      lineHeight: 19,
    },
    inlineActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingTop: 8,
    },
    inlineButton: {
      minHeight: 38,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.glassBorder,
      borderRadius: 14,
      paddingHorizontal: 12,
      backgroundColor: theme.glassBgHover,
    },
    inlineButtonText: {
      color: theme.textPrimary,
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '700',
    },
    footerLinks: {
      alignItems: 'center',
      gap: 9,
      paddingTop: 2,
    },
    linkText: {
      color: '#3B82F6',
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
    authRouteSwitch: {
      minHeight: 42,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
      paddingTop: 2,
    },
    authRouteSwitchText: {
      color: '#3B82F6',
      fontFamily: uiTokens.fontFamily.semibold,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
      textAlign: 'center',
    },
    notice: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    noticeText: {
      flex: 1,
      fontFamily: uiTokens.fontFamily.medium,
      fontSize: 13,
      lineHeight: 19,
    },
    errorNotice: {
      borderColor: theme.dangerBorder,
      backgroundColor: theme.dangerBg,
    },
    errorNoticeText: {
      color: theme.danger,
    },
    successNotice: {
      borderColor: theme.successBorder,
      backgroundColor: theme.successBg,
    },
    successNoticeText: {
      color: theme.success,
    },
    warningNotice: {
      borderColor: theme.warningBorder,
      backgroundColor: theme.warningBg,
    },
    warningNoticeText: {
      color: theme.warning,
    },
    disabled: {
      opacity: 0.55,
    },
    pressed: {
      transform: [{ scale: 0.97 }],
    },
  });
}
