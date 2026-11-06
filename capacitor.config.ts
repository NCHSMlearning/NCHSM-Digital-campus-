import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ke.ac.nchsm.digitalcampus',
  appName: 'NCHSM Digital Campus',
  // Keep a valid local web directory for Capacitor sync; launch the live login page.
  webDir: 'www',
  server: {
    url: 'https://nchsm.co.ke/login.html',
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
