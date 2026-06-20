const fs = require('fs');
const path = require('path');

function countLines(dir, exts) {
  let result = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (let f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      result = result.concat(countLines(full, exts));
    } else if (exts.some(ext => f.name.endsWith(ext))) {
      const lines = fs.readFileSync(full, 'utf8').split('\n').length;
      result.push({ file: full.replace(/\\/g, '/'), lines });
    }
  }
  return result;
}

const fe = countLines('frontend/src', ['.js', '.jsx', '.ts', '.tsx']).sort((a, b) => b.lines - a.lines).slice(0, 25);
console.log('--- Frontend Top 25 ---');
fe.forEach(f => console.log(`${f.lines} - ${f.file}`));

const be = countLines('backend/src', ['.js', '.jsx', '.ts', '.tsx']).sort((a, b) => b.lines - a.lines).slice(0, 25);
console.log('\n--- Backend Top 25 ---');
be.forEach(f => console.log(`${f.lines} - ${f.file}`));
