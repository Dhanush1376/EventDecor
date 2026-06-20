const fs = require('fs');

const code = fs.readFileSync('frontend/src/pages/CustomOrders.jsx', 'utf-8');
const lines = code.split('\n');

const loc = lines.length;

// calculate complexity naively
let complexity = 1;
complexity += (code.match(/\bif\b/g) || []).length;
complexity += (code.match(/\bfor\b/g) || []).length;
complexity += (code.match(/\bwhile\b/g) || []).length;
complexity += (code.match(/\bcase\b/g) || []).length;
complexity += (code.match(/\bcatch\b/g) || []).length;
complexity += (code.match(/\?/g) || []).length;
complexity += (code.match(/&&/g) || []).length;
complexity += (code.match(/\|\|/g) || []).length;

const stateCount = (code.match(/useState\(/g) || []).length;
const effectCount = (code.match(/useEffect\(/g) || []).length;

const apiCalls = [];
if (code.match(/axios\./g)) apiCalls.push('axios');
if (code.match(/api\./g)) apiCalls.push('api');
if (code.match(/fetch\(/g)) apiCalls.push('fetch');
if (code.match(/customOrderService\./g)) apiCalls.push('customOrderService');

const contexts = [];
if (code.match(/useAdmin\(/g)) contexts.push('useAdmin');
if (code.match(/useAuth\(/g)) contexts.push('useAuth');

const childComponents = [];
const componentMatches = code.match(/<([A-Z][a-zA-Z0-9]+)/g) || [];
componentMatches.forEach(m => {
  const c = m.substring(1);
  if (!childComponents.includes(c)) childComponents.push(c);
});

const declaredComponents = [];
lines.forEach((line, i) => {
  if (line.match(/^function [A-Z]/)) declaredComponents.push(`Line ${i+1}: ${line.trim()}`);
  if (line.match(/^export default function [A-Z]/)) declaredComponents.push(`Line ${i+1}: ${line.trim()}`);
  if (line.match(/^const [A-Z]\w+\s*=\s*\(/)) declaredComponents.push(`Line ${i+1}: ${line.trim()}`);
  if (line.match(/^const [A-Z]\w+\s*=\s*function/)) declaredComponents.push(`Line ${i+1}: ${line.trim()}`);
  // Catch standard function declarations or arrow functions for subcomponents
});

const sections = [];
let currentSection = '';
lines.forEach((line, i) => {
  // Try to find natural comment sections
  if (line.match(/\/\/ ---|===/)) {
    sections.push(`Line ${i+1}: ${line.trim()}`);
  }
  if (line.match(/\/\/ [A-Z]/) && line.length < 50 && line.includes(' ')) {
    // some headers
  }
});

console.log('--- STATS ---');
console.log(`LOC: ${loc}`);
console.log(`Complexity: ${complexity}`);
console.log(`State Count: ${stateCount}`);
console.log(`Effect Count: ${effectCount}`);
console.log(`API: ${apiCalls.join(', ') || 'None'}`);
console.log(`Contexts: ${contexts.join(', ') || 'None'}`);
console.log(`Children: ${childComponents.join(', ')}`);

console.log('\n--- DECLARED COMPONENTS ---');
declaredComponents.forEach(c => console.log(c));

console.log('\n--- SECTIONS ---');
sections.forEach(s => console.log(s));
