const fs = require('fs');

const code = fs.readFileSync('frontend/src/admin/pages/AdminContent.jsx', 'utf-8');

const componentNames = [
  'AISparkButton',
  'HomePageControllerEditor',
  'GalleryPortfolioEditor',
  'AboutPageDetailsEditor',
  'ShopPageEditor',
  'EventsPageEditor',
  'ContactInfoEditor',
  'CustomOrdersEditor',
  'FAQEditor',
  'SEOCenterEditor',
  'AnnouncementBarEditor',
  'NavigationFooterEditor',
  'PublisherVersionsEditor',
  'MediaLibraryEditor',
  'QuickCatalogControl'
];

const results = {};

componentNames.forEach(comp => {
  // Find function body
  const regex = new RegExp(`function ${comp}\\s*\\((.*?)\\)\\s*{([\\s\\S]*?)^}`, 'gm');
  let match = null;
  // Since some components are large and might have nested functions ending in `}`, we need a smarter parser
  // Instead, let's just do a basic string search using index
});

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

  return { props, body };
}

componentNames.forEach(comp => {
  const data = parseComponent(code, comp);
  if (!data) return;

  const { props, body } = data;

  const stateAccessed = [];
  if (body.includes('useState(')) stateAccessed.push('useState');
  if (body.includes('useEffect(')) stateAccessed.push('useEffect');
  
  const contextsUsed = [];
  if (body.includes('useAdmin(')) contextsUsed.push('useAdmin');
  if (body.includes('useDraft(')) contextsUsed.push('useDraft');

  const apiCalls = [];
  if (body.includes('cmsService.')) apiCalls.push('cmsService');
  if (body.includes('couponService.')) apiCalls.push('couponService');
  if (body.includes('productService.')) apiCalls.push('productService');
  if (body.includes('galleryService.')) apiCalls.push('galleryService');

  const helpersUsed = [];
  if (body.includes('cleanSignatureImg')) helpersUsed.push('cleanSignatureImg');
  if (body.includes('toast')) helpersUsed.push('toast');
  if (body.includes('logger')) helpersUsed.push('logger');
  if (body.includes('DEFAULT_SPECIALIZATIONS')) helpersUsed.push('DEFAULT_SPECIALIZATIONS');
  if (body.includes('PLACEHOLDER_IMAGES')) helpersUsed.push('PLACEHOLDER_IMAGES');

  // Find sub-components used
  const componentsUsed = [];
  ['ImageUpload', 'SectionHeader', 'AdminField', 'AdminInput', 'AdminTextarea', 'AdminToggle', 'AISparkButton'].forEach(c => {
    if (body.includes(`<${c}`) && c !== comp) componentsUsed.push(c);
  });

  results[comp] = {
    props: props.replace(/[{}]/g, '').trim(),
    stateAccessed,
    contextsUsed,
    apiCalls,
    helpersUsed,
    componentsUsed
  };
});

let md = `# AdminContent.jsx Dependency Map\n\n`;

md += `## Component Analysis\n\n`;

for (const comp in results) {
  const data = results[comp];
  md += `### \`${comp}\`\n`;
  md += `- **Props received**: ${data.props || 'None'}\n`;
  md += `- **React Hooks used**: ${data.stateAccessed.length > 0 ? data.stateAccessed.join(', ') : 'None'}\n`;
  md += `- **Contexts used**: ${data.contextsUsed.length > 0 ? data.contextsUsed.join(', ') : 'None'}\n`;
  md += `- **Service/API calls used**: ${data.apiCalls.length > 0 ? data.apiCalls.join(', ') : 'None'}\n`;
  md += `- **Shared helpers used**: ${data.helpersUsed.length > 0 ? data.helpersUsed.join(', ') : 'None'}\n`;
  md += `- **Sub-components used**: ${data.componentsUsed.length > 0 ? data.componentsUsed.join(', ') : 'None'}\n\n`;
}

// Logic to identify tiers
md += `## Safe Extraction Order\n\n`;

const completelyIndependent = [];
const tier1 = [];
const tier2 = [];
const tier3 = [];

for (const comp in results) {
  const data = results[comp];
  
  if (data.contextsUsed.length === 0 && data.apiCalls.length === 0 && data.helpersUsed.length === 0) {
    completelyIndependent.push(comp);
    tier1.push(comp);
  } else if (data.contextsUsed.length === 0 && data.apiCalls.length === 0) {
    // Only uses helpers/props
    tier1.push(comp);
  } else if (data.contextsUsed.length > 0 || data.apiCalls.length > 0) {
    // Uses context or direct API call
    tier2.push(comp);
  }
}

// Anything not in tier1/2 is tier3
// Wait, we need to specifically check for shared state or complex orchestration
tier3.push('AdminContent'); // Main orchestrator
tier3.push('HomePageControllerEditor'); // Historically complex

md += `### Tier 1 (Very Safe)\n`;
md += `*Components that rely exclusively on passed props or simple imported helpers. No context or external API calls.*\n\n`;
tier1.forEach(c => md += `- ${c}\n`);
md += `\n`;

md += `### Tier 2 (Moderate Risk)\n`;
md += `*Components that import context (e.g. \`useAdmin\`) or make direct service API calls. Requires ensuring the new file imports the necessary services correctly.*\n\n`;
tier2.forEach(c => {
  if (c !== 'HomePageControllerEditor') {
    md += `- ${c}\n`;
  }
});
md += `\n`;

md += `### Tier 3 (Requires Coordination)\n`;
md += `*Components that have complex state sharing, heavy data fetching, or act as orchestrators.*\n\n`;
md += `- HomePageControllerEditor (Heavy dynamic imports and complex internal states)\n`;
md += `- AdminContent (Main Orchestrator)\n\n`;


fs.writeFileSync('C:\\Users\\Dhanush\\.gemini\\antigravity-ide\\brain\\650e426d-3682-4170-87a7-92d349a1b4db\\admin_content_dependency_map.md', md);

const meta = { ArtifactType: 'other', RequestFeedback: false, Summary: 'Dependency map analysis of internal components in AdminContent.jsx' };
fs.writeFileSync('C:\\Users\\Dhanush\\.gemini\\antigravity-ide\\brain\\650e426d-3682-4170-87a7-92d349a1b4db\\.artifact_metadata.json', JSON.stringify(meta));
