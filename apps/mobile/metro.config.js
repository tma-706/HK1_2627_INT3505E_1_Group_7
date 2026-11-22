const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
if (process.env.LF_SECURITY_WEB_VARIANT === 'fixture') {
  config.resolver.resolveRequest = (context, moduleName, platform) => context.resolveRequest(
    context,
    platform === 'web' && moduleName === './src/auth-platform'
      ? path.join(__dirname, 'src/auth-platform.fixture.tsx')
      : moduleName,
    platform,
  );
}

module.exports = config;
