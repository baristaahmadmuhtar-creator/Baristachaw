export type CameraPermissionReason =
  | 'unavailable'
  | 'unsupported'
  | 'insecure_context'
  | 'denied';

export type CameraPermissionResult = {
  granted: boolean;
  code?: CameraPermissionReason;
  reason?: string;
};

export async function ensureCameraPermission(): Promise<CameraPermissionResult> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { granted: false, code: 'unavailable', reason: 'Camera is unavailable in this environment.' };
  }

  if (window.isSecureContext === false) {
    return {
      granted: false,
      code: 'insecure_context',
      reason: 'Camera access requires a secure HTTPS context.',
    };
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return { granted: false, code: 'unsupported', reason: 'This browser does not support camera access.' };
  }

  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
      if (status.state === 'granted') {
        return { granted: true };
      }
    }
  } catch {
    // Ignore unsupported permission query implementations and continue.
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    return { granted: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Camera permission denied.';
    return { granted: false, code: 'denied', reason: message };
  }
}
