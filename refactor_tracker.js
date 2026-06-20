const fs = require('fs');
const path = require('path');

const filePath = 'frontend/src/pages/CustomOrders.jsx';
let code = fs.readFileSync(filePath, 'utf-8');

const targetDir = 'frontend/src/components/customOrders';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Extract OrderList
const listStartStr = '{/* Left Box: Active customer order request brief list */}';
const listEndStr = '{/* Right Box: Master Curation Workspace & chat portal */}';
const listStart = code.indexOf(listStartStr);
const listEnd = code.indexOf(listEndStr);
const listJSX = code.substring(listStart, listEnd);

fs.writeFileSync(path.join(targetDir, 'OrderList.jsx'), `import React from 'react';

export function OrderList({ myOrders, selectedOrder, setSelectedOrder }) {
  return (
    <>
      ${listJSX.trim()}
    </>
  );
}
`);
code = code.replace(listJSX, `            <OrderList myOrders={myOrders} selectedOrder={selectedOrder} setSelectedOrder={setSelectedOrder} />\n\n            `);

// Extract OrderTimeline
const timelineStartStr = '{/* Timeline status track */}';
const timelineEndStr = '{/* Interactive Quotation Estimate Card */}';
const timelineStart = code.indexOf(timelineStartStr);
const timelineEnd = code.indexOf(timelineEndStr);
const timelineJSX = code.substring(timelineStart, timelineEnd);

fs.writeFileSync(path.join(targetDir, 'OrderTimeline.jsx'), `import React from 'react';

export function OrderTimeline({ selectedOrder }) {
  return (
    <>
      ${timelineJSX.trim()}
    </>
  );
}
`);
code = code.replace(timelineJSX, `                      <OrderTimeline selectedOrder={selectedOrder} />\n\n                      `);

// Extract QuotationEstimateCard
const quoteStartStr = '{/* Interactive Quotation Estimate Card */}';
const quoteEndStr = '{/* WhatsApp direct help for active order */}';
const quoteStart = code.indexOf(quoteStartStr);
const quoteEnd = code.indexOf(quoteEndStr);
const quoteJSX = code.substring(quoteStart, quoteEnd);

fs.writeFileSync(path.join(targetDir, 'QuotationEstimateCard.jsx'), `import React from 'react';

export function QuotationEstimateCard({ selectedOrder, handleQuotationDecision }) {
  return (
    <>
      ${quoteJSX.trim()}
    </>
  );
}
`);
code = code.replace(quoteJSX, `                      <QuotationEstimateCard selectedOrder={selectedOrder} handleQuotationDecision={handleQuotationDecision} />\n\n                      `);

// Extract OrderMediaGallery
const mediaStartStr = '{/* Display inspiration images in client active order details tracking card */}';
const mediaEndStr = '                    </div>\n\n                    {/* Right Grid: Chat feed sanctuary */}';
const mediaStart = code.indexOf(mediaStartStr);
const mediaEnd = code.indexOf(mediaEndStr);
const mediaJSX = code.substring(mediaStart, mediaEnd);

fs.writeFileSync(path.join(targetDir, 'OrderMediaGallery.jsx'), `import React from 'react';
import { OptimizedImage } from '../ui/OptimizedImage';

export function OrderMediaGallery({ selectedOrder, isDirectImageUrl }) {
  return (
    <>
      ${mediaJSX.trim()}
    </>
  );
}
`);
code = code.replace(mediaJSX, `                      <OrderMediaGallery selectedOrder={selectedOrder} isDirectImageUrl={isDirectImageUrl} />\n`);

// Extract OrderChatFeed
const chatStartStr = '{/* Right Grid: Chat feed sanctuary */}';
const chatEndStr = '                  </div>\n                </div>\n              )}';
const chatStart = code.indexOf(chatStartStr);
const chatEnd = code.indexOf(chatEndStr);
const chatJSX = code.substring(chatStart, chatEnd);

fs.writeFileSync(path.join(targetDir, 'OrderChatFeed.jsx'), `import React from 'react';

export function OrderChatFeed({ selectedOrder, mobileSubTab, chatMessage, setChatMessage, handleSendChatMessage, isSendingMessage, chatEndRef }) {
  return (
    <>
      ${chatJSX.trim()}
    </>
  );
}
`);
code = code.replace(chatJSX, `                    <OrderChatFeed \n                      selectedOrder={selectedOrder}\n                      mobileSubTab={mobileSubTab}\n                      chatMessage={chatMessage}\n                      setChatMessage={setChatMessage}\n                      handleSendChatMessage={handleSendChatMessage}\n                      isSendingMessage={isSendingMessage}\n                      chatEndRef={chatEndRef}\n                    />\n`);


const imports = `import { OrderList } from '../components/customOrders/OrderList';
import { OrderTimeline } from '../components/customOrders/OrderTimeline';
import { QuotationEstimateCard } from '../components/customOrders/QuotationEstimateCard';
import { OrderMediaGallery } from '../components/customOrders/OrderMediaGallery';
import { OrderChatFeed } from '../components/customOrders/OrderChatFeed';
`;
code = code.replace("import { OptimizedImage } from '../components/ui/OptimizedImage';", imports);

fs.writeFileSync(filePath, code);
console.log('Successfully extracted Tracker UI chunks.');
