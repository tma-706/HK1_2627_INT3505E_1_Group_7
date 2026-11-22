import { randomUUID } from 'expo-crypto';
import { getNetworkStateAsync } from 'expo-network';
import { Alert, BackHandler, Linking, Platform } from 'react-native';
import { GoogleOneTapSignIn, GoogleSignInButton } from 'react-native-nitro-google-signin';
import { AuthFlow } from './auth-flow';
import { identityApi } from './identity-api';
import { installation } from './installation';
import { myAreaApi } from './my-area-api';
import { MyAreaFlow } from './my-area-flow';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const policies = {
  terms: process.env.EXPO_PUBLIC_TERMS_URL,
  privacy: process.env.EXPO_PUBLIC_PRIVACY_URL,
};
const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';

async function online() {
  const network = await getNetworkStateAsync();
  return network.isConnected !== false && network.isInternetReachable !== false;
}

export const isPreview = false;
export const auth = new AuthFlow({
  installation,
  api: identityApi(process.env.EXPO_PUBLIC_CORE_URL),
  online,
  async selectGoogle() {
    if (!webClientId || (deviceType === 'ios' && !iosClientId)) throw new Error('Google clients not configured');
    GoogleOneTapSignIn.configure({ webClientId, iosClientId, autoSelectOnSignIn: false });
    const result = await GoogleOneTapSignIn.presentExplicitSignIn();
    if (result.type === 'cancelled') return null;
    if (result.type !== 'success' || !result.data?.idToken) throw new Error('Google sign-in unavailable');
    await GoogleOneTapSignIn.signOut().catch(() => undefined);
    return result.data.idToken;
  },
  attemptId: randomUUID,
  deviceType,
  clearPersonalData: () => myArea.clear(),
  mark: (name) => performance.mark?.(name),
});

export const myArea = new MyAreaFlow(auth, myAreaApi(process.env.EXPO_PUBLIC_CORE_URL), online);

export function subscribeBack(handler: () => boolean) {
  const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
  return () => subscription.remove();
}

export function openPolicy(policy: keyof typeof policies) {
  const url = policies[policy];
  if (!url) {
    Alert.alert('Liên kết chưa sẵn sàng');
    return;
  }
  try {
    const destination = new URL(url);
    if (destination.protocol !== 'https:' || destination.username || destination.password) {
      Alert.alert('Liên kết chưa sẵn sàng');
      return;
    }
    void Linking.openURL(destination.href).catch(() => Alert.alert('Không mở được liên kết'));
  } catch {
    Alert.alert('Liên kết chưa sẵn sàng');
  }
}

export function SignInButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  return (
    <GoogleSignInButton
      size="standard"
      colorScheme="light"
      signInBehavior="none"
      accessibilityRole="button"
      accessibilityLabel="Đăng nhập bằng Google"
      disabled={disabled}
      onPress={onPress}
    />
  );
}
