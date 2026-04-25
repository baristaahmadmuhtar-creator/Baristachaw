import { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { Linking, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { buildResponseOrchestration, normalizeAgentProfileMemory, type AgentProfileMemory } from '@baristachaw/shared';
import {
  ActionButton,
  AppShell,
  FloatingSearchField,
  HeroHeader,
  InfoPill,
  ResultSheet,
  SectionCard,
} from '../design-system';
import { usePreferredMobileLanguage } from '../hooks/usePreferredMobileLanguage';
import { ApiClient, ApiError } from '../services/apiClient';
import { readAgentProfileMemory } from '../services/agentProfileStore';
import { hapticSuccess } from '../services/haptics';
import { trackEvent } from '../services/telemetry';
import { uiTokens } from '../theme/tokens';
import type { AuthProvider, AuthSession, EmailAuthPayload, MobileQuickSavePayload } from '../types';
import { getMobileLocalization } from '../utils/localization';

type SearchPhase = 'idle' | 'sending' | 'live_searching' | 'rendering' | 'failed';
type HomeAuthState = 'signed_in' | 'signed_out' | 'session_expired' | 'offline_cached';
type IoniconName = keyof typeof Ionicons.glyphMap;

type SearchSource = {
  uri: string;
  title?: string;
  domain?: string;
};

type HomeScreenProps = {
  apiClient: ApiClient;
  session: AuthSession | null;
  authBusyProvider: AuthProvider | null;
  authError: string | null;
  authState: HomeAuthState;
  isOnline: boolean;
  guestModeEnabled: boolean;
  enableAppleSignIn: boolean;
  supabaseAuthEnabled: boolean;
  onLoginGoogle: () => Promise<void>;
  onEmailAuth: (payload: EmailAuthPayload) => Promise<void>;
  onLoginApple: () => Promise<void>;
  onLogout: () => Promise<void>;
  onSaveToCollection: (payload: MobileQuickSavePayload) => Promise<void>;
};

const FEATURE_ICONS: Record<string, IoniconName> = {
  Chat: 'sparkles-outline',
  Scanner: 'scan-outline',
  Tools: 'construct-outline',
  Collection: 'albums-outline',
};

function formatRetrievedAt(locale: string, value?: number | null) {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function normalizeSources(raw: Array<{ uri: string; title?: string; domain?: string }> | undefined): SearchSource[] {
  return (raw || [])
    .filter((item) => typeof item?.uri === 'string' && item.uri.startsWith('http'))
    .map((item) => {
      const domain = item.domain || (() => {
        try {
          return new URL(item.uri).hostname.replace(/^www\./, '');
        } catch {
          return undefined;
        }
      })();
      return {
        uri: item.uri,
        title: item.title,
        domain,
      };
    });
}

function buildPreview(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  return compact.length > 170 ? `${compact.slice(0, 167).trim()}...` : compact;
}

export function HomeScreen({
  apiClient,
  session,
  authBusyProvider,
  authError,
  authState,
  isOnline,
  guestModeEnabled,
  enableAppleSignIn,
  supabaseAuthEnabled,
  onLoginGoogle,
  onEmailAuth,
  onLoginApple,
  onLogout,
  onSaveToCollection,
}: HomeScreenProps) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const preferredLanguage = usePreferredMobileLanguage(session?.user.id);
  const isMountedRef = useRef(true);
  const activeSearchRequestRef = useRef(0);
  const [query, setQuery] = useState('');
  const [searchPhase, setSearchPhase] = useState<SearchPhase>('idle');
  const [result, setResult] = useState('');
  const [sources, setSources] = useState<SearchSource[]>([]);
  const [retrievedAt, setRetrievedAt] = useState<number | null>(null);
  const [liveSearchUnavailable, setLiveSearchUnavailable] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [lastActionLabel, setLastActionLabel] = useState('');
  const [resultSheetVisible, setResultSheetVisible] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState<EmailAuthPayload['mode']>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailFormError, setEmailFormError] = useState('');
  const [agentProfile, setAgentProfile] = useState<AgentProfileMemory>(() => normalizeAgentProfileMemory({
    preferredLanguage,
    assistantName: 'Baristachaw',
    userDisplayName: session?.user.name,
  }));

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    trackEvent('screen_ready', { screen: 'home', authState });
    if (!session) {
      trackEvent('auth_gate_seen', { surface: 'home', guestModeEnabled, authState });
    }
  }, [authState, guestModeEnabled, session]);

  useEffect(() => {
    if (!isOnline) {
      trackEvent('offline_gate_seen', { surface: 'home', hasSession: Boolean(session) });
    }
  }, [isOnline, session]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await readAgentProfileMemory(session?.user.id, {
        preferredLanguage,
        assistantName: 'Baristachaw',
        userDisplayName: session?.user.name,
      });
      if (!cancelled) setAgentProfile(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, [preferredLanguage, session?.user.id, session?.user.name]);

  const localeState = useMemo(() => getMobileLocalization(agentProfile.preferredLanguage), [agentProfile.preferredLanguage]);
  const { direction, locale } = localeState;
  const homeCopy = localeState.copy.home;
  const webT = localeState.web;
  const quickPrompts = homeCopy.quickPrompts;
  const featureCards = useMemo(() => ([
    {
      routeName: 'Chat' as const,
      title: webT.homeAskTitle,
      subtitle: webT.homeAskSubtitle,
    },
    {
      routeName: 'Scanner' as const,
      title: webT.homeScannerTitle,
      subtitle: webT.homeScannerSubtitle,
    },
    {
      routeName: 'Tools' as const,
      title: webT.homeAiBrewTitle,
      subtitle: webT.homeAiBrewSubtitle,
    },
    {
      routeName: 'Tools' as const,
      title: webT.homeToolsTitle,
      subtitle: webT.homeToolsSubtitle,
    },
    {
      routeName: 'Collection' as const,
      title: webT.homeCollectionTitle,
      subtitle: webT.homeCollectionSubtitle,
    },
  ]), [webT]);

  const authSummary = useMemo(() => {
    if (authState === 'offline_cached') {
      return {
        tone: 'warning' as const,
        title: homeCopy.auth.offlineTitle,
        body: homeCopy.auth.offlineBody,
      };
    }
    if (authState === 'session_expired') {
      return {
        tone: 'warning' as const,
        title: homeCopy.auth.expiredTitle,
        body: homeCopy.auth.expiredBody,
      };
    }
    if (session) {
      return {
        tone: 'success' as const,
        title: homeCopy.auth.signedInTitle,
        body: session.user.name || session.user.email || homeCopy.auth.signedInTitle,
      };
    }
    return {
      tone: 'accent' as const,
      title: homeCopy.auth.signInTitle,
      body: guestModeEnabled ? homeCopy.auth.signInBodyGuest : homeCopy.auth.signInBodyCloud,
    };
  }, [authState, guestModeEnabled, homeCopy.auth, session]);

  const searchStatusLabel = useMemo(() => {
    switch (searchPhase) {
      case 'sending':
        return homeCopy.searchStatus.sending;
      case 'live_searching':
        return homeCopy.searchStatus.checking;
      case 'rendering':
        return homeCopy.searchStatus.preparing;
      case 'failed':
        return homeCopy.searchStatus.retry;
      default:
        return session ? homeCopy.searchStatus.ready : homeCopy.searchStatus.signIn;
    }
  }, [homeCopy.searchStatus, searchPhase, session]);

  const searchPlaceholder = session ? webT.homeSearchPlaceholderAuth : webT.homeSearchPlaceholderGuest;
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return webT.goodMorning;
    if (hour < 18) return webT.goodAfternoon;
    return webT.goodEvening;
  }, [webT]);
  const resultPreview = buildPreview(result);
  const authFormCopy = useMemo(() => {
    if (localeState.language === 'id') {
      return {
        signInTab: 'Masuk',
        signUpTab: 'Daftar',
        nameLabel: 'Nama tampilan',
        namePlaceholder: 'Nama Anda',
        emailLabel: 'Email',
        emailPlaceholder: 'nama@email.com',
        passwordLabel: 'Kata sandi',
        passwordPlaceholder: 'Minimal 8 karakter',
        hidePassword: 'Sembunyikan',
        showPassword: 'Tampilkan',
        submitSignIn: 'Masuk dengan email',
        submitSignUp: 'Buat akun',
        submittingSignIn: 'Memproses masuk...',
        submittingSignUp: 'Membuat akun...',
        googleDivider: 'atau lanjut aman dengan Google',
        googleFallback: 'Gunakan Google untuk masuk cepat dan aman.',
        supabaseMissing: 'Masuk dengan email belum tersedia di perangkat ini. Gunakan Google untuk melanjutkan.',
        invalidEmail: 'Masukkan email yang valid.',
        invalidPassword: 'Kata sandi minimal 8 karakter.',
        requiredName: 'Nama tampilan wajib untuk daftar.',
        trust: 'Sesi disimpan aman di perangkat ini dan bisa keluar kapan saja.',
      };
    }
    return {
      signInTab: 'Sign in',
      signUpTab: 'Create account',
      nameLabel: 'Display name',
      namePlaceholder: 'Your name',
      emailLabel: 'Email',
      emailPlaceholder: 'name@email.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'At least 8 characters',
      hidePassword: 'Hide',
      showPassword: 'Show',
      submitSignIn: 'Sign in with email',
      submitSignUp: 'Create account',
      submittingSignIn: 'Signing in...',
      submittingSignUp: 'Creating account...',
      googleDivider: 'or continue securely with Google',
      googleFallback: 'Use Google for quick and secure access.',
      supabaseMissing: 'Email sign-in is not available on this device yet. Continue with Google.',
      invalidEmail: 'Enter a valid email address.',
      invalidPassword: 'Password must be at least 8 characters.',
      requiredName: 'Display name is required to create an account.',
      trust: 'Your session is stored safely on this device and you can sign out anytime.',
    };
  }, [localeState.language]);

  const emailAuthBusy = authBusyProvider === 'email';
  const googleAuthBusy = authBusyProvider === 'google';
  const authBusy = Boolean(authBusyProvider);

  const submitEmailAuth = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = displayName.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailFormError(authFormCopy.invalidEmail);
      return;
    }
    if (password.length < 8) {
      setEmailFormError(authFormCopy.invalidPassword);
      return;
    }
    if (emailAuthMode === 'signUp' && !normalizedName) {
      setEmailFormError(authFormCopy.requiredName);
      return;
    }

    setEmailFormError('');
    await onEmailAuth({
      mode: emailAuthMode,
      email: normalizedEmail,
      password,
      displayName: normalizedName || undefined,
    });
  };

  useEffect(() => {
    if (!lastActionLabel) {
      setLastActionLabel(homeCopy.searchStatus.ready);
    }
  }, [homeCopy.searchStatus.ready, lastActionLabel]);

  const runSearch = async (promptOverride?: string) => {
    if (searchPhase !== 'idle' && searchPhase !== 'failed') {
      return;
    }

    const prompt = (promptOverride ?? query).trim();
    if (!prompt) return;

    const requestId = activeSearchRequestRef.current + 1;
    activeSearchRequestRef.current = requestId;
    const isCurrentRequest = () => isMountedRef.current && activeSearchRequestRef.current === requestId;

    if (!session) {
      const message = homeCopy.search.signInRequired;
      setError(message);
      setSearchPhase('failed');
      trackEvent('auth_gate_seen', { surface: 'home', trigger: 'search_without_session' });
      return;
    }

    if (!isOnline) {
      const message = homeCopy.search.reconnectRequired;
      setError(message);
      setSearchPhase('failed');
      trackEvent('offline_gate_seen', { surface: 'home', trigger: 'search' });
      return;
    }

    setQuery(prompt);
    setSearchPhase('sending');
    setSaved(false);
    setError('');
    setResult('');
    setSources([]);
    setRetrievedAt(null);
    setLiveSearchUnavailable(false);

    trackEvent('feature_used', { feature: 'home_live_search', promptLength: prompt.length });
    await new Promise((resolve) => setTimeout(resolve, 120));
    if (!isCurrentRequest()) return;
    setSearchPhase('live_searching');

    try {
      const response = await apiClient.runAiAction(
        'search',
        prompt,
        {
          responseProfile: {
            verbosity: 'comprehensive',
            format: 'steps',
            tone: 'professional',
            ambiguityPolicy: 'assume',
          },
          clientContext: {
            platform: 'mobile',
            surface: 'home',
          },
          agentProfile,
        },
      );

      if (!isCurrentRequest()) return;

      if (response.ok === false) {
        const message = response.errorCode === 'insufficient_sources'
          ? homeCopy.search.insufficientSources
          : homeCopy.search.retry;
        setError(message);
        setSearchPhase('failed');
        trackEvent('action_failed', { action: 'home_live_search', errorCode: response.errorCode || 'search_unavailable' });
        return;
      }

      const text = String(response.text || '').trim();
      const normalizedSources = normalizeSources(response.sources);
      const sourceCount = Number.isFinite(response.sourceCount) ? Number(response.sourceCount) : normalizedSources.length;
      if (!text || sourceCount < 2 || normalizedSources.length < 2) {
        throw new ApiError(homeCopy.search.insufficientSources, {
          status: 200,
          errorCode: 'insufficient_sources',
        });
      }

      setSearchPhase('rendering');
      setResult(text);
      setSources(normalizedSources);
      setRetrievedAt(Number.isFinite(response.retrievedAt) ? Number(response.retrievedAt) : Date.now());
      setLastActionLabel(prompt);
      setResultSheetVisible(true);
      trackEvent('action_succeeded', { action: 'home_live_search', sourceCount });
      await hapticSuccess();
      if (!isCurrentRequest()) return;
      setSearchPhase('idle');
    } catch (err) {
      try {
        const responseMode = 'deep' as const;
        const resolved = buildResponseOrchestration(prompt, responseMode, {
          verbosity: 'comprehensive',
          format: 'steps',
          tone: 'professional',
          ambiguityPolicy: 'assume',
        }, {
          platform: 'mobile',
          appLanguage: locale,
          acceptLanguage: locale,
          surface: 'home',
        }, undefined, agentProfile);
        const deepFallback = await apiClient.runAiAction('deep_think', prompt, {
          responseProfile: {
            language: resolved.language,
            verbosity: resolved.expectation.verbosity,
            format: resolved.expectation.format,
            tone: resolved.expectation.tone,
            ambiguityPolicy: resolved.expectation.ambiguityPolicy,
          },
          clientContext: {
            platform: 'mobile',
            appLanguage: locale,
            acceptLanguage: locale,
            surface: 'home',
          },
          agentProfile,
        });

        const fallbackText = String(deepFallback.text || '').trim();
        if (!isCurrentRequest()) return;
        if (!fallbackText) {
          throw err;
        }

        const fallbackSources = normalizeSources(deepFallback.sources);
        setResult(fallbackText);
        setSources(fallbackSources);
        setRetrievedAt(Date.now());
        setLiveSearchUnavailable(true);
        setError(homeCopy.search.deepFallback);
        setLastActionLabel(prompt);
        setResultSheetVisible(true);
        setSearchPhase('idle');
      } catch {
        if (!isCurrentRequest()) return;
        const message = err instanceof ApiError && err.errorCode === 'insufficient_sources'
          ? homeCopy.search.insufficientSources
          : homeCopy.search.retry;
        setError(message);
        setSearchPhase('failed');
        trackEvent('action_failed', {
          action: 'home_live_search',
          errorCode: err instanceof ApiError ? err.errorCode || 'api_error' : 'unknown',
        });
      }
    }
  };

  const saveResult = async () => {
    if (!result.trim()) return;
    await onSaveToCollection({
      title: query || webT.homeSearchResult,
      markdown: result,
      source: 'home',
      sources: sources.map((source) => source.uri),
    });
    setSaved(true);
    setLastActionLabel(webT.saveToCollection);
    trackEvent('action_succeeded', { action: 'home_save_result', sourceCount: sources.length });
    await hapticSuccess();
  };

  const shareResult = async () => {
    const text = result.trim();
    if (!text) return;
    await Share.share({
      message: text,
      title: query || webT.homeSearchResult || homeCopy.sections.latestResultTitle,
    });
    setLastActionLabel(homeCopy.sections.share);
    trackEvent('action_succeeded', { action: 'home_share_result' });
  };

  return (
    <>
      <AppShell
        header={(
          <HeroHeader
            eyebrow={webT.chatBrandName}
            title={greeting}
            subtitle={webT.homePrompt}
            direction={direction}
            status={(
              <>
                <InfoPill label={searchStatusLabel} tone={searchPhase === 'failed' ? 'warning' : 'accent'} />
                {sources.length >= 2 ? <InfoPill label={homeCopy.search.sources(sources.length)} tone="success" /> : null}
                {liveSearchUnavailable ? <InfoPill label={homeCopy.search.deepFallback} tone="warning" /> : null}
              </>
            )}
            trailing={(
              <View style={styles.trailingMeta}>
                <InfoPill label={authSummary.title} tone={authSummary.tone} />
              </View>
            )}
          />
        )}
      >
        <FloatingSearchField
          value={query}
          placeholder={searchPlaceholder}
          onChangeText={setQuery}
          onSubmit={() => void runSearch()}
          submitLabel={localeState.language === 'id' ? 'Cari' : 'Search'}
          loadingLabel={localeState.language === 'id' ? 'Mencari...' : 'Searching...'}
          loading={searchPhase !== 'idle' && searchPhase !== 'failed'}
          chips={quickPrompts.map((prompt) => ({
            key: prompt,
            label: prompt,
            onPress: () => void runSearch(prompt),
          }))}
          statusLabel={searchPhase === 'failed' && error ? error : searchStatusLabel}
        />

        <SectionCard
          title={homeCopy.sections.quickPathsTitle}
          subtitle={homeCopy.sections.quickPathsSubtitle}
        >
          <View style={styles.shortcutGrid}>
            {featureCards.map((feature) => (
              <Pressable
                key={feature.routeName}
                onPress={() => navigation.navigate(feature.routeName)}
                style={styles.shortcutCard}
              >
                <View style={styles.shortcutIcon}>
                  <Ionicons
                    name={FEATURE_ICONS[feature.routeName] || 'sparkles-outline'}
                    size={uiTokens.icon.sm}
                    color={uiTokens.colors.accent}
                  />
                </View>
                <Text style={styles.shortcutTitle}>{feature.title}</Text>
                <Text style={styles.shortcutSubtitle}>{feature.subtitle}</Text>
              </Pressable>
            ))}
          </View>
        </SectionCard>

        <SectionCard
          title={session ? homeCopy.sections.accountTitle : homeCopy.sections.accessTitle}
          subtitle={authSummary.body}
          tone={authSummary.tone === 'warning' ? 'warning' : authSummary.tone === 'success' ? 'success' : 'accent'}
          footer={(
            <View style={styles.authActions}>
              {session ? (
                <ActionButton label={homeCopy.sections.logOut} tone="secondary" direction={direction} onPress={() => void onLogout()} />
              ) : (
                <>
                  {supabaseAuthEnabled ? (
                    <>
                      <View style={styles.authModeTabs}>
                        {(['signIn', 'signUp'] as const).map((mode) => {
                          const selected = emailAuthMode === mode;
                          return (
                            <Pressable
                              key={mode}
                              onPress={() => {
                                setEmailAuthMode(mode);
                                setEmailFormError('');
                              }}
                              style={[styles.authModeTab, selected ? styles.authModeTabActive : null]}
                              disabled={emailAuthBusy}
                            >
                              <Text style={[styles.authModeTabText, selected ? styles.authModeTabTextActive : null]}>
                                {mode === 'signIn' ? authFormCopy.signInTab : authFormCopy.signUpTab}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      {emailAuthMode === 'signUp' ? (
                        <View style={styles.fieldGroup}>
                          <Text style={styles.fieldLabel}>{authFormCopy.nameLabel}</Text>
                          <TextInput
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder={authFormCopy.namePlaceholder}
                            placeholderTextColor={uiTokens.colors.textMuted}
                            autoCapitalize="words"
                            autoCorrect={false}
                            editable={!emailAuthBusy}
                            style={styles.input}
                          />
                        </View>
                      ) : null}

                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>{authFormCopy.emailLabel}</Text>
                        <TextInput
                          value={email}
                          onChangeText={setEmail}
                          placeholder={authFormCopy.emailPlaceholder}
                          placeholderTextColor={uiTokens.colors.textMuted}
                          keyboardType="email-address"
                          textContentType="emailAddress"
                          autoCapitalize="none"
                          autoComplete="email"
                          autoCorrect={false}
                          editable={!emailAuthBusy}
                          style={styles.input}
                        />
                      </View>

                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>{authFormCopy.passwordLabel}</Text>
                        <View style={styles.passwordInputWrap}>
                          <TextInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder={authFormCopy.passwordPlaceholder}
                            placeholderTextColor={uiTokens.colors.textMuted}
                            textContentType={emailAuthMode === 'signUp' ? 'newPassword' : 'password'}
                            autoCapitalize="none"
                            autoComplete={emailAuthMode === 'signUp' ? 'new-password' : 'password'}
                            autoCorrect={false}
                            secureTextEntry={!passwordVisible}
                            editable={!emailAuthBusy}
                            style={styles.passwordInput}
                          />
                          <Pressable
                            onPress={() => setPasswordVisible((visible) => !visible)}
                            style={styles.passwordToggle}
                            hitSlop={8}
                          >
                            <Text style={styles.passwordToggleText}>
                              {passwordVisible ? authFormCopy.hidePassword : authFormCopy.showPassword}
                            </Text>
                          </Pressable>
                        </View>
                      </View>

                      {emailFormError ? <Text selectable style={styles.warningText}>{emailFormError}</Text> : null}

                      <ActionButton
                        label={
                          emailAuthBusy
                            ? (emailAuthMode === 'signUp' ? authFormCopy.submittingSignUp : authFormCopy.submittingSignIn)
                            : (emailAuthMode === 'signUp' ? authFormCopy.submitSignUp : authFormCopy.submitSignIn)
                        }
                        tone="primary"
                        fullWidth
                        direction={direction}
                        onPress={() => void submitEmailAuth()}
                        disabled={!isOnline || authBusy}
                      />

                      <View style={styles.authDivider}>
                        <View style={styles.authDividerLine} />
                        <Text style={styles.authDividerText}>{authFormCopy.googleDivider}</Text>
                        <View style={styles.authDividerLine} />
                      </View>
                    </>
                  ) : (
                    <Text selectable style={styles.warningText}>{authFormCopy.supabaseMissing}</Text>
                  )}

                  <ActionButton
                    label={googleAuthBusy ? homeCopy.sections.openingGoogle : webT.continueWithGoogle}
                    tone="primary"
                    fullWidth
                    direction={direction}
                    onPress={() => void onLoginGoogle()}
                    disabled={!isOnline || authBusy}
                  />
                  {!supabaseAuthEnabled ? <Text selectable style={styles.accountHint}>{authFormCopy.googleFallback}</Text> : null}
                  {enableAppleSignIn ? (
                    <ActionButton
                      label={authBusyProvider === 'apple' ? homeCopy.sections.openingApple : webT.authModalAppleSoon}
                      tone="secondary"
                      direction={direction}
                      onPress={() => void onLoginApple()}
                      disabled={Boolean(authBusyProvider)}
                    />
                  ) : null}
                </>
              )}
            </View>
          )}
        >
          <Text style={styles.accountValue}>
            {session ? authSummary.body : homeCopy.sections.guestAccessBody}
          </Text>
          {!session ? <Text style={styles.accountHint}>{authFormCopy.trust}</Text> : null}
          {authError ? <Text selectable style={styles.warningText}>{authError}</Text> : null}
        </SectionCard>

        {result ? (
          <SectionCard
            title={homeCopy.sections.latestResultTitle}
            subtitle={query || homeCopy.sections.latestResultSubtitle}
            footer={<ActionButton label={homeCopy.sections.openResult} tone="secondary" direction={direction} onPress={() => setResultSheetVisible(true)} />}
          >
            <View style={styles.previewWrap}>
              <Text style={styles.previewText}>{resultPreview}</Text>
              <View style={styles.previewMeta}>
                {retrievedAt ? <InfoPill label={homeCopy.search.retrieved(formatRetrievedAt(locale, retrievedAt) || '')} /> : null}
                <InfoPill label={saved ? homeCopy.sections.saved : homeCopy.sections.readyToSave} tone={saved ? 'success' : 'accent'} />
              </View>
            </View>
          </SectionCard>
        ) : null}
      </AppShell>

      <ResultSheet
        visible={resultSheetVisible}
        direction={direction}
        onClose={() => setResultSheetVisible(false)}
        title={query || webT.homeSearchResult}
        subtitle={sources.length >= 2 ? homeCopy.search.groundedSources(sources.length) : homeCopy.search.groundedResult}
        actions={[
          {
            label: saved ? webT.saveToCollection : webT.saveToCollection,
            tone: 'primary',
            onPress: () => void saveResult(),
            disabled: !result || saved,
          },
          {
            label: homeCopy.sections.share,
            tone: 'secondary',
            onPress: () => void shareResult(),
            disabled: !result,
          },
        ]}
        content={(
          <View style={styles.sheetContent}>
            <Text style={styles.sheetText}>{result || homeCopy.sections.noResultYet}</Text>
            {liveSearchUnavailable ? (
              <Text style={styles.warningText}>{homeCopy.search.deepFallback}</Text>
            ) : null}
            {sources.length > 0 ? (
              <View style={styles.sourceList}>
                {sources.map((source) => (
                  <Pressable
                    key={source.uri}
                    onPress={() => {
                      trackEvent('feature_used', { feature: 'home_open_source', domain: source.domain || 'unknown' });
                      void Linking.openURL(source.uri);
                    }}
                    style={styles.sourceCard}
                  >
                    <Text style={styles.sourceTitle} numberOfLines={1}>
                      {source.title || source.uri}
                    </Text>
                    <Text style={styles.sourceDomain} numberOfLines={1}>
                      {source.domain || source.uri}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  trailingMeta: {
    gap: 8,
  },
  authActions: {
    width: '100%',
    gap: 10,
  },
  authModeTabs: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: uiTokens.radius.pill,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    backgroundColor: uiTokens.surface.soft,
  },
  authModeTab: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: uiTokens.radius.pill,
  },
  authModeTabActive: {
    backgroundColor: uiTokens.colors.accent,
  },
  authModeTabText: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
    fontWeight: '600',
  },
  authModeTabTextActive: {
    color: uiTokens.text.inverse,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
    fontWeight: '600',
  },
  input: {
    minHeight: 48,
    borderRadius: uiTokens.radius.input,
    borderWidth: 1,
    borderColor: uiTokens.colors.fieldBorder,
    backgroundColor: uiTokens.colors.field,
    color: uiTokens.text.primary,
    paddingHorizontal: 14,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.body.fontSize,
  },
  passwordInputWrap: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: uiTokens.radius.input,
    borderWidth: 1,
    borderColor: uiTokens.colors.fieldBorder,
    backgroundColor: uiTokens.colors.field,
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    color: uiTokens.text.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.body.fontSize,
  },
  passwordToggle: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  passwordToggleText: {
    color: uiTokens.colors.accent,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
    fontWeight: '600',
  },
  authDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: uiTokens.border.soft,
  },
  authDividerText: {
    color: uiTokens.text.muted,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
  accountValue: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
  },
  accountHint: {
    color: uiTokens.text.muted,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
  warningText: {
    color: uiTokens.colors.warning,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
  previewWrap: {
    gap: 12,
  },
  previewText: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
  },
  previewMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  shortcutCard: {
    width: '48%',
    gap: 10,
    borderRadius: uiTokens.radius.card,
    padding: 16,
    backgroundColor: uiTokens.surface.strong,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    ...uiTokens.elevation.panel,
  },
  shortcutIcon: {
    width: 40,
    height: 40,
    borderRadius: uiTokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uiTokens.surface.accent,
  },
  shortcutTitle: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: uiTokens.typography.section.fontSize,
    lineHeight: uiTokens.typography.section.lineHeight,
    fontWeight: '600',
  },
  shortcutSubtitle: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: 20,
  },
  sheetContent: {
    gap: 12,
  },
  sheetText: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: 22,
  },
  sourceList: {
    gap: 10,
  },
  sourceCard: {
    borderRadius: uiTokens.radius.input,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    backgroundColor: uiTokens.surface.soft,
    padding: 14,
    gap: 4,
  },
  sourceTitle: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
    fontWeight: '600',
  },
  sourceDomain: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
});


