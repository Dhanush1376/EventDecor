const fs = require('fs');
const path = require('path');

const srcPath = 'frontend/src/admin/pages/AdminAddProduct.jsx';
const hooksDir = 'frontend/src/admin/hooks';

let content = fs.readFileSync(srcPath, 'utf8');
let lines = content.split('\n');

const subRange = [604, 742]; // Submission
const valRange = [528, 601]; // Validation
const aiRange = [173, 325]; // AI

// Extract Submission
const subLines = lines.slice(subRange[0], subRange[1] + 1);
const subContent = subLines.join('\n');
const useProductSubmission = `import { useState } from 'react';
import { productService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import logger from '../../../utils/logger';

export function useProductSubmission({ formData, setFormData, isEditMode, id, deleteDraft, queryClient, refreshProducts, handleSuccessAction, setIsLoading }) {
  const [newVariant, setNewVariant] = useState({ name: '', value: '', price: '', stock: '' });

${subContent}

  return { _swapPrimaryImage, handleAddVariant, handleRemoveVariant, handleSubmit, newVariant, setNewVariant };
}
`;
fs.writeFileSync(path.join(hooksDir, 'useProductSubmission.js'), useProductSubmission);

// Extract Validation
const valLines = lines.slice(valRange[0], valRange[1] + 1);
const valContent = valLines.join('\n');
const useProductValidation = `import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export function useProductValidation({ currentStep, setCurrentStep, formData, setFormData, WIZARD_STEPS, showAIHUD, handleCancelAction, setLastDraftSaved }) {
${valContent}

  return { getStepErrors, isStepValid, handleNext, handlePrev };
}
`;
fs.writeFileSync(path.join(hooksDir, 'useProductValidation.js'), useProductValidation);

// Extract AI
const aiLines = lines.slice(aiRange[0], aiRange[1] + 1);
const aiContent = aiLines.join('\n');
const useProductAI = `import { useState } from 'react';
import { productService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import logger from '../../../utils/logger';

export function useProductAI({ formData, setFormData, categoriesList, setCategoriesList, setCurrentStep }) {
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [showAIHUD, setShowAIHUD] = useState(false);
  const [aiChatInput, setAiChatInput] = useState('');
  const [isAILearning, setIsAILearning] = useState(false);
  const [_isApplyingFields, setIsApplyingFields] = useState(false);
  const [focusedField, setFocusedField] = useState('');

${aiContent}

  return { handleAIFill, handleAiChatSubmit, handleApplyAISpecs, isAIGenerating, aiAnalysisResult, setAiAnalysisResult, showAIHUD, setShowAIHUD, aiChatInput, setAiChatInput, isAILearning, focusedField };
}
`;
fs.writeFileSync(path.join(hooksDir, 'useProductAI.js'), useProductAI);

// Replacements in AdminAddProduct.jsx (Backwards)

// 1. Replace Submission
lines.splice(subRange[0], subRange[1] - subRange[0] + 1,
    `  const { _swapPrimaryImage, handleAddVariant, handleRemoveVariant, handleSubmit, newVariant, setNewVariant } = useProductSubmission({ formData, setFormData, isEditMode, id, deleteDraft, queryClient, refreshProducts, handleSuccessAction, setIsLoading });`
);

// 2. Replace Validation
lines.splice(valRange[0], valRange[1] - valRange[0] + 1,
    `  const { getStepErrors, isStepValid, handleNext, handlePrev } = useProductValidation({ currentStep, setCurrentStep, formData, setFormData, WIZARD_STEPS, showAIHUD, handleCancelAction, setLastDraftSaved });`
);

// 3. Replace AI
// Before replacing, I need to remove the original useStates for AI from lines 85-95.
// Let's replace the AI logic block first
lines.splice(aiRange[0], aiRange[1] - aiRange[0] + 1,
    `  const { handleAIFill, handleAiChatSubmit, handleApplyAISpecs, isAIGenerating, aiAnalysisResult, setAiAnalysisResult, showAIHUD, setShowAIHUD, aiChatInput, setAiChatInput, isAILearning, focusedField } = useProductAI({ formData, setFormData, categoriesList, setCategoriesList, setCurrentStep });`
);

// Remove the AI states (lines 85-95)
// Also remove `newVariant` at line 328 (which is now shifted)
// It's safer to just let the script run the block replacements, and then do string replacements for the `useState`s.

let newContent = lines.join('\n');
newContent = newContent.replace(/const \[isAIGenerating, setIsAIGenerating\] = useState\(false\);\n/g, '');
newContent = newContent.replace(/const \[aiAnalysisResult, setAiAnalysisResult\] = useState\(null\);\n/g, '');
newContent = newContent.replace(/const \[showAIHUD, setShowAIHUD\] = useState\(false\);\n/g, '');
newContent = newContent.replace(/const \[aiChatInput, setAiChatInput\] = useState\(''\);\n/g, '');
newContent = newContent.replace(/const \[isAILearning, setIsAILearning\] = useState\(false\);\n/g, '');
newContent = newContent.replace(/const \[_isApplyingFields, setIsApplyingFields\] = useState\(false\);\n/g, '');
newContent = newContent.replace(/const \[focusedField, setFocusedField\] = useState\(''\);\n/g, '');
newContent = newContent.replace(/\/\/ Variant input local state\n  const \[newVariant, setNewVariant\] = useState\(\{ name: '', value: '', price: '', stock: '' \}\);\n/g, '');

// Add imports
newContent = newContent.replace(`import { useDraft } from '../hooks/useDraft';`,
`import { useDraft } from '../hooks/useDraft';
import { useProductAI } from '../hooks/useProductAI';
import { useProductValidation } from '../hooks/useProductValidation';
import { useProductSubmission } from '../hooks/useProductSubmission';`);

fs.writeFileSync(srcPath, newContent);
console.log('Phase 3 Refactoring Complete.');
