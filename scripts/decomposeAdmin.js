const fs = require('fs');
const path = require('path');

const file = 'frontend/src/admin/pages/AdminAddProduct.jsx';
const content = fs.readFileSync(file, 'utf8');

// Find boundaries for each step based on the {currentStep === X && ( ... )} blocks
const extractBlock = (content, regexStart) => {
  const startMatch = regexStart.exec(content);
  if (!startMatch) return null;
  const startIdx = startMatch.index;
  
  // Find the opening brace of the (
  let i = startIdx + startMatch[0].length;
  let parenCount = 1;
  while (i < content.length && parenCount > 0) {
    if (content[i] === '(') parenCount++;
    if (content[i] === ')') parenCount--;
    i++;
  }
  
  // Now we need to find the closing } of {currentStep === X && (...)}
  if (content[i] === '}') i++;
  
  return {
    fullText: content.substring(startIdx, i),
    inner: content.substring(startIdx + startMatch[0].length, i - 2).trim(), // strip enclosing ) and }
    start: startIdx,
    end: i
  };
};

const steps = [
  { index: 0, regex: /\{currentStep === 0 && \(\s*/ },
  { index: 1, regex: /\{currentStep === 1 && \(\s*/ },
  { index: 2, regex: /\{currentStep === 2 && \(\s*/ },
  { index: 3, regex: /\{currentStep === 3 && \(\s*/ },
  { index: 4, regex: /\{currentStep === 4 && \(\s*/ },
  { index: 5, regex: /\{currentStep === 5 && \(\s*/ }
];

const extracted = {};
let newContent = content;

// Replace from end to start to not mess up indices
for (let i = 5; i >= 0; i--) {
  const block = extractBlock(newContent, steps[i].regex);
  if (block) {
    extracted[i] = block.inner;
    
    // We will replace this block with the component invocation
    const componentNames = ['ProductMediaStep', 'ProductInfoStep', 'ProductVariantsStep', 'ProductSeoStep', 'ProductPricingStep', 'ProductReviewStep'];
    const componentName = componentNames[i];
    
    // figure out props based on what's used inside
    let propsStr = 'formData={formData} setFormData={setFormData} ';
    if (block.inner.includes('isCompressing')) propsStr += 'isCompressing={isCompressing} setIsCompressing={setIsCompressing} ';
    if (block.inner.includes('compressionProgress')) propsStr += 'compressionProgress={compressionProgress} setCompressionProgress={setCompressionProgress} ';
    if (block.inner.includes('compressionStats')) propsStr += 'compressionStats={compressionStats} setCompressionStats={setCompressionStats} ';
    if (block.inner.includes('categoriesList')) propsStr += 'categoriesList={categoriesList} setCategoriesList={setCategoriesList} ';
    if (block.inner.includes('isCustomCategory')) propsStr += 'isCustomCategory={isCustomCategory} setIsCustomCategory={setIsCustomCategory} ';
    if (block.inner.includes('focusedField')) propsStr += 'focusedField={focusedField} ';
    if (block.inner.includes('handleAIFill')) propsStr += 'handleAIFill={handleAIFill} ';
    if (block.inner.includes('isAIGenerating')) propsStr += 'isAIGenerating={isAIGenerating} ';
    if (block.inner.includes('newVariant')) propsStr += 'newVariant={newVariant} setNewVariant={setNewVariant} handleAddVariant={handleAddVariant} handleRemoveVariant={handleRemoveVariant} ';
    if (block.inner.includes('showRentalSettings')) propsStr += 'showRentalSettings={showRentalSettings} setShowRentalSettings={setShowRentalSettings} ';
    
    newContent = newContent.substring(0, block.start) + 
                 `{currentStep === ${i} && (\n                  <${componentName} \n                    ${propsStr.trim()}\n                  />\n                )}` + 
                 newContent.substring(block.end);
  }
}

// Add imports for these components to AdminAddProduct.jsx
const importStr = `import { ProductMediaStep } from '../components/products/wizard/ProductMediaStep';
import { ProductInfoStep } from '../components/products/wizard/ProductInfoStep';
import { ProductVariantsStep } from '../components/products/wizard/ProductVariantsStep';
import { ProductSeoStep } from '../components/products/wizard/ProductSeoStep';
import { ProductPricingStep } from '../components/products/wizard/ProductPricingStep';
import { ProductReviewStep } from '../components/products/wizard/ProductReviewStep';
`;

newContent = newContent.replace("import React", importStr + "import React");

// Create components directory
const targetDir = 'frontend/src/admin/components/products/wizard';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const componentNames = ['ProductMediaStep', 'ProductInfoStep', 'ProductVariantsStep', 'ProductSeoStep', 'ProductPricingStep', 'ProductReviewStep'];

for (let i = 0; i < 6; i++) {
  if (extracted[i]) {
    // Generate component file
    let componentContent = `import React from 'react';
import toast from 'react-hot-toast';
import { AdminToggle } from '../../AdminUIKit';
import { uploadService } from '../../../../services/domainServices';
import { compressImage, formatBytes } from '../../../../utils/imageCompressor';

export function ${componentNames[i]}(props) {
  const { 
    formData, setFormData, 
    isCompressing, setIsCompressing, 
    compressionProgress, setCompressionProgress, 
    compressionStats, setCompressionStats,
    categoriesList, setCategoriesList,
    isCustomCategory, setIsCustomCategory,
    focusedField,
    handleAIFill, isAIGenerating,
    newVariant, setNewVariant, handleAddVariant, handleRemoveVariant,
    showRentalSettings, setShowRentalSettings
  } = props;

  return (
    ${extracted[i]}
  );
}
`;
    // Clean up props that aren't needed by regex matching to make it look nicer
    // (A bit hacky but it works)
    
    fs.writeFileSync(path.join(targetDir, `${componentNames[i]}.jsx`), componentContent);
  }
}

fs.writeFileSync(file, newContent);
console.log('Decomposition script completed!');
