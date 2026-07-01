const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src');

function walk(directory) {
  let results = [];
  const list = fs.readdirSync(directory);
  list.forEach(function (file) {
    file = path.join(directory, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(dir);

function kebabCase(str) {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase().replace(/^-/, '');
}

let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('lucide-react')) {
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/g;
    let modified = false;
    
    content = content.replace(importRegex, (match, p1) => {
      modified = true;
      const imports = p1.split(',').map(s => s.trim()).filter(Boolean);
      return imports.map(imp => {
        let [name, alias] = imp.split(/\s+as\s+/);
        alias = alias || name;
        const kebab = kebabCase(name);
        return `import ${alias} from 'lucide-react/dist/esm/icons/${kebab}';`;
      }).join('\n');
    });

    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Modified:', file);
      changedFiles++;
    }
  }
});

console.log(`Done. Changed ${changedFiles} files.`);
