const fs = require('fs');
const path = require('path');

const filePath = 'frontend/src/pages/CustomOrders.jsx';
let code = fs.readFileSync(filePath, 'utf-8');

const targetDir = 'frontend/src/components/customOrders';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 1. OrderList
const orderListStart = code.indexOf('            {/* Left Box: Active customer order request brief list */}');
const orderListEnd = code.indexOf('            {/* Right Box: Master Curation Workspace & chat portal */}');
const orderListJSX = code.substring(orderListStart, orderListEnd).trim();

const orderListFile = `import React from 'react';

export function OrderList({ myOrders, selectedOrder, setSelectedOrder }) {
  return (
    <>
      ${orderListJSX}
    </>
  );
}
`;
fs.writeFileSync(path.join(targetDir, 'OrderList.jsx'), orderListFile);
code = code.replace(code.substring(orderListStart, orderListEnd), '            <OrderList myOrders={myOrders} selectedOrder={selectedOrder} setSelectedOrder={setSelectedOrder} />\n\n');


// 2. OrderTimeline
const timelineStart = code.indexOf('                      {/* Timeline status track */}');
const timelineEnd = code.indexOf('                      {/* Interactive Quotation Estimate Card */}');
const timelineJSX = code.substring(timelineStart, timelineEnd).trim();

const timelineFile = `import React from 'react';

export function OrderTimeline({ selectedOrder }) {
  return (
    <>
      ${timelineJSX}
    </>
  );
}
`;
fs.writeFileSync(path.join(targetDir, 'OrderTimeline.jsx'), timelineFile);
code = code.replace(code.substring(timelineStart, timelineEnd), '                      <OrderTimeline selectedOrder={selectedOrder} />\n\n');


// 3. QuotationEstimateCard
const quoteStart = code.indexOf('                      {/* Interactive Quotation Estimate Card */}');
const quoteEnd = code.indexOf('                      {/* WhatsApp direct help for active order */}');
const quoteJSX = code.substring(quoteStart, quoteEnd).trim();

const quoteFile = `import React from 'react';

export function QuotationEstimateCard({ selectedOrder, handleQuotationDecision }) {
  return (
    <>
      ${quoteJSX}
    </>
  );
}
`;
fs.writeFileSync(path.join(targetDir, 'QuotationEstimateCard.jsx'), quoteFile);
code = code.replace(code.substring(quoteStart, quoteEnd), '                      <QuotationEstimateCard selectedOrder={selectedOrder} handleQuotationDecision={handleQuotationDecision} />\n\n');


// 4. OrderMediaGallery
const mediaStart = code.indexOf('                      {/* Display inspiration images in client active order details tracking card */}');
const mediaEnd = code.indexOf('                    </div>\n\n                    {/* Right Grid: Chat feed sanctuary */}');
const mediaJSX = code.substring(mediaStart, mediaEnd).trim();

const mediaFile = `import React from 'react';
import { OptimizedImage } from '../ui/OptimizedImage';

export function OrderMediaGallery({ selectedOrder, isDirectImageUrl }) {
  return (
    <>
      ${mediaJSX}
    </>
  );
}
`;
fs.writeFileSync(path.join(targetDir, 'OrderMediaGallery.jsx'), mediaFile);
code = code.replace(code.substring(mediaStart, mediaEnd), '                      <OrderMediaGallery selectedOrder={selectedOrder} isDirectImageUrl={isDirectImageUrl} />\n');


// 5. OrderChatFeed
const chatStart = code.indexOf('                    {/* Right Grid: Chat feed sanctuary */}');
const chatEnd = code.indexOf('                  </div>\n                </div>\n              )}');
const chatJSX = code.substring(chatStart, chatEnd).trim();

const chatFile = `import React from 'react';

export function OrderChatFeed({ selectedOrder, mobileSubTab, chatMessage, setChatMessage, handleSendChatMessage, isSendingMessage, chatEndRef }) {
  return (
    <>
      ${chatJSX}
    </>
  );
}
`;
fs.writeFileSync(path.join(targetDir, 'OrderChatFeed.jsx'), chatFile);
code = code.replace(code.substring(chatStart, chatEnd), '                    <OrderChatFeed \n                      selectedOrder={selectedOrder}\n                      mobileSubTab={mobileSubTab}\n                      chatMessage={chatMessage}\n                      setChatMessage={setChatMessage}\n                      handleSendChatMessage={handleSendChatMessage}\n                      isSendingMessage={isSendingMessage}\n                      chatEndRef={chatEndRef}\n                    />\n');


// 6. CustomOrderWizard
const wizardStart = code.indexOf('        {/* ─── ACTIVE VIEW: MULTI-STEP REQUEST WIZARD ─── */}');
const wizardEnd = code.indexOf('        {/* ─── ACTIVE VIEW: CLIENT WORKSPACE TRACKING PORTAL ─── */}');
const wizardJSX = code.substring(wizardStart, wizardEnd).trim();

const wizardFile = `import React from 'react';
import { DynamicCustomOrderWizard } from '../ui/DynamicCustomOrderWizard';

export function CustomOrderWizard({ 
  activeTab, 
  wizardDraft, 
  setWizardDraft, 
  updateDraft,
  customizationFields,
  setCustomizationFields,
  customOccasionText,
  setCustomOccasionText,
  customProductTypeText,
  setCustomProductTypeText,
  pastedLink,
  setPastedLink,
  showCustomOccasion,
  setShowCustomOccasion,
  showCustomProductType,
  setShowCustomProductType,
  currentStep,
  setCurrentStep,
  handleNextStep,
  handleWizardSubmit,
  handleMoodUpload,
  isUploading,
  uploadProgress,
  fileInputRef,
  occasionList,
  productTypeList,
  budgetList,
  bookingList,
  isAnalyzing,
  handleAIAnalysis,
  aiStep,
  aiAnalysisResult,
  handleApplyAiSuggestions,
  aiMessages,
  aiUserQuery,
  setAiUserQuery,
  handleAiChatSubmit,
  handleQuickQuestion,
  linkedProduct,
  setLinkedProduct,
  isAiPanelOpen,
  setIsAiPanelOpen,
  stepsList,
  actionLoading
}) {
  return (
    <>
      ${wizardJSX}
    </>
  );
}
`;
fs.writeFileSync(path.join(targetDir, 'CustomOrderWizard.jsx'), wizardFile);
code = code.replace(code.substring(wizardStart, wizardEnd), `        <CustomOrderWizard 
          activeTab={activeTab}
          wizardDraft={wizardDraft}
          setWizardDraft={setWizardDraft}
          updateDraft={updateDraft}
          customizationFields={customizationFields}
          setCustomizationFields={setCustomizationFields}
          customOccasionText={_customOccasionText}
          setCustomOccasionText={setCustomOccasionText}
          customProductTypeText={_customProductTypeText}
          setCustomProductTypeText={setCustomProductTypeText}
          pastedLink={_pastedLink}
          setPastedLink={setPastedLink}
          showCustomOccasion={_showCustomOccasion}
          setShowCustomOccasion={setShowCustomOccasion}
          showCustomProductType={_showCustomProductType}
          setShowCustomProductType={setShowCustomProductType}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          handleNextStep={_handleNextStep}
          handleWizardSubmit={_handleWizardSubmit}
          handleMoodUpload={_handleMoodUpload}
          isUploading={_isUploading}
          uploadProgress={_uploadProgress}
          fileInputRef={_fileInputRef}
          occasionList={occasionList}
          productTypeList={productTypeList}
          budgetList={_budgetList}
          bookingList={_bookingList}
          isAnalyzing={_isAnalyzing}
          handleAIAnalysis={_handleAIAnalysis}
          aiStep={_aiStep}
          aiAnalysisResult={aiAnalysisResult}
          handleApplyAiSuggestions={_handleApplyAiSuggestions}
          aiMessages={aiMessages}
          aiUserQuery={aiUserQuery}
          setAiUserQuery={setAiUserQuery}
          handleAiChatSubmit={_handleAiChatSubmit}
          handleQuickQuestion={_handleQuickQuestion}
          linkedProduct={linkedProduct}
          setLinkedProduct={setLinkedProduct}
          isAiPanelOpen={_isAiPanelOpen}
          setIsAiPanelOpen={_setIsAiPanelOpen}
          stepsList={_stepsList}
          actionLoading={_actionLoading}
        />\n\n`);

// Remove DynamicCustomOrderWizard import from main file
code = code.replace("import { DynamicCustomOrderWizard } from '../components/ui/DynamicCustomOrderWizard';", "");

// Add imports to the top
const imports = `import { OrderList } from '../components/customOrders/OrderList';
import { OrderTimeline } from '../components/customOrders/OrderTimeline';
import { QuotationEstimateCard } from '../components/customOrders/QuotationEstimateCard';
import { OrderMediaGallery } from '../components/customOrders/OrderMediaGallery';
import { OrderChatFeed } from '../components/customOrders/OrderChatFeed';
import { CustomOrderWizard } from '../components/customOrders/CustomOrderWizard';
`;
code = code.replace("import { OptimizedImage } from '../components/ui/OptimizedImage';", imports + "\nimport { OptimizedImage } from '../components/ui/OptimizedImage';");


fs.writeFileSync(filePath, code);
console.log('UI extraction complete.');
