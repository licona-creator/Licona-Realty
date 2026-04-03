/**
 * Generate PWA icons and Apple splash screens
 *
 * Uses sharp to create navy (#132236) backgrounds with gold (#d3a971) "LR" text.
 * Since sharp cannot render text directly, we generate SVG and convert to PNG.
 *
 * Run: node scripts/generate-pwa-assets.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const NAVY = '#132236';
const GOLD = '#d3a971';

function createIconSvg(size) {
  const fontSize = Math.round(size * 0.38);
  return Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="${NAVY}"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
          font-family="Georgia, serif" font-weight="bold" font-size="${fontSize}px"
          fill="${GOLD}">LR</text>
  </svg>`);
}

function createSplashSvg(width, height) {
  const fontSize = Math.round(Math.min(width, height) * 0.08);
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="${NAVY}"/>
    <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle"
          font-family="Georgia, serif" font-weight="bold" font-size="${fontSize}px"
          fill="${GOLD}">LR</text>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
          font-family="Arial, sans-serif" font-weight="400" font-size="${Math.round(fontSize * 0.32)}px"
          letter-spacing="3" fill="${GOLD}" opacity="0.6">LICONA REALTY</text>
  </svg>`);
}

const ICONS = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-72x72.png', size: 72 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 },
];

const SPLASHES = [
  { name: 'iphone-16-pro-max.png', w: 1320, h: 2868 },
  { name: 'iphone-16-pro.png', w: 1206, h: 2622 },
  { name: 'iphone-16.png', w: 1170, h: 2532 },
  { name: 'iphone-se.png', w: 750, h: 1334 },
  { name: 'ipad-pro-12.9.png', w: 2048, h: 2732 },
  { name: 'ipad-pro-11.png', w: 1668, h: 2388 },
  { name: 'ipad-air.png', w: 1640, h: 2360 },
  // Landscape variants for iPad
  { name: 'ipad-pro-12.9-landscape.png', w: 2732, h: 2048 },
  { name: 'ipad-pro-11-landscape.png', w: 2388, h: 1668 },
  { name: 'ipad-air-landscape.png', w: 2360, h: 1640 },
];

async function main() {
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');
  const splashDir = path.join(__dirname, '..', 'public', 'splash');

  fs.mkdirSync(iconsDir, { recursive: true });
  fs.mkdirSync(splashDir, { recursive: true });

  // Generate icons
  for (const icon of ICONS) {
    const svg = createIconSvg(icon.size);
    await sharp(svg).png().toFile(path.join(iconsDir, icon.name));
    process.stdout.write(`  Icon: ${icon.name}\n`);
  }

  // Generate splash screens
  for (const splash of SPLASHES) {
    const svg = createSplashSvg(splash.w, splash.h);
    await sharp(svg).png().toFile(path.join(splashDir, splash.name));
    process.stdout.write(`  Splash: ${splash.name}\n`);
  }

  process.stdout.write('Done generating PWA assets.\n');
}

main().catch(err => { process.stderr.write(String(err) + '\n'); process.exit(1); });
