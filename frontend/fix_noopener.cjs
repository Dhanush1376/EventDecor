const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Simple regex: replace target="_blank" with target="_blank" rel="noopener noreferrer"
    // Also remove existing rel="noreferrer" or rel="noopener" to avoid duplicates
    // But safely:
    
    // First, find all <a> tags, or just anything with target="_blank"
    content = content.replace(/target="_blank"(?!\s*rel="noopener noreferrer")/g, 'target="_blank" rel="noopener noreferrer"');
    
    // Remove existing standalone rel="noreferrer" that might now be next to our new rel
    // We can just normalize rel="noopener noreferrer" manually
    content = content.replace(/rel="noreferrer"/g, '');
    content = content.replace(/rel="noopener noreferrer"\s*rel="noopener noreferrer"/g, 'rel="noopener noreferrer"');
    content = content.replace(/target="_blank" rel="noopener noreferrer"\s+rel="noopener noreferrer"/g, 'target="_blank" rel="noopener noreferrer"');
    
    if (original !== content) {
      fs.writeFileSync(filePath, content);
      console.log('Fixed', filePath);
    }
  }
});
