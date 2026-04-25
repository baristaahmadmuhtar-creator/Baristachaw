import type { ReactNode } from 'react';
import {
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { uiTokens } from '../theme/tokens';

export type ActionButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';

type ActionButtonProps = PressableProps & {
  label: string;
  tone?: ActionButtonTone;
  icon?: ReactNode;
  compact?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  direction?: 'ltr' | 'rtl';
  style?: StyleProp<ViewStyle>;
};

export function ActionButton({
  label,
  tone = 'secondary',
  icon,
  compact = false,
  fullWidth = false,
  disabled = false,
  direction,
  style,
  ...props
}: ActionButtonProps) {
  const isRtl = direction ? direction === 'rtl' : I18nManager.isRTL;
  return (
    <Pressable
      {...props}
      disabled={disabled}
      accessibilityRole={props.accessibilityRole || 'button'}
      accessibilityState={{
        ...props.accessibilityState,
        disabled,
      }}
      style={({ pressed }) => [
        styles.base,
        compact ? styles.compact : null,
        fullWidth ? styles.fullWidth : null,
        tone === 'primary' ? styles.primary : null,
        tone === 'ghost' ? styles.ghost : null,
        tone === 'danger' ? styles.danger : null,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <View style={[styles.content, isRtl ? styles.contentRtl : null]}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text
          style={[
            styles.label,
            isRtl ? styles.labelRtl : null,
            tone === 'primary' ? styles.primaryLabel : null,
            tone === 'ghost' ? styles.ghostLabel : null,
            tone === 'danger' ? styles.dangerLabel : null,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: uiTokens.size.touchTarget,
    borderRadius: uiTokens.radius.button,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: uiTokens.border.strong,
    backgroundColor: uiTokens.surface.strong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compact: {
    minHeight: 34,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  fullWidth: {
    width: '100%',
  },
  primary: {
    backgroundColor: uiTokens.colors.accent,
    borderColor: uiTokens.colors.accent,
    ...uiTokens.elevation.panel,
  },
  ghost: {
    backgroundColor: uiTokens.surface.soft,
    borderColor: 'transparent',
  },
  danger: {
    backgroundColor: uiTokens.surface.warning,
    borderColor: 'transparent',
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.46,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  contentRtl: {
    flexDirection: 'row-reverse',
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
    fontWeight: '600',
  },
  labelRtl: {
    textAlign: 'right',
  },
  primaryLabel: {
    color: uiTokens.text.inverse,
  },
  ghostLabel: {
    color: uiTokens.colors.accent,
  },
  dangerLabel: {
    color: uiTokens.colors.warning,
  },
});
