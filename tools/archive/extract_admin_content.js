const fs = require('fs');
const path = require('path');

const filePath = 'frontend/src/admin/pages/AdminContent.jsx';
const code = fs.readFileSync(filePath, 'utf-8');
const targetDir = 'frontend/src/admin/components/cms';

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

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

// Helper to determine what imports to prepend based on usage
function getImportsForComponent(body) {
  const imports = [
    `import React, { useState, useEffect } from 'react';`,
  ];
  
  const uiKitUsed = [];
  if (body.includes('<SectionHeader')) uiKitUsed.push('SectionHeader');
  if (body.includes('<AdminField')) uiKitUsed.push('AdminField');
  if (body.includes('<AdminInput')) uiKitUsed.push('AdminInput');
  if (body.includes('<AdminTextarea')) uiKitUsed.push('AdminTextarea');
  if (body.includes('<AdminToggle')) uiKitUsed.push('AdminToggle');
  
  if (uiKitUsed.length > 0) {
    imports.push(`import { ${uiKitUsed.join(', ')} } from '../AdminUIKit';`);
  }
  
  if (body.includes('<ImageUpload')) {
    imports.push(`import { ImageUpload } from '../ImageUpload';`);
  }
  
  if (body.includes('useAdmin(')) {
    imports.push(`import { useAdmin } from '../../context/AdminContext';`);
  }
  
  if (body.includes('toast.')) {
    imports.push(`import toast from 'react-hot-toast';`);
  }
  
  if (body.includes('logger.')) {
    imports.push(`import logger from '../../../utils/logger';`);
  }
  
  if (body.includes('cmsService.')) {
    imports.push(`import { cmsService } from '../../../services/domainServices';`);
  }

  const constantsUsed = [];
  if (body.includes('DEFAULT_SPECIALIZATIONS')) constantsUsed.push('DEFAULT_SPECIALIZATIONS');
  if (body.includes('PLACEHOLDER_IMAGES')) constantsUsed.push('PLACEHOLDER_IMAGES');
  if (constantsUsed.length > 0) {
    imports.push(`import { ${constantsUsed.join(', ')} } from '../../../constants/placeholderImages';`);
  }
  
  // Custom helpers embedded in the file
  if (body.includes('cleanSignatureImg')) {
    // We will extract cleanSignatureImg to a local helper or export it from a utils file.
    // For safety, let's inject it directly into the component file if used.
    imports.push(`
const cleanSignatureImg = (imgUrl, founderName) => {
  if (
    !imgUrl ||
    imgUrl.includes('unsplash.com') ||
    imgUrl === '' ||
    imgUrl.includes('images.unsplash.com')
  ) {
    const svg = \`<svg xmlns="http://www.w3.org/2000/svg" width="250" height="80" viewBox="0 0 250 80"><defs><style>@import url('https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap');.sig { font-family: 'Alex Brush', cursive; font-size: 42px; fill: %231a1a1a; }</style></defs><text x="25" y="52" class="sig">\${founderName}</text></svg>\`;
    return \`data:image/svg+xml;utf8,\${encodeURIComponent(svg)}\`;
  }
  return imgUrl;
};`);
  }
  
  return imports.join('\n');
}

let modifiedCode = code;

componentNames.forEach(comp => {
  const startStr = `function ${comp}(`;
  const startIndex = code.indexOf(startStr);
  if (startIndex === -1) return;

  const propsEnd = code.indexOf(')', startIndex);
  const bodyStart = code.indexOf('{', propsEnd);
  
  let openBraces = 1;
  let curr = bodyStart + 1;
  while (openBraces > 0 && curr < code.length) {
    if (code[curr] === '{') openBraces++;
    if (code[curr] === '}') openBraces--;
    curr++;
  }
  
  const componentCode = code.substring(startIndex, curr);
  
  // Add export
  let finalComponentCode = componentCode.replace(`function ${comp}`, `export function ${comp}`);
  
  // Handle AISparkButton dependency if another component uses it
  let fileImports = getImportsForComponent(componentCode);
  if (componentCode.includes('<AISparkButton') && comp !== 'AISparkButton') {
    fileImports += `\nimport { AISparkButton } from './AISparkButton';`;
  }
  
  if (comp === 'AboutPageDetailsEditor' && !componentCode.includes('DEFAULT_FEATURES')) {
      // Need to grab DEFAULT_FEATURES
      fileImports += `\nconst DEFAULT_FEATURES = [
  {
    icon: 'verified',
    title: 'Authentic Heritage',
    desc: 'Rooted in timeless cultural traditions.',
  },
  {
    icon: 'diamond',
    title: 'Premium Materials',
    desc: 'Only the finest textures and finishes.',
  },
  {
    icon: 'handshake',
    title: 'Trusted Expertise',
    desc: 'Decades of masterful craftsmanship.',
  },
];`;
  }

  const fileContent = `${fileImports}\n\n${finalComponentCode}\n`;
  
  fs.writeFileSync(path.join(targetDir, `${comp}.jsx`), fileContent);
  console.log(`Extracted ${comp}.jsx`);
  
  // Remove component from original code
  modifiedCode = modifiedCode.replace(componentCode, '');
});

// Now we prepend the imports of these components in AdminContent.jsx
const importStatements = componentNames.map(c => `import { ${c} } from '../components/cms/${c}';`).join('\n');

// Find the import section in AdminContent.jsx and inject the new imports
const importTargetStr = `import { SkeletonDashboard, AdminToggle, SectionHeader, AdminField, AdminInput, AdminTextarea, PublishBar } from '../components/AdminUIKit';`;
modifiedCode = modifiedCode.replace(importTargetStr, `${importTargetStr}\n${importStatements}`);

// Remove cleanSignatureImg and DEFAULT_FEATURES from AdminContent since they are moved/local
modifiedCode = modifiedCode.replace(/const cleanSignatureImg = [\s\S]*?return imgUrl;\n};\n/, '');
modifiedCode = modifiedCode.replace(/const DEFAULT_FEATURES = [\s\S]*?\];\n/, '');


fs.writeFileSync(filePath, modifiedCode);
console.log('Updated AdminContent.jsx');
