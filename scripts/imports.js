const fs = require('fs');
const path = require('path');

function getAllFiles(dir, exts) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(file, exts));
    } else {
      if (exts.some(e => file.endsWith(e))) results.push(file);
    }
  });
  return results;
}

const exts = ['.js', '.jsx', '.ts', '.tsx'];
const feFiles = getAllFiles('frontend/src', exts);
const beFiles = getAllFiles('backend/src', exts);
const allFiles = [...feFiles, ...beFiles];

const importCounts = {};

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // simplistic import extraction: import ... from '.../filename' or import('.../filename')
  const importRegex = /from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1] || match[2];
    if (importPath.startsWith('.')) {
      // resolve relative path
      const resolved = path.resolve(path.dirname(file), importPath).replace(/\\/g, '/');
      // We only care about the base name for matching roughly
      const base = path.basename(resolved);
      importCounts[base] = (importCounts[base] || 0) + 1;
    }
  }
});

const sorted = Object.entries(importCounts).sort((a, b) => b[1] - a[1]).slice(0, 25);
console.log('--- Top 25 Most Imported Files ---');
sorted.forEach(entry => console.log(`${entry[1]} - ${entry[0]}`));
