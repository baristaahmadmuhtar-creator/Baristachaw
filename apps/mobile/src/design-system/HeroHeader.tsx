import type { ReactNode } from 'react';
import { I18nManager, StyleSheet, Text, View } from 'react-native';
import { uiTokens } from '../theme/tokens';

export interface HeroHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  status?: ReactNode;
  trailing?: ReactNode;
  direction?: 'ltr' | 'rtl';
}

export function HeroHeader({ eyebrow, title, subtitle, status, trailing, direction }: HeroHeaderProps) {
  const isRtl = direction ? direction === 'rtl' : I18nManager.isRTL;
  return (
    <View style={[styles.root, isRtl ? styles.rootRtl : null]}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={[styles.eyebrow, isRtl ? styles.textRtl : null]}>{eyebrow}</Text> : null}
        <Text style={[styles.title, isRtl ? styles.textRtl : null]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, isRtl ? styles.textRtl : null]}>{subtitle}</Text> : null}
        {status ? <View style={[styles.status, isRtl ? styles.statusRtl : null]}>{status}</View> : null}
      </View>
      {trailing ? <View style={[styles.trailing, isRtl ? styles.trailingRtl : null]}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  rootRtl: {
    flexDirection: 'row-reverse',
  },
  copy: {
    flex: 1,
    gap: 5,
  },
  eyebrow: {
    color: uiTokens.text.muted,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.72,
  },
  title: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.bold,
    fontSize: uiTokens.typography.hero.fontSize,
    lineHeight: uiTokens.typography.hero.lineHeight,
    fontWeight: '700',
    letterSpacing: uiTokens.typography.hero.letterSpacing,
  },
  subtitle: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
    maxWidth: '96%',
  },
  textRtl: {
    textAlign: 'right',
  },
  status: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  statusRtl: {
    flexDirection: 'row-reverse',
  },
  trailing: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  trailingRtl: {
    alignItems: 'flex-start',
  },
});
