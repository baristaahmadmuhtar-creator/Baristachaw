import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { uiTokens } from '../theme/tokens';

type UseMobileRhythmOptions = {
  tabBarVisible?: boolean;
};

export function useMobileRhythm(options?: UseMobileRhythmOptions) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabBarVisible = options?.tabBarVisible ?? true;

  return useMemo(() => {
    const compact = width <= uiTokens.size.compactWidth;
    const wide = width >= uiTokens.size.wideWidth;
    const sizeClass = compact ? 'compact' : (wide ? 'wide' : 'regular');

    const horizontal = compact ? 14 : (wide ? 18 : uiTokens.spacing.page);
    const block = compact ? 12 : (wide ? 14 : uiTokens.spacing.block);
    const top = Math.max(8, insets.top > 20 ? 10 : 8);

    const tabBarReserve = Math.max(104, insets.bottom + 98);
    const contentBottom = tabBarVisible
      ? tabBarReserve
      : Math.max(20, insets.bottom + 16);

    return {
      width,
      compact,
      wide,
      sizeClass,
      horizontal,
      block,
      top,
      contentBottom,
      insets,
    };
  }, [width, insets, tabBarVisible]);
}
