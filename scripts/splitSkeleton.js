const fs = require('fs');
const path = require('path');

const file = 'frontend/src/components/ui/Skeleton.jsx';
const content = fs.readFileSync(file, 'utf8');

const domains = {
  ProductSkeletons: ['ProductListSkeleton', 'ProductCardSkeleton', 'ProductDetailSkeleton', 'CategorySkeleton', 'RecommendationSkeleton', 'RecommendationGridSkeleton'],
  CartCheckoutSkeletons: ['CartSkeleton', 'CartItemSkeleton', 'CheckoutStepSkeleton', 'CheckoutSidebarSkeleton', 'AddressSkeleton', 'PaymentSkeleton', 'OrderSuccessSkeleton', 'OrderTrackingSkeleton', 'OrderCardSkeleton', 'OrdersListSkeleton'],
  EventSkeletons: ['EventCollectionsSkeleton', 'EventShowcasesSkeleton', 'EventDetailSkeleton', 'BookingWizardSkeleton'],
  PageSkeletons: ['HomeSkeleton', 'HeroSkeleton', 'NavigationHubSkeleton', 'BestsellerSkeleton', 'StorySkeleton', 'CollectionSkeleton', 'WishlistPageSkeleton', 'BlogListingSkeleton', 'BlogPostSkeleton', 'LocationLandingSkeleton', 'AboutSkeleton', 'ContactSkeleton', 'GallerySkeleton', 'GalleryDetailSkeleton', 'CustomOrdersSkeleton', 'DashboardSkeleton', 'FAQSkeleton', 'LoyaltySkeleton', 'AuthSkeleton'],
  CommonSkeletons: ['AddressBarSkeleton', 'ReviewsSkeleton', 'SearchSuggestionsSkeleton', 'NavbarSkeleton', 'ProfileSkeleton', 'ChatSkeleton', 'GridSkeleton', 'TableSkeleton', 'ModalSkeleton']
};

const components = {};

const parts = content.split(/^export function /gm);
for (let i = 1; i < parts.length; i++) {
  const part = parts[i];
  const nameMatch = part.match(/^([A-Za-z0-9_]+)/);
  if (nameMatch) {
    const name = nameMatch[1];
    
    // Grab the comment preceding this if any
    let comment = '';
    const precedingPart = parts[i-1];
    const lines = precedingPart.split('\n');
    let j = lines.length - 2;
    while(j >= 0 && lines[j].trim().startsWith('//')) {
      comment = lines[j] + '\n' + comment;
      j--;
    }
    
    // We just take the whole part up to the end of the file or next function.
    // wait, the part might have trailing comments for the *next* function.
    // So we strip any trailing comments that belong to the next function.
    let functionBody = 'export function ' + part;
    const bodyLines = functionBody.split('\n');
    let k = bodyLines.length - 1;
    while(k > 0 && (bodyLines[k].trim() === '' || bodyLines[k].trim().startsWith('//'))) {
      k--;
    }
    
    components[name] = comment + bodyLines.slice(0, k + 1).join('\n');
  }
}

// Ensure the directory exists
const targetDir = 'frontend/src/components/ui/skeletons';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Write domains
for (const [domain, list] of Object.entries(domains)) {
  const importsNeeded = new Set();
  let fileContent = `import React from 'react';\nimport { Skeleton } from '../SkeletonBase';\n\n`;
  
  for (const name of list) {
    if (components[name]) {
      for (const [otherDomain, otherList] of Object.entries(domains)) {
        if (otherDomain !== domain) {
          for (const otherName of otherList) {
            // Very naive check for component usage: <OtherSkeleton
            if (components[name].includes(`<${otherName}`)) {
              importsNeeded.add(`import { ${otherName} } from './${otherDomain}';`);
            }
          }
        }
      }
      fileContent += components[name] + '\n\n';
    }
  }
  
  if (importsNeeded.size > 0) {
    fileContent = `import React from 'react';\nimport { Skeleton } from '../SkeletonBase';\n` + 
                  Array.from(importsNeeded).join('\n') + '\n\n' + fileContent.substring(fileContent.indexOf('\n\n') + 2);
  }
  
  fs.writeFileSync(path.join(targetDir, `${domain}.jsx`), fileContent);
}

// Now rewrite Skeleton.jsx
let barrelContent = `// Auto-generated barrel file after decomposition\nimport { Skeleton } from './SkeletonBase';\nexport { Skeleton };\n\n`;
for (const [domain, list] of Object.entries(domains)) {
  const existingList = list.filter(n => components[n]);
  if (existingList.length > 0) {
    barrelContent += `export {\n  ${existingList.join(',\n  ')}\n} from './skeletons/${domain}';\n`;
  }
}

fs.writeFileSync(file, barrelContent);
console.log('Decomposition complete!');
