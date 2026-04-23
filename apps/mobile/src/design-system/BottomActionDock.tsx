import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton, type ActionButtonTone } from './ActionButton';
import { uiTokens } from '../theme/tokens';

type DockAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: ActionButtonTone;
};

export interface BottomActionDockProps {
  primaryAction: DockAction;
  secondaryActions?: DockAction[];
  safeAreaMode?: 'floating' | 'flush';
}

export function resolveDockBottomPadding(insetsBottom: number): number {
  return Math.max(12, insetsBottom + 6);
}

export function BottomActionDock({
  primaryAction,
  secondaryActions = [],
  safeAreaMode = 'floating',
}: BottomActionDockProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.shell,
        safeAreaMode === 'flush' ? styles.flush : null,
        {
          paddingBottom: resolveDockBottomPadding(insets.bottom),
        },
      ]}
    >
      {secondaryActions.length > 0 ? (
        <View style={styles.secondaryRow}>
          {secondaryActions.map((action) => (
            <ActionButton
              key={action.label}
              label={action.label}
              tone={action.tone || 'secondary'}
              compact
              onPress={action.onPress}
              disabled={action.disabled}
            />
          ))}
        </View>
      ) : null}
      <ActionButton
        label={primaryAction.label}
        tone={primaryAction.tone || 'primary'}
        fullWidth
        onPress={primaryAction.onPress}
        disabled={primaryAction.disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: uiTokens.radius.dock,
    backgroundColor: uiTokens.colors.navSurface,
    borderWidth: 1,
    borderColor: uiTokens.colors.navBorder,
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
    ...uiTokens.elevation.dock,
  },
  flush: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  secondaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
