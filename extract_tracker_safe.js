const fs = require('fs');
const path = require('path');

const filePath = 'frontend/src/pages/CustomOrders.jsx';
const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

const targetDir = 'frontend/src/components/customOrders';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Lines 843 to 1279 are index 842 to 1278
const trackerLines = lines.slice(842, 1279);
const trackerJSX = trackerLines.join('\n');

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
${trackerJSX}
  );
}
`;

fs.writeFileSync(path.join(targetDir, 'CustomOrderTracker.jsx'), trackerFileContent);

// Replace lines 842 to 1278 with the component call
const before = lines.slice(0, 842);
const after = lines.slice(1279);

const componentCall = `          <CustomOrderTracker 
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
          />`;

let newCode = before.join('\n') + '\n' + componentCall + '\n' + after.join('\n');

const imports = `import { CustomOrderTracker } from '../components/customOrders/CustomOrderTracker';\nimport { OptimizedImage } from '../components/ui/OptimizedImage';`;
newCode = newCode.replace("import { OptimizedImage } from '../components/ui/OptimizedImage';", imports);

fs.writeFileSync(filePath, newCode);
console.log('CustomOrderTracker extracted successfully via strict line numbers.');
