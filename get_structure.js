const fs = require('fs');

const content = fs.readFileSync('frontend/src/admin/pages/AdminAddProduct.jsx', 'utf8');
const lines = content.split('\n');

const structure = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('// ') || line.includes('{/*')) {
        // filter out some noise
        if (line.includes('eslint') || line.includes('TODO')) continue;
        structure.push({ line: i + 1, text: line.replace(/\{\/\*|\*\/\}/g, '').trim() });
    }
}

fs.writeFileSync('structure2.json', JSON.stringify(structure, null, 2));
