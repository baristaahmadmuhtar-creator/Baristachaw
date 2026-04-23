import {
  CHAT_VOICE_NOTE_MAX_DURATION_MS,
  REQUIRED_CHAT_CORE_ACTION_IDS,
  computeComposerBottomOffset,
  hasAllRequiredCoreActions,
} from '../chatComposerLayout';

describe('chatComposerLayout helpers', () => {
  test('computes idle composer offset from safe area inset', () => {
    expect(computeComposerBottomOffset({ insetsBottom: 34, keyboardHeight: 0, keyboardVisible: false })).toBe(44);
  });

  test('adds docked inset when the tab bar is visible', () => {
    expect(computeComposerBottomOffset({
      insetsBottom: 34,
      keyboardHeight: 0,
      keyboardVisible: false,
      dockedInset: 70,
    })).toBe(114);
  });

  test('computes keyboard composer offset with lift', () => {
    expect(computeComposerBottomOffset({ insetsBottom: 34, keyboardHeight: 330, keyboardVisible: true })).toBeGreaterThan(280);
  });

  test('voice note max duration remains 60 seconds', () => {
    expect(CHAT_VOICE_NOTE_MAX_DURATION_MS).toBe(60_000);
  });

  test('required core actions are complete', () => {
    expect(hasAllRequiredCoreActions(REQUIRED_CHAT_CORE_ACTION_IDS)).toBe(true);
  });
});
