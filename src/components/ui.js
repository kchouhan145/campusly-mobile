import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';

export function Screen({ children }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Heading({ children, size = 'lg', style }) {
  return <Text style={[size === 'sm' ? styles.headingSm : styles.heading, style]}>{children}</Text>;
}

export function Muted({ children, style }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function AppInput({ label, style, multiline, ...props }) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, multiline ? styles.multiline : null, style]}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

export function AppButton({ title, onPress, type = 'primary', disabled, loading, style }) {
  const styleByType =
    type === 'ghost' ? styles.btnGhost : type === 'danger' ? styles.btnDanger : styles.btnPrimary;

  return (
    <Pressable disabled={disabled || loading} onPress={onPress} style={[styles.btn, styleByType, style, disabled ? styles.btnDisabled : null]}>
      {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>{title}</Text>}
    </Pressable>
  );
}

export function ErrorText({ text }) {
  if (!text) return null;
  return <Text style={styles.error}>{text}</Text>;
}

export const commonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  gap8: {
    gap: 8,
  },
  gap12: {
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  heading: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  headingSm: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.text,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  btn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: colors.accent,
  },
  btnGhost: {
    backgroundColor: colors.accentAlt,
  },
  btnDanger: {
    backgroundColor: colors.danger,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
  },
  error: {
    color: '#b91c1c',
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
  },
});
