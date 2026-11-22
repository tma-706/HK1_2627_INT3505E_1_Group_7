import { randomUUID } from 'expo-crypto';
import { AuthFlow, type AuthDependencies } from './auth-flow';
import { IdentityError, type GoogleSession } from './identity-api';

import { MyAreaFlow } from './my-area-flow';
import type { Item } from './my-area-api';

export { SignInButton } from './sign-in-button.web';

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
  clearPersonalData: () => myArea.clear(),
  mark() {},
});

export const myArea = new MyAreaFlow(auth, {
  async profile() {
    return { displayName: 'Nguyễn Minh Anh', email: 'minh.anh@example.test', avatarUrl: null };
  },
  async items(_token, tab, cursor) {
    const offset = cursor === null ? 0 : Number(cursor);
    const count = tab === 'lost' ? 21 : 2;
    const postedAt = '2026-11-21T09:00:00Z';
    const items = Array.from({ length: Math.min(20, count - offset) }, (_, index): Item => {
      const item = offset + index;
      const id = String(count - item);
      if (tab === 'claims') return {
        id, title: item === 0 ? 'Chìa khóa xe' : 'Ví màu nâu', sentAt: postedAt,
        status: item === 0 ? 'Đang chờ phản hồi' : 'Đã xác nhận', role: item === 0 ? 'sent' : 'received',
      };
      const titles = tab === 'lost' ? ['Ví màu nâu', 'Túi vải màu xanh', 'Thẻ sinh viên'] : ['Chìa khóa xe', 'Bình giữ nhiệt'];
      return { id, postedAt, title: titles[item % titles.length], status: tab === 'lost' ? 'Đang tìm' : 'Đang chờ nhận' };
    });
    return { tab, items, nextCursor: offset + items.length < count ? String(offset + items.length) : null };
  },
}, async () => true);

export function subscribeBack() {}

export function openPolicy(policy: 'terms' | 'privacy') {
  const title = policy === 'terms' ? 'Điều khoản dịch vụ' : 'Chính sách quyền riêng tư';
  window.alert(`${title} chỉ hiển thị trên bản xem trước để kiểm tra giao diện.`);
}
