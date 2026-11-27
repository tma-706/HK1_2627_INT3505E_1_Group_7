module.exports = {
  name: 'Campus Lost & Found',
  slug: 'campus-lost-found',
  version: '0.1.0',
  android: { package: 'vn.campus.lostfound' },
  ios: { bundleIdentifier: 'vn.campus.lostfound' },
  plugins: ['./with-local-gateway-ca.cjs'],
};
