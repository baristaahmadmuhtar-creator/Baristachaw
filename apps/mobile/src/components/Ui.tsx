import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { uiTokens } from '../theme/tokens';

// Legacy UI primitives for pre-rebuild screens.
// New phase-1 surfaces should use components from src/design-system instead.
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({
  title,
  disabled,
  ...props
}: PressableProps & { title: string; disabled?: boolean }) {
  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && !disabled ? styles.primaryButtonPressed : null,
        disabled ? styles.primaryButtonDisabled : null,
      ]}
    >
      <Text style={styles.primaryButtonText}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  title,
  disabled,
  ...props
}: PressableProps & { title: string; disabled?: boolean }) {
  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondaryButton,
        pressed && !disabled ? styles.secondaryButtonPressed : null,
        disabled ? styles.secondaryButtonDisabled : null,
      ]}
    >
      <Text style={styles.secondaryButtonText}>{title}</Text>
    </Pressable>
  );
}

export function InlineChip({
  title,
  tone = 'neutral',
}: {
  title: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning';
}) {
  return (
    <View
      style={[
        styles.inlineChip,
        tone === 'accent' ? styles.inlineChipAccent : null,
        tone === 'success' ? styles.inlineChipSuccess : null,
        tone === 'warning' ? styles.inlineChipWarning : null,
      ]}
    >
      <Text
        style={[
          styles.inlineChipText,
          tone === 'accent' ? styles.inlineChipTextAccent : null,
          tone === 'success' ? styles.inlineChipTextSuccess : null,
          tone === 'warning' ? styles.inlineChipTextWarning : null,
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: uiTokens.radius.card,
    backgroundColor: uiTokens.colors.panel,
    borderWidth: 1,
    borderColor: uiTokens.colors.panelBorder,
    padding: uiTokens.spacing.card,
    gap: 12,
    ...uiTokens.shadow.card,
  },
  primaryButton: {
    minHeight: uiTokens.size.touchTarget,
    borderRadius: uiTokens.radius.button,
    backgroundColor: uiTokens.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    ...uiTokens.shadow.card,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.985 }],
    backgroundColor: uiTokens.colors.accentStrong,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  secondaryButton: {
    minHeight: uiTokens.size.touchTarget,
    borderRadius: uiTokens.radius.button,
    borderWidth: 1,
    borderColor: uiTokens.colors.fieldBorder,
    backgroundColor: uiTokens.colors.panelSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonPressed: {
    transform: [{ scale: 0.985 }],
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonDisabled: {
    opacity: 0.42,
  },
  secondaryButtonText: {
    color: uiTokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  inlineChip: {
    minHeight: 28,
    borderRadius: uiTokens.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineChipAccent: {
    backgroundColor: uiTokens.colors.navActivePill,
  },
  inlineChipSuccess: {
    backgroundColor: uiTokens.colors.successSurface,
  },
  inlineChipWarning: {
    backgroundColor: uiTokens.colors.warningSurface,
  },
  inlineChipText: {
    color: uiTokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  inlineChipTextAccent: {
    color: uiTokens.colors.accentStrong,
  },
  inlineChipTextSuccess: {
    color: uiTokens.colors.success,
  },
  inlineChipTextWarning: {
    color: uiTokens.colors.warning,
  },
});
