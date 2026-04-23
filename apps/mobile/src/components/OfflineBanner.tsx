import { StyleSheet, Text, View } from 'react-native';
import { uiTokens } from '../theme/tokens';

export function OfflineBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>You are offline. Tools still work, live search and chat need internet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: uiTokens.spacing.page,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  text: {
    color: '#9A3412',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
