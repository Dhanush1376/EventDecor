const fs = require('fs');
const path = require('path');

const filePath = 'frontend/src/pages/CustomOrders.jsx';
let code = fs.readFileSync(filePath, 'utf-8');

const targetDir = 'frontend/src/components/customOrders';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// CustomOrderTracker is the entire tracker div
const trackerStartStr = '{/* ─── ACTIVE VIEW: CLIENT WORKSPACE TRACKING PORTAL ─── */}';
const trackerEndStr = '      </main>\n    </div>';
const trackerStart = code.indexOf(trackerStartStr);
const trackerEnd = code.indexOf(trackerEndStr);

let trackerJSX = code.substring(trackerStart, trackerEnd).trim();

// The JSX is currently:
// {/* ─── ACTIVE VIEW: CLIENT WORKSPACE TRACKING PORTAL ─── */}
// {activeTab === 'tracker' && (
//   <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
//     ...
//   </div>
// )}
// We just want to extract the inner <div className="grid ...">

const innerStart = trackerJSX.indexOf('<div className="grid');
const innerEnd = trackerJSX.lastIndexOf('</div>') + 6;
const innerJSX = trackerJSX.substring(innerStart, innerEnd);

const trackerFileContent = `import React from 'react';
import { OptimizedImage } from '../ui/OptimizedImage';

export function CustomOrderTracker({
  selectedOrder,
  setSelectedOrder,
  myOrders,
  mobileSubTab,
  setMobileSubTab,
  handleQuotationDecision,
  handleWhatsAppConsult,
  isDirectImageUrl,
  chatMessage,
  setChatMessage,
  handleSendChatMessage,
  isSendingMessage,
  chatEndRef
}) {
  return (
    ${innerJSX}
  );
}
`;

fs.writeFileSync(path.join(targetDir, 'CustomOrderTracker.jsx'), trackerFileContent);

// Replace in CustomOrders.jsx
code = code.replace(innerJSX, `<CustomOrderTracker 
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
          />`);

const imports = `import { CustomOrderTracker } from '../components/customOrders/CustomOrderTracker';
`;
code = code.replace("import { OptimizedImage } from '../components/ui/OptimizedImage';", imports);

fs.writeFileSync(filePath, code);
console.log('CustomOrderTracker extracted successfully.');
