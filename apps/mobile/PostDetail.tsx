import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PublicPost } from '@lost-found/public-feed';
import { loadPost } from './identity-api';

type Result = { kind: 'loading' | 'missing' | 'error' } | { kind: 'ready'; post: PublicPost };

export default function PostDetail({ postId, token, intent, onBack, onLogin }: {
  postId: string;
  token?: string;
  intent?: PublicPost['type'];
  onBack: () => void;
  onLogin: (type: PublicPost['type']) => void;
}) {
  const [result, setResult] = useState<Result>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      setResult({ kind: 'error' });
    }, 12_000);
    setResult({ kind: 'loading' });
    loadPost(postId, token, controller.signal).then(post => {
      if (!controller.signal.aborted) setResult(post ? { kind: 'ready', post } : { kind: 'missing' });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ kind: 'error' });
    }).finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [attempt, postId, token]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.heading}>Chi tiết bài</Text>
        {result.kind === 'loading' && <ActivityIndicator accessibilityLabel="Đang tải chi tiết bài" />}
        {result.kind === 'missing' && <Text accessibilityRole="alert">Bài không còn khả dụng.</Text>}
        {result.kind === 'error' && <>
          <Text accessibilityRole="alert">Chưa tải được bài. Bạn có thể thử lại.</Text>
          <Button title="Tải lại bài" onPress={() => { setResult({ kind: 'loading' }); setAttempt(value => value + 1); }} />
        </>}
        {result.kind === 'ready' && <>
          <Text style={styles.kind}>{result.post.type === 'found' ? 'Bài báo nhặt đồ' : 'Bài báo mất đồ'}</Text>
          <Text accessibilityRole="header" style={styles.heading}>{result.post.title}</Text>
          <Text style={styles.body}>{result.post.description}</Text>
          {token
            ? <Text accessibilityRole="alert">{intent && intent !== result.post.type
              ? 'Thao tác đã chọn không phù hợp với loại bài hiện tại.'
              : 'Thao tác trên bài này chưa khả dụng.'}</Text>
            : <Button title={result.post.type === 'found' ? 'Yêu cầu nhận đồ' : 'Gửi phản hồi'}
              onPress={() => onLogin(result.post.type)} />}
        </>}
        <Button title="Về bảng tin" onPress={onBack} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24, gap: 16 },
  heading: { fontSize: 23, color: '#10192C', fontWeight: '700' },
  kind: { fontSize: 15, color: '#1E4BDD', fontWeight: '600' },
  body: { fontSize: 15, color: '#506279', lineHeight: 22 },
});
