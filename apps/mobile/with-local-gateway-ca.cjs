const { copyFile, mkdir, rm, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { AndroidConfig, withDangerousMod } = require('expo/config-plugins');

module.exports = function withLocalGatewayCa(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const debug = path.join(config.modRequest.platformProjectRoot, 'app/src/debug');
    const manifestPath = path.join(debug, 'AndroidManifest.xml');
    const manifest = await AndroidConfig.Manifest.readAndroidManifestAsync(manifestPath);
    const app = manifest.manifest.application[0];
    const resource = '@xml/lost_found_gateway_tls';
    const directory = path.join(debug, 'res');
    const xml = path.join(directory, 'xml/lost_found_gateway_tls.xml');
    const certificate = path.join(directory, 'raw/lost_found_gateway_ca.crt');
    const source = process.env.LF_ANDROID_GATEWAY_CA;

    if (!source) {
      if (app.$['android:networkSecurityConfig'] === resource) {
        delete app.$['android:networkSecurityConfig'];
        await AndroidConfig.Manifest.writeAndroidManifestAsync(manifestPath, manifest);
      }
      await rm(xml, { force: true });
      await rm(certificate, { force: true });
      return config;
    }

    await mkdir(path.dirname(xml), { recursive: true });
    await mkdir(path.dirname(certificate), { recursive: true });
    await copyFile(path.resolve(config.modRequest.projectRoot, source), certificate);
    await writeFile(xml, `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Match Expo's debug manifest so Metro can serve JavaScript over HTTP. -->
    <base-config cleartextTrafficPermitted="true" />
    <debug-overrides>
        <trust-anchors>
            <certificates src="@raw/lost_found_gateway_ca" />
        </trust-anchors>
    </debug-overrides>
</network-security-config>
`);
    app.$['android:networkSecurityConfig'] = resource;
    await AndroidConfig.Manifest.writeAndroidManifestAsync(manifestPath, manifest);
    return config;
  }]);
};
