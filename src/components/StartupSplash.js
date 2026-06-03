import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export default function StartupSplash() {
  // Static splash without animations

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <View style={styles.logoShell}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
      </View>

      <Text style={styles.tagline}>Connect your campus</Text>

      <View style={styles.creditWrap}>
        <Text style={styles.credit}>By Kartik Chouhan</Text>
        <Text style={styles.creditSub}>under guidance of Dr. Monika (DCSA KUK)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  glowTop: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(31, 107, 90, 0.18)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -60,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(14, 165, 233, 0.14)',
  },
  logoShell: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#ffffff',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  logo: {
    width: 96,
    height: 96,
  },
  tagline: {
    marginTop: 16,
    color: colors.brand,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'lowercase',
  },
  
  creditWrap: {
    marginTop: 18,
    alignItems: 'center',
  },
  credit: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  creditSub: {
    marginTop: 4,
    color: colors.cardSoft,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});