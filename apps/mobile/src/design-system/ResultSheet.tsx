import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  I18nManager,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton, type ActionButtonTone } from './ActionButton';
import { uiTokens } from '../theme/tokens';

type SheetAction = {
  label: string;
  onPress: () => void;
  tone?: ActionButtonTone;
  disabled?: boolean;
};

export interface ResultSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  content: ReactNode;
  actions?: SheetAction[];
  onClose?: () => void;
  direction?: 'ltr' | 'rtl';
  closeAccessibilityLabel?: string;
}

export function resolveSheetBottomPadding(insetsBottom: number): number {
  return Math.max(16, insetsBottom + 12);
}

export function shouldRenderResultSheet(visible: boolean): boolean {
  return visible;
}

export function ResultSheet({
  visible,
  title,
  subtitle,
  content,
  actions = [],
  onClose,
  direction,
  closeAccessibilityLabel = 'Close',
}: ResultSheetProps) {
  const insets = useSafeAreaInsets();
  const isRtl = direction ? direction === 'rtl' : I18nManager.isRTL;

  if (!shouldRenderResultSheet(visible)) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            isRtl ? styles.sheetRtl : null,
            {
              paddingBottom: resolveSheetBottomPadding(insets.bottom),
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={[styles.header, isRtl ? styles.headerRtl : null]}>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, isRtl ? styles.textRtl : null]}>{title}</Text>
              {subtitle ? <Text style={[styles.subtitle, isRtl ? styles.textRtl : null]}>{subtitle}</Text> : null}
            </View>
            {onClose ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={closeAccessibilityLabel}
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={uiTokens.icon.md} color={uiTokens.text.primary} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            {content}
          </ScrollView>

          {actions.length > 0 ? (
            <View style={styles.actions}>
              {actions.map((action) => (
                <ActionButton
                  key={action.label}
                  label={action.label}
                  tone={action.tone || 'secondary'}
                  fullWidth
                  onPress={action.onPress}
                  disabled={action.disabled}
                />
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: uiTokens.surface.overlay,
  },
  sheet: {
    borderTopLeftRadius: uiTokens.radius.sheet,
    borderTopRightRadius: uiTokens.radius.sheet,
    backgroundColor: uiTokens.colors.navSurface,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: uiTokens.colors.navBorder,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    maxHeight: '82%',
    ...uiTokens.elevation.sheet,
  },
  sheetRtl: {
    direction: 'rtl',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: uiTokens.radius.pill,
    backgroundColor: uiTokens.border.strong,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: uiTokens.typography.title.fontSize,
    lineHeight: uiTokens.typography.title.lineHeight,
    fontWeight: '600',
  },
  subtitle: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
  },
  textRtl: {
    textAlign: 'right',
  },
  closeButton: {
    width: uiTokens.size.touchTarget,
    height: uiTokens.size.touchTarget,
    borderRadius: uiTokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uiTokens.surface.soft,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    gap: 12,
    paddingBottom: 4,
  },
  actions: {
    gap: 10,
  },
});
