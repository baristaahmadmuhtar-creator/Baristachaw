import test from 'node:test';
import assert from 'node:assert/strict';

import type { Language } from '../../apps/mobile/src/web-shared/types.ts';
import { LANGUAGE_META } from '../../apps/mobile/src/web-shared/constants.ts';
import { resolveMobileAuthBundle, resolveMobileAuthCopy } from '../../apps/mobile/src/utils/authLocalization.ts';

const BROKEN_ENCODING_PATTERNS = [
  /\?{3,}/,
  /Ã./,
  /Ø./,
  /â€™|â€œ|â€|â€¢/,
  /�/,
];

test('mobile auth gate exposes localized first-screen labels for every supported language', () => {
  const english = resolveMobileAuthBundle('en');

  for (const language of Object.keys(LANGUAGE_META) as Language[]) {
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

test('mobile auth copy defaults unsupported locale tags to English', () => {
  assert.equal(resolveMobileAuthCopy('signIn', 'fr-FR').submit, 'Sign in with email');
  assert.equal(resolveMobileAuthBundle('fr-FR').guestContinue, 'Continue as guest');
});
