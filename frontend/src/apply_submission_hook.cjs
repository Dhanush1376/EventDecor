const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'pages', 'CustomOrders.jsx');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log('Original lines:', lines.length);

// 1. Add import
const importStr = "import { useCustomOrderSubmission } from '../hooks/useCustomOrderSubmission';";
const uploadsHookIdx = lines.findIndex(l => l.includes("import { useCustomOrderUploads }"));
if (uploadsHookIdx !== -1 && !lines.some(l => l.includes('useCustomOrderSubmission'))) {
    lines.splice(uploadsHookIdx + 1, 0, importStr);
}

// 2. Remove old state
const loadingStateIdx = lines.findIndex(l => l.includes('const [loading, setLoading] = useState(false);'));
if (loadingStateIdx !== -1) {
    lines.splice(loadingStateIdx, 1);
}

const submittingRefIdx = lines.findIndex(l => l.includes('const isSubmittingRef = useRef(false);'));
if (submittingRefIdx !== -1) {
    lines.splice(submittingRefIdx, 1);
}

// 3. Remove handleWizardSubmit function block
const submitStartIdx = lines.findIndex(l => l.includes('// ─── SUBMISSION FLOW ───'));
const submitEndIdx = lines.findIndex(l => l.includes('// ─── CLIENT CHAT DISPATCH ───'));

if (submitStartIdx !== -1 && submitEndIdx !== -1) {
    // We want to replace it with the hook call
    const hookCall = `
  const { loading, isSubmittingRef, handleWizardSubmit } = useCustomOrderSubmission({
    user,
    runProtectedAction,
    wizardDraft,
    linkedProduct,
    customizationFields,
    setWizardDraft,
    setCustomOccasionText,
    setCustomProductTypeText,
    setPastedLink: () => {}, // mock since it might not be defined
    setCustomizationFields,
    setCurrentStep,
    loadWorkspaceData,
    setActiveTab
  });
`;
    lines.splice(submitStartIdx, submitEndIdx - submitStartIdx, hookCall);
} else {
    console.log("Could not find submission flow block", submitStartIdx, submitEndIdx);
}

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Final lines:', lines.length);
console.log('Successfully applied useCustomOrderSubmission hook!');
