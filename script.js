const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'apps/web/src/context/AuthModalContext.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add accessToken to EmailAuthResult
content = content.replace(
  /export type EmailAuthResult = \{[\s\S]*?user\?: AuthUser \| null;\n\};/,
  \export type EmailAuthResult = {
  authenticated: boolean;
  emailConfirmationRequired?: boolean;
  email?: string;
  user?: AuthUser | null;
  accessToken?: string;
};\n
export type OtpVerifyInput = {
  email: string;
  token: string;
};

export type AccountRecoveryInput = {
  contactEmail: string;
  displayNameHint?: string;
  providerHint?: string;
  country?: string;
  evidence?: string;
};

export type AccountRecoveryResult = {
  message: string;
};\n\
);

// 2. Add methods to AuthModalContextValue
content = content.replace(
  /sendPasswordResetEmail: \(email: string\) => Promise<EmailPasswordResetResult>;/,
  \sendPasswordResetEmail: (email: string) => Promise<EmailPasswordResetResult>;
  sendEmailOtp: (email: string) => Promise<{ email: string }>;
  verifyEmailOtp: (input: OtpVerifyInput) => Promise<EmailAuthResult>;
  startPasswordResetOtp: (email: string) => Promise<EmailPasswordResetResult>;
  verifyPasswordResetOtp: (input: OtpVerifyInput) => Promise<EmailAuthResult>;
  completePasswordResetWithOtp: (input: EmailPasswordUpdateInput) => Promise<EmailAuthResult>;
  submitForgotEmailRecovery: (input: AccountRecoveryInput) => Promise<AccountRecoveryResult>;\
);

// 3. Add methods inside AuthModalProvider
// Let's insert them right after sendPasswordResetEmail
const methodsToInsert = \
  const sendEmailOtp = useCallback(async (email: string): Promise<{ email: string }> => {
    oauthResultHandledRef.current = true;
    clearOauthPopupMonitor({ closePopup: true });
    setAuthBusy(true);
    setAuthError(null);
    const copy = getLocalizedCopy();

    if (isOffline) {
      const message = copy.authEmailOffline || copy.connectionFailed || copy.error;
      setAuthBusy(false);
      setAuthError(message);
      throw new Error(message);
    }

    try {
      const response = await fetch('/api/auth/email/otp/send', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) {
        throw new Error(resolveEmailAuthError(payload, copy.authEmailUnavailable || copy.error, copy));
      }
      setAuthError(null);
      return { email };
    } catch (error) {
      const message = error instanceof Error ? error.message : (copy.authEmailUnavailable || copy.error);
      setAuthError(message);
      throw new Error(message);
    } finally {
      setAuthBusy(false);
    }
  }, [clearOauthPopupMonitor, getLocalizedCopy, isOffline]);

  const verifyEmailOtp = useCallback(async (input: OtpVerifyInput): Promise<EmailAuthResult> => {
    oauthResultHandledRef.current = true;
    clearOauthPopupMonitor({ closePopup: true });
    setAuthBusy(true);
    setAuthError(null);
    const copy = getLocalizedCopy();

    if (isOffline) {
      const message = copy.authEmailOffline || copy.connectionFailed || copy.error;
      setAuthBusy(false);
      setAuthError(message);
      throw new Error(message);
    }

    try {
      const response = await fetch('/api/auth/email/otp/verify', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) {
        throw new Error(resolveEmailAuthError(payload, copy.authEmailUnavailable || copy.error, copy));
      }

      const nextUser = (payload.user || null) as AuthUser | null;
      if (!payload.authenticated || !nextUser?.id) {
        throw new Error(copy.authEmailUnavailable || copy.error);
      }

      setUser(nextUser);
      if (nextUser.name) saveUserName(nextUser.name);
      setAuthMode('server');
      setAuthChecking(false);
      setAuthError(null);
      setIsOpen(false);
      return {
        authenticated: true,
        user: nextUser,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : (copy.authEmailUnavailable || copy.error);
      setAuthError(message);
      throw new Error(message);
    } finally {
      setAuthBusy(false);
    }
  }, [clearOauthPopupMonitor, getLocalizedCopy, isOffline]);

  const startPasswordResetOtp = useCallback(async (email: string): Promise<EmailPasswordResetResult> => {
    oauthResultHandledRef.current = true;
    clearOauthPopupMonitor({ closePopup: true });
    setAuthBusy(true);
    setAuthError(null);
    const copy = getLocalizedCopy();

    if (isOffline) {
      const message = copy.authEmailOffline || copy.connectionFailed || copy.error;
      setAuthBusy(false);
      setAuthError(message);
      throw new Error(message);
    }

    try {
      const response = await fetch('/api/auth/email/password/reset/start', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) {
        throw new Error(resolveEmailAuthError(payload, copy.authResetEmailUnavailable || copy.error, copy));
      }
      setAuthError(null);
      return {
        resetEmailSent: Boolean(payload.resetEmailSent ?? true),
        email: typeof payload.email === 'string' ? payload.email : email,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : (copy.authResetEmailUnavailable || copy.error);
      setAuthError(message);
      throw new Error(message);
    } finally {
      setAuthBusy(false);
    }
  }, [clearOauthPopupMonitor, getLocalizedCopy, isOffline]);

  const verifyPasswordResetOtp = useCallback(async (input: OtpVerifyInput): Promise<EmailAuthResult> => {
    oauthResultHandledRef.current = true;
    clearOauthPopupMonitor({ closePopup: true });
    setAuthBusy(true);
    setAuthError(null);
    const copy = getLocalizedCopy();

    if (isOffline) {
      const message = copy.authEmailOffline || copy.connectionFailed || copy.error;
      setAuthBusy(false);
      setAuthError(message);
      throw new Error(message);
    }

    try {
      const response = await fetch('/api/auth/email/password/reset/verify', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) {
        throw new Error(resolveEmailAuthError(payload, copy.authEmailUnavailable || copy.error, copy));
      }

      // We do not set the user or close the modal yet, because they need to set a new password.
      // But we do clear the error.
      setAuthError(null);
      return {
        authenticated: true,
        accessToken: typeof payload.accessToken === 'string' ? payload.accessToken : undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : (copy.authEmailUnavailable || copy.error);
      setAuthError(message);
      throw new Error(message);
    } finally {
      setAuthBusy(false);
    }
  }, [clearOauthPopupMonitor, getLocalizedCopy, isOffline]);

  const completePasswordResetWithOtp = useCallback(async (input: EmailPasswordUpdateInput): Promise<EmailAuthResult> => {
    oauthResultHandledRef.current = true;
    clearOauthPopupMonitor({ closePopup: true });
    setAuthBusy(true);
    setAuthError(null);
    const copy = getLocalizedCopy();

    if (isOffline) {
      const message = copy.authEmailOffline || copy.connectionFailed || copy.error;
      setAuthBusy(false);
      setAuthError(message);
      throw new Error(message);
    }

    try {
      const response = await fetch('/api/auth/email/password/reset/update', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) {
        throw new Error(resolveEmailAuthError(payload, copy.authEmailUnavailable || copy.error, copy));
      }

      const nextUser = (payload.user || null) as AuthUser | null;
      if (!payload.authenticated || !nextUser?.id) {
        throw new Error(copy.authEmailUnavailable || copy.error);
      }

      setUser(nextUser);
      if (nextUser.name) saveUserName(nextUser.name);
      setAuthMode('server');
      setAuthChecking(false);
      setAuthError(null);
      setIsOpen(false);
      return {
        authenticated: true,
        user: nextUser,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : (copy.authEmailUnavailable || copy.error);
      setAuthError(message);
      throw new Error(message);
    } finally {
      setAuthBusy(false);
    }
  }, [clearOauthPopupMonitor, getLocalizedCopy, isOffline]);

  const submitForgotEmailRecovery = useCallback(async (input: AccountRecoveryInput): Promise<AccountRecoveryResult> => {
    oauthResultHandledRef.current = true;
    clearOauthPopupMonitor({ closePopup: true });
    setAuthBusy(true);
    setAuthError(null);
    const copy = getLocalizedCopy();

    if (isOffline) {
      const message = copy.authEmailOffline || copy.connectionFailed || copy.error;
      setAuthBusy(false);
      setAuthError(message);
      throw new Error(message);
    }

    try {
      const response = await fetch('/api/auth/account-recovery', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) {
        throw new Error(resolveEmailAuthError(payload, copy.authEmailUnavailable || copy.error, copy));
      }
      setAuthError(null);
      return { message: payload.message || 'Permintaan bantuan akun diterima.' };
    } catch (error) {
      const message = error instanceof Error ? error.message : (copy.authEmailUnavailable || copy.error);
      setAuthError(message);
      throw new Error(message);
    } finally {
      setAuthBusy(false);
    }
  }, [clearOauthPopupMonitor, getLocalizedCopy, isOffline]);\n\n  const updateRecoveredPassword =;

content = content.replace(/  const updateRecoveredPassword =/, methodsToInsert);

// 4. Update the dependencies in the useMemo call for value
const depsToInsert = \    sendPasswordResetEmail,
    sendEmailOtp,
    verifyEmailOtp,
    startPasswordResetOtp,
    verifyPasswordResetOtp,
    completePasswordResetWithOtp,
    submitForgotEmailRecovery,\;

content = content.replace(/    sendPasswordResetEmail,/, depsToInsert);

const valueObjectToInsert = \    sendPasswordResetEmail,
    sendEmailOtp,
    verifyEmailOtp,
    startPasswordResetOtp,
    verifyPasswordResetOtp,
    completePasswordResetWithOtp,
    submitForgotEmailRecovery,\;

content = content.replace(/    sendPasswordResetEmail,/, valueObjectToInsert);

fs.writeFileSync(file, content);
console.log('Successfully patched AuthModalContext.tsx');
