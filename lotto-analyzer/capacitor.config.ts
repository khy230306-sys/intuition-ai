import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.aizio.lottolens',
  appName: '로또렌즈',
  webDir: 'dist',
  server: {
    // Bundle local assets; do not load a remote web URL in production.
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#0b2e2a',
    scheme: 'LottoLens',
  },
}

export default config
