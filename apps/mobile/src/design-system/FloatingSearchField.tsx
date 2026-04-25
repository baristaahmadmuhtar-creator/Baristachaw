import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';
import { ActionButton } from './ActionButton';
import { InfoPill } from './InfoPill';
import { uiTokens } from '../theme/tokens';

export interface FloatingSearchFieldChip {
  key: string;
  label: string;
  onPress: () => void;
}

export interface FloatingSearchFieldProps {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  disabled?: boolean;
  chips?: FloatingSearchFieldChip[];
  statusLabel?: string;
  submitLabel?: string;
  loadingLabel?: string;
}

export function FloatingSearchField({
  value,
  placeholder,
  onChangeText,
  onSubmit,
  loading = false,
  disabled = false,
  chips = [],
  statusLabel,
  submitLabel = 'Search',
  loadingLabel = 'Searching...',
}: FloatingSearchFieldProps) {
  return (
    <View style={styles.shell}>
      <View style={styles.inputRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="search" size={uiTokens.icon.sm} color={uiTokens.text.secondary} />
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={uiTokens.text.muted}
          style={styles.input}
          editable={!disabled && !loading}
          multiline
          maxLength={500}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
        />
        <ActionButton
          label={loading ? loadingLabel : submitLabel}
          tone="primary"
          compact
          onPress={onSubmit}
          disabled={disabled || loading}
        />
      </View>

      {statusLabel ? (
        <View style={styles.meta}>
          <InfoPill label={statusLabel} tone="accent" />
        </View>
      ) : null}

      {chips.length > 0 ? (
        <View style={styles.chipRow}>
          {chips.map((chip) => (
            <ActionButton key={chip.key} label={chip.label} compact tone="ghost" onPress={chip.onPress} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 30,
    backgroundColor: uiTokens.surface.strong,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    padding: 14,
    gap: 10,
    ...uiTokens.elevation.card,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: uiTokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uiTokens.surface.soft,
  },
  input: {
    flex: 1,
    minHeight: 58,
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: 17,
    lineHeight: 24,
    textAlignVertical: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
