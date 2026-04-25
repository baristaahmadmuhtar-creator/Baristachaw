import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMobileRhythm } from '../hooks/useMobileRhythm';
import { uiTokens } from '../theme/tokens';

export interface AppShellProps {
  header?: ReactNode;
  children: ReactNode;
  bottomDock?: ReactNode;
  scrollable?: boolean;
  keyboardAware?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  contentPadding?: {
    horizontal?: number;
    top?: number;
    bottom?: number;
  };
  style?: StyleProp<ViewStyle>;
}

export function AppShell({
  header,
  children,
  bottomDock,
  scrollable = true,
  keyboardAware = false,
  contentStyle,
  contentPadding,
  style,
}: AppShellProps) {
  const rhythm = useMobileRhythm({ tabBarVisible: true });
  const insets = useSafeAreaInsets();
  const bottomReserve = contentPadding?.bottom ?? (bottomDock ? Math.max(152, rhythm.contentBottom + 24) : rhythm.contentBottom);

  const content = (
    <>
      {scrollable ? (
        <ScrollView
          style={styles.scroll}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: contentPadding?.horizontal ?? rhythm.horizontal,
              paddingTop: contentPadding?.top ?? Math.max(8, insets.top > 20 ? 12 : 8),
              paddingBottom: bottomReserve,
            },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          {header}
          {children}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.content,
            styles.nonScrollableContent,
            {
              paddingHorizontal: contentPadding?.horizontal ?? rhythm.horizontal,
              paddingTop: contentPadding?.top ?? Math.max(8, insets.top > 20 ? 12 : 8),
              paddingBottom: bottomReserve,
            },
            contentStyle,
          ]}
        >
          {header}
          {children}
        </View>
      )}

      {bottomDock ? (
        <View
          style={[
            styles.dockWrap,
            {
              left: Math.max(12, rhythm.horizontal),
              right: Math.max(12, rhythm.horizontal),
              bottom: Math.max(10, insets.bottom + 8),
            },
          ]}
        >
          {bottomDock}
        </View>
      ) : null}
    </>
  );

  return (
    <View style={[styles.page, style]}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={keyboardAware && Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {content}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: uiTokens.colors.bgBase,
  },
  keyboard: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: uiTokens.spacing.hero,
  },
  nonScrollableContent: {
    flex: 1,
  },
  dockWrap: {
    position: 'absolute',
  },
});
