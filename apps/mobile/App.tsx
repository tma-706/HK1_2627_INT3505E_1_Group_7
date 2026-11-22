import { useEffect, useSyncExternalStore } from 'react';
import {
  ActivityIndicator, Modal, Pressable,
  ScrollView, StatusBar, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { auth, isPreview, myArea, openPolicy, SignInButton, subscribeBack } from './src/auth-platform';

import { MyAreaScreens } from './src/my-area-screens';

const blue = '#204dcc';
const mark = (name: string) => performance.mark?.(name);

function Brand() {
  return (
    <View style={styles.hero}>
      <View style={[styles.circle, styles.circleTop]} />
      <View style={[styles.circle, styles.circleBottom]} />
      <View style={styles.logo} accessible={false}>
        <View style={styles.lens} />
        <View style={styles.handle} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>Lost &amp; Found</Text>
      <Text style={styles.tagline}>Kết nối người mất đồ với người nhặt được đồ.</Text>
    </View>
  );
}

function PolicyLinks({ compact = false }: { compact?: boolean }) {
  return (
    <View style={compact ? styles.policyFooter : styles.policyList}>
      <Pressable accessibilityRole="link" style={styles.link} onPress={() => openPolicy('terms')}>
        <Text style={compact ? styles.linkText : styles.policyTitle}>Điều khoản dịch vụ</Text>
      </Pressable>
      <Pressable accessibilityRole="link" style={styles.link} onPress={() => openPolicy('privacy')}>
        <Text style={compact ? styles.linkText : styles.policyTitle}>Chính sách quyền riêng tư</Text>
      </Pressable>
    </View>
  );
}

function Button({ label, onPress, primary = true }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable accessibilityRole="button" style={[styles.button, primary && styles.primary]} onPress={onPress}>
      <Text style={[styles.buttonText, primary && styles.primaryText]}>{label}</Text>
    </Pressable>
  );
}

function Screen() {
  const state = useSyncExternalStore(auth.subscribe, auth.getState);
  const personal = useSyncExternalStore(myArea.subscribe, myArea.getState);
  useEffect(() => {
    mark('auth.app-mounted');
    void auth.restore();
    return subscribeBack(() => {
      const current = auth.getState();
      const { screen } = current;
      if (screen === 'consent') {
        auth.rejectTerms();
        return true;
      }
      if (current.screen === 'home' && !current.confirming) return myArea.back();
      return screen === 'clearing';
    });
  }, []);
  useEffect(() => {
    if (state.screen === 'home' && !state.confirming) mark('auth.home');
    if (state.screen === 'signedOut') mark('auth.signed-out');
    if (state.screen === 'consent') mark('auth.terms-shown');
  }, [state]);

  if (state.screen === 'home') {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="dark-content" />
        {personal.screen === 'home' ? (
          <>
            <View style={styles.topBar}>
              <Text style={styles.topBarTitle}>Lost &amp; Found</Text>
            </View>
            <ScrollView contentContainerStyle={styles.pageContent}>
              <Text accessibilityRole="header" style={styles.heading}>Trang chính</Text>
              <Button label="Đăng xuất" onPress={() => auth.openLogout()} primary={false} />
            </ScrollView>
            <View style={styles.actionBar}>
              <Button label="Hồ sơ" onPress={() => { void myArea.openProfile(); }} primary={false} />
            </View>
          </>
        ) : (
          <MyAreaScreens flow={myArea} state={personal} logout={() => auth.openLogout()} />
        )}
        <Modal visible={state.confirming} transparent animationType="fade" onRequestClose={() => auth.cancelLogout()}>
          <View style={styles.backdrop}>
            <View style={styles.dialog} accessibilityViewIsModal>
              <Text accessibilityRole="header" style={styles.heading}>Bạn muốn đăng xuất?</Text>
              <Button label="Đăng xuất" onPress={() => auth.confirmLogout()} />
              <Button label="Huỷ" onPress={() => auth.cancelLogout()} primary={false} />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (state.screen === 'consent') {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.topBar}>
          <Text accessibilityRole="header" style={styles.topBarTitle}>Điều khoản và quyền riêng tư</Text>
        </View>
        <ScrollView contentContainerStyle={styles.pageContent}>
          <Text style={styles.body}>Đây là lần đầu bạn đăng nhập. Vui lòng đọc và đồng ý để tiếp tục.</Text>
          <PolicyLinks />
        </ScrollView>
        <View style={styles.actionBar}>
          <Button label="Đồng ý và tiếp tục" onPress={() => { void auth.acceptTerms(); }} />
          <Button label="Từ chối" onPress={() => auth.rejectTerms()} primary={false} />
        </View>
      </SafeAreaView>
    );
  }

  const canSignIn = state.screen === 'signedOut' || state.screen === 'selecting' || state.screen === 'issuing';
  const sessionExpired = state.screen === 'signedOut' && state.notice?.startsWith('Phiên đăng nhập');
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.loginScroll}>
        <Brand />
        <View style={styles.loginContent}>
          {state.screen === 'signedOut' && state.notice ? (
            <Text accessibilityLiveRegion="polite" style={styles.notice}>{state.notice}</Text>
          ) : null}
          <Text accessibilityRole="header" style={styles.heading}>
            {sessionExpired ? 'Đăng nhập lại' : 'Chào mừng bạn'}
          </Text>
          {canSignIn ? (
            <>
              <Text style={styles.body}>Đăng nhập để đăng bài báo mất, báo nhặt đồ và theo dõi yêu cầu nhận đồ của bạn.</Text>
              <View style={styles.signIn}>
                <SignInButton disabled={state.screen !== 'signedOut'} onPress={() => auth.select()} />
                {isPreview ? <Text style={styles.previewNote}>Bản xem trước · Dữ liệu mô phỏng</Text> : null}
              </View>
            </>
          ) : null}
          {state.screen === 'signedOut' && state.notice ? (
            state.retryAttempt
              ? <Button label="Thử lại" onPress={() => { void auth.retryAttempt(); }} />
              : (/kết nối/u.test(state.notice) || state.notice.startsWith('Không xác minh')
                ? <Button label="Thử lại" onPress={() => { void auth.select(); }} />
                : null)
          ) : null}
          {state.screen === 'blocked' ? (
            <>
              <Text accessibilityLiveRegion="polite" style={styles.notice}>{state.notice}</Text>
              <Button label="Thử lại" onPress={() => {
                void (state.retry === 'clear' ? auth.retryClear() : auth.restore());
              }} />
            </>
          ) : null}
          {['starting', 'restoring', 'issuing', 'selecting', 'clearing'].includes(state.screen) ? (
            <View style={styles.loading} accessibilityLiveRegion="polite">
              <ActivityIndicator color={blue} />
              <Text style={styles.body}>{state.screen === 'restoring' ? 'Đang xác minh phiên' : 'Đang xử lý'}</Text>
            </View>
          ) : null}
          {state.screen === 'issuing' ? (
            <Button label="Chọn tài khoản khác" onPress={() => auth.chooseAgain()} primary={false} />
          ) : null}
          {canSignIn ? (
            <View style={styles.loginFooter}>
              <Text style={styles.footerText}>Khi đăng nhập, bạn đồng ý với</Text>
              <PolicyLinks compact />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  const { width, height } = useWindowDimensions();
  const showFrame = isPreview && width >= 600;
  return (
    <View style={[styles.root, showFrame && styles.previewDesk]}>
      <View style={showFrame ? [styles.previewFrame, { height: Math.min(844, height - 32) }] : styles.root}>
        <SafeAreaProvider><Screen /></SafeAreaProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  previewDesk: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#e6ecf6' },
  previewFrame: { width: 390, overflow: 'hidden', borderRadius: 26, borderWidth: 1, borderColor: '#c7d2e4' },
  screen: { flex: 1, backgroundColor: '#fff' },
  loginScroll: { flexGrow: 1 },
  hero: {
    backgroundColor: blue, minHeight: 330, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, paddingTop: 24, paddingBottom: 34, gap: 13, overflow: 'hidden',
  },
  circle: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#ffffff12' },
  circleTop: { top: -96, right: -74 },
  circleBottom: { bottom: -154, left: -105 },
  logo: { width: 72, height: 72, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  lens: { width: 26, height: 26, borderRadius: 13, borderWidth: 2.5, borderColor: blue, marginRight: 5, marginBottom: 5 },
  handle: { width: 13, height: 2.5, borderRadius: 2, backgroundColor: blue, position: 'absolute', top: 45, left: 40, transform: [{ rotate: '45deg' }] },
  title: { color: '#fff', fontSize: 31, fontWeight: '800', textAlign: 'center' },
  tagline: { color: '#eef3ff', fontSize: 16, lineHeight: 23, maxWidth: 260, textAlign: 'center' },
  loginContent: {
    flexGrow: 1, marginTop: -22, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 28, gap: 11,
  },
  heading: { color: '#121b30', fontSize: 25, fontWeight: '700' },
  body: { color: '#485469', fontSize: 15, lineHeight: 23 },
  signIn: { alignItems: 'center', paddingTop: 12, gap: 8 },
  previewNote: { color: '#485469', fontSize: 12, textAlign: 'center' },
  loginFooter: { flexGrow: 1, justifyContent: 'flex-end', paddingTop: 24, paddingBottom: 14 },
  footerText: { color: '#485469', fontSize: 13, textAlign: 'center' },
  policyFooter: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 4 },
  policyList: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e4e9f3' },
  link: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 },
  linkText: { color: blue, fontSize: 13, textDecorationLine: 'underline' },
  policyTitle: { color: blue, fontSize: 16, fontWeight: '600' },
  topBar: { minHeight: 58, justifyContent: 'center', paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#e4e9f3' },
  topBarTitle: { color: '#121b30', fontSize: 18, fontWeight: '700' },
  pageContent: { padding: 24, gap: 20 },
  actionBar: { padding: 24, gap: 8, borderTopWidth: 1, borderTopColor: '#e4e9f3' },
  notice: { backgroundColor: '#edf3fe', color: '#173a8c', borderRadius: 12, padding: 12, fontSize: 15 },
  button: { minHeight: 48, padding: 10, justifyContent: 'center', borderRadius: 12 },
  primary: { backgroundColor: blue },
  buttonText: { textAlign: 'center', color: blue, fontWeight: '700', fontSize: 16 },
  primaryText: { color: '#fff' },
  loading: { minHeight: 48, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  backdrop: { backgroundColor: '#111b30a8', flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 342, backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 14 },
});
