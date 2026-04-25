import { resolveMobileAuthCopy, resolveMobileAuthUnavailableCopy } from '../MobileAuthGate';

describe('MobileAuthGate copy parity', () => {
  test('matches the PWA sign-in route copy for Google and guest mode', () => {
    expect(resolveMobileAuthCopy('signIn').subtitle).toBe(
      'Gunakan Google untuk fitur AI terlindungi, atau lanjut sebagai tamu untuk ruang kerja gratis.',
    );
    expect(resolveMobileAuthUnavailableCopy('signIn')).toEqual({
      title: 'Masuk ke Baristachaw',
      subtitle: 'Gunakan Google untuk fitur AI terlindungi, atau lanjut sebagai tamu untuk ruang kerja gratis.',
    });
  });

  test('keeps the sign-up surface aligned with the PWA registration route', () => {
    expect(resolveMobileAuthCopy('signUp').subtitle).toBe(
      'Mulai dengan Google atau mode tamu. Akun bisa ditingkatkan saat pembayaran sudah aktif.',
    );
    expect(resolveMobileAuthUnavailableCopy('signUp')).toEqual({
      title: 'Daftar ke Baristachaw',
      subtitle: 'Mulai dengan Google atau mode tamu. Akun bisa ditingkatkan saat pembayaran sudah aktif.',
    });
  });
});
