import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { uiTokens } from '../theme/tokens';

export type InfoPillTone = 'neutral' | 'accent' | 'success' | 'warning';

export function InfoPill({
  label,
  tone = 'neutral',
  style,
}: {
  label: string;
  tone?: InfoPillTone;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.base, tone === 'accent' ? styles.accent : null, tone === 'success' ? styles.success : null, tone === 'warning' ? styles.warning : null, style]}>
      <Text
        style={[
          styles.label,
          tone === 'accent' ? styles.accentLabel : null,
          tone === 'success' ? styles.successLabel : null,
          tone === 'warning' ? styles.warningLabel : null,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 24,
    borderRadius: uiTokens.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: uiTokens.surface.soft,
    borderWidth: 1,
    borderColor: uiTokens.border.strong,
    justifyContent: 'center',
    alignItems: 'center',
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
  label: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: uiTokens.typography.chip.fontSize,
    lineHeight: uiTokens.typography.chip.lineHeight,
    fontWeight: '600',
  },
  accentLabel: {
    color: uiTokens.colors.accent,
  },
  successLabel: {
    color: uiTokens.colors.success,
  },
  warningLabel: {
    color: uiTokens.colors.warning,
  },
});
