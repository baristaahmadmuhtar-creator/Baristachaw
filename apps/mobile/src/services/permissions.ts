import * as ImagePicker from 'expo-image-picker';

async function resolvePermission(
  current: () => Promise<ImagePicker.PermissionResponse>,
  request: () => Promise<ImagePicker.PermissionResponse>
) {
  const existing = await current();
  if (existing.granted) return { granted: true };

  const next = await request();
  return {
    granted: next.granted,
    canAskAgain: next.canAskAgain,
    status: next.status,
  };
}

export async function ensureCameraPermission() {
  return resolvePermission(
    () => ImagePicker.getCameraPermissionsAsync(),
    () => ImagePicker.requestCameraPermissionsAsync()
  );
}

export async function ensureMediaLibraryPermission() {
  return resolvePermission(
    () => ImagePicker.getMediaLibraryPermissionsAsync(),
    () => ImagePicker.requestMediaLibraryPermissionsAsync()
  );
}
