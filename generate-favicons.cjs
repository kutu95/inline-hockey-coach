const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Input files (update these paths if needed)
const ICON_SRC = path.join(__dirname, 'backcheck-icon.png'); // icon-only
const LOGO_SRC = path.join(__dirname, 'backcheck-logo.png'); // full logo
const OUT_DIR = path.join(__dirname, 'public');

// Favicon/icon sizes
const iconSizes = [16, 32, 48, 64, 128, 180, 192, 256, 512];

// Generate PNG favicons from icon-only image
async function generateFavicons() {
  for (const size of iconSizes) {
    const outPath = path.join(OUT_DIR, `favicon-${size}x${size}.png`);
    await sharp(ICON_SRC)
      .resize(size, size)
      .png({ quality: 100 })
      .toFile(outPath);
    console.log(`Generated ${outPath}`);
  }
  // Apple Touch Icon
  await sharp(ICON_SRC)
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile(path.join(OUT_DIR, 'apple-touch-icon.png'));
  // Android Chrome icons
  await sharp(ICON_SRC)
    .resize(192, 192)
    .png({ quality: 100 })
    .toFile(path.join(OUT_DIR, 'android-chrome-192x192.png'));
  await sharp(ICON_SRC)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(OUT_DIR, 'android-chrome-512x512.png'));
}

// Generate large branding images from full logo
async function generateBrandingImages() {
  // Example: splash screen, social preview, etc.
  await sharp(LOGO_SRC)
    .resize(1200, 630, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100 })
    .toFile(path.join(OUT_DIR, 'social-preview.png'));
  console.log('Generated social-preview.png');
}

(async () => {
  await generateFavicons();
  await generateBrandingImages();
  console.log('All favicons and branding images generated!');
})(); 