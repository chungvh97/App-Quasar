import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myteashop.app',
  appName: 'nuxt-app',
  webDir: '.output/public',
  server: {
    "androidScheme": "https" // Hoặc "http" nếu bạn không dùng HTTPS cho local dev server (ít quan trọng cho app đóng gói hoàn toàn)
  },
  bundledWebRuntime: false // Để false vì Nuxt đã bao gồm polyfills
};

export default config;
