import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveMobileAuthBundle, resolveMobileAuthCopy } from '../../apps/mobile/src/utils/authLocalization.ts';
import type { Language } from '../../apps/mobile/src/web-shared/types.ts';

const BROKEN_ENCODING_PATTERNS = [
  /\?{3,}/,
  /Ã./,
  /Ø./,
  /â€™|â€œ|â€|â€¢/,
  /�/,
];

test('mobile auth gate exposes localized first-screen labels for claimed launch languages', () => {
  const english = resolveMobileAuthBundle('en');
  const launchLanguages: Language[] = ['en', 'id'];

  for (const language of launchLanguages) {
    const copy = resolveMobileAuthBundle(language);
    const values = [
      copy.modes.signIn.subtitle,
      copy.modes.signIn.submit,
      copy.googleContinue,
      copy.guestContinue,
      copy.tabSignIn,
      copy.tabSignUp,
      copy.offlineNotice,
      copy.appleSignIn,
    ];

    for (const value of values) {
      assert.ok(value.trim().length > 0, `${language} auth copy cannot be empty`);
      for (const pattern of BROKEN_ENCODING_PATTERNS) {
        assert.equal(pattern.test(value), false, `${language} auth copy contains broken encoding: ${value}`);
      }
    }

    if (language !== 'en') {
      assert.notEqual(copy.googleContinue, english.googleContinue, `${language}.googleContinue must not fall back to English`);
      assert.notEqual(copy.guestContinue, english.guestContinue, `${language}.guestContinue must not fall back to English`);
      assert.notEqual(copy.modes.signIn.submit, english.modes.signIn.submit, `${language}.signIn.submit must not fall back to English`);
    }
  }
});

test('mobile auth copy defaults unsupported locale tags to English for store shell safety', () => {
  assert.equal(resolveMobileAuthCopy('signIn', 'fr-FR').submit, 'Sign in with email');
  assert.equal(resolveMobileAuthBundle('fr-FR').guestContinue, 'Continue as guest');
  assert.equal(resolveMobileAuthBundle('ar').guestContinue, 'Continue as guest');
  assert.equal(resolveMobileAuthBundle('zh').googleContinue, 'Continue with Google');
});
