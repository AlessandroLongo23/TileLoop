# TileLoop Mobile Setup

This guide will help you set up and build the mobile version of TileLoop using Capacitor.

## Prerequisites

1. **Android Studio** - Download and install from [developer.android.com](https://developer.android.com/studio)
2. **Java Development Kit (JDK)** - Android Studio includes this
3. **Android SDK** - Installed through Android Studio

## Development Workflow

### 1. Build and Test on Device/Emulator

```bash
# Build the web app and sync with mobile
npm run mobile:build

# Open Android Studio to run on device/emulator
npm run mobile:dev

# Or run directly (if you have ADB set up)
npm run mobile:run
```

### 2. Development Cycle

1. Make changes to your Svelte code
2. Run `npm run mobile:build` to build and sync
3. In Android Studio, click the "Run" button to deploy to your device

### 3. Available Scripts

- `npm run mobile:build` - Build web app and sync with Capacitor
- `npm run mobile:dev` - Build and open Android Studio
- `npm run mobile:run` - Build and run on connected device

## Android Studio Setup

1. Open Android Studio
2. Open the `android` folder in your project
3. Let Gradle sync complete
4. Connect your Android device or start an emulator
5. Click the "Run" button (green play icon)

## Building APK for Distribution

1. In Android Studio, go to `Build > Generate Signed Bundle / APK`
2. Choose APK
3. Create a new keystore or use existing
4. Select build variant (usually `release`)
5. Click "Finish"

## Troubleshooting

### Common Issues

1. **Gradle sync fails**: Make sure you have the latest Android SDK
2. **App crashes on startup**: Check the console logs in Android Studio
3. **White screen**: Usually means the web build failed - check `npm run build`

### Debugging

- Enable web debugging in Android Studio's device inspector
- Use Chrome DevTools to debug the WebView
- Check Capacitor logs: `npx cap run android --verbose`

## Configuration

The mobile app configuration is in `capacitor.config.json`. Key settings:

- `appId`: Your app's unique identifier
- `appName`: Display name on device
- `webDir`: Where the built web files are located
- `android`: Android-specific settings

## Next Steps

1. Test the app on your device
2. Customize the app icon and splash screen
3. Add any native plugins you need
4. Prepare for Play Store submission 