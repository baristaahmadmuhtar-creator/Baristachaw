import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { uiTokens } from '../theme/tokens';

type AppLoadingScreenProps = {
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
};

const BRAND_ICON = require('../../assets/splash-icon.png');

export function AppLoadingScreen({
  text = 'Opening Baristachaw...',
  backgroundColor = '#F2F2F7',
  textColor = '#3C3C43',
  accentColor = '#1D4ED8',
}: AppLoadingScreenProps) {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, { opacity: pulseAnim }]}>
          <Image source={BRAND_ICON} style={styles.logo} resizeMode="contain" />
        </Animated.View>
        <ActivityIndicator size="small" color={accentColor} style={styles.spinner} />
        <Text style={[styles.text, { color: textColor }]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
    marginBottom: 8,
  },
  logo: {
    width: 76,
    height: 76,
  },
  spinner: {
    marginTop: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: uiTokens.fontFamily.semibold || 'System',
    letterSpacing: -0.2,
  },
});
