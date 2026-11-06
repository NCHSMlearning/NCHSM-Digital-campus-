import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nchsm.secureexam',
  appName: 'NCHSM Secure Exam',
  // The Android workflow stages the site's complete web files into ./www.
  // Capacitor requires webDir to point to an existing web asset directory.
  webDir: 'www',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['*'],
    hostname: 'localhost'
  },
  plugins: {
    App: {
      allowBackButton: false
    },
    Keyboard: {
      resize: 'body',
      style: 'dark'
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0A3D62',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    ScreenOrientation: {
      orientation: 'portrait'
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    minWebViewVersion: 80
  }
};

export default config;
