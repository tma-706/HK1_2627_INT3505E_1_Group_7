import type { ExpoConfig } from 'expo/config';

const iOSUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME;
const securityWebVariant = process.env.LF_SECURITY_WEB_VARIANT;
const plugins: NonNullable<ExpoConfig['plugins']> = ['expo-secure-store', 'expo-dev-client'];
if (iOSUrlScheme) {
  plugins.push(['react-native-nitro-google-signin', { iosUrlScheme: iOSUrlScheme }]);
}

const config: ExpoConfig = {
  name: 'Lost & Found',
  slug: 'lost-and-found',
  version: '0.1.0',
  orientation: 'portrait',
  ...(securityWebVariant === 'fixture' || securityWebVariant === 'preview'
    ? { experiments: { baseUrl: '/__security/' + securityWebVariant } } : {}),
  ios: { bundleIdentifier: 'app.lostfound.mobile', supportsTablet: true },
  android: {
    package: 'app.lostfound.mobile',
    blockedPermissions: [
      'android.permission.CAMERA', 'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION', 'android.permission.READ_CONTACTS',
      'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
  },
  plugins,
};
export default config;
