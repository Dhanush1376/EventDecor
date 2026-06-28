const fs = require('fs');
const path = require('path');

const coverageFile = path.join(__dirname, 'coverage/coverage-final.json');
const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));

const domains = {};

Object.keys(coverage).forEach((file) => {
  const relativePath = file.split('backend')[1] || file;
  const parts = relativePath.split(/[\\/]/).filter(Boolean);

  if (parts[0] !== 'src') return;

  // Try to group by domain, e.g., src/controllers/userController.ts -> User
  // src/services/users/userService.ts -> User
  let domain = 'Misc';
  let fileBase = parts[parts.length - 1];

  if (fileBase.toLowerCase().includes('user')) domain = 'User Management';
  else if (fileBase.toLowerCase().includes('product')) domain = 'Product CRUD';
  else if (fileBase.toLowerCase().includes('search')) domain = 'Search';
  else if (fileBase.toLowerCase().includes('recommendation')) domain = 'Recommendation Engine';
  else if (fileBase.toLowerCase().includes('order')) domain = 'Orders';
  else if (fileBase.toLowerCase().includes('checkout')) domain = 'Checkout';
  else if (fileBase.toLowerCase().includes('payment')) domain = 'Payments';
  else if (fileBase.toLowerCase().includes('refund')) domain = 'Refunds';
  else if (fileBase.toLowerCase().includes('rental')) domain = 'Rentals';
  else if (fileBase.toLowerCase().includes('event') || fileBase.toLowerCase().includes('booking'))
    domain = 'Event Booking';
  else if (fileBase.toLowerCase().includes('notification')) domain = 'Notifications';
  else if (fileBase.toLowerCase().includes('inventory')) domain = 'Inventory';
  else if (fileBase.toLowerCase().includes('upload') || fileBase.toLowerCase().includes('media'))
    domain = 'File Uploads';
  else if (fileBase.toLowerCase().includes('auth')) domain = 'Authentication';

  if (!domains[domain]) {
    domains[domain] = { statements: { total: 0, covered: 0 }, files: [] };
  }

  const fileCov = coverage[file];
  const statementKeys = Object.keys(fileCov.statementMap);
  let totalStatements = statementKeys.length;
  let coveredStatements = statementKeys.filter((k) => fileCov.s[k] > 0).length;

  domains[domain].statements.total += totalStatements;
  domains[domain].statements.covered += coveredStatements;
  domains[domain].files.push({
    file: relativePath,
    coverage: totalStatements ? ((coveredStatements / totalStatements) * 100).toFixed(1) : '100.0',
  });
});

console.log('== COVERAGE BY DOMAIN ==');
Object.keys(domains)
  .sort(
    (a, b) =>
      domains[a].statements.covered / (domains[a].statements.total || 1) -
      domains[b].statements.covered / (domains[b].statements.total || 1),
  )
  .forEach((domain) => {
    const data = domains[domain];
    const pct = data.statements.total
      ? ((data.statements.covered / data.statements.total) * 100).toFixed(1)
      : 100;
    console.log(
      `${domain}: ${pct}% (${data.statements.covered}/${data.statements.total} statements)`,
    );
    if (pct < 50) {
      console.log(`  High Risk Files:`);
      data.files
        .filter((f) => parseFloat(f.coverage) < 50)
        .forEach((f) => {
          console.log(`    - ${f.file} (${f.coverage}%)`);
        });
    }
  });
