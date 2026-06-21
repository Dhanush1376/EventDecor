const fs = require('fs');
const lines = fs.readFileSync('frontend/src/pages/CustomOrders.jsx', 'utf-8').split('\n');

lines.forEach((line, i) => {
  if (line.includes('// ───') || line.includes('// ---') || line.includes('{/*')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
