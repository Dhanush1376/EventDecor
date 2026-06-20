const fs = require('fs');
const path = require('path');

const adminUIKitExports = [
  'fadeUp', 'stagger', 'CHART_COLORS', 'formatCurrency', 'getRelativeTime',
  'PageHeader', 'StatCard', 'ChartCard', 'ChartTooltip', 'StatusBadge',
  'PeriodSelector', 'SkeletonDashboard', 'AdminToggle', 'EmptyState',
  'MobileFilterDrawer', 'SkeletonTable', 'AdminSkeleton', 'FilterBar',
  'SkeletonList', 'CustomSelect'
];

const dir = 'frontend/src/admin/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const usedComponents = new Set();
  const componentMatches = content.match(/<[A-Z][a-zA-Z]*/g);
  if (componentMatches) {
    for (const match of componentMatches) {
      usedComponents.add(match.substring(1));
    }
  }
  
  const usedExports = new Set();
  for (const exp of adminUIKitExports) {
    if (usedComponents.has(exp) || new RegExp('\\\\b' + exp + '\\\\b').test(content)) {
      usedExports.add(exp);
    }
  }
  
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]\.\.\/components\/AdminUIKit['"];?/;
  const importMatch = content.match(importRegex);
  
  if (importMatch) {
    const existingImports = importMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    for (const imp of existingImports) usedExports.add(imp);
    
    const newImportStr = `import { ${Array.from(usedExports).join(', ')} } from '../components/AdminUIKit';`;
    content = content.replace(importRegex, newImportStr);
    fs.writeFileSync(filePath, content);
  }
}
console.log('Fixed imports in all Admin pages!');
