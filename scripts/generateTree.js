const fs = require('fs');
const path = require('path');

function walk(dir, indent, isLast) {
  let result = '';
  const files = fs.readdirSync(dir).filter(f => !['node_modules', 'dist', '.git', '.cursor', 'coverage', 'logs', 'temp'].includes(f));
  files.sort((a, b) => {
    const aDir = fs.statSync(path.join(dir, a)).isDirectory();
    const bDir = fs.statSync(path.join(dir, b)).isDirectory();
    return aDir === bDir ? a.localeCompare(b) : (aDir ? -1 : 1);
  });
  files.forEach((file, index) => {
    const isLastFile = index === files.length - 1;
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    const prefix = isLast ? '    ' : '│   ';
    const marker = isLastFile ? '└── ' : '├── ';
    result += indent + marker + file + '\n';
    if (stats.isDirectory()) {
      result += walk(filePath, indent + prefix, isLastFile);
    }
  });
  return result;
}

const root = process.cwd();
let treeStr = 'C:\\Users\\Dhanush\\OneDrive\\Desktop\\PROJECTS\\EventDecor\n' + walk(root, '', true);
const output = '```txt\n' + treeStr + '```\n';
fs.writeFileSync('codebase_tree.md', output);
console.log("Tree successfully written to codebase_tree.md");
