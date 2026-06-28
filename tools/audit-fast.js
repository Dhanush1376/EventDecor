const fs = require('fs');
const path = require('path');

const base = 'c:\\Users\\Dhanush\\OneDrive\\Desktop\\PROJECTS\\EventDecor';
const results = [];

function walk(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage' || entry.name === '.git') continue;
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx|js|jsx|css|json|md|mjs|cjs|hbs)$/.test(entry.name) && !entry.name.endsWith('.lock') && !entry.name.endsWith('.snap')) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          const lines = content.split('\n').length;
          const rel = full.replace(base + '\\', '').replace(/\\/g, '/');
          results.push({ path: rel, ext: path.extname(entry.name), lines });
        } catch {}
      }
    }
  } catch {}
}

walk(path.join(base, 'backend', 'src'));
walk(path.join(base, 'backend', 'server.ts'));
walk(path.join(base, 'backend', 'scripts'));
walk(path.join(base, 'backend', 'ops'));
walk(path.join(base, 'frontend', 'src'));
walk(path.join(base, 'frontend', 'scripts'));
walk(path.join(base, 'frontend', 'vite.config.js'));
walk(path.join(base, 'frontend', 'index.html'));
walk(path.join(base, 'docs'));
walk(path.join(base, 'tools'));

// Summary
const byExt = {};
results.forEach(r => {
  if (!byExt[r.ext]) byExt[r.ext] = { count: 0, lines: 0 };
  byExt[r.ext].count++;
  byExt[r.ext].lines += r.lines;
});

console.log('=== TOTAL FILES:', results.length, '===');
console.log('\n=== LOC BY EXTENSION ===');
Object.entries(byExt).sort((a,b) => b[1].lines - a[1].lines).forEach(([ext, data]) => {
  console.log(`  ${ext}: ${data.count} files, ${data.lines} LOC`);
});

const totalLOC = results.reduce((s, r) => s + r.lines, 0);
const backendLOC = results.filter(r => r.path.startsWith('backend/')).reduce((s, r) => s + r.lines, 0);
const frontendLOC = results.filter(r => r.path.startsWith('frontend/')).reduce((s, r) => s + r.lines, 0);
const testLOC = results.filter(r => r.path.includes('test') || r.path.includes('__tests__')).reduce((s, r) => s + r.lines, 0);
const mdLOC = results.filter(r => r.ext === '.md').reduce((s, r) => s + r.lines, 0);
const jsonLOC = results.filter(r => r.ext === '.json').reduce((s, r) => s + r.lines, 0);
const cssLOC = results.filter(r => r.ext === '.css').reduce((s, r) => s + r.lines, 0);
const tsLOC = results.filter(r => r.ext === '.ts').reduce((s, r) => s + r.lines, 0);
const jsLOC = results.filter(r => r.ext === '.js' || r.ext === '.mjs' || r.ext === '.cjs').reduce((s, r) => s + r.lines, 0);
const jsxLOC = results.filter(r => r.ext === '.jsx').reduce((s, r) => s + r.lines, 0);
const tsxLOC = results.filter(r => r.ext === '.tsx').reduce((s, r) => s + r.lines, 0);

console.log('\n=== SUMMARY ===');
console.log('Total LOC:', totalLOC);
console.log('Backend LOC:', backendLOC);
console.log('Frontend LOC:', frontendLOC);
console.log('Test LOC:', testLOC);
console.log('Markdown LOC:', mdLOC);
console.log('JSON LOC:', jsonLOC);
console.log('CSS LOC:', cssLOC);
console.log('TypeScript LOC:', tsLOC);
console.log('JavaScript LOC:', jsLOC);
console.log('JSX LOC:', jsxLOC);
console.log('TSX LOC:', tsxLOC);

// Top 120 by LOC
console.log('\n=== TOP 120 LARGEST FILES ===');
results.sort((a,b) => b.lines - a.lines).slice(0, 120).forEach((r, i) => {
  console.log(`  ${i+1}. ${r.lines} LOC  ${r.path}`);
});

// Categories
const cats = {
  controllers: r => /controller/i.test(r.path),
  services: r => /service/i.test(r.path) && !/test/i.test(r.path),
  models: r => r.path.includes('models/'),
  hooks: r => r.path.includes('hooks/') || /\/use[A-Z]/.test(r.path),
  routes: r => /routes/i.test(r.path) || /Routes/.test(r.path),
  utils: r => /utils/i.test(r.path) || /util/i.test(r.path),
  middleware: r => r.path.includes('middleware/'),
  jobs: r => r.path.includes('jobs/') || /Job/i.test(r.path),
  validators: r => /validator/i.test(r.path) || /schema/i.test(r.path),
  components: r => r.path.includes('components/') && /\.(jsx|tsx)$/.test(r.ext),
  css: r => r.ext === '.css',
  tests: r => r.path.includes('test') || r.path.includes('__tests__'),
};

for (const [name, filter] of Object.entries(cats)) {
  const items = results.filter(filter).sort((a,b) => b.lines - a.lines);
  const totalLines = items.reduce((s, r) => s + r.lines, 0);
  console.log(`\n=== ${name.toUpperCase()} (${items.length} files, ${totalLines} LOC) ===`);
  items.slice(0, 50).forEach(r => console.log(`  ${r.lines} LOC  ${r.path}`));
}

// Size thresholds
for (const t of [200, 400, 600, 800, 1000, 1500, 2000]) {
  const over = results.filter(r => r.lines > t && /\.(ts|tsx|js|jsx)$/.test(r.ext));
  console.log(`\n=== SOURCE FILES OVER ${t} LOC: ${over.length} ===`);
  if (t >= 600) {
    over.forEach(r => console.log(`  ${r.lines} LOC  ${r.path}`));
  }
}

// Folder count
let folderCount = 0;
function countDirs(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage' || entry.name === '.git') continue;
      if (entry.isDirectory()) {
        folderCount++;
        countDirs(path.join(dir, entry.name));
      }
    }
  } catch {}
}
countDirs(path.join(base, 'backend', 'src'));
countDirs(path.join(base, 'frontend', 'src'));
console.log('\nTotal source folders:', folderCount);

// Average and median LOC
const srcFiles = results.filter(r => /\.(ts|tsx|js|jsx)$/.test(r.ext));
const avgLOC = Math.round(srcFiles.reduce((s,r) => s + r.lines, 0) / srcFiles.length);
const sorted = [...srcFiles].sort((a,b) => a.lines - b.lines);
const medianLOC = sorted[Math.floor(sorted.length / 2)]?.lines || 0;
console.log('Avg LOC/source file:', avgLOC);
console.log('Median LOC/source file:', medianLOC);

// Detect potential circular deps by finding mutual imports
console.log('\n=== IMPORT/EXPORT ANALYSIS ===');
const importMap = {};
srcFiles.forEach(r => {
  const full = path.join(base, r.path.replace(/\//g, '\\'));
  try {
    const content = fs.readFileSync(full, 'utf8');
    const imports = content.match(/(?:import|require)\s*\(?['"](\..*?)['"]\)?/g) || [];
    const exportCount = (content.match(/export\s+(default\s+)?(function|class|const|let|var|interface|type|enum|async)/g) || []).length;
    importMap[r.path] = {
      imports: imports.length,
      exports: exportCount,
      lines: r.lines
    };
  } catch {}
});

// Files with most imports
const byImports = Object.entries(importMap).sort((a,b) => b[1].imports - a[1].imports);
console.log('\nFiles with most imports:');
byImports.slice(0, 20).forEach(([p, d]) => console.log(`  ${d.imports} imports  ${p}`));

// Files with most exports
const byExports = Object.entries(importMap).sort((a,b) => b[1].exports - a[1].exports);
console.log('\nFiles with most exports:');
byExports.slice(0, 20).forEach(([p, d]) => console.log(`  ${d.exports} exports  ${p}`));

// Write results as JSON for further analysis
fs.writeFileSync(path.join(base, 'tools', 'audit-results.json'), JSON.stringify({results, byExt, importMap}, null, 2));
console.log('\nResults written to tools/audit-results.json');
