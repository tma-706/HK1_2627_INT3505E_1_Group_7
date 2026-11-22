import { randomUUID } from 'expo-crypto';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AuthFlow, type AuthDependencies } from './auth-flow';
import { IdentityError, type GoogleSession } from './identity-api';
import type { Item } from './my-area-api';
import { MyAreaFlow } from './my-area-flow';


let savedToken: string | null = null;
let accepted = false;

const installation: AuthDependencies['installation'] = {
  async load() { return { accepted, token: savedToken }; },
  async prepareSave() {},
  async save(token) { savedToken = token; accepted = true; },
  async clear() { savedToken = null; },
};

let session: GoogleSession | null = null;

export const isPreview = __DEV__;
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
  async selectGoogle() { return isPreview ? 'preview-account' : null; },
  attemptId: randomUUID,
  deviceType: 'android',
  clearPersonalData: () => myArea.clear(),
  mark() {},
});

function checkPreviewSession(token: string) {
  if (!isPreview || session?.sessionToken !== token) throw new IdentityError('SESSION_INVALID');
}

export const myArea = new MyAreaFlow(auth, {
  async profile(token) {
    checkPreviewSession(token);
    return { displayName: 'Nguyễn Minh Anh', email: 'minh.anh@example.test', avatarUrl: null };
  },
  async items(token, tab, cursor) {
    checkPreviewSession(token);
    const offset = cursor === null ? 0 : Number(cursor);
    const total = tab === 'lost' ? 21 : 2;
    const occurredAt = '2026-11-21T09:00:00Z';
    const items = Array.from({ length: Math.min(20, total - offset) }, (_, index): Item => {
      const item = offset + index;
      const id = 'preview-' + tab + '-' + (total - item);
      if (tab === 'claims') return {
        id, title: item === 0 ? 'Chìa khóa xe' : 'Ví màu nâu', sentAt: occurredAt,
        status: 'Đang chờ xử lý', role: item === 0 ? 'sent' : 'received',
      };
      const titles = tab === 'lost' ? ['Ví màu nâu', 'Túi vải xanh', 'Thẻ sinh viên'] : ['Chìa khóa xe', 'Bình giữ nhiệt'];
      return { id, title: titles[item % titles.length], status: tab === 'lost' ? 'Đang tìm' : 'Đang giữ', postedAt: occurredAt };
    });
    return { tab, items, nextCursor: offset + items.length < total ? String(offset + items.length) : null };
  },
}, async () => true);

export function subscribeBack() {}

export function openPolicy(policy: 'terms' | 'privacy') {
  const title = policy === 'terms' ? 'Điều khoản dịch vụ' : 'Chính sách quyền riêng tư';
  window.alert(`${title} chỉ hiển thị trên bản xem trước để kiểm tra giao diện.`);
}

export function SignInButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled || !isPreview} onPress={onPress} style={[styles.button, disabled && styles.disabled]}>
      <Text style={styles.label}>{isPreview ? 'Dùng tài khoản mô phỏng' : 'Đăng nhập bằng Google'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: '100%', minHeight: 52, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#cbd6e8' },
  disabled: { opacity: 0.6 },
  label: { color: '#17223a', fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
