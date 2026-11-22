import { IdentityError, type CurrentSession, type GoogleSession, type LoginAttempt } from './identity-api';

const offline = 'Không có kết nối mạng. Hãy kiểm tra mạng rồi thử lại.';
const google = 'Không kết nối được tới Google. Hãy thử lại sau ít phút.';
const unavailable = 'Máy chủ đang bận. Hãy thử lại sau.';
const rejected = 'Không xác minh được tài khoản Google. Hãy thử lại hoặc chọn tài khoản khác.';
const expired = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại';
const localLogout = 'Đã đăng xuất khỏi ứng dụng trên thiết bị này';
const saveError = 'Không thể lưu phiên đăng nhập trên thiết bị. Hãy thử lại.';
const storageError = 'Không thể cập nhật dữ liệu đăng nhập trên thiết bị. Hãy thử lại.';

export type AuthState =
  | { screen: 'starting' | 'restoring' | 'selecting' | 'consent' | 'issuing' | 'saving' | 'clearing' }
  | { screen: 'signedOut'; notice?: string; retryAttempt?: boolean }
  | { screen: 'blocked'; notice: string; retry: 'restore' | 'clear' }
  | { screen: 'home'; session: CurrentSession; page: 'main' | 'profile'; confirming: boolean };

export interface AuthDependencies {
  installation: {
    load(): Promise<{ accepted: boolean; token: string | null }>;
    prepareSave(accepted: boolean): Promise<void>;
    save(token: string, needsConsent: boolean): Promise<void>;
    clear(accepted: boolean): Promise<void>;
  };
  api: {
    create(attempt: LoginAttempt): Promise<GoogleSession>;
    validate(token: string): Promise<CurrentSession>;
    revoke(token: string): Promise<void>;
  };
  online(): Promise<boolean>;
  selectGoogle(): Promise<string | null>;
  attemptId(): string;
  deviceType: LoginAttempt['deviceType'];
  clearPersonalData(): void;
  mark(name: string): void;
}

export class AuthFlow {
  private state: AuthState = { screen: 'starting' };
  private listeners = new Set<() => void>();
  private generation = 0;
  private token: string | null = null;
  private attempt: LoginAttempt | null = null;
  private accepted = false;
  private clearNotice: string | undefined;

  constructor(private readonly deps: AuthDependencies) {}

  getState = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private show(state: AuthState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }

  private async isOnline() {
    return this.deps.online().catch(() => true);
  }

  async restore() {
    if (this.state.screen !== 'starting' &&
        !(this.state.screen === 'blocked' && this.state.retry === 'restore')) return;
    this.show({ screen: 'restoring' });
    try {
      const { accepted, token } = await this.deps.installation.load();
      this.accepted = accepted;
      this.token = token;
      if (!token) {
        this.show({ screen: 'signedOut' });
        return;
      }
      if (!await this.isOnline()) {
        this.show({ screen: 'blocked', notice: offline, retry: 'restore' });
        return;
      }
      const session = await this.deps.api.validate(token);
      this.deps.mark('auth.cold-session-validated');
      this.show({ screen: 'home', session, page: 'main', confirming: false });
    } catch (error) {
      if (error instanceof IdentityError && error.code === 'SESSION_INVALID') {
        this.invalidateSession();
      } else {
        this.show({ screen: 'blocked', notice: await this.isOnline() ? unavailable : offline, retry: 'restore' });
      }
    }
  }

  async select() {
    if (this.state.screen !== 'signedOut') return;
    const generation = ++this.generation;
    this.attempt = null;
    this.show({ screen: 'selecting' });
    try {
      if (!await this.isOnline()) {
        this.show({ screen: 'signedOut', notice: offline });
        return;
      }
      const idToken = await this.deps.selectGoogle();
      if (!idToken) {
        this.show({ screen: 'signedOut' });
        return;
      }
      this.deps.mark('auth.google-selected');
      this.attempt = { idToken, attemptId: this.deps.attemptId(), deviceType: this.deps.deviceType };
      if (!this.accepted) this.show({ screen: 'consent' });
      else await this.issue(generation);
    } catch {
      const notice = await this.isOnline() ? google : offline;
      this.show({ screen: 'signedOut', notice });
    }
  }

  rejectTerms() {
    if (this.state.screen !== 'consent') return;
    ++this.generation;
    this.attempt = null;
    this.show({ screen: 'signedOut' });
  }

  async acceptTerms() {
    if (this.state.screen === 'consent') {
      this.deps.mark('auth.terms-accepted');
      await this.issue(this.generation);
    }
  }

  async retryAttempt() {
    if (this.state.screen === 'signedOut' && this.state.retryAttempt) {
      await this.issue(this.generation);
    }
  }

  // Allow a new Google choice while Core is pending. A save already started
  // is completed before the screen can leave the issuing state.
  chooseAgain() {
    if (this.state.screen !== 'issuing') return;
    ++this.generation;
    this.attempt = null;
    this.show({ screen: 'signedOut' });
  }

  private async issue(generation: number) {
    const attempt = this.attempt;
    if (!attempt) return;
    this.show({ screen: 'issuing' });
    let saving = false;
    try {
      if (!await this.isOnline()) {
        if (generation === this.generation) this.show({ screen: 'signedOut', notice: offline, retryAttempt: true });
        return;
      }
      if (generation !== this.generation) return;
      const { sessionToken, ...session } = await this.deps.api.create(attempt);
      if (generation !== this.generation) return;
      saving = true;
      this.show({ screen: 'saving' });
      await this.deps.installation.prepareSave(this.accepted);
      await this.deps.installation.save(sessionToken, !this.accepted);
      this.accepted = true;
      this.token = sessionToken;
      this.attempt = null;
      this.show({ screen: 'home', session, page: 'main', confirming: false });
    } catch (error) {
      if (generation !== this.generation) return;
      if (saving) {
        this.generation++;
        this.attempt = null;
        this.clearNotice = saveError;
        await this.finishClear();
        return;
      }
      const shouldReselect = error instanceof IdentityError &&
        ['GOOGLE_TOKEN_REJECTED', 'LOGIN_ATTEMPT_CONFLICT', 'INVALID_REQUEST'].includes(error.code);
      const notice = shouldReselect ? rejected : await this.isOnline() ? unavailable : offline;
      if (generation !== this.generation) return;
      if (shouldReselect) this.attempt = null;
      this.show({ screen: 'signedOut', notice, retryAttempt: !shouldReselect });
    }
  }

  openProfile() {
    if (this.state.screen === 'home' && this.state.page === 'main') {
      this.show({ ...this.state, page: 'profile' });
    }
  }

  goHome() {
    if (this.state.screen !== 'home' || this.state.page !== 'profile' || this.state.confirming) return false;
    this.show({ ...this.state, page: 'main' });
    return true;
  }

  openLogout() {
    if (this.state.screen === 'home' && this.state.page === 'profile') {
      this.show({ ...this.state, confirming: true });
    }
  }

  cancelLogout() {
    if (this.state.screen === 'home') this.show({ ...this.state, confirming: false });
  }

  confirmLogout() {
    if (this.state.screen !== 'home' || !this.state.confirming) return;
    this.deps.mark('auth.logout-confirmed');
    const token = this.token;
    const generation = this.beginClear(localLogout);
    if (token) {
      void this.deps.api.revoke(token).then(() => {
        if (generation !== this.generation) return;
        this.clearNotice = undefined;
        if (this.state.screen === 'signedOut') this.show({ screen: 'signedOut' });
      }, () => undefined);
    }
    void this.finishClear();
  }

  invalidateSession() {
    if (!this.token) return;
    this.deps.mark('auth.session-invalid');
    this.beginClear(expired);
    void this.finishClear();
  }

  private beginClear(notice: string) {
    ++this.generation;
    this.token = null;
    this.attempt = null;
    this.clearNotice = notice;
    this.show({ screen: 'clearing' });
    return this.generation;
  }

  async retryClear() {
    if (this.state.screen === 'blocked' && this.state.retry === 'clear') {
      await this.finishClear();
    }
  }

  private async finishClear() {
    this.show({ screen: 'clearing' });
    try {
      this.deps.clearPersonalData();
      await this.deps.installation.clear(this.accepted);
      this.show({ screen: 'signedOut', notice: this.clearNotice });
    } catch {
      this.show({ screen: 'blocked', notice: storageError, retry: 'clear' });
    }
  }

  // UC-02 calls this only for responses associated with the same session.
  async withCurrentToken<T>(act: (token: string) => Promise<T>): Promise<T | undefined> {
    const token = this.token;
    const generation = this.generation;
    if (this.state.screen !== 'home' || !token) return;
    try {
      const result = await act(token);
      return generation === this.generation ? result : undefined;
    } catch (error) {
      if (generation !== this.generation) return;
      if (error instanceof IdentityError && error.code === 'SESSION_INVALID') {
        this.invalidateSession();
        return;
      }
      throw error;
    }
  }
}
