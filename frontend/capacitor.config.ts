import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.linkpet.app',
  appName: 'LinkPet',
  webDir: 'out',
  server: {
    // During development, uncomment and set to your local IP:
    // url: 'http://192.168.x.x:7860',
    androidScheme: 'https',
  },
};

export default config;
