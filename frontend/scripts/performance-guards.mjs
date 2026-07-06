import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');

const errors = [];

const walk = (dir, predicate = () => true) => {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      out.push(...walk(fullPath, predicate));
    } else if (predicate(fullPath)) {
      out.push(fullPath);
    }
  }
  return out;
};

const sourceFiles = walk(srcDir, (file) => /\.(jsx?|tsx?)$/.test(file));
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (/import\s+\*\s+as\s+\w+\s+from\s+['"]lucide-react['"]/.test(text)) {
    errors.push(`Lucide namespace import is forbidden: ${path.relative(root, file)}`);
  }
  if (/import\(\s*['"]lucide-react['"]\s*\)/.test(text)) {
    errors.push(`Dynamic full lucide-react import is forbidden: ${path.relative(root, file)}`);
  }
}

const distFiles = walk(distDir, (file) => /\.(html|js|css|map)$/.test(file));
const forbiddenDistPatterns = [
  { name: 'legacy Render hostname', pattern: /\.onrender\.com/i },
  { name: 'legacy Railway hostname', pattern: /\.railway\.app/i },
  { name: 'localhost API URL', pattern: /https?:\/\/localhost:5000/i },
  { name: '127.0.0.1 API URL', pattern: /https?:\/\/127\.0\.0\.1:5000/i },
];

for (const file of distFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const { name, pattern } of forbiddenDistPatterns) {
    if (pattern.test(text)) {
      errors.push(`Production dist contains ${name}: ${path.relative(root, file)}`);
    }
  }
  if (file.endsWith('.map')) {
    errors.push(`Public production sourcemap found: ${path.relative(root, file)}`);
  }
}

if (errors.length) {
  console.error('\n[performance-guards] Failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('[performance-guards] Import, legacy URL, and sourcemap guards passed.');
