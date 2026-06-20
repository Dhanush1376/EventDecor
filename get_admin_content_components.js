const fs = require('fs');
const code = fs.readFileSync('frontend/src/admin/pages/AdminContent.jsx', 'utf-8');
const lines = code.split('\n');

const components = [];
lines.forEach((line, index) => {
  if (line.match(/^function [A-Z]\w+\(/)) {
    components.push({ line: index + 1, text: line.trim() });
  } else if (line.match(/^export default function [A-Z]\w+\(/)) {
    components.push({ line: index + 1, text: line.trim() });
  } else if (line.match(/^const [A-Z]\w+ = /)) {
    components.push({ line: index + 1, text: line.trim() });
  }
});

console.log('Components found:');
components.forEach(c => console.log(`Line ${c.line}: ${c.text}`));
