export function resolveAuthInitError(payload: any, fallback = 'Gagal memulai proses masuk.') {
  const code = typeof payload?.errorCode === 'string' ? payload.errorCode : '';
  const hint = typeof payload?.hint === 'string' ? payload.hint : '';
  const provider = typeof payload?.provider === 'string' ? payload.provider : '';

  if (code === 'oauth_not_configured') {
    if (provider === 'facebook') {
      return 'Facebook Login belum dikonfigurasi di server. Pastikan FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET, dan JWT_SECRET sudah diset.';
    }
    return 'Google Sign-In belum dikonfigurasi di server. Pastikan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, dan JWT_SECRET sudah diset.';
  }

  if (code === 'server_misconfigured') {
    return 'Server authentication belum dikonfigurasi dengan benar. Periksa variabel environment auth di deployment.';
  }

  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error.trim();
  }

  return hint || fallback;
}
