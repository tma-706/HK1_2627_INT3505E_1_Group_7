import { AuthFlow, type AuthDependencies } from './auth-flow';
import { identityApi } from './identity-api';
import { myAreaApi } from './my-area-api';
import { MyAreaFlow } from './my-area-flow';

export { SignInButton } from './sign-in-button.web';

const base = new URL('/api', window.location.origin).href;
const identity = globalThis as typeof globalThis & { lostFoundFixtureIdToken?: string };
const installation: AuthDependencies['installation'] = {
  async load() { return { accepted: false, token: null }; },
  async prepareSave() {},
  async save() {},
  async clear() {},
};

export const isPreview = false;
export const auth = new AuthFlow({
  installation,
  api: identityApi(base),
  async online() { return true; },
  async selectGoogle() {
    const token = identity.lostFoundFixtureIdToken;
    delete identity.lostFoundFixtureIdToken;
    if (!token) throw new Error('Fixture identity unavailable');
    return token;
  },
  attemptId: () => crypto.randomUUID(),
  deviceType: 'android',
  clearPersonalData: () => myArea.clear(),
  mark(name) { performance.mark(name); },
});

export const myArea = new MyAreaFlow(auth, myAreaApi(base), async () => true);

export function subscribeBack() {}

export function openPolicy(policy: 'terms' | 'privacy') {
  window.open(policy === 'terms' ? '/test-terms' : '/test-privacy', '_blank', 'noopener');
}
