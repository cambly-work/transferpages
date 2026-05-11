// One-shot: convert hero/tile JPGs to WebP and AVIF for use via CSS image-set().
// Usage: node scripts/convert-images.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const srcDir = path.join(__dirname, '..', 'src', 'assets', 'images');
const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.jpg'));

(async () => {
  for (const file of files) {
    const inputPath = path.join(srcDir, file);
    const base = file.replace(/\.jpg$/i, '');
    const webpOut = path.join(srcDir, base + '.webp');
    const avifOut = path.join(srcDir, base + '.avif');

    const input = sharp(inputPath);
    const meta = await input.metadata();
    console.log(`→ ${file}  (${meta.width}×${meta.height})`);

    await sharp(inputPath).webp({ quality: 78, effort: 6 }).toFile(webpOut);
    const w = fs.statSync(webpOut).size;
    await sharp(inputPath).avif({ quality: 60, effort: 5 }).toFile(avifOut);
    const a = fs.statSync(avifOut).size;
    const j = fs.statSync(inputPath).size;
    const fmt = (b) => (b / 1024).toFixed(1) + ' KB';
    console.log(`   jpg ${fmt(j)}  →  webp ${fmt(w)}  ·  avif ${fmt(a)}`);
  }
})();
