const fs = require('fs');
const path = require('path');

const srcPath = 'frontend/src/admin/pages/AdminAddProduct.jsx';
const compDir = 'frontend/src/admin/components';

let content = fs.readFileSync(srcPath, 'utf8');
let lines = content.split('\n');

const overlayRange = [1571, 1833]; // lines 1572 to 1834 -> array indices 1571 to 1833
const previewRange = [1428, 1569]; // lines 1429 to 1570 -> array indices 1428 to 1569

// Extract Overlay
const overlayLines = lines.slice(overlayRange[0], overlayRange[1] + 1);
const overlayContent = overlayLines.join('\n');
const overlayComponent = `import React from 'react';

export function AiCurationOverlay({ showAIHUD, setShowAIHUD, aiAnalysisResult, aiChatInput, setAiChatInput, handleAiChatSubmit, isAILearning, handleApplyAISpecs }) {
  return (
    <>
${overlayContent}
    </>
  );
}
`;
fs.writeFileSync(path.join(compDir, 'AiCurationOverlay.jsx'), overlayComponent);

// Extract Preview
const previewLines = lines.slice(previewRange[0], previewRange[1] + 1);
const previewContent = previewLines.join('\n');
const previewComponent = `import React from 'react';

export function LivePreviewCard({ formData, mobileTab }) {
  return (
    <>
${previewContent}
    </>
  );
}
`;
fs.writeFileSync(path.join(compDir, 'LivePreviewCard.jsx'), previewComponent);

// Replace in main file (Backwards)
// 1. Replace Overlay
lines.splice(overlayRange[0], overlayRange[1] - overlayRange[0] + 1,
    `      <AiCurationOverlay showAIHUD={showAIHUD} setShowAIHUD={setShowAIHUD} aiAnalysisResult={aiAnalysisResult} aiChatInput={aiChatInput} setAiChatInput={setAiChatInput} handleAiChatSubmit={handleAiChatSubmit} isAILearning={isAILearning} handleApplyAISpecs={handleApplyAISpecs} />`
);

// 2. Replace Preview
lines.splice(previewRange[0], previewRange[1] - previewRange[0] + 1,
    `        <LivePreviewCard formData={formData} mobileTab={mobileTab} />`
);

// Add Imports
const imports = `import { LivePreviewCard } from '../components/LivePreviewCard';
import { AiCurationOverlay } from '../components/AiCurationOverlay';`;

lines.splice(6, 0, imports);

fs.writeFileSync(srcPath, lines.join('\n'));
console.log('Phase 2 Refactoring Complete.');
