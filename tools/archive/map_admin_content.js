const fs = require('fs');

const fileContent = fs.readFileSync('frontend/src/admin/pages/AdminContent.jsx', 'utf-8');
const lines = fileContent.split('\n');

let importsEnd = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('import ')) {
    importsEnd = i + 1;
  }
}

const functionStart = lines.findIndex(l => l.includes('export default function AdminContent') || l.includes('const AdminContent = '));

const stateHooks = [];
const effects = [];
const returns = [];
const functions = [];
let currentFn = null;

lines.forEach((line, index) => {
  const lineNum = index + 1;
  if (line.includes('useState(')) {
    stateHooks.push({ line: lineNum, code: line.trim() });
  }
  if (line.includes('useEffect(')) {
    effects.push({ line: lineNum });
  }
  if (line.match(/const \w+ = .*=> {/)) {
    functions.push({ line: lineNum, name: line.match(/const (\w+) =/)[1] });
  }
  if (line.includes('return (') || line.includes('return(') || line.includes('return <')) {
    returns.push({ line: lineNum });
  }
});

console.log('--- AdminContent.jsx Structural Map ---');
console.log(`Imports End: Line ${importsEnd}`);
console.log(`Component Start: Line ${functionStart + 1}`);

console.log('\n--- State Hooks ---');
stateHooks.forEach(s => console.log(`Line ${s.line}: ${s.code}`));

console.log('\n--- Effects ---');
effects.forEach(e => console.log(`Line ${e.line}`));

console.log('\n--- Internal Functions ---');
functions.forEach(f => console.log(`Line ${f.line}: ${f.name}`));

console.log('\n--- Return Statements (Render blocks) ---');
returns.forEach(r => console.log(`Line ${r.line}`));
