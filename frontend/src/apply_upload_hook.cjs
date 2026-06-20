const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'pages', 'CustomOrders.jsx');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!code.includes('useCustomOrderUploads')) {
  code = code.replace(
    "import { useProduct } from '../hooks/useProductQueries';",
    "import { useProduct } from '../hooks/useProductQueries';\nimport { useCustomOrderUploads } from '../hooks/useCustomOrderUploads';"
  );
}

// 2. Replace state variables with hook
code = code.replace(
  "  const [isUploading, setIsUploading] = useState(false);\n  const [uploadProgress, setUploadProgress] = useState(0);",
  "  const { isUploading, uploadProgress, handleMoodUpload } = useCustomOrderUploads(wizardDraft, (updates) => setWizardDraft(prev => ({ ...prev, ...updates })));"
);

// 3. Remove handleMoodUpload definition
const startStr = "  // ─── IMAGE UPLOAD HANDLING ───";
const endStr = "  };\n\n  // ─── SUBMISSION FLOW ───";
const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  code = code.slice(0, startIndex) + "  // ─── SUBMISSION FLOW ───" + code.slice(endIndex + endStr.length - "  // ─── SUBMISSION FLOW ───".length);
} else {
  console.log("Could not find handleMoodUpload definition");
}

fs.writeFileSync(filePath, code);
console.log("Successfully extracted useCustomOrderUploads");
