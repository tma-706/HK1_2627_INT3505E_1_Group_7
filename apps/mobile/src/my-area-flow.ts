import type { AuthFlow } from './auth-flow';
import { IdentityError } from './identity-api';
import type { Item, MyAreaApi, Post, Profile, Tab } from './my-area-api';

type Load = 'first' | 'refresh' | 'next';
type Failure = 'offline' | 'unavailable';
interface ListState {
  tab: Tab;
  items: Item[];
  nextCursor: string | null;
  load?: Load;
  error?: { reason: Failure; retry: Load };
}
type Screen = 'home' | 'profile' | 'items' | 'detail';
interface State {
  screen: Screen;
  profile?: Profile;
  profileLoading?: boolean;
  profileError?: Failure;
  list?: ListState;
  detail?: { tab: 'lost' | 'found'; post: Post };
}

export class MyAreaFlow {
  private state: State = { screen: 'home' };
  private listeners = new Set<() => void>();
  private profileRequest?: AbortController;
  private listRequest?: AbortController;

  constructor(
    private readonly auth: Pick<AuthFlow, 'withCurrentToken'>,
    private readonly api: MyAreaApi,
    private readonly online: () => Promise<boolean>,
  ) {}

  getState = () => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private show(state: State) {
    this.state = state;
    for (const listener of this.listeners) listener();
  }

  clear = () => {
    this.profileRequest?.abort();
    this.listRequest?.abort();
    this.profileRequest = undefined;
    this.listRequest = undefined;
    this.show({ screen: 'home' });
  };

  back = () => {
    const { screen } = this.state;
    if (screen === 'home') return false;
    if (screen === 'profile') this.clear();
    else if (screen === 'detail') this.show({ ...this.state, screen: 'items', detail: undefined });
    else {
      this.listRequest?.abort();
      this.listRequest = undefined;
      this.show({ ...this.state, screen: 'profile', list: undefined });
    }
    return true;
  };

  async openProfile() {
    if (this.profileRequest) return;
    performance.mark?.('my-area.profile-open');
    const request = new AbortController();
    this.profileRequest = request;
    this.show({ ...this.state, screen: 'profile', profileLoading: true, profileError: undefined });
    try {
      const profile = await this.auth.withCurrentToken((token) => this.api.profile(token, request.signal));
      if (profile && this.profileRequest === request) {
        this.show({ ...this.state, profile, profileLoading: false });
      }
    } catch {
      const reason = await this.failure();
      if (this.profileRequest === request) {
        this.show({ ...this.state, profileLoading: false, profileError: reason });
      }
    } finally {
      if (this.profileRequest === request) this.profileRequest = undefined;
    }
  }

  openItems() {
    this.selectTab('lost');
  }

  selectTab(tab: Tab) {
    if (this.state.screen === 'items' && this.state.list?.tab === tab) return;
    this.show({ ...this.state, screen: 'items', list: { tab, items: [], nextCursor: null, load: 'first' } });
    void this.loadItems('first');
  }

  openPost(post: Post) {
    const tab = this.state.list?.tab;
    if (this.state.screen === 'items' && (tab === 'lost' || tab === 'found')) {
      this.show({ ...this.state, screen: 'detail', detail: { tab, post } });
    }
  }

  refresh() {
    if (this.state.list?.load === 'refresh') return;
    void this.loadItems('refresh');
  }

  next() {
    const list = this.state.list;
    if (list?.nextCursor && !list.load && !list.error) void this.loadItems('next');
  }

  retry() {
    const retry = this.state.list?.error?.retry;
    if (retry) void this.loadItems(retry);
  }

  private async failure(): Promise<Failure> {
    try {
      if (!await this.online()) return 'offline';
    } catch {
      // A network-state check may be unavailable.
    }
    return 'unavailable';
  }

  private async loadItems(load: Load) {
    const list = this.state.list;
    if (!list || this.state.screen !== 'items') return;
    this.listRequest?.abort();
    const request = new AbortController();
    this.listRequest = request;
    this.show({ ...this.state, list: { ...list, load, error: undefined } });
    let retry = load;
    try {
      let page: Awaited<ReturnType<MyAreaApi['items']>> | undefined;
      try {
        page = await this.requestPage(list, load, request.signal);
      } catch (error) {
        if (load !== 'next' || !(error instanceof IdentityError) || error.code !== 'INVALID_CURSOR') throw error;
        if (this.listRequest !== request) return;
        retry = 'refresh';
        page = await this.requestPage(list, retry, request.signal);
      }
      if (!page || this.listRequest !== request) return;
      const items = retry === 'next' ? [...list.items, ...page.items] : page.items;
      this.show({ ...this.state, list: { tab: page.tab, items, nextCursor: page.nextCursor } });
    } catch {
      const reason = await this.failure();
      if (this.listRequest === request) {
        this.show({ ...this.state, list: { ...list, load: undefined, error: { reason, retry } } });
      }
    } finally {
      if (this.listRequest === request) this.listRequest = undefined;
    }
  }

  private requestPage(list: ListState, load: Load, signal: AbortSignal) {
    performance.mark?.('my-area.page-request');
    return this.auth.withCurrentToken((token) =>
      this.api.items(token, list.tab, load === 'next' ? list.nextCursor : null, signal));
  }
}
