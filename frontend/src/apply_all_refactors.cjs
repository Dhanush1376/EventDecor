const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'pages', 'CustomOrders.jsx');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log('Original lines:', lines.length);

// 1. Add imports
const importStr = `
import { CustomOrderWizard } from '../components/customOrders/CustomOrderWizard';
import { CustomOrderTracker } from '../components/customOrders/CustomOrderTracker';
import { useCustomOrderUploads } from '../hooks/useCustomOrderUploads';
`;

const optimizedImageIdx = lines.findIndex(l => l.includes("import { OptimizedImage }"));
if (optimizedImageIdx !== -1) {
    lines.splice(optimizedImageIdx, 0, importStr);
}

// 2. Replace states with hook
const stateStartIdx = lines.findIndex(l => l.includes('const [isUploading, setIsUploading]'));
if (stateStartIdx !== -1) {
    lines[stateStartIdx] = "  const { isUploading, uploadProgress, handleMoodUpload } = useCustomOrderUploads(wizardDraft, (updates) => setWizardDraft(prev => ({...prev, ...updates})));";
    // remove the next line (uploadProgress)
    lines.splice(stateStartIdx + 1, 1);
}

// 3. Remove handleMoodUpload definition
const uploadFnStartIdx = lines.findIndex(l => l.includes('// ─── IMAGE UPLOAD HANDLING ───'));
const uploadFnEndIdx = lines.findIndex(l => l.includes('// ─── SUBMISSION FLOW ───'));
if (uploadFnStartIdx !== -1 && uploadFnEndIdx !== -1) {
    lines.splice(uploadFnStartIdx, uploadFnEndIdx - uploadFnStartIdx);
}

// 4. Extract Wizard
const wizardStartIdx = lines.findIndex(l => l.includes('{/* ─── ACTIVE VIEW: MULTI-STEP REQUEST WIZARD ─── */}'));
const wizardEndIdx = lines.findIndex(l => l.includes('{/* ─── ACTIVE VIEW: CLIENT WORKSPACE TRACKING PORTAL ─── */}'));
if (wizardStartIdx !== -1 && wizardEndIdx !== -1) {
    const wizardReplacement = `
        {/* ─── ACTIVE VIEW: MULTI-STEP REQUEST WIZARD ─── */}
        {activeTab === 'wizard' && (
          <CustomOrderWizard 
            isAuthenticated={isAuthenticated}
            runProtectedAction={runProtectedAction}
            linkedProduct={linkedProduct}
            setLinkedProduct={setLinkedProduct}
            setActiveTab={setActiveTab}
            loadWorkspaceData={loadWorkspaceData}
            eventIdQuery={eventIdQuery}
          />
        )}
`;
    lines.splice(wizardStartIdx, wizardEndIdx - wizardStartIdx, wizardReplacement);
}

// 5. Extract Tracker
// Re-calculate since lines array changed
const trackerStartIdx = lines.findIndex(l => l.includes('{/* ─── ACTIVE VIEW: CLIENT WORKSPACE TRACKING PORTAL ─── */}'));
const trackerEndIdx = lines.findIndex((l, i) => i > trackerStartIdx && l.includes('      </main>'));
if (trackerStartIdx !== -1 && trackerEndIdx !== -1) {
    const trackerReplacement = `
        {/* ─── ACTIVE VIEW: CLIENT WORKSPACE TRACKING PORTAL ─── */}
        {activeTab === 'tracker' && (
          <CustomOrderTracker 
            selectedOrder={selectedOrder}
            setSelectedOrder={setSelectedOrder}
            myOrders={myOrders}
            mobileSubTab={mobileSubTab}
            setMobileSubTab={setMobileSubTab}
            handleQuotationDecision={handleQuotationDecision}
            handleWhatsAppConsult={handleWhatsAppConsult}
            isDirectImageUrl={isDirectImageUrl}
            chatMessage={chatMessage}
            setChatMessage={setChatMessage}
            handleSendChatMessage={handleSendChatMessage}
            isSendingMessage={isSendingMessage}
            chatEndRef={chatEndRef}
          />
        )}
`;
    lines.splice(trackerStartIdx, trackerEndIdx - trackerStartIdx, trackerReplacement);
}

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Final lines:', lines.length);
console.log('Successfully refactored CustomOrders.jsx!');
