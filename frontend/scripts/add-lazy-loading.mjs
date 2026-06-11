import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let modifiedCount = 0;

walkDir(srcDir, function(filePath) {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // A simple regex to find <img> tags without loading="lazy" or loading="eager"
    // and inject loading="lazy" into them.
    content = content.replace(/<img(?![^>]*\bloading=["'][^"']*["'])((?:[^>]*?))\/?>/g, (match, p1) => {
      // Don't add if it's the SiriLogo (we want that eager usually, or it's just one off)
      if (filePath.includes('SiriLogo.jsx') || filePath.includes('HeroCarousel.jsx')) {
          return match;
      }
      return `<img loading="lazy"${p1}/>`;
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      modifiedCount++;
      console.log(`Updated ${path.basename(filePath)}`);
    }
  }
});

console.log(`Done. Modified ${modifiedCount} files.`);
