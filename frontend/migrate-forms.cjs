const fs = require('fs');

const path = require('path');
const { execSync } = require('child_process');

// The pattern to match the label class
const labelRegex = /className=[\"']block text-\[9px\] uppercase font-bold text-secondary tracking-widest mb-1\.5 font-display[\"']/g;

// The pattern to match input/textarea classes
const inputRegex1 = /className=[\"']w-full bg-white border border-outline-variant\/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold[\"']/g;
const inputRegex2 = /className=[\"']w-full bg-white border border-outline-variant\/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all min-h-\[70px\] font-semibold[\"']/g;
const inputRegex3 = /className=[\"']w-full bg-white border border-outline-variant\/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold uppercase[\"']/g;
const inputRegex4 = /className=[\"']w-full bg-white border border-outline-variant\/30 rounded-lg px-3 py-3 text-xs outline-none focus:border-primary transition-all font-semibold cursor-pointer[\"']/g;
const inputRegex5 = /className=[\"']w-full bg-surface-bright border border-outline-variant\/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold[\"']/g;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  content = content.replace(labelRegex, 'className=\"form-label\"');
  content = content.replace(inputRegex1, 'className=\"form-field\"');
  content = content.replace(inputRegex2, 'className=\"form-field min-h-[70px]\"');
  content = content.replace(inputRegex3, 'className=\"form-field uppercase\"');
  content = content.replace(inputRegex4, 'className=\"form-field cursor-pointer\"');
  content = content.replace(inputRegex5, 'className=\"form-field\"');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', filePath);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.match(/\.(js|jsx|ts|tsx)$/)) {
      processFile(fullPath);
    }
  }
}

walk('src');
console.log('Done');
