#!/usr/bin/env node
/**
 * Fails CI if console.* appears in application src (excluding logger wrappers and seed scripts).
 */
import fs from 'fs';
import path from 'path';

const roots = [
  { dir: 'backend/src', exclude: ['seeds', 'scripts'] },
  { dir: 'frontend/src', exclude: ['utils/logger.js'] },
];

const CONSOLE_RE = /\bconsole\.(log|debug|info|warn|error)\s*\(/;

const walk = (dir, excludePaths, violations) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (excludePaths.includes(entry.name)) continue;
      walk(full, excludePaths, violations);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
    const rel = full.replace(/\\/g, '/');
    if (excludePaths.some((ex) => rel.includes(ex))) continue;

    const lines = fs.readFileSync(full, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      if (CONSOLE_RE.test(line) && !line.trim().startsWith('//')) {
        violations.push(`${rel}:${idx + 1}: ${line.trim()}`);
      }
    });
  }
};

const violations = [];
for (const { dir, exclude } of roots) {
  walk(dir, exclude, violations);
}

if (violations.length > 0) {
  console.error('[check-no-console] Disallowed console.* usage in application src:\n');
  violations.forEach((v) => console.error(`  ${v}`));
  process.exit(1);
}

console.log('[check-no-console] OK — no stray console.* in application src');
