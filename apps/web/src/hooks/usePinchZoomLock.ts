import { useEffect } from 'react';

const LOCKED_VIEWPORT = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content';
const DEFAULT_VIEWPORT = 'width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content';

export function usePinchZoomLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!(viewportMeta instanceof HTMLMetaElement)) return;

    const previousContent = viewportMeta.getAttribute('content') || '';
    viewportMeta.setAttribute('content', LOCKED_VIEWPORT);

    const preventGesture = (event: Event) => {
      event.preventDefault();
    };

    const preventMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    document.addEventListener('gesturestart', preventGesture, { passive: false } as AddEventListenerOptions);
    document.addEventListener('gesturechange', preventGesture, { passive: false } as AddEventListenerOptions);
    document.addEventListener('touchmove', preventMultiTouch, { passive: false });

    return () => {
      viewportMeta.setAttribute('content', previousContent || DEFAULT_VIEWPORT);
      document.removeEventListener('gesturestart', preventGesture as EventListener);
      document.removeEventListener('gesturechange', preventGesture as EventListener);
      document.removeEventListener('touchmove', preventMultiTouch as EventListener);
    };
  }, [enabled]);
}
