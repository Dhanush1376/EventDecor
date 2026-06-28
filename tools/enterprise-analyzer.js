/**
 * Enterprise-Grade Codebase Analyzer
 * Measures: Cyclomatic Complexity, Cognitive Complexity, Fan-in/Fan-out,
 * Circular Dependencies, Maintainability Index, SRP violations
 */
const fs = require('fs');
const path = require('path');

const BASE = 'c:\\Users\\Dhanush\\OneDrive\\Desktop\\PROJECTS\\EventDecor';
const results = { files: [], circularDeps: [], unusedExports: [], duplicateLogic: [] };

// ─── File Walker ───
function walk(dir, filter) {
  const out = [];
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

// ─── Cyclomatic Complexity ───
function cyclomaticComplexity(code) {
  let cc = 1;
  const patterns = [
    /\bif\s*\(/g, /\belse\s+if\s*\(/g, /\bwhile\s*\(/g, /\bfor\s*\(/g,
    /\bcase\s+/g, /\bcatch\s*\(/g, /\?\?/g, /\?\./g, /&&/g, /\|\|/g,
    /\?\s*[^:?]+\s*:/g // ternary
  ];
  for (const p of patterns) {
    const matches = code.match(p);
    if (matches) cc += matches.length;
  }
  return cc;
}

// ─── Cognitive Complexity ───
function cognitiveComplexity(code) {
  let cc = 0;
  let nesting = 0;
  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line) || !trimmed) continue;
    
    // Nesting incrementors
    if (/\bif\s*\(/.test(trimmed) || /\belse\s+if\s*\(/.test(trimmed)) {
      cc += 1 + nesting;
      nesting++;
    } else if (/\belse\b/.test(trimmed) && !/else\s+if/.test(trimmed)) {
      cc += 1;
    } else if (/\bfor\s*\(/.test(trimmed) || /\bwhile\s*\(/.test(trimmed)) {
      cc += 1 + nesting;
      nesting++;
    } else if (/\bswitch\s*\(/.test(trimmed)) {
      cc += 1 + nesting;
      nesting++;
    } else if (/\bcatch\s*\(/.test(trimmed)) {
      cc += 1 + nesting;
      nesting++;
    } else if (/\?\s*[^:]+\s*:/.test(trimmed)) {
      cc += 1 + nesting; // ternary
    }
    
    // Track nesting depth via braces (simplified)
    const opens = (trimmed.match(/\{/g) || []).length;
    const closes = (trimmed.match(/\}/g) || []).length;
    if (closes > opens) nesting = Math.max(0, nesting - (closes - opens));
  }
  return cc;
}

// ─── Maintainability Index ───
// MI = 171 - 5.2 * ln(HV) - 0.23 * CC - 16.2 * ln(LOC)
// Simplified: We use LOC and CC since Halstead Volume requires full lexical analysis
function maintainabilityIndex(loc, cc) {
  if (loc <= 0) return 100;
  const mi = Math.max(0, Math.min(100, 
    171 - 5.2 * Math.log(loc * 10) - 0.23 * cc - 16.2 * Math.log(loc)
  ));
  return Math.round(mi * 100) / 100;
}

// ─── Extract imports and exports ───
function analyzeImportsExports(code, filePath) {
  const relPath = filePath.replace(BASE + '\\', '').replace(/\\/g, '/');
  
  // Imports (relative only - for dependency graph)
  const importMatches = [];
  const importRegex = /(?:import\s+.*?from\s+|require\s*\(\s*)['"](\.[^'"]+)['"]/g;
  let m;
  while ((m = importRegex.exec(code)) !== null) {
    importMatches.push(m[1]);
  }
  
  // Named exports count
  const namedExports = (code.match(/export\s+(const|let|var|function|class|interface|type|enum|async\s+function)\s+/g) || []).length;
  const defaultExport = /export\s+default\b/.test(code) ? 1 : 0;
  const reExports = (code.match(/export\s*\{[^}]+\}\s*from/g) || []).length;
  
  return {
    imports: importMatches,
    importCount: importMatches.length,
    namedExports,
    defaultExport,
    reExports,
    totalExports: namedExports + defaultExport + reExports
  };
}

// ─── Count function definitions ───
function countFunctions(code) {
  const funcPatterns = [
    /(?:export\s+)?(?:async\s+)?function\s+\w+/g,
    /(?:export\s+)?const\s+\w+\s*=\s*(?:async\s+)?\(/g,
    /(?:export\s+)?const\s+\w+\s*=\s*(?:async\s+)?\w+\s*=>/g,
  ];
  let count = 0;
  for (const p of funcPatterns) {
    const matches = code.match(p);
    if (matches) count += matches.length;
  }
  return count;
}

// ─── Detect state/hooks in React components ───
function analyzeReactComponent(code) {
  const stateCount = (code.match(/useState\s*[<(]/g) || []).length;
  const effectCount = (code.match(/useEffect\s*\(/g) || []).length;
  const refCount = (code.match(/useRef\s*[<(]/g) || []).length;
  const memoCount = (code.match(/useMemo\s*\(/g) || []).length;
  const callbackCount = (code.match(/useCallback\s*\(/g) || []).length;
  const contextCount = (code.match(/useContext\s*\(/g) || []).length;
  const customHooks = (code.match(/use[A-Z]\w+\s*\(/g) || []).length - stateCount - effectCount - refCount - memoCount - callbackCount - contextCount;
  const hasMemo = /React\.memo\(|memo\(/.test(code);
  const propsCount = (code.match(/\b(props\.\w+|{\s*\w+(?:\s*,\s*\w+)*\s*})\s*(?:=|:)/g) || []).length;
  
  return {
    stateCount, effectCount, refCount, memoCount, callbackCount,
    contextCount, customHooks: Math.max(0, customHooks), hasMemo, propsCount
  };
}

// ─── SRP Violation Detection ───
function detectSRPViolation(code, filePath) {
  const violations = [];
  const relPath = filePath.replace(BASE + '\\', '').replace(/\\/g, '/');
  
  // Detect mixed concerns: DB queries + HTTP response formatting + email sending
  const hasDbQueries = /\.(find|findOne|findById|aggregate|updateOne|deleteOne|create|save)\s*\(/.test(code);
  const hasHttpResponse = /res\.(json|status|send)\s*\(/.test(code);
  const hasEmailSending = /sendEmail|sendMail|nodemailer|transporter/.test(code);
  const hasFileIO = /fs\.(readFile|writeFile|unlink|mkdir)/.test(code);
  const hasExternalAPI = /axios\.|fetch\(|https?\.request/.test(code);
  
  const concerns = [];
  if (hasDbQueries) concerns.push('database');
  if (hasHttpResponse) concerns.push('http');
  if (hasEmailSending) concerns.push('email');
  if (hasFileIO) concerns.push('filesystem');
  if (hasExternalAPI) concerns.push('external-api');
  
  // Controllers should only have http + maybe database (via service)
  if (relPath.includes('controller') && concerns.length > 2) {
    violations.push({ file: relPath, type: 'controller-mixed-concerns', concerns });
  }
  
  // Services with HTTP concerns
  if (relPath.includes('service') && !relPath.includes('controller') && hasHttpResponse) {
    violations.push({ file: relPath, type: 'service-has-http', concerns });
  }
  
  return violations;
}

// ─── Main Analysis ───
const sourceFiles = walk(path.join(BASE, 'backend', 'src'), f => /\.(ts|js|mjs|cjs)$/.test(f))
  .concat(walk(path.join(BASE, 'frontend', 'src'), f => /\.(jsx|js|mjs)$/.test(f)));

// Also add server.ts
const serverTs = path.join(BASE, 'backend', 'server.ts');
if (fs.existsSync(serverTs)) sourceFiles.push(serverTs);

const depGraph = {}; // For circular dependency detection
const exportRegistry = {}; // Track all exports for unused detection
const importRegistry = {}; // Track all imports

for (const filePath of sourceFiles) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const relPath = filePath.replace(BASE + '\\', '').replace(/\\/g, '/');
    const lines = code.split('\n');
    const loc = lines.length;
    const blankLines = lines.filter(l => !l.trim()).length;
    const commentLines = lines.filter(l => /^\s*(\/\/|\/\*|\*)/.test(l)).length;
    const effectiveLOC = loc - blankLines - commentLines;
    
    const cc = cyclomaticComplexity(code);
    const cogCC = cognitiveComplexity(code);
    const mi = maintainabilityIndex(effectiveLOC, cc);
    const funcCount = countFunctions(code);
    const { imports, importCount, namedExports, defaultExport, reExports, totalExports } = analyzeImportsExports(code, filePath);
    const srpViolations = detectSRPViolation(code, filePath);
    
    let reactAnalysis = null;
    if (/\.jsx$/.test(filePath)) {
      reactAnalysis = analyzeReactComponent(code);
    }
    
    // Build dependency graph
    depGraph[relPath] = imports.map(imp => {
      // Resolve relative import to absolute-ish path
      const dir = path.dirname(filePath);
      let resolved = path.resolve(dir, imp).replace(BASE + '\\', '').replace(/\\/g, '/');
      // Try common extensions
      for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js', '/index.jsx']) {
        const candidate = resolved + ext;
        if (sourceFiles.some(f => f.replace(BASE + '\\', '').replace(/\\/g, '/') === candidate)) {
          return candidate;
        }
      }
      return resolved;
    });
    
    // Track exports for unused detection
    exportRegistry[relPath] = totalExports;
    importRegistry[relPath] = imports;
    
    results.files.push({
      path: relPath,
      loc,
      effectiveLOC,
      blankLines,
      commentLines,
      cyclomaticComplexity: cc,
      cognitiveComplexity: cogCC,
      maintainabilityIndex: mi,
      functionCount: funcCount,
      importCount,
      totalExports,
      namedExports,
      defaultExport,
      reExports,
      srpViolations,
      reactAnalysis,
      ext: path.extname(filePath),
    });
    
    if (srpViolations.length > 0) {
      results.files[results.files.length - 1].srpViolations = srpViolations;
    }
  } catch (e) {
    // Skip unreadable files
  }
}

// ─── Circular Dependency Detection (DFS) ───
function detectCircularDeps(graph) {
  const circular = [];
  const visited = new Set();
  const inStack = new Set();
  const pathStack = [];
  
  function dfs(node) {
    if (inStack.has(node)) {
      const cycleStart = pathStack.indexOf(node);
      if (cycleStart !== -1) {
        circular.push([...pathStack.slice(cycleStart), node]);
      }
      return;
    }
    if (visited.has(node)) return;
    
    visited.add(node);
    inStack.add(node);
    pathStack.push(node);
    
    const deps = graph[node] || [];
    for (const dep of deps) {
      if (graph[dep] !== undefined) { // Only check files we have
        dfs(dep);
      }
    }
    
    pathStack.pop();
    inStack.delete(node);
  }
  
  for (const node of Object.keys(graph)) {
    dfs(node);
  }
  
  return circular;
}

results.circularDeps = detectCircularDeps(depGraph);

// ─── Fan-in / Fan-out Analysis ───
const fanOut = {}; // How many modules does this file depend on?
const fanIn = {};  // How many modules depend on this file?

for (const [file, deps] of Object.entries(depGraph)) {
  fanOut[file] = deps.length;
  for (const dep of deps) {
    fanIn[dep] = (fanIn[dep] || 0) + 1;
  }
}

// ─── Output ───

// Sort by complexity
const byComplexity = [...results.files].sort((a, b) => b.cyclomaticComplexity - a.cyclomaticComplexity);
const byCogComplexity = [...results.files].sort((a, b) => b.cognitiveComplexity - a.cognitiveComplexity);
const byMI = [...results.files].sort((a, b) => a.maintainabilityIndex - b.maintainabilityIndex);

console.log('=== CYCLOMATIC COMPLEXITY TOP 40 ===');
byComplexity.slice(0, 40).forEach((f, i) => {
  console.log(`${i+1}. CC=${f.cyclomaticComplexity} CogC=${f.cognitiveComplexity} MI=${f.maintainabilityIndex} LOC=${f.loc} ${f.path}`);
});

console.log('\n=== COGNITIVE COMPLEXITY TOP 40 ===');
byCogComplexity.slice(0, 40).forEach((f, i) => {
  console.log(`${i+1}. CogC=${f.cognitiveComplexity} CC=${f.cyclomaticComplexity} MI=${f.maintainabilityIndex} LOC=${f.loc} ${f.path}`);
});

console.log('\n=== LOWEST MAINTAINABILITY INDEX (worst 40) ===');
byMI.slice(0, 40).forEach((f, i) => {
  console.log(`${i+1}. MI=${f.maintainabilityIndex} CC=${f.cyclomaticComplexity} LOC=${f.loc} ${f.path}`);
});

console.log('\n=== CIRCULAR DEPENDENCIES ===');
if (results.circularDeps.length === 0) {
  console.log('None detected ✅');
} else {
  results.circularDeps.forEach((cycle, i) => {
    console.log(`${i+1}. ${cycle.join(' → ')}`);
  });
}

console.log('\n=== FAN-IN TOP 20 (most depended upon) ===');
Object.entries(fanIn).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([f, count]) => {
  console.log(`  ${count} dependents  ${f}`);
});

console.log('\n=== FAN-OUT TOP 20 (most dependencies) ===');
Object.entries(fanOut).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([f, count]) => {
  console.log(`  ${count} dependencies  ${f}`);
});

// SRP Violations
const allSRP = results.files.filter(f => f.srpViolations && f.srpViolations.length > 0);
console.log(`\n=== SRP VIOLATIONS (${allSRP.length} files) ===`);
allSRP.forEach(f => {
  f.srpViolations.forEach(v => {
    console.log(`  ${v.type}: ${v.file} [${v.concerns.join(', ')}]`);
  });
});

// React component analysis
const reactFiles = results.files.filter(f => f.reactAnalysis);
console.log(`\n=== REACT COMPONENTS WITH MOST STATE (top 20) ===`);
reactFiles.sort((a, b) => b.reactAnalysis.stateCount - a.reactAnalysis.stateCount).slice(0, 20).forEach(f => {
  const r = f.reactAnalysis;
  console.log(`  state=${r.stateCount} effects=${r.effectCount} memo=${r.memoCount} cb=${r.callbackCount} hasMemo=${r.hasMemo} ${f.path} (${f.loc} LOC)`);
});

console.log(`\n=== REACT COMPONENTS WITHOUT React.memo (top 30 by LOC) ===`);
reactFiles.filter(f => !f.reactAnalysis.hasMemo && f.loc > 200)
  .sort((a, b) => b.loc - a.loc).slice(0, 30).forEach(f => {
  const r = f.reactAnalysis;
  console.log(`  ${f.loc} LOC state=${r.stateCount} effects=${r.effectCount} ${f.path}`);
});

// Files with high exports (possible God modules)
console.log('\n=== FILES WITH 10+ EXPORTS (possible God modules) ===');
results.files.filter(f => f.totalExports >= 10).sort((a, b) => b.totalExports - a.totalExports).forEach(f => {
  console.log(`  ${f.totalExports} exports  CC=${f.cyclomaticComplexity}  ${f.path}`);
});

// Write full results to JSON
fs.writeFileSync(
  path.join(BASE, 'tools', 'enterprise-audit.json'),
  JSON.stringify({ files: results.files, circularDeps: results.circularDeps, fanIn, fanOut }, null, 2)
);
console.log('\nFull results written to tools/enterprise-audit.json');
