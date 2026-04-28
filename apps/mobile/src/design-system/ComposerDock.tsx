import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ActionButton } from './ActionButton';
import { uiTokens } from '../theme/tokens';

export interface ComposerDockAttachment {
  key: string;
  label: string;
  icon?: ReactNode;
  onPress?: () => void;
  onRemove?: () => void;
}

export interface ComposerDockQuickAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onPress: () => void;
  disabled?: boolean;
}

export interface ComposerDockRecordingState {
  label: string;
  onPress?: () => void;
}

export interface ComposerDockIconAction {
  onPress: () => void;
  icon: ReactNode;
  accessibilityLabel: string;
  disabled?: boolean;
  active?: boolean;
}

export interface ComposerDockProps {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  attachments?: ComposerDockAttachment[];
  quickActions?: ComposerDockQuickAction[];
  menuAction?: ComposerDockIconAction | null;
  voiceAction?: ComposerDockIconAction | null;
  busy?: boolean;
  error?: string;
  placeholder?: string;
  sendLabel?: string;
  recordingState?: ComposerDockRecordingState | null;
  canSend?: boolean;
  helperText?: string;
  helperTone?: 'default' | 'warning';
  characterLimit?: number;
}

export function ComposerDock({
  value,
  onChangeText,
  onSend,
  attachments = [],
  quickActions = [],
  menuAction = null,
  voiceAction = null,
  busy = false,
  error,
  placeholder = 'Type a message...',
  sendLabel = 'Send',
  recordingState = null,
  canSend,
  helperText,
  helperTone = 'default',
  characterLimit,
}: ComposerDockProps) {
  const sendEnabled = canSend ?? Boolean(value.trim());

  return (
    <View style={styles.shell}>
      {recordingState ? (
        <Pressable style={styles.recordingBanner} onPress={recordingState.onPress}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>{recordingState.label}</Text>
        </Pressable>
      ) : null}

      {attachments.length > 0 ? (
        <View style={styles.attachmentRow}>
          {attachments.map((attachment) => (
            <Pressable key={attachment.key} style={styles.attachmentChip} onPress={attachment.onPress} disabled={!attachment.onPress}>
              {attachment.icon}
              <Text style={styles.attachmentLabel}>{attachment.label}</Text>
              {attachment.onRemove ? (
                <Pressable onPress={attachment.onRemove} style={styles.attachmentRemove}>
                  <Ionicons name="close" size={12} color={uiTokens.text.secondary} />
                </Pressable>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {helperText ? (
        <View style={styles.metaRow}>
          <Text style={[styles.helperText, helperTone === 'warning' ? styles.helperTextWarning : null]}>
            {helperText}
          </Text>
        </View>
      ) : null}

      {quickActions.length > 0 ? (
        <View style={styles.quickActionRow}>
          {quickActions.map((action) => (
            <ActionButton
              key={action.key}
              label={action.label}
              icon={action.icon}
              tone="ghost"
              compact
              onPress={action.onPress}
              disabled={action.disabled}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.inputRow}>
        {menuAction ? (
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              pressed && !menuAction.disabled ? styles.iconButtonPressed : null,
              menuAction.disabled ? styles.iconButtonDisabled : null,
            ]}
            onPress={menuAction.onPress}
            disabled={menuAction.disabled}
            accessibilityLabel={menuAction.accessibilityLabel}
          >
            {menuAction.icon}
          </Pressable>
        ) : null}
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={uiTokens.text.muted}
            style={styles.input}
            multiline
            maxLength={characterLimit}
            returnKeyType="default"
            blurOnSubmit={false}
            accessibilityLabel={placeholder}
          />
        {voiceAction ? (
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              voiceAction.active ? styles.iconButtonActive : null,
              pressed && !voiceAction.disabled ? styles.iconButtonPressed : null,
              voiceAction.disabled ? styles.iconButtonDisabled : null,
            ]}
            onPress={voiceAction.onPress}
            disabled={voiceAction.disabled}
            accessibilityLabel={voiceAction.accessibilityLabel}
          >
            {voiceAction.icon}
          </Pressable>
        ) : null}
        <Pressable
          style={[
            styles.sendButton,
            sendEnabled && !busy ? styles.sendButtonActive : null,
            busy || !sendEnabled ? styles.sendButtonIdle : null,
          ]}
          onPress={onSend}
          disabled={busy || !sendEnabled}
          accessibilityLabel={sendLabel}
        >
          <Ionicons
            name={busy ? 'time-outline' : 'arrow-up'}
            size={uiTokens.icon.sm}
            color={sendEnabled && !busy ? uiTokens.text.inverse : uiTokens.text.muted}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: uiTokens.radius.dock,
    backgroundColor: uiTokens.colors.navSurface,
    borderWidth: 1,
    borderColor: uiTokens.colors.navBorder,
    padding: 10,
    gap: 8,
    ...uiTokens.elevation.dock,
  },
  attachmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: uiTokens.surface.soft,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
  },
  attachmentRemove: {
    width: 18,
    height: 18,
    borderRadius: uiTokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uiTokens.surface.base,
  },
  attachmentLabel: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
  quickActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  helperText: {
    flex: 1,
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
  helperTextWarning: {
    color: uiTokens.colors.warning,
  },
  error: {
    color: uiTokens.colors.warning,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: uiTokens.radius.pill,
    backgroundColor: uiTokens.surface.warning,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: uiTokens.radius.pill,
    backgroundColor: uiTokens.colors.warning,
  },
  recordingText: {
    color: uiTokens.colors.warning,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderRadius: 28,
    backgroundColor: uiTokens.surface.base,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
    paddingTop: 8,
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: uiTokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uiTokens.surface.soft,
  },
  iconButtonActive: {
    backgroundColor: uiTokens.surface.warning,
  },
  iconButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  iconButtonDisabled: {
    opacity: 0.46,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: uiTokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: uiTokens.text.primary,
  },
  sendButtonIdle: {
    backgroundColor: uiTokens.surface.soft,
  },
});
