import { useEffect } from 'react';

const DEFAULT_VIEWPORT = 'width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content';

export function normalizeZoomableViewportContent(content: string): string {
  const tokens = String(content || DEFAULT_VIEWPORT)
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !/^maximum-scale\s*=/i.test(token))
    .filter((token) => !/^user-scalable\s*=/i.test(token));

  if (!tokens.some((token) => /^width\s*=/i.test(token))) tokens.unshift('width=device-width');
  if (!tokens.some((token) => /^initial-scale\s*=/i.test(token))) tokens.push('initial-scale=1.0');
  if (!tokens.some((token) => /^viewport-fit\s*=/i.test(token))) tokens.push('viewport-fit=cover');
  if (!tokens.some((token) => /^interactive-widget\s*=/i.test(token))) {
    tokens.push('interactive-widget=resizes-content');
  }

  return tokens.join(', ');
}

export function usePinchZoomLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!(viewportMeta instanceof HTMLMetaElement)) return;

    const previousContent = viewportMeta.getAttribute('content') || '';
    const nextContent = normalizeZoomableViewportContent(previousContent || DEFAULT_VIEWPORT);

    // Keep iOS PWA viewport-fit/keyboard behavior without disabling user zoom.
    if (nextContent !== previousContent) {
      viewportMeta.setAttribute('content', nextContent);
    }

    return () => {
      viewportMeta.setAttribute('content', normalizeZoomableViewportContent(previousContent || DEFAULT_VIEWPORT));
    };
  }, [enabled]);
}
