const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/CustomOrders.jsx');
let code = fs.readFileSync(filePath, 'utf-8');

// 1. Add imports
const imports = `
import { CustomOrderTracker } from '../components/customOrders/CustomOrderTracker';
import { CustomOrderWizard } from '../components/customOrders/CustomOrderWizard';
`;
code = code.replace("import DynamicCustomOrderWizard from '../components/customOrders/Wizard/DynamicCustomOrderWizard';", imports);
// Remove ProductSummaryCard import since it's now in CustomOrderWizard
code = code.replace("import { ProductSummaryCard } from '../components/product/ProductSummaryCard';", "");

// 2. Replace Wizard block (lines 778 to 839)
// Let's find it by substring to be perfectly safe, since line numbers might shift.
const wizardStartStr = `{/* ─── ACTIVE VIEW: MULTI-STEP REQUEST WIZARD ─── */}`;
const wizardEndStr = `        {/* ─── ACTIVE VIEW: CLIENT WORKSPACE TRACKING PORTAL ─── */}`;

const wizardStartIndex = code.indexOf(wizardStartStr);
const wizardEndIndex = code.indexOf(wizardEndStr);

if (wizardStartIndex !== -1 && wizardEndIndex !== -1) {
  // Extract the exact block to replace
  const wizardBlock = code.substring(wizardStartIndex, wizardEndIndex);
  
  const newWizardBlock = `${wizardStartStr}
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
  code = code.replace(wizardBlock, newWizardBlock);
}

// 3. Replace Tracker block (which is right after Wizard)
const trackerStartStr = `{/* ─── ACTIVE VIEW: CLIENT WORKSPACE TRACKING PORTAL ─── */}`;
const trackerEndStr = `      </main>
    </div>
  );
}`;

const trackerStartIndex = code.indexOf(trackerStartStr);
const trackerEndIndex = code.indexOf(trackerEndStr);

if (trackerStartIndex !== -1 && trackerEndIndex !== -1) {
  const trackerBlock = code.substring(trackerStartIndex, trackerEndIndex);
  
  const newTrackerBlock = `${trackerStartStr}
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
  code = code.replace(trackerBlock, newTrackerBlock);
}

fs.writeFileSync(filePath, code);
console.log('Successfully applied Wizard and Tracker replacements!');
