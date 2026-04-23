import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { uiTokens } from '../theme/tokens';

export type SectionCardTone = 'default' | 'accent' | 'success' | 'warning' | 'subtle';

export interface SectionCardProps {
  title?: string;
  subtitle?: string;
  tone?: SectionCardTone;
  footer?: ReactNode;
  compact?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionCard({
  title,
  subtitle,
  tone = 'default',
  footer,
  compact = false,
  children,
  style,
}: SectionCardProps) {
  return (
    <View
      style={[
        styles.base,
        compact ? styles.compact : null,
        tone === 'accent' ? styles.accent : null,
        tone === 'success' ? styles.success : null,
        tone === 'warning' ? styles.warning : null,
        tone === 'subtle' ? styles.subtle : null,
        style,
      ]}
    >
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {children !== undefined && children !== null ? <View style={styles.body}>{children}</View> : null}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: uiTokens.radius.card,
    backgroundColor: uiTokens.surface.strong,
    borderWidth: 1,
    borderColor: uiTokens.border.strong,
    padding: uiTokens.spacing.card,
    gap: uiTokens.spacing.compact,
    ...uiTokens.elevation.panel,
  },
  compact: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  accent: {
    backgroundColor: uiTokens.surface.accent,
  },
  success: {
    backgroundColor: uiTokens.surface.success,
  },
  warning: {
    backgroundColor: uiTokens.surface.warning,
  },
  subtle: {
    backgroundColor: uiTokens.surface.soft,
  },
  header: {
    gap: 3,
  },
  title: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: uiTokens.typography.section.fontSize,
    lineHeight: uiTokens.typography.section.lineHeight,
    fontWeight: '600',
  },
  subtitle: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
  body: {
    gap: uiTokens.spacing.compact,
  },
  footer: {
    marginTop: 2,
  },
});
