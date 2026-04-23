import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { uiTokens } from '../theme/tokens';

export interface SegmentedControlItem<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  items: SegmentedControlItem<T>[];
  value: T;
  onChange: (value: T) => void;
  fullWidth?: boolean;
  direction?: 'ltr' | 'rtl';
}

export function resolveSegmentActiveState<T extends string>(itemValue: T, selectedValue: T) {
  return {
    active: itemValue === selectedValue,
  };
}

export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  fullWidth = true,
  direction,
}: SegmentedControlProps<T>) {
  const isRtl = direction ? direction === 'rtl' : I18nManager.isRTL;
  return (
    <View style={[styles.root, fullWidth ? styles.fullWidth : null, isRtl ? styles.rootRtl : null]}>
      {items.map((item) => {
        const { active } = resolveSegmentActiveState(item.value, value);
        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            style={[styles.segment, fullWidth ? styles.segmentFullWidth : null, active ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentLabel, isRtl ? styles.segmentLabelRtl : null, active ? styles.segmentLabelActive : null]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: uiTokens.radius.nav,
    backgroundColor: uiTokens.surface.soft,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
  },
  rootRtl: {
    flexDirection: 'row-reverse',
  },
  fullWidth: {
    width: '100%',
  },
  segment: {
    minHeight: 44,
    borderRadius: uiTokens.radius.pill,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  segmentFullWidth: {
    flex: 1,
  },
  segmentActive: {
    backgroundColor: uiTokens.surface.strong,
    ...uiTokens.elevation.panel,
  },
  segmentLabel: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
    fontWeight: '600',
  },
  segmentLabelRtl: {
    textAlign: 'right',
  },
  segmentLabelActive: {
    color: uiTokens.text.primary,
  },
});
