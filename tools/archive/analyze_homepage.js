const fs = require('fs');

const code = fs.readFileSync('frontend/src/admin/pages/AdminContent.jsx', 'utf-8');

function parseComponent(code, compName) {
  const startStr = `function ${compName}(`;
  const startIndex = code.indexOf(startStr);
  if (startIndex === -1) return null;

  const propsEnd = code.indexOf(')', startIndex);
  const props = code.substring(startIndex + startStr.length, propsEnd).trim();

  const bodyStart = code.indexOf('{', propsEnd);
  let openBraces = 1;
  let curr = bodyStart + 1;
  while (openBraces > 0 && curr < code.length) {
    if (code[curr] === '{') openBraces++;
    if (code[curr] === '}') openBraces--;
    curr++;
  }
  const body = code.substring(bodyStart, curr);
  
  // count newlines to determine LOC
  const snippet = code.substring(startIndex, curr);
  const loc = snippet.split('\n').length;

  return { props, body, loc, snippet };
}

const data = parseComponent(code, 'HomePageControllerEditor');
if (!data) {
  console.log('Component not found');
  process.exit(1);
}

const { snippet, loc } = data;

// Calculate Complexity (naive: count if, for, while, case, catch, ?, &&, ||)
let complexity = 1; // base
complexity += (snippet.match(/\bif\b/g) || []).length;
complexity += (snippet.match(/\bfor\b/g) || []).length;
complexity += (snippet.match(/\bwhile\b/g) || []).length;
complexity += (snippet.match(/\bcase\b/g) || []).length;
complexity += (snippet.match(/\bcatch\b/g) || []).length;
complexity += (snippet.match(/\?/g) || []).length;
complexity += (snippet.match(/&&/g) || []).length;
complexity += (snippet.match(/\|\|/g) || []).length;

const stateCount = (snippet.match(/useState\(/g) || []).length;
const effectCount = (snippet.match(/useEffect\(/g) || []).length;

const apiCalls = [];
if (snippet.includes('couponService.')) apiCalls.push('couponService.getAll');

const contexts = [];
if (snippet.includes('useAdmin(')) contexts.push('useAdmin() -> products, _productsError');

const childComponents = [];
const potentialChildren = ['ImageUpload', 'SectionHeader', 'AdminField', 'AdminInput', 'AdminToggle', 'AdminTextarea'];
potentialChildren.forEach(c => {
  if (snippet.includes(`<${c}`)) childComponents.push(c);
});

console.log(`LOC: ${loc}`);
console.log(`Complexity: ${complexity}`);
console.log(`State Count: ${stateCount}`);
console.log(`Effect Count: ${effectCount}`);
console.log(`API Calls: ${apiCalls.join(', ') || 'None'}`);
console.log(`Contexts: ${contexts.join(', ') || 'None'}`);
console.log(`Children: ${childComponents.join(', ') || 'None'}`);
