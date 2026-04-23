import * as Haptics from 'expo-haptics';

async function runHaptic(
  fn: () => Promise<void>,
) {
  try {
    await fn();
  } catch {
    // Ignore haptic errors on unsupported environments.
  }
}

export async function hapticImpactLight() {
  await runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export async function hapticSuccess() {
  await runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export async function hapticWarning() {
  await runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export async function hapticError() {
  await runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

