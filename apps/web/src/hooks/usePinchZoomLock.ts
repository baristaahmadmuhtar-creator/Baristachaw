import { useEffect } from 'react';

const DEFAULT_VIEWPORT = 'width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content';

export function usePinchZoomLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!(viewportMeta instanceof HTMLMetaElement)) return;

    const previousContent = viewportMeta.getAttribute('content') || '';
    const nextContent = previousContent || DEFAULT_VIEWPORT;

    // Keep iOS PWA viewport-fit/keyboard behavior without disabling user zoom.
    if (!/viewport-fit=cover/i.test(nextContent) || !/interactive-widget=resizes-content/i.test(nextContent)) {
      viewportMeta.setAttribute('content', DEFAULT_VIEWPORT);
    }

    return () => {
      viewportMeta.setAttribute('content', previousContent || DEFAULT_VIEWPORT);
    };
  }, [enabled]);
}
