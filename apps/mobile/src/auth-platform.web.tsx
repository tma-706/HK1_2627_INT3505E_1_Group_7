import { randomUUID } from 'expo-crypto';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AuthFlow, type AuthDependencies } from './auth-flow';
import { IdentityError, type GoogleSession } from './identity-api';

const installation: AuthDependencies['installation'] = {
  async load() { return { accepted: false, token: null }; },
  async prepareSave() {},
  async save() {},
  async clear() {},
};

let session: GoogleSession | null = null;

export const isPreview = true;
export const auth = new AuthFlow({
  installation,
  api: {
    async create() {
      session = {
        sessionToken: randomUUID(),
        accountId: 'preview-account',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };
      return session;
    },
    async validate(token) {
      if (!session || session.sessionToken !== token) throw new IdentityError('SESSION_INVALID');
      return { accountId: session.accountId, expiresAt: session.expiresAt };
    },
    async revoke(token) {
      if (session?.sessionToken === token) session = null;
    },
  },
  async online() { return true; },
  async selectGoogle() { return 'preview-account'; },
  attemptId: randomUUID,
  deviceType: 'android',
  clearPersonalData() {},
  mark() {},
});

export function subscribeBack() {}

export function openPolicy(policy: 'terms' | 'privacy') {
  const title = policy === 'terms' ? 'Điều khoản dịch vụ' : 'Chính sách quyền riêng tư';
  window.alert(`${title} chỉ hiển thị trên bản xem trước để kiểm tra giao diện.`);
}

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
