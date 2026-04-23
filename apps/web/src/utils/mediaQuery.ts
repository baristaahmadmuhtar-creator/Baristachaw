type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

export function subscribeMediaQueryChange(
  media: MediaQueryList,
  listener: (event: MediaQueryListEvent) => void,
): () => void {
  const compatibleMedia = media as LegacyMediaQueryList;

  if (typeof compatibleMedia.addEventListener === 'function') {
    compatibleMedia.addEventListener('change', listener);
    return () => compatibleMedia.removeEventListener('change', listener);
  }

  if (typeof compatibleMedia.addListener === 'function') {
    compatibleMedia.addListener(listener);
    return () => compatibleMedia.removeListener?.(listener);
  }

  return () => {};
}
