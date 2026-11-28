import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { register, resend, verificationLink, verify } from './identity-api';

type Screen = 'feed' | 'register' | 'checkMail' | 'resend' | 'verify' | 'verified' | 'login';
type Feedback = { kind: 'invalid' | 'expired' | 'retry'; message: string };

const headings = {
  register: 'Đăng ký tài khoản', checkMail: 'Kiểm tra email', resend: 'Gửi lại email xác thực',
  verify: 'Xác thực email', verified: 'Xác thực thành công', login: 'Đăng nhập',
};

function Action({ label, onPress, disabled, secondary = false }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled}
      onPress={onPress} style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}>
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text>
    </Pressable>
  );
}

export default function RegistrationFlow({ feed, onLogin }: {
  feed: (openRegistration: () => void) => ReactNode; onLogin?: () => void;
}) {
  const [screen, setScreen] = useState<Screen>('feed');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<Feedback>();
  const [pending, setPending] = useState(false);
  const [invalidField, setInvalidField] = useState<'email' | 'password'>();
  const [mailboxUnavailable, setMailboxUnavailable] = useState(false);
  const [retryByEmail, setRetryByEmail] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now);
  const active = useRef<AbortController | null>(null);
  const verificationToken = useRef<string | null>(null);
  const normalizedEmail = email.trim().toLowerCase();
  const remaining = Math.max(0, Math.ceil(((retryByEmail[normalizedEmail] ?? 0) - now) / 1000));

  const cancel = useCallback(() => {
    active.current?.abort();
    active.current = null;
    setPending(false);
  }, []);

  const navigate = useCallback((next: Screen) => {
    cancel();
    setFeedback(undefined);
    setInvalidField(undefined);
    setMailboxUnavailable(false);
    setPassword('');
    verificationToken.current = null;
    setScreen(next);
  }, [cancel]);

  const run = useCallback(async (operation: (signal: AbortSignal) => Promise<Response>, receive: (response: Response) => void) => {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setFeedback(undefined);
    setPending(true);
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await operation(controller.signal);
      if (active.current === controller) receive(response);
    } catch {
      if (active.current === controller) {
        setFeedback({ kind: 'retry', message: 'Chưa nhận được kết quả. Vui lòng thử lại.' });
      }
    } finally {
      clearTimeout(timer);
      if (active.current === controller) {
        active.current = null;
        setPending(false);
      }
    }
  }, []);

  const submitVerification = useCallback((token: string | null) => {
    if (active.current && verificationToken.current === token) return;
    cancel();
    verificationToken.current = token;
    setPassword('');
    setScreen('verify');
    if (!token || !/^[a-zA-Z0-9_-]{43}$/.test(token)) {
      verificationToken.current = null;
      setFeedback({ kind: 'invalid', message: 'Liên kết xác thực không hợp lệ.' });
      return;
    }
    void run(signal => verify({ token }, signal), response => {
      if (response.status === 204) navigate('verified');
      else if (response.status === 410 || response.status === 400) {
        verificationToken.current = null;
        setFeedback(response.status === 410
          ? { kind: 'expired', message: 'Liên kết đã hết hạn hoặc đã được dùng. Bạn có thể yêu cầu gửi lại email.' }
          : { kind: 'invalid', message: 'Liên kết xác thực không hợp lệ.' });
      } else setFeedback({ kind: 'retry', message: 'Chưa xác thực được email. Bạn có thể thử lại.' });
    });
  }, [cancel, navigate, run]);

  useEffect(() => {
    let seenEvent = false;
    let disposed = false;
    const handleLink = (url: string) => {
      const link = verificationLink(url);
      if (link) submitVerification(link.token);
    };
    const subscription = Linking.addEventListener('url', ({ url }) => {
      seenEvent = true;
      handleLink(url);
    });
    void Linking.getInitialURL().then(url => {
      if (url && !disposed && !seenEvent) handleLink(url);
    }).catch(() => {});
    return () => {
      disposed = true;
      subscription.remove();
      const controller = active.current;
      active.current = null;
      controller?.abort();
    };
  }, [submitVerification]);

  const cooling = screen === 'resend' && remaining > 0;
  useEffect(() => {
    if (!cooling) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [cooling]);

  function edit(field: 'email' | 'password', value: string) {
    cancel();
    setFeedback(undefined);
    setInvalidField(undefined);
    if (field === 'email') {
      setEmail(value);
      setNow(Date.now());
    } else setPassword(value);
  }

  function submitForm() {
    if (active.current || (screen === 'resend' && remaining)) return;
    const registration = screen === 'register';
    if (!/^[^\s@]+@[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
      setInvalidField('email');
      setFeedback({ kind: 'invalid', message: 'Hãy nhập địa chỉ email hợp lệ.' });
      return;
    }
    const passwordLength = [...password].length;
    if (registration && (passwordLength < 15 || passwordLength > 128)) {
      setInvalidField('password');
      setFeedback({ kind: 'invalid', message: 'Mật khẩu cần có từ 15 đến 128 ký tự.' });
      return;
    }
    setInvalidField(undefined);
    void run(signal => registration ? register({ email: normalizedEmail, password }, signal)
      : resend({ email: normalizedEmail }, signal), response => {
      if (response.status === 202) {
        navigate('checkMail');
      } else if (response.status === 429 && !registration) {
        const seconds = Number(response.headers.get('Retry-After'));
        if (Number.isSafeInteger(seconds) && seconds > 0) {
          const receivedAt = Date.now();
          setNow(receivedAt);
          setRetryByEmail(previous => ({ ...previous, [normalizedEmail]: receivedAt + seconds * 1000 }));
        } else setFeedback({ kind: 'retry', message: 'Đã đạt hạn mức gửi lại. Vui lòng thử lại sau.' });
      } else if (response.status === 400) {
        setFeedback({ kind: 'invalid', message: 'Vui lòng kiểm tra dữ liệu đã nhập.' });
      } else setFeedback({ kind: 'retry', message: 'Tạm thời chưa xử lý được yêu cầu. Vui lòng thử lại.' });
    });
  }

  if (screen === 'feed') return feed(() => navigate('register'));
  const form = screen === 'register' || screen === 'resend';
  const primaryLabel = screen === 'register' ? 'Đăng ký' : 'Gửi lại email';
  function goToLogin() {
    if (onLogin) {
      navigate('feed');
      onLogin();
    } else navigate('login');
  }

  async function openMailbox() {
    setMailboxUnavailable(false);
    const configured = process.env.EXPO_PUBLIC_MAILBOX_URL?.trim();
    const localOrHttps = configured && /^https:\/\/|^http:\/\/(?:localhost|127\.0\.0\.1|10\.0\.2\.2)(?=[:/]|$)/i.test(configured);
    const destination = localOrHttps ? configured : Platform.OS === 'ios' ? 'message://' : undefined;
    if (destination) {
      try {
        await Linking.openURL(destination);
        return;
      } catch {
        // Fall back to the manual inbox instructions if the device cannot open this destination.
      }
    }
    setMailboxUnavailable(true);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View pointerEvents="none" style={styles.circle} />
            <View pointerEvents="none" style={styles.smallCircle} />
            <Text style={styles.brand}>Campus Lost &amp; Found</Text>
          </View>
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.heading}>{headings[screen]}</Text>
            {form && <>
              <Text style={styles.label}>Email</Text>
              <TextInput accessibilityLabel="Email" value={email} onChangeText={value => edit('email', value)}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email"
                style={[styles.input, invalidField === 'email' && styles.invalid]} />
              {invalidField === 'email' && <Text accessibilityRole="alert" style={styles.alert}>{feedback?.message}</Text>}
              {screen === 'register' && <>
                <Text style={styles.label}>Mật khẩu</Text>
                <TextInput accessibilityLabel="Mật khẩu" value={password} onChangeText={value => edit('password', value)}
                  secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password"
                  style={[styles.input, invalidField === 'password' && styles.invalid]} />
                {invalidField === 'password'
                  ? <Text accessibilityRole="alert" style={styles.alert}>{feedback?.message}</Text>
                  : <Text style={styles.hint}>Từ 15 đến 128 ký tự.</Text>}
              </>}
            </>}
            {pending && <View style={styles.notice} accessibilityLiveRegion="polite">
              <ActivityIndicator color="#1E4BDD" /><Text style={styles.body}>{screen === 'verify' ? 'Đang xác thực…' : 'Đang gửi yêu cầu…'}</Text>
            </View>}
            {feedback && !invalidField && <Text accessibilityRole="alert" style={styles.alert}>{feedback.message}</Text>}
            {form && <>
              {cooling && <Text style={styles.body}>Bạn có thể gửi lại sau {remaining} giây.</Text>}
              <Action label={feedback?.kind === 'retry' ? 'Thử lại' : primaryLabel} onPress={submitForm} disabled={pending || cooling} />
            </>}
            {screen === 'checkMail' && <>
              <Text style={[styles.body, styles.notice]}>Yêu cầu đã được tiếp nhận. Hãy kiểm tra hộp thư và mở liên kết xác thực trong email nếu nhận được.</Text>
              <Action label="Mở hộp thư" onPress={() => void openMailbox()} />
              {mailboxUnavailable && <Text accessibilityRole="alert" style={styles.body}>Hãy mở ứng dụng email trên thiết bị để kiểm tra hộp thư.</Text>}
              <Action secondary label="Gửi lại email" onPress={() => navigate('resend')} />
            </>}
            {screen === 'verify' && !pending && <>
              {feedback?.kind === 'retry' && <Action label="Thử lại xác thực" onPress={() => submitVerification(verificationToken.current)} />}
              <Action secondary label="Gửi lại email" onPress={() => navigate('resend')} />
              {feedback?.kind === 'retry' && <Action secondary label="Đăng nhập" onPress={goToLogin} />}
            </>}
            {screen === 'verified' && <>
              <Text style={[styles.body, styles.notice]}>Email đã được xác thực. Bạn có thể đăng nhập để tiếp tục.</Text>
              <Action label="Đăng nhập" onPress={goToLogin} />
            </>}
            {screen === 'login' && <Text style={[styles.body, styles.notice]}>Tính năng đăng nhập đang chờ tích hợp.</Text>}
            <Action label="Về bảng tin" secondary onPress={() => navigate('feed')} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, screen: { flex: 1, backgroundColor: '#F1F5FC' },
  content: { flexGrow: 1, alignItems: 'center', paddingBottom: 32 },
  hero: { width: '100%', minHeight: 180, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', backgroundColor: '#1E4BDD' },
  circle: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -140, right: -50, backgroundColor: '#4067E6' },
  smallCircle: { position: 'absolute', width: 170, height: 170, borderRadius: 85, bottom: -95, left: -52, backgroundColor: '#315BE4' },
  brand: { color: '#fff', fontSize: 26, fontWeight: '700', textAlign: 'center', marginHorizontal: 18 },
  card: { width: '90%', maxWidth: 440, marginTop: -22, backgroundColor: '#fff', borderRadius: 22, padding: 22, gap: 12 },
  heading: { fontSize: 23, fontWeight: '700', color: '#172952', marginBottom: 4 },
  label: { fontSize: 15, fontWeight: '600', color: '#172952' },
  body: { fontSize: 15, lineHeight: 22, color: '#294782', flexShrink: 1 },
  hint: { color: '#41567D', fontSize: 14 },
  input: { borderColor: '#ABB8CF', borderWidth: 1, borderRadius: 12, minHeight: 48, color: '#172952', padding: 12, fontSize: 16 },
  invalid: { borderColor: '#A62A27' },
  alert: { color: '#A62A27', fontSize: 15, lineHeight: 21 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EAF1FF', padding: 12, borderRadius: 12 },
  button: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#1E4BDD', padding: 10 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 }, secondary: { backgroundColor: '#EFF4FF' },
  secondaryText: { color: '#244BBF' }, disabled: { backgroundColor: '#556B9E' },
});
