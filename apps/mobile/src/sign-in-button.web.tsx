import { Pressable, StyleSheet, Text } from 'react-native';

export function SignInButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}>
      <Text style={styles.label}>Dùng tài khoản mô phỏng</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: '100%', minHeight: 52, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#cbd6e8' },
  disabled: { opacity: 0.6 },
  label: { color: '#17223a', fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
