export interface ComposerBottomInput {
  insetsBottom: number;
  keyboardHeight: number;
  keyboardVisible: boolean;
  idleGap?: number;
  keyboardGap?: number;
  dockedInset?: number;
}

export const CHAT_VOICE_NOTE_MAX_DURATION_MS = 60_000;

export type ChatCoreActionId =
  | 'mode_normal'
  | 'mode_fast'
  | 'mode_deep'
  | 'history'
  | 'attach_gallery'
  | 'attach_camera'
  | 'attach_file'
  | 'voice_note'
  | 'save_last'
  | 'share_last'
  | 'go_scanner'
  | 'go_collection'
  | 'go_tools';

export const REQUIRED_CHAT_CORE_ACTION_IDS: readonly ChatCoreActionId[] = [
  'mode_normal',
  'mode_fast',
  'mode_deep',
  'history',
  'attach_gallery',
  'attach_camera',
  'attach_file',
  'voice_note',
  'save_last',
  'share_last',
  'go_scanner',
  'go_collection',
  'go_tools',
] as const;

export function computeComposerBottomOffset({
  insetsBottom,
  keyboardHeight,
  keyboardVisible,
  idleGap = 10,
  keyboardGap = 8,
  dockedInset = 0,
}: ComposerBottomInput): number {
  if (!keyboardVisible) {
    return Math.max(0, insetsBottom + idleGap + dockedInset);
  }

  const lift = Math.max(0, keyboardHeight - insetsBottom + keyboardGap);
  return Math.max(idleGap, lift);
}

export function hasAllRequiredCoreActions(ids: readonly string[]): boolean {
  const idSet = new Set(ids);
  return REQUIRED_CHAT_CORE_ACTION_IDS.every((id) => idSet.has(id));
}
