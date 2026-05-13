// One-shot: convert hero/tile JPGs to WebP and AVIF. Large iPhone-native JPGs
// (>3000px wide) are also downscaled to a 2400-wide capped JPG/WebP/AVIF set
// so the served file is reasonable. Idempotent — skips outputs newer than input.
//
// Usage: node scripts/convert-images.js [--force]
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const force = process.argv.includes('--force');
const srcDir = path.join(__dirname, '..', 'src', 'assets', 'images');
const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.jpg'));
const MAX_W = 2400;
const fmt = (b) => (b / 1024).toFixed(1) + ' KB';

const isFresh = (outPath, inPath) => {
  if (force || !fs.existsSync(outPath)) return false;
  return fs.statSync(outPath).mtimeMs >= fs.statSync(inPath).mtimeMs;
};

(async () => {
  for (const file of files) {
    const inputPath = path.join(srcDir, file);
    const base = file.replace(/\.jpg$/i, '');
    const webpOut = path.join(srcDir, base + '.webp');
    const avifOut = path.join(srcDir, base + '.avif');
    const jpgOut = path.join(srcDir, base + '.jpg');

    const meta = await sharp(inputPath).metadata();
    const needsDownscale = meta.width && meta.width > MAX_W;
    const variantTag = needsDownscale ? `→${MAX_W}w` : 'as-is';
    console.log(`→ ${file}  (${meta.width}×${meta.height})  ${variantTag}`);

    const buildPipeline = () => {
      let p = sharp(inputPath);
      if (needsDownscale) p = p.resize({ width: MAX_W, withoutEnlargement: true });
      return p.withMetadata({ exif: {} });
    };

    if (!isFresh(webpOut, inputPath)) {
      await buildPipeline().webp({ quality: 78, effort: 6 }).toFile(webpOut);
    }
    if (!isFresh(avifOut, inputPath)) {
      await buildPipeline().avif({ quality: 60, effort: 5 }).toFile(avifOut);
    }
    // Re-export JPG capped to MAX_W only if the source is bigger than that.
    if (needsDownscale && !isFresh(jpgOut, inputPath)) {
      // Write to a temp path first because the source IS jpgOut.
      const tmp = jpgOut + '.tmp';
      await buildPipeline().jpeg({ quality: 82, mozjpeg: true }).toFile(tmp);
      fs.renameSync(tmp, jpgOut);
    }

    const w = fs.existsSync(webpOut) ? fs.statSync(webpOut).size : 0;
    const a = fs.existsSync(avifOut) ? fs.statSync(avifOut).size : 0;
    const j = fs.statSync(jpgOut).size;
    console.log(`   jpg ${fmt(j)}  →  webp ${fmt(w)}  ·  avif ${fmt(a)}`);
  }
})();
