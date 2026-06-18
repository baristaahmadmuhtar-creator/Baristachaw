import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inferAppLanguage,
  inferCountryProfile,
  inferMarketingLanguage,
  inferRegion,
} from '@baristachaw/shared/locale';

test('country code BN defaults Baristachaw to Brunei region and Malay-facing language', () => {
  const profile = inferCountryProfile({ countryCode: 'BN' });

  assert.equal(profile.countryName, 'Brunei');
  assert.equal(profile.region, 'bn');
  assert.equal(profile.marketingLanguage, 'bn');
  assert.equal(profile.appLanguage, 'ms');
});

test('browser timezone can infer Brunei without GPS permission', () => {
  const signals = { languages: ['en-US'], timeZone: 'Asia/Brunei' };

  assert.equal(inferRegion(signals), 'bn');
  assert.equal(inferMarketingLanguage(signals), 'bn');
  assert.equal(inferAppLanguage(signals), 'ms');
});

test('Indonesian locale still defaults to Indonesia pricing and UI language', () => {
  const signals = { languages: ['id-ID'], timeZone: 'Asia/Jakarta' };

  assert.equal(inferRegion(signals), 'id');
  assert.equal(inferMarketingLanguage(signals), 'id');
  assert.equal(inferAppLanguage(signals), 'id');
});

