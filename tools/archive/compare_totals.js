const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./analysis_results.json', 'utf8'));

// Calculate current totals (After)
let totalLOC = 0;
let totalComplexity = 0;
let totalDebtScore = 0;

// To calculate 'Before', we need to find the extracted components and AdminContent
const extractedNames = [
  'AISparkButton.jsx',
  'HomePageControllerEditor.jsx',
  'GalleryPortfolioEditor.jsx',
  'AboutPageDetailsEditor.jsx',
  'ShopPageEditor.jsx',
  'EventsPageEditor.jsx',
  'ContactInfoEditor.jsx',
  'CustomOrdersEditor.jsx',
  'FAQEditor.jsx',
  'SEOCenterEditor.jsx',
  'AnnouncementBarEditor.jsx',
  'NavigationFooterEditor.jsx',
  'PublisherVersionsEditor.jsx',
  'MediaLibraryEditor.jsx',
  'QuickCatalogControl.jsx'
];

let extractedLOC = 0;
let extractedComplexity = 0;
let extractedDebtScore = 0;

let currentAdminContent = null;

const top25 = data.sort((a, b) => b.debtScore - a.debtScore).slice(0, 25);

data.forEach(item => {
  totalLOC += item.loc;
  totalComplexity += item.cyclomaticComplexity;
  totalDebtScore += item.debtScore;
  
  if (item.file.includes('AdminContent.jsx')) {
    currentAdminContent = item;
  }
  
  const isExtracted = extractedNames.some(name => item.file.endsWith(name));
  if (isExtracted) {
    extractedLOC += item.loc;
    extractedComplexity += item.cyclomaticComplexity;
    extractedDebtScore += item.debtScore;
  }
});

// Calculate 'Before' Totals
// We know AdminContent before was: LOC 2725, Complexity 229, Debt 167.75
const oldAdminContent = { loc: 2725, comp: 229, debt: 167.75 };

const beforeLOC = totalLOC - currentAdminContent.loc - extractedLOC + oldAdminContent.loc;
const beforeComplexity = totalComplexity - currentAdminContent.cyclomaticComplexity - extractedComplexity + oldAdminContent.comp;
const beforeDebtScore = totalDebtScore - currentAdminContent.debtScore - extractedDebtScore + oldAdminContent.debt;

console.log('--- TOTALS ---');
console.log(`LOC: Before ${beforeLOC} | After ${totalLOC} | Delta ${totalLOC - beforeLOC}`);
console.log(`Complexity: Before ${beforeComplexity} | After ${totalComplexity} | Delta ${totalComplexity - beforeComplexity}`);
console.log(`Debt Score: Before ${beforeDebtScore.toFixed(2)} | After ${totalDebtScore.toFixed(2)} | Delta ${(totalDebtScore - beforeDebtScore).toFixed(2)}`);

const debtReductionPct = ((beforeDebtScore - totalDebtScore) / beforeDebtScore) * 100;
console.log(`Total Debt Reduction: ${debtReductionPct.toFixed(2)}%`);

console.log('\n--- NEW TOP 10 OFFENDERS ---');
top25.slice(0, 10).forEach((item, idx) => {
  console.log(`${idx + 1}. ${item.file.split(/[\\/]/).pop()} (Debt: ${item.debtScore.toFixed(2)}, LOC: ${item.loc}, Comp: ${item.cyclomaticComplexity})`);
});
