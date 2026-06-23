const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const frontendSrc = path.join(projectRoot, 'frontend', 'src');
const backendSrc = path.join(projectRoot, 'backend', 'src');

const results = {
  largeFiles: [],
  hardcodedUrls: [],
  todoComments: [],
  totalFiles: 0,
  totalLines: 0,
};

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function analyzeFile(filePath) {
  if (filePath.includes('node_modules') || filePath.includes('.git') || filePath.includes('dist') || filePath.includes('build')) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const lineCount = lines.length;
  
  results.totalFiles++;
  results.totalLines += lineCount;

  if (lineCount > 500) {
    let priority = 'Medium';
    if (lineCount > 700) priority = 'High';
    if (lineCount > 1000) priority = 'Critical';
    results.largeFiles.push({ file: filePath.replace(projectRoot, ''), lines: lineCount, priority });
  }

  lines.forEach((line, i) => {
    if (line.match(/https?:\/\/[^\s'"]+/)) {
      results.hardcodedUrls.push({ file: filePath.replace(projectRoot, ''), line: i + 1, content: line.trim() });
    }
    if (line.match(/\/\/ TODO|\/\/ FIXME/i)) {
      results.todoComments.push({ file: filePath.replace(projectRoot, ''), line: i + 1, content: line.trim() });
    }
  });
}

walkDir(frontendSrc, analyzeFile);
walkDir(backendSrc, analyzeFile);

fs.writeFileSync(path.join(projectRoot, 'audit_report_raw.json'), JSON.stringify(results, null, 2));
console.log('Audit complete.');
