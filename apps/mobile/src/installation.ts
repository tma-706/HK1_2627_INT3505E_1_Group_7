import { requireNativeModule } from 'expo-modules-core';
import * as SecureStore from 'expo-secure-store';

const native = requireNativeModule<{
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
}>('InstallState');

const key = 'core-session';
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export const installation = {
  async load() {
    const marker = await native.read();
    const accepted = marker === 'accepted' || marker === 'discard-accepted';
    if (marker !== 'accepted') {
      await SecureStore.deleteItemAsync(key, options);
      await native.write(accepted ? 'accepted' : 'new');
      return { accepted, token: null };
    }
    return { accepted, token: await SecureStore.getItemAsync(key, options) };
  },
  async save(token: string, needsConsent: boolean) {
    await SecureStore.setItemAsync(key, token, options);
    if (needsConsent) await native.write('accepted');
  },
  async clear(accepted: boolean) {
    const tombstone = await native.write(accepted ? 'discard-accepted' : 'discard-new').then(() => true, () => false);
    await SecureStore.deleteItemAsync(key, options).catch((error: unknown) => {
      if (!tombstone) throw error;
    });
  },
  async prepareSave(accepted: boolean) {
    await SecureStore.deleteItemAsync(key, options);
    await native.write(accepted ? 'accepted' : 'new');
  },
};
