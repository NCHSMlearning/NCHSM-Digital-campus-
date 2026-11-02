import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ke.ac.nchsm.digitalcampus',
  appName: 'NCHSM Digital Campus',
  webDir: 'www',
  server: {
    // Load the live campus portal so all existing modules remain available in the APK.
    // The app requires an internet connection; authenticated data is not bundled offline.
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
      backgroundColor: "#0A3D62",
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
  },
  electron: {
    bundler: 'vite',
    electron: {
      build: {
        executableName: 'NCHSM-Secure-Exam',
        productName: 'NCHSM Secure Exam',
        appId: 'com.nchsm.exam',
        directories: {
          output: 'release'
        },
        files: [
          "**/*",
          "!**/*.ts",
          "!*.map",
          "!package-lock.json",
          "!node_modules/.cache"
        ],
        win: {
          target: ['nsis', 'portable'],
          icon: 'assets/icon.ico',
          publisherName: 'NCHSM',
          certificateFile: '',
          certificatePassword: ''
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true,
          createDesktopShortcut: true,
          createStartMenuShortcut: true
        }
      }
    }
  }
};

export default config;
