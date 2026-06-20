const fs = require('fs');
const path = require('path');

const srcPath = 'frontend/src/admin/pages/AdminAddProduct.jsx';
const stepsDir = 'frontend/src/admin/pages/steps';

if (!fs.existsSync(stepsDir)) {
    fs.mkdirSync(stepsDir, { recursive: true });
}

let content = fs.readFileSync(srcPath, 'utf8');
let lines = content.split('\n');

// Phase 1 Ranges
const pricingRange = [1766, 2354]; // 0-indexed, so 1767 is 1766
const infoRange = [1256, 1560];
const mediaRange = [990, 1255];

// Extract Pricing
const pricingLines = lines.slice(pricingRange[0], pricingRange[1] + 1);
const pricingContent = pricingLines.join('\n');
const pricingComponent = `import React from 'react';
import { AdminToggle } from '../../components/AdminUIKit';

export function ProductPricingStep({ formData, setFormData, showRentalSettings, setShowRentalSettings }) {
  return (
    <>
${pricingContent}
    </>
  );
}
`;
fs.writeFileSync(path.join(stepsDir, 'ProductPricingStep.jsx'), pricingComponent);

// Extract Info
const infoLines = lines.slice(infoRange[0], infoRange[1] + 1);
const infoContent = infoLines.join('\n');
const infoComponent = `import React from 'react';
import { AdminToggle } from '../../components/AdminUIKit';

export function ProductInfoStep({ formData, setFormData, categoriesList, isAIGenerating, isCustomCategory, setIsCustomCategory, focusedField, handleAIFill }) {
  return (
    <>
${infoContent}
    </>
  );
}
`;
fs.writeFileSync(path.join(stepsDir, 'ProductInfoStep.jsx'), infoComponent);

// Extract Media
const mediaLines = lines.slice(mediaRange[0], mediaRange[1] + 1);
const mediaContent = mediaLines.join('\n');
const mediaComponent = `import React from 'react';
import { uploadService } from '../../../services/domainServices';
import { compressImage, formatBytes } from '../../../utils/imageCompressor';
import toast from 'react-hot-toast';

export function ProductMediaStep({ formData, setFormData, isCompressing, setIsCompressing, compressionProgress, setCompressionProgress, compressionStats, setCompressionStats }) {
  return (
    <>
${mediaContent}
    </>
  );
}
`;
fs.writeFileSync(path.join(stepsDir, 'ProductMediaStep.jsx'), mediaComponent);

// Replace in main file (Backwards to not mess up indices)
// 1. Replace Pricing
lines.splice(pricingRange[0], pricingRange[1] - pricingRange[0] + 1,
    `                {/* STEP 5: PRICING & STOCK */}`,
    `                {currentStep === 4 && (`,
    `                  <ProductPricingStep formData={formData} setFormData={setFormData} showRentalSettings={showRentalSettings} setShowRentalSettings={setShowRentalSettings} />`,
    `                )}`
);

// 2. Replace Info
lines.splice(infoRange[0], infoRange[1] - infoRange[0] + 1,
    `                {/* STEP 2: CORE DETAILS */}`,
    `                {currentStep === 1 && (`,
    `                  <ProductInfoStep formData={formData} setFormData={setFormData} categoriesList={categoriesList} isAIGenerating={isAIGenerating} isCustomCategory={isCustomCategory} setIsCustomCategory={setIsCustomCategory} focusedField={focusedField} handleAIFill={handleAIFill} />`,
    `                )}`
);

// 3. Replace Media
lines.splice(mediaRange[0], mediaRange[1] - mediaRange[0] + 1,
    `                {/* STEP 1: MEDIA */}`,
    `                {currentStep === 0 && (`,
    `                  <ProductMediaStep formData={formData} setFormData={setFormData} isCompressing={isCompressing} setIsCompressing={setIsCompressing} compressionProgress={compressionProgress} setCompressionProgress={setCompressionProgress} compressionStats={compressionStats} setCompressionStats={setCompressionStats} />`,
    `                )}`
);

// Add Imports
const imports = `import { ProductMediaStep } from './steps/ProductMediaStep';
import { ProductInfoStep } from './steps/ProductInfoStep';
import { ProductPricingStep } from './steps/ProductPricingStep';`;

lines.splice(2, 0, imports);

fs.writeFileSync(srcPath, lines.join('\n'));
console.log('Phase 1 Refactoring Complete.');
