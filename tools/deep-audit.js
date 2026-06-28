const fs = require('fs');
const path = require('path');

const BASE = 'c:\\Users\\Dhanush\\OneDrive\\Desktop\\PROJECTS\\EventDecor';
const results = {
  dbAudits: { missingLean: [], missingProjection: [], loopsWithQueries: [], missingTransactions: [] },
  apiAudits: { inconsistentResponses: [], missingAuth: [] },
  deadCode: { todos: [], unusedDependencies: [] }
};

function walk(dir, filter) {
  let out = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (/node_modules|dist|coverage|\.git$/.test(entry.name)) continue;
      if (entry.isDirectory()) out.push(...walk(full, filter));
      else if (filter(entry.name)) out.push(full);
    }
  } catch {}
  return out;
}

const tsJsFiles = walk(path.join(BASE, 'backend', 'src'), f => /\.(ts|js)$/.test(f));

// --- DB Query Audit ---
tsJsFiles.forEach(file => {
  const relPath = file.replace(BASE + '\\', '').replace(/\\/g, '/');
  const code = fs.readFileSync(file, 'utf8');

  // Check for find/findOne/findById without .lean()
  const queryRegex = /\.(find|findOne|findById)\s*\([^)]*\)(?![\s\S]*?\.lean\(\))/g;
  let match;
  while ((match = queryRegex.exec(code)) !== null) {
     // Simplified heuristic: If the line or next few lines don't have .lean(), it might be missing
     // It's hard to be perfect with regex, but we can look for .find( ... ) without .lean()
  }

  // A better heuristic for missing lean
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\.(find|findOne|findById)\s*\(/.test(line)) {
      let snippet = lines.slice(i, i + 5).join(' ');
      if (!/\.lean\(\)/.test(snippet) && !/\.save\(\)/.test(snippet) && !/\.populate/.test(snippet)) {
         results.dbAudits.missingLean.push({ file: relPath, line: i + 1, snippet: line.trim() });
      }
      
      // Projections
      if (!/\.select\(|\.project\(/.test(snippet) && !/\.countDocuments/.test(snippet) && !/\.update/.test(snippet) && !/\.delete/.test(snippet)) {
         results.dbAudits.missingProjection.push({ file: relPath, line: i + 1 });
      }
    }
    
    // N+1 query heuristic (DB query inside loop)
    if (/\b(for\s*\(|while\s*\(|forEach\s*\()/.test(line)) {
      let snippet = lines.slice(i, i + 10).join('\n');
      if (/\.(find|findOne|findById|updateOne|deleteOne|save)\s*\(/.test(snippet)) {
        results.dbAudits.loopsWithQueries.push({ file: relPath, line: i + 1 });
      }
    }
  }
  
  // Multi-document writes without transactions (heuristic)
  if (/\.(insertMany|updateMany|deleteMany)\s*\(/.test(code) && !/startSession\(\)/.test(code)) {
     results.dbAudits.missingTransactions.push({ file: relPath });
  }
});

// --- API Consistency ---
tsJsFiles.forEach(file => {
  const relPath = file.replace(BASE + '\\', '').replace(/\\/g, '/');
  if (!relPath.includes('controller') && !relPath.includes('routes')) return;
  const code = fs.readFileSync(file, 'utf8');
  const lines = code.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Inconsistent response formats
    if (/res\.(json|send)\s*\(/.test(line)) {
       if (!/success\s*:/.test(line) && !/ApiResponse/.test(line) && !/res\.status\(204\)/.test(line)) {
          results.apiAudits.inconsistentResponses.push({ file: relPath, line: i + 1, snippet: line.trim() });
       }
    }
  }
});

// --- Dead Code / TODOs ---
const allFiles = walk(BASE, f => /\.(ts|js|jsx|tsx)$/.test(f));
allFiles.forEach(file => {
  const relPath = file.replace(BASE + '\\', '').replace(/\\/g, '/');
  const code = fs.readFileSync(file, 'utf8');
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/(TODO|FIXME|HACK):/i.test(lines[i])) {
      results.deadCode.todos.push({ file: relPath, line: i + 1, text: lines[i].trim() });
    }
  }
});

// --- Output ---
console.log('=== DATABASE QUERY AUDIT ===');
console.log(`Missing .lean() (heuristic): ${results.dbAudits.missingLean.length} occurrences`);
console.log(`Missing projections (heuristic): ${results.dbAudits.missingProjection.length} occurrences`);
console.log(`Potential N+1 loops (queries in loops): ${results.dbAudits.loopsWithQueries.length} occurrences`);
console.log(`Potential missing transactions (multi-doc write without session): ${results.dbAudits.missingTransactions.length} occurrences`);

console.log('\n=== API CONSISTENCY AUDIT ===');
console.log(`Inconsistent response formats (missing { success, data }): ${results.apiAudits.inconsistentResponses.length} occurrences`);

console.log('\n=== DEAD CODE & DEBT ===');
console.log(`TODO/FIXME Comments: ${results.deadCode.todos.length}`);
results.deadCode.todos.slice(0, 10).forEach(t => console.log(`  ${t.file}:${t.line} - ${t.text}`));

fs.writeFileSync(path.join(BASE, 'tools', 'deep-audit-results.json'), JSON.stringify(results, null, 2));
