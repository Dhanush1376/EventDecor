const fs = require('fs');
const path = require('path');

const filePath = 'frontend/src/components/customOrders/CustomOrderTracker.jsx';
const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

const targetDir = 'frontend/src/components/customOrders';

// OrderList
const orderListLines = lines.slice(21, 94);
fs.writeFileSync(path.join(targetDir, 'OrderList.jsx'), `import React from 'react';

export function OrderList({ myOrders, selectedOrder, setSelectedOrder }) {
  return (
${orderListLines.join('\n')}
  );
}
`);

// OrderTimeline
const orderTimelineLines = lines.slice(182, 231);
fs.writeFileSync(path.join(targetDir, 'OrderTimeline.jsx'), `import React from 'react';

export function OrderTimeline({ selectedOrder }) {
  return (
${orderTimelineLines.join('\n')}
  );
}
`);

// QuotationEstimateCard
const quoteLines = lines.slice(233, 320);
fs.writeFileSync(path.join(targetDir, 'QuotationEstimateCard.jsx'), `import React from 'react';

export function QuotationEstimateCard({ selectedOrder, handleQuotationDecision }) {
  return (
    <>
${quoteLines.join('\n')}
    </>
  );
}
`);

// OrderMediaGallery
const mediaLines = lines.slice(331, 385);
fs.writeFileSync(path.join(targetDir, 'OrderMediaGallery.jsx'), `import React from 'react';
import { OptimizedImage } from '../ui/OptimizedImage';

export function OrderMediaGallery({ selectedOrder, isDirectImageUrl }) {
  return (
    <>
${mediaLines.join('\n')}
    </>
  );
}
`);

// OrderChatFeed
const chatLines = lines.slice(387, 452);
fs.writeFileSync(path.join(targetDir, 'OrderChatFeed.jsx'), `import React from 'react';

export function OrderChatFeed({ selectedOrder, mobileSubTab, chatMessage, setChatMessage, handleSendChatMessage, isSendingMessage, chatEndRef }) {
  return (
${chatLines.join('\n')}
  );
}
`);

// Replace in CustomOrderTracker.jsx
let newLines = [];
let i = 0;
while (i < lines.length) {
  if (i === 21) {
    newLines.push(`            <OrderList myOrders={myOrders} selectedOrder={selectedOrder} setSelectedOrder={setSelectedOrder} />`);
    i = 94; // Skip to end of OrderList
  } else if (i === 182) {
    newLines.push(`                      <OrderTimeline selectedOrder={selectedOrder} />`);
    i = 231; // Skip to end of OrderTimeline
  } else if (i === 233) {
    newLines.push(`                      <QuotationEstimateCard selectedOrder={selectedOrder} handleQuotationDecision={handleQuotationDecision} />`);
    i = 320; // Skip to end of QuotationEstimateCard
  } else if (i === 331) {
    newLines.push(`                      <OrderMediaGallery selectedOrder={selectedOrder} isDirectImageUrl={isDirectImageUrl} />`);
    i = 385; // Skip to end of OrderMediaGallery
  } else if (i === 387) {
    newLines.push(`                    <OrderChatFeed \n                      selectedOrder={selectedOrder}\n                      mobileSubTab={mobileSubTab}\n                      chatMessage={chatMessage}\n                      setChatMessage={setChatMessage}\n                      handleSendChatMessage={handleSendChatMessage}\n                      isSendingMessage={isSendingMessage}\n                      chatEndRef={chatEndRef}\n                    />`);
    i = 452; // Skip to end of OrderChatFeed
  } else {
    newLines.push(lines[i]);
    i++;
  }
}

let newCode = newLines.join('\n');

const imports = `import { OrderList } from './OrderList';
import { OrderTimeline } from './OrderTimeline';
import { QuotationEstimateCard } from './QuotationEstimateCard';
import { OrderMediaGallery } from './OrderMediaGallery';
import { OrderChatFeed } from './OrderChatFeed';
`;
newCode = newCode.replace("import React from 'react';", "import React from 'react';\n" + imports);

// We no longer need OptimizedImage here because OrderMediaGallery imports it
newCode = newCode.replace("import { OptimizedImage } from '../ui/OptimizedImage';\n", "");

fs.writeFileSync(filePath, newCode);
console.log('Sub-components extracted successfully!');
