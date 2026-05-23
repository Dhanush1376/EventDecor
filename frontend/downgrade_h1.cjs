const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.jsx') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src'));
let updatedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Change all <h1 to <h2 and </h1> to </h2>
    if (content.includes('<h1') || content.includes('</h1')) {
        content = content.replace(/<h1\b/g, '<h2');
        content = content.replace(/<\/h1>/g, '</h2>');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        updatedCount++;
        console.log('Downgraded h1 to h2 in:', file);
    }
});

console.log('Total files updated:', updatedCount);
