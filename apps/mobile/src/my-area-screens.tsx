import { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Platform, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { tabs, type Item, type Post, type Tab } from './my-area-api';
import type { MyAreaFlow } from './my-area-flow';

const blue = '#204dcc';
const labels: Record<Tab, string> = {
  lost: 'Bài báo mất',
  found: 'Bài báo nhặt',
  claims: 'Yêu cầu nhận đồ',
};
const empty: Record<Tab, string> = {
  lost: 'Bạn chưa có bài báo mất nào',
  found: 'Bạn chưa có bài báo nhặt nào',
  claims: 'Bạn chưa có yêu cầu nhận đồ nào',
};

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.action}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

function Loading() {
  return (
    <View style={styles.message} accessibilityLiveRegion="polite">
      <ActivityIndicator color={blue} />
      <Text style={styles.text}>Đang tải</Text>
    </View>
  );
}

function ErrorNotice({ reason, retry }: { reason: 'offline' | 'unavailable'; retry: () => void }) {
  return (
    <View style={styles.error}>
      <Text accessibilityLiveRegion="polite" style={styles.text}>
        {reason === 'offline' ? 'Mất kết nối mạng' : 'Máy chủ không phản hồi'}
      </Text>
      <Action label="Thử lại" onPress={retry} />
    </View>
  );
}

function PrivateImage({ url, avatar = false }: { url?: string | null; avatar?: boolean }) {
  const [image, setImage] = useState<string>();
  useEffect(() => {
    setImage(undefined);
    if (!url) {
      performance.mark?.('my-area.image-missing');
      return;
    }
    const controller = new AbortController();
    const reader = new FileReader();
    const timer = setTimeout(() => {
      controller.abort();
      if (reader.readyState === reader.LOADING) reader.abort();
      performance.mark?.('my-area.image-timeout');
    }, 15_000);

    async function loadImage(uri: string) {
      try {
        const remote = new URL(uri);
        if (remote.protocol !== 'https:' || remote.username || remote.password) return;
        const response = await fetch(remote.href, {
          signal: controller.signal, credentials: 'omit', redirect: 'error', cache: 'no-store',
          headers: { 'Cache-Control': 'no-store' },
        });
        if (!response.ok) return;
        const blob = await response.blob();
        if (controller.signal.aborted || !/^image\/(?:png|jpeg|webp|gif|avif)$/iu.test(blob.type)) return;
        reader.onload = () => {
          clearTimeout(timer);
          if (!controller.signal.aborted && typeof reader.result === 'string') setImage(reader.result);
        };
        reader.onerror = () => {
          clearTimeout(timer);
          if (!controller.signal.aborted) performance.mark?.('my-area.image-unavailable');
        };
        reader.readAsDataURL(blob);
        return;
      } catch {
        if (!controller.signal.aborted) performance.mark?.('my-area.image-unavailable');
      } finally {
        if (reader.readyState !== reader.LOADING) clearTimeout(timer);
      }
    }
    void loadImage(url);
    return () => {
      clearTimeout(timer);
      controller.abort();
      if (reader.readyState === reader.LOADING) reader.abort();
    };
  }, [url]);

  return (
    <View accessible={false} style={[styles.placeholder, avatar && styles.avatar]}>
      <Text style={styles.placeholderText}>{avatar ? 'Ảnh đại diện' : 'Ảnh'}</Text>
      {image ? (
        <Image
          accessible={false}
          source={{ uri: image }}
          style={StyleSheet.absoluteFill}
          onLoad={() => performance.mark?.('my-area.image-rendered')}
          onError={() => {
            performance.mark?.('my-area.image-unavailable');
            setImage(undefined);
          }}
        />
      ) : null}
    </View>
  );
}

const formatDate = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
function Row({ item, open }: { item: Item; open: (post: Post) => void }) {
  if ('role' in item) {
    return (
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{item.title}</Text>
          <Text style={styles.text}>{formatDate.format(new Date(item.sentAt))}</Text>
          <Text style={styles.status}>{item.status}</Text>
          <Text style={styles.text}>{item.role === 'sent' ? 'Tôi gửi' : 'Gửi đến bài của tôi'}</Text>
        </View>
      </View>
    );
  }
  return (
    <Pressable accessibilityRole="button" onPress={() => open(item)} style={styles.row}>
      <PrivateImage key={item.thumbnailUrl} url={item.thumbnailUrl} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.text}>{formatDate.format(new Date(item.postedAt))}</Text>
        <Text style={styles.status}>{item.status}</Text>
      </View>
      <Text accessible={false} style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export function MyAreaScreens({ flow, state, back, logout }: {
  flow: MyAreaFlow;
  state: ReturnType<MyAreaFlow['getState']>;
  back: () => void;
  logout: () => void;
}) {
  const { profile, list, detail } = state;
  useEffect(() => {
    if (state.screen === 'profile' && profile) performance.mark?.('my-area.profile-rendered');
  }, [state.screen, profile]);
  useEffect(() => {
    if (state.screen === 'profile' && list && !list.load && !list.error) {
      performance.mark?.('my-area.page-rendered');
    }
  }, [state.screen, list]);

  if (state.screen === 'home') return null;
  return (
    <>
      <View style={styles.header}>
        <Action label="Quay lại" onPress={back} />
        <Text accessibilityRole="header" style={styles.heading}>{detail ? labels[detail.tab] : 'Hồ sơ'}</Text>
      </View>
      {detail ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={styles.name}>{detail.post.title}</Text>
          <Text style={styles.text}>Mã bài {detail.post.id}</Text>
        </ScrollView>
      ) : list ? (
        <>
          <View style={styles.summary}>
            {profile ? (
              <View style={styles.profile}>
                <PrivateImage key={profile.avatarUrl} url={profile.avatarUrl} avatar />
                <View style={styles.rowText}>
                  <Text style={styles.name}>{profile.displayName}</Text>
                  <Text style={styles.text}>{profile.email}</Text>
                </View>
              </View>
            ) : null}
            {state.profileLoading ? <Loading /> : null}
            {state.profileError ? <ErrorNotice reason={state.profileError} retry={() => flow.retryProfile()} /> : null}
            <Text accessibilityRole="header" style={styles.heading}>Mục của tôi</Text>
          </View>
          <View style={styles.tabs} accessibilityRole="tablist">
            {tabs.map((tab) => (
              <Pressable
                key={tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: list.tab === tab }}
                onPress={() => flow.selectTab(tab)}
                style={[styles.tab, list.tab === tab && styles.selectedTab]}
              >
                <Text style={[styles.tabText, list.tab === tab && styles.selectedText]}>{labels[tab]}</Text>
              </Pressable>
            ))}
          </View>
          {Platform.OS === 'web' ? <Action label="Làm mới" onPress={() => flow.refresh()} /> : null}
          <FlatList
            key={list.tab}
            style={styles.scroll}
            data={list.items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <Row item={item} open={(post) => flow.openPost(post)} />}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={list.load === 'refresh'} onRefresh={() => flow.refresh()} />}
            onEndReached={() => flow.next()}
            onEndReachedThreshold={0.35}
            ListHeaderComponent={list.error ? <ErrorNotice reason={list.error.reason} retry={() => flow.retry()} /> : undefined}
            ListEmptyComponent={list.load === 'first' ? <Loading /> : list.load || list.error ? undefined :
              <Text accessibilityLiveRegion="polite" style={styles.listMessage}>{empty[list.tab]}</Text>}
            ListFooterComponent={list.load === 'next' ? <Loading /> :
              list.items.length > 0 && list.nextCursor === null && !list.error && !list.load
                ? <Text accessibilityLiveRegion="polite" style={styles.listMessage}>Đã hiển thị tất cả</Text>
                : undefined}
          />
          <View style={styles.footer}>
            <Pressable accessibilityRole="button" onPress={logout} style={styles.logout}>
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 5, borderBottomWidth: 1, borderColor: '#e4e9f3' },
  heading: { flexShrink: 1, fontSize: 20, fontWeight: '700', color: '#121b30' },
  action: { minHeight: 48, minWidth: 48, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8 },
  actionText: { fontSize: 15, fontWeight: '700', color: blue },
  text: { fontSize: 15, color: '#414e65' },
  content: { padding: 22, gap: 16 },
  summary: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#edf3fe', padding: 14, borderRadius: 16 },
  scroll: { flex: 1, backgroundColor: '#f1f4f8' },
  footer: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderColor: '#e4e9f3' },
  logout: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#14532d' },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  name: { fontSize: 23, color: '#121b30', fontWeight: '700' },
  placeholder: { overflow: 'hidden', width: 58, height: 58, borderRadius: 10, backgroundColor: '#e7eefb', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 82, height: 82, borderRadius: 41 },
  placeholderText: { color: '#3b4a66', fontSize: 12, textAlign: 'center' },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, borderBottomWidth: 1, borderColor: '#e4e9f3', gap: 4 },
  tab: { flex: 1, minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', padding: 5, borderBottomWidth: 3, borderColor: 'transparent' },
  selectedTab: { borderColor: blue, backgroundColor: '#edf3fe' },
  tabText: { color: '#414e65', textAlign: 'center', fontSize: 14, fontWeight: '600' },
  selectedText: { color: '#173a8c' },
  list: { paddingHorizontal: 16, paddingBottom: 12 },
  row: { backgroundColor: '#fff', borderRadius: 12, marginTop: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#e4e9f3' },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 16, color: '#121b30', fontWeight: '700' },
  status: { fontSize: 14, color: '#173a8c', fontWeight: '600' },
  chevron: { color: blue, fontSize: 24 },
  message: { padding: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  listMessage: { color: '#414e65', textAlign: 'center', paddingVertical: 20 },
  error: { backgroundColor: '#edf3fe', paddingHorizontal: 12, paddingTop: 10, marginVertical: 8, borderRadius: 10 },
});
