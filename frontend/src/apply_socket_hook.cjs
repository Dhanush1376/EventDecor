const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'pages', 'CustomOrders.jsx');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log('Original lines:', lines.length);

// 1. Add import
const importStr = "import { useOrderSocketTracker } from '../hooks/useOrderSocketTracker';";
const submissionHookIdx = lines.findIndex(l => l.includes("import { useCustomOrderSubmission }"));
if (submissionHookIdx !== -1 && !lines.some(l => l.includes('useOrderSocketTracker'))) {
    lines.splice(submissionHookIdx + 1, 0, importStr);
}

// 2. Remove socket useEffect block
const socketStartIdx = lines.findIndex(l => l.includes('// ─── Socket Events for Tracker ───'));
// Find the next section which is `// ─── CLIENT CHAT DISPATCH ───` or similar
const socketEndIdx = lines.findIndex((l, i) => i > socketStartIdx && (l.includes('// ─── CLIENT CHAT DISPATCH ───') || l.includes('const { loading')));

if (socketStartIdx !== -1 && socketEndIdx !== -1) {
    // We want to replace the socket logic with the hook call
    const hookCall = `
  useOrderSocketTracker({
    socket,
    activeTab,
    selectedOrder,
    setSelectedOrder,
    loadWorkspaceData
  });
`;
    lines.splice(socketStartIdx, socketEndIdx - socketStartIdx, hookCall);
} else {
    console.log("Could not find socket flow block", socketStartIdx, socketEndIdx);
}

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Final lines:', lines.length);
console.log('Successfully applied useOrderSocketTracker hook!');
