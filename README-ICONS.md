# TileLoop - Custom App Icon Setup

## Icon Files Created

I've created custom SVG icon files for your TileLoop game:

1. **`resources/icon.svg`** - Full icon with text (1024x1024)
2. **`resources/icon-simple.svg`** - Clean icon without text (1024x1024) - **Use this one**

## Manual Icon Generation Steps

Since automatic SVG-to-PNG conversion has some issues, here's how to generate your app icons:

### Option 1: Online Icon Generator (Recommended)

1. **Convert SVG to PNG:**
   - Open `resources/icon-simple.svg` in your browser
   - Take a screenshot or use an online SVG-to-PNG converter like:
     - https://svgtopng.com/
     - https://cloudconvert.com/svg-to-png
   - Export as 1024x1024 PNG

2. **Generate all icon sizes:**
   - Use an online app icon generator like:
     - https://icon.kitchen/
     - https://appicon.co/
     - https://makeappicon.com/
   - Upload your 1024x1024 PNG
   - Download the Android icon pack

3. **Replace the icons:**
   - Extract the downloaded Android icons
   - Replace all files in these directories:
     - `android/app/src/main/res/mipmap-mdpi/`
     - `android/app/src/main/res/mipmap-hdpi/`
     - `android/app/src/main/res/mipmap-xhdpi/`
     - `android/app/src/main/res/mipmap-xxhdpi/`
     - `android/app/src/main/res/mipmap-xxxhdpi/`

### Option 2: Using Image Editor

1. Open `resources/icon-simple.svg` in:
   - Adobe Illustrator
   - Inkscape (free)
   - Figma (free online)

2. Export as PNG at these sizes:
   - 48x48 (mdpi)
   - 72x72 (hdpi)
   - 96x96 (xhdpi)
   - 144x144 (xxhdpi)
   - 192x192 (xxxhdpi)

3. Name them `ic_launcher.png` and place in respective mipmap directories

### Option 3: Command Line (if you have ImageMagick)

If you have ImageMagick installed:

```bash
# Convert SVG to base PNG
magick resources/icon-simple.svg -resize 1024x1024 resources/icon-1024.png

# Generate different sizes
magick resources/icon-1024.png -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png
magick resources/icon-1024.png -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher.png
magick resources/icon-1024.png -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
magick resources/icon-1024.png -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
magick resources/icon-1024.png -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
```

## Rebuild and Test

After replacing the icons:

1. **Sync with Capacitor:**
   ```bash
   npx cap sync android
   ```

2. **Build new APK:**
   ```bash
   npm run mobile:build
   ```

3. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```

## Icon Design Notes

The custom icon features:
- **Dark theme** matching your game's aesthetic (#1e293b to #0f172a gradient)
- **Hexagonal tiles** representing the puzzle game concept
- **Golden connection paths** (#fbbf24 to #f59e0b) showing the "loop" concept
- **Clean geometric design** that scales well at small sizes
- **No text** for better readability at icon sizes

## Troubleshooting

- If icons don't update, clean the project: `./gradlew clean` in the android directory
- Make sure all mipmap directories have the `ic_launcher.png` file
- The SVG uses modern CSS gradients and filters that work well when rasterized

The icon perfectly represents TileLoop's concept of connecting geometric tiles to form loops! 