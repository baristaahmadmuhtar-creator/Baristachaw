import { getApp, getApps, initializeApp } from 'firebase/app';
import type { FirebaseOptions } from 'firebase/app';
import {
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    deleteUser,
    GoogleAuthProvider,
    getAuth,
    getRedirectResult,
    onAuthStateChanged,
    sendPasswordResetEmail,
    setPersistence,
    signInWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    signOut,
    updateProfile,
} from 'firebase/auth';
import type { AuthError, User, UserCredential } from 'firebase/auth';

const runtimeEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
const getEnvVar = (key: string): string | undefined => runtimeEnv?.[key];

const firebaseConfig: FirebaseOptions = {
    apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
    authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnvVar('VITE_FIREBASE_APP_ID'),
    measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID'),
};

const requiredConfig = [
    firebaseConfig.apiKey,
    firebaseConfig.authDomain,
    firebaseConfig.projectId,
    firebaseConfig.storageBucket,
    firebaseConfig.messagingSenderId,
    firebaseConfig.appId,
];

const firebaseConfigured = requiredConfig.every((value) => Boolean(String(value || '').trim()));

const firebaseApp = firebaseConfigured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
const FIREBASE_ID_TOKEN_CACHE_KEY = 'BARISTA_FIREBASE_ID_TOKEN';
const GOOGLE_REDIRECT_ERROR_KEY = 'BARISTA_GOOGLE_REDIRECT_ERROR';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const assertAuthConfigured = () => {
    if (!firebaseAuth) {
        throw new Error('Firebase config not complete. Check VITE_FIREBASE_* in environment.');
    }
    return firebaseAuth;
};

const safeLocalStorageRead = (key: string): string => {
    try {
        return localStorage.getItem(key) || '';
    } catch {
        return '';
    }
};

const safeLocalStorageWrite = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch { }
};

const safeLocalStorageRemove = (key: string) => {
    try {
        localStorage.removeItem(key);
    } catch { }
};

const safeSessionStorageRead = (key: string): string => {
    try {
        return sessionStorage.getItem(key) || '';
    } catch {
        return '';
    }
};

const safeSessionStorageWrite = (key: string, value: string) => {
    try {
        sessionStorage.setItem(key, value);
    } catch { }
};

const safeSessionStorageRemove = (key: string) => {
    try {
        sessionStorage.removeItem(key);
    } catch { }
};

if (firebaseAuth) {
    void setPersistence(firebaseAuth, browserLocalPersistence).catch(() => { });
}

export const isFirebaseConfigured = () => firebaseConfigured;

export const startGoogleRedirectLogin = async (): Promise<void> => {
    await signInWithRedirect(assertAuthConfigured(), provider);
};

export const startGoogleLogin = async (): Promise<UserCredential | null> => {
    const auth = assertAuthConfigured();
    try {
        const credential = await signInWithPopup(auth, provider);
        if (credential?.user) {
            const token = await credential.user.getIdToken().catch(() => '');
            if (token) safeLocalStorageWrite(FIREBASE_ID_TOKEN_CACHE_KEY, token);
        }
        return credential;
    } catch (error) {
        const code = String((error as any)?.code || '').trim();
        const shouldFallbackToRedirect =
            code === 'auth/popup-blocked' ||
            code === 'auth/operation-not-supported-in-this-environment' ||
            code === 'auth/web-storage-unsupported';
        if (shouldFallbackToRedirect) {
            await signInWithRedirect(auth, provider);
            return null;
        }
        throw error as AuthError;
    }
};

export const loginWithEmailPassword = async (email: string, password: string): Promise<UserCredential> => {
    const auth = assertAuthConfigured();
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const token = await credential.user.getIdToken().catch(() => '');
    if (token) safeLocalStorageWrite(FIREBASE_ID_TOKEN_CACHE_KEY, token);
    return credential;
};

export const registerWithEmailPassword = async (
    email: string,
    password: string,
    displayName?: string
): Promise<UserCredential> => {
    const auth = assertAuthConfigured();
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const name = (displayName || '').trim();
    if (name) {
        await updateProfile(credential.user, { displayName: name }).catch(() => { });
    }
    const token = await credential.user.getIdToken().catch(() => '');
    if (token) safeLocalStorageWrite(FIREBASE_ID_TOKEN_CACHE_KEY, token);
    return credential;
};

export const requestPasswordReset = async (email: string): Promise<void> => {
    const auth = assertAuthConfigured();
    await sendPasswordResetEmail(auth, email.trim());
};

export const consumeGoogleRedirectLoginResult = async (): Promise<UserCredential | null> => {
    try {
        const credential = await getRedirectResult(assertAuthConfigured());
        if (credential?.user) {
            const token = await credential.user.getIdToken().catch(() => '');
            if (token) {
                safeLocalStorageWrite(FIREBASE_ID_TOKEN_CACHE_KEY, token);
            }
        }
        return credential;
    } catch (error) {
        throw error as AuthError;
    }
};

export const saveGoogleRedirectError = (error: unknown) => {
    const code = String((error as any)?.code || '').trim();
    const message = code ? `Google sign-in failed. (${code})` : 'Google sign-in failed.';
    safeSessionStorageWrite(GOOGLE_REDIRECT_ERROR_KEY, message);
};

export const consumeGoogleRedirectError = (): string => {
    const message = String(safeSessionStorageRead(GOOGLE_REDIRECT_ERROR_KEY)).trim();
    safeSessionStorageRemove(GOOGLE_REDIRECT_ERROR_KEY);
    return message;
};

export const signOutFirebase = async () => {
    safeLocalStorageRemove(FIREBASE_ID_TOKEN_CACHE_KEY);
    if (!firebaseAuth) return;
    await signOut(firebaseAuth);
};

export const deleteCurrentFirebaseAccount = async (): Promise<void> => {
    const user = firebaseAuth?.currentUser;
    if (!user) {
        throw Object.assign(new Error('No active Firebase user.'), { code: 'auth/no-current-user' });
    }
    await deleteUser(user);
    safeLocalStorageRemove(FIREBASE_ID_TOKEN_CACHE_KEY);
};

export const getFirebaseCurrentUser = (): User | null => firebaseAuth?.currentUser || null;

export const clearFirebaseIdTokenCache = () => {
    safeLocalStorageRemove(FIREBASE_ID_TOKEN_CACHE_KEY);
};

export const hasCachedFirebaseIdToken = () => Boolean(safeLocalStorageRead(FIREBASE_ID_TOKEN_CACHE_KEY));

export const getFirebaseIdToken = async (forceRefresh = false): Promise<string | null> => {
    const user = firebaseAuth?.currentUser;
    if (user) {
        const token = await user.getIdToken(forceRefresh).catch(() => null);
        if (token) {
            safeLocalStorageWrite(FIREBASE_ID_TOKEN_CACHE_KEY, token);
            return token;
        }
    }
    const cached = safeLocalStorageRead(FIREBASE_ID_TOKEN_CACHE_KEY);
    return cached || null;
};

export const onFirebaseAuthStateChanged = (callback: (user: User | null) => void) => {
    if (!firebaseAuth) {
        callback(null);
        return () => { };
    }
    return onAuthStateChanged(firebaseAuth, (user) => {
        if (!user) {
            safeLocalStorageRemove(FIREBASE_ID_TOKEN_CACHE_KEY);
            callback(null);
            return;
        }
        void user
            .getIdToken()
            .then((token) => {
                if (token) safeLocalStorageWrite(FIREBASE_ID_TOKEN_CACHE_KEY, token);
            })
            .finally(() => callback(user));
    });
};
