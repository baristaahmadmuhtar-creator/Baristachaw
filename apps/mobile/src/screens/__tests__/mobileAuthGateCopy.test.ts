import { resolveMobileAuthCopy, resolveMobileAuthUnavailableCopy } from '../MobileAuthGate';

describe('MobileAuthGate copy parity', () => {
  test('defaults to the PWA English sign-in route copy for Google and guest mode', () => {
    expect(resolveMobileAuthCopy('signIn').subtitle).toBe(
      'Use Google for protected AI features, or continue as a guest for the free workspace.',
    );
    expect(resolveMobileAuthUnavailableCopy('signIn')).toEqual({
      title: 'Sign in to Baristachaw',
      subtitle: 'Use Google for protected AI features, or continue as a guest for the free workspace.',
    });
  });

  test('defaults to the PWA English registration route copy', () => {
    expect(resolveMobileAuthCopy('signUp').subtitle).toBe(
      'Start with Google or guest mode. You can upgrade the account when payments are active.',
    );
    expect(resolveMobileAuthUnavailableCopy('signUp')).toEqual({
      title: 'Join Baristachaw',
      subtitle: 'Start with Google or guest mode. You can upgrade the account when payments are active.',
    });
  });

  test('keeps explicit Indonesian auth copy aligned with the PWA routes', () => {
    expect(resolveMobileAuthCopy('signIn', 'id').subtitle).toBe(
      'Gunakan Google untuk fitur AI terlindungi, atau lanjut sebagai tamu untuk ruang kerja gratis.',
    );
    expect(resolveMobileAuthUnavailableCopy('signIn', 'id')).toEqual({
      title: 'Masuk ke Baristachaw',
      subtitle: 'Gunakan Google untuk fitur AI terlindungi, atau lanjut sebagai tamu untuk ruang kerja gratis.',
    });
    expect(resolveMobileAuthCopy('signUp', 'id').subtitle).toBe(
      'Mulai dengan Google atau mode tamu. Akun bisa ditingkatkan saat pembayaran sudah aktif.',
    );
    expect(resolveMobileAuthUnavailableCopy('signUp', 'id')).toEqual({
      title: 'Daftar ke Baristachaw',
      subtitle: 'Mulai dengan Google atau mode tamu. Akun bisa ditingkatkan saat pembayaran sudah aktif.',
    });
  });
});
