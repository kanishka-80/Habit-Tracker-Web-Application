import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const items = ['js', 'css', 'images', 'favicon.ico'];

items.forEach(item => {
  const src = path.join(__dirname, item);
  const dest = path.join(__dirname, 'dist', item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`✓ Copied ${item} to dist/${item}`);
  }
});
