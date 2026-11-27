import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { loadPublicPosts, type PublicPost } from '@lost-found/public-feed';

export default function App() {
  const [posts, setPosts] = useState<PublicPost[]>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const request = new AbortController();
    loadPublicPosts(process.env.EXPO_PUBLIC_GATEWAY_URL, request.signal)
      .then(setPosts)
      .catch((reason: unknown) => {
        if (!request.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Không thể kết nối Gateway.');
        }
      });
    return () => request.abort();
  }, [attempt]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.brand}>Campus Lost &amp; Found</Text>
          <Text accessibilityRole="header" style={styles.heading}>Bảng tin công khai</Text>
        </View>
        {error ? (
          <View style={styles.notice}>
            <Text accessibilityRole="alert" style={styles.body}>Không tải được bảng tin. {error}</Text>
            <Button title="Thử lại" onPress={() => { setError(''); setAttempt(attempt + 1); }} />
          </View>
        ) : posts ? (
          <FlatList
            data={posts}
            keyExtractor={(post) => post.postId}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.body}>Chưa có bài đăng công khai.</Text>}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.kind}>{item.type === 'found' ? 'Tìm thấy' : 'Thất lạc'}</Text>
                <Text accessibilityRole="header" style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.description}</Text>
              </View>
            )}
          />
        ) : (
          <ActivityIndicator accessibilityLabel="Đang tải bảng tin" style={styles.notice} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f5f2' },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },
  brand: { color: '#27634f', fontSize: 15, fontWeight: '600' },
  heading: { marginTop: 8, fontSize: 30, fontWeight: '700', color: '#142c25' },
  list: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  card: { backgroundColor: '#fff', padding: 18, borderRadius: 14, gap: 7 },
  kind: { color: '#27634f', fontSize: 13, fontWeight: '700' },
  title: { color: '#142c25', fontSize: 19, fontWeight: '700' },
  body: { color: '#365048', fontSize: 15, lineHeight: 22 },
  notice: { marginHorizontal: 24, marginTop: 12, gap: 12 },
});
