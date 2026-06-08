import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const APP_SOURCE = readFileSync('apps/web/src/App.tsx', 'utf8');
const AUTH_SCREEN_SOURCE = readFileSync('apps/web/src/pages/AuthScreen.tsx', 'utf8');
const AUTH_MODAL_SOURCE = readFileSync('apps/web/src/components/auth/AuthEntryModal.tsx', 'utf8');
const AUTH_CONTEXT_SOURCE = readFileSync('apps/web/src/context/AuthModalContext.tsx', 'utf8');
const AI_ACCESS_GATE_SOURCE = readFileSync('apps/web/src/components/billing/AiAccessGate.tsx', 'utf8');
const HOME_SOURCE = readFileSync('apps/web/src/pages/Home.tsx', 'utf8');
const CHAT_SOURCE = readFileSync('apps/web/src/pages/Chat.tsx', 'utf8');
const MOBILE_PARITY_SOURCE = readFileSync('apps/mobile/src/screens/WebParityScreen.tsx', 'utf8');
const MOBILE_DOC_SOURCE = readFileSync('docs/mobile-web-parity-gate.md', 'utf8');

test('web auth uses browse-only preview instead of route-level guest gate', () => {
  assert.doesNotMatch(APP_SOURCE, /ENTRY_AUTH_GATE_PATHS/);
  assert.doesNotMatch(APP_SOURCE, /shouldGateEntryRoute/);
  assert.match(AUTH_SCREEN_SOURCE, /authRouteLanguageTitle/);
  assert.match(AUTH_SCREEN_SOURCE, /authRouteExploreCta/);
  assert.match(AUTH_SCREEN_SOURCE, /BARISTACHAW_ONBOARDING_SEEN/);
  assert.doesNotMatch(AUTH_SCREEN_SOURCE, /continueAsGuest/);
  assert.doesNotMatch(AUTH_SCREEN_SOURCE, /authRouteGuestCta/);
  assert.doesNotMatch(AUTH_MODAL_SOURCE, /continueAsGuest/);
  assert.doesNotMatch(AUTH_MODAL_SOURCE, /AuthModalAction = 'google' \| 'facebook' \| 'guest'/);
});

test('legacy guest bootstrap is not started from public query params', () => {
  assert.doesNotMatch(AUTH_CONTEXT_SOURCE, /consumeGuestModeRequest/);
  assert.doesNotMatch(AUTH_CONTEXT_SOURCE, /guestBootstrapHandledRef/);
  assert.doesNotMatch(MOBILE_PARITY_SOURCE, /guest_mode/);
  assert.match(MOBILE_DOC_SOURCE, /Browse-only preview/);
});

test('unauthenticated or legacy guest AI access opens auth directly', () => {
  assert.match(AI_ACCESS_GATE_SOURCE, /if \(!isAuthenticated \|\| isGuest\)/);
  assert.match(AI_ACCESS_GATE_SOURCE, /openAuthModal\(\{ source: source as any \}\)/);
  assert.doesNotMatch(AI_ACCESS_GATE_SOURCE, /reason: 'guest'/);
});

test('browse-only public feature surfaces stay interactive until protected submit', () => {
  assert.match(HOME_SOURCE, /disabled=\{accountBlocked \|\| loading\}/);
  assert.doesNotMatch(HOME_SOURCE, /disabled=\{!isAuthenticated \|\| accountBlocked \|\| loading\}/);
  assert.match(CHAT_SOURCE, /const interactionDisabled = loading \|\| authChecking \|\| authBusy;/);
  assert.doesNotMatch(CHAT_SOURCE, /const interactionDisabled = loading \|\| authChecking \|\| authBusy \|\| !isAuthenticated;/);
  assert.match(AUTH_MODAL_SOURCE, /\^ai_brew\(\?:_\|\$\)/);
});
