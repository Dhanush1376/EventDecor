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

    // Find <img> tags
    const newContent = content.replace(/<img\b([^>]*?)>/g, (match, p1) => {
        // If it doesn't have an alt tag
        if (!/alt=/.test(p1)) {
            changed = true;
            return `<img${p1} alt="Traditional wedding event decoration">`;
        }
        // If it has empty alt tag: alt=""
        if (/alt=""/.test(p1)) {
            changed = true;
            return `<img${p1.replace(/alt=""/g, 'alt="Traditional wedding event decoration"')}>`;
        }
        return match;
    });

    if (changed) {
        fs.writeFileSync(file, newContent, 'utf8');
        updatedCount++;
        console.log('Updated:', file);
    }
});

console.log('Total files updated:', updatedCount);
