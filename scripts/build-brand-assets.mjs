// Generates the optimised logo files used by the website and the mobile app from the
// originals in /Images. Run it again whenever a logo changes:  node scripts/build-brand-assets.mjs
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const images = path.join(root, 'Images');
const web = path.join(root, 'frontend', 'public', 'brand');
const mobile = path.join(root, 'mobile', 'assets', 'brand');
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

await mkdir(web, { recursive: true });
await mkdir(mobile, { recursive: true });

const logo = path.join(images, 'logo.png');
const fcai = path.join(images, 'CAI logo.png');
const university = path.join(images, 'Damietta University logo.png');

const fit = (file, size) => sharp(file).resize(size, size, { fit: 'contain', background: transparent });

/** The logo centred on a square canvas, scaled to `ratio` of the canvas. */
async function padded(file, canvas, ratio, background) {
  const inner = Math.round(canvas * ratio);
  const buffer = await fit(file, inner).png().toBuffer();
  return sharp({ create: { width: canvas, height: canvas, channels: 4, background } })
    .composite([{ input: buffer, gravity: 'centre' }])
    .png();
}

// ---- website ----
await fit(logo, 512).webp({ quality: 90 }).toFile(path.join(web, 'logo.webp'));
await fit(logo, 160).webp({ quality: 90 }).toFile(path.join(web, 'logo-sm.webp'));
await fit(logo, 180).png().toFile(path.join(web, 'apple-touch-icon.png'));
await fit(logo, 64).png().toFile(path.join(web, 'favicon.png'));
await (await padded(logo, 512, 0.86, '#ffffff')).toFile(path.join(web, 'icon-512.png'));
await fit(fcai, 240).webp({ quality: 90 }).toFile(path.join(web, 'fcai.webp'));
await fit(university, 240).webp({ quality: 90 }).toFile(path.join(web, 'university.webp'));
await (await padded(logo, 1200, 0.42, '#14110f')).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 86 })
  .toFile(path.join(web, 'og-image.jpg'));

// ---- mobile ----
await fit(logo, 512).png().toFile(path.join(mobile, 'logo.png'));
await fit(fcai, 240).png().toFile(path.join(mobile, 'fcai.png'));
await fit(university, 240).png().toFile(path.join(mobile, 'university.png'));
// iOS icons cannot be transparent; Android crops adaptive icons to a circle, hence the extra padding.
await (await padded(logo, 1024, 0.9, '#ffffff')).toFile(path.join(mobile, 'icon.png'));
await (await padded(logo, 1024, 0.6, transparent)).toFile(path.join(mobile, 'adaptive-foreground.png'));
await (await padded(logo, 1024, 0.5, transparent)).toFile(path.join(mobile, 'splash.png'));
await fit(logo, 64).png().toFile(path.join(mobile, 'favicon.png'));

console.log('Brand assets written to', web, 'and', mobile);
