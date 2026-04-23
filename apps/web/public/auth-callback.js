(() => {
  const CALLBACK_RESULT_KEY = 'BARISTA_OAUTH_CALLBACK_RESULT_V1';
  const node = document.getElementById('auth-callback-data');
  if (!node) return;

  const read = (name) => node.getAttribute(name) || '';
  const decode = (value) => {
    if (!value) return '';
    try {
      return decodeURIComponent(value);
    } catch {
      return '';
    }
  };

  const mode = read('data-mode');
  const targetOrigin = decode(read('data-target-origin')) || window.location.origin;
  const returnTo = decode(read('data-return-to')) || '/';

  const persistResult = (payload) => {
    try {
      window.sessionStorage.setItem(CALLBACK_RESULT_KEY, JSON.stringify({
        ...payload,
        savedAt: Date.now(),
      }));
    } catch {
      // Ignore storage failures and continue with redirect fallback.
    }
  };

  const redirectToApp = () => {
    window.location.replace(returnTo);
  };

  if (mode === 'success') {
    const encodedUser = read('data-user');
    let user = null;
    try {
      const raw = decode(encodedUser);
      user = raw ? JSON.parse(raw) : null;
    } catch {
      user = null;
    }

    if (window.opener) {
      window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user }, targetOrigin);
      window.close();
      return;
    }

    persistResult({ type: 'success', user, returnTo });
    redirectToApp();
    return;
  }

  if (mode === 'error') {
    const errorMessage = decode(read('data-error-message')) || 'Authentication failed';
    if (window.opener) {
      window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: errorMessage }, targetOrigin);
      window.close();
      return;
    }

    persistResult({ type: 'error', error: errorMessage, returnTo });
    redirectToApp();
  }
})();
