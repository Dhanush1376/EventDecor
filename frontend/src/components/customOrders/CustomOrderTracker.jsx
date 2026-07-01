import React from 'react';
import { OrderList } from './OrderList';
import { OrderTimeline } from './OrderTimeline';
import { QuotationEstimateCard } from './QuotationEstimateCard';
import { OrderMediaGallery } from './OrderMediaGallery';
import { OrderChatFeed } from './OrderChatFeed';

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
  chatEndRef,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
      {/* Left Box: Active customer order request brief list */}
      <OrderList
        myOrders={myOrders}
        selectedOrder={selectedOrder}
        setSelectedOrder={setSelectedOrder}
      />

      {/* Right Box: Master Curation Workspace & chat portal */}
      <div
        className={`lg:col-span-8 bg-white rounded-3xl lg:rounded-[2.5rem] border border-black/5 p-5 lg:p-8 min-h-[560px] shadow-sm flex flex-col ${selectedOrder ? 'block' : 'hidden lg:flex'}`}
      >
        {!selectedOrder ? (
          <div className="flex flex-col items-center justify-center flex-1 py-12 lg:py-20 text-center text-[#685C57]">
            <span className="material-symbols-outlined text-[40px] lg:text-[48px] text-black/10 mb-2">
              forum
            </span>
            <p className="text-[14px] font-bold text-[var(--color-on-surface)]">
              Custom Order Tracking
            </p>
            <p className="text-[11.5px] max-w-[280px] mx-auto mt-1 leading-relaxed px-4">
              Select one of your custom orders from the left list to view status updates, pricing,
              and chat with our team.
            </p>
          </div>
        ) : (
          <div className="flex flex-col flex-1 gap-5 lg:gap-6">
            {/* Back button on mobile */}
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="lg:hidden flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold)] hover:text-[var(--color-on-surface)] transition-colors pb-1.5 self-start cursor-pointer bg-transparent border-none p-0"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back to All Orders
            </button>

            {/* Workspace top profile header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-black/5 pb-4 gap-3">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-gold)]">
                  Custom Order Tracking
                </span>
                <h3 className="text-[16px] lg:text-[18px] font-bold text-[var(--color-on-surface)] mt-0.5">
                  {selectedOrder.occasion} Custom Order Details
                </h3>
                <p className="text-[11px] text-[#685C57] mt-0.5">
                  Category: {selectedOrder.productType} • Number of Setups: {selectedOrder.quantity}
                </p>
              </div>

              <div className="self-start sm:self-auto text-left sm:text-right">
                <span className="text-[9px] uppercase tracking-wider text-outline-variant block sm:inline-block">
                  Status
                </span>
                <span className="inline-block sm:block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-on-surface)] text-white mt-1">
                  {selectedOrder.status}
                </span>
              </div>
            </div>

            {/* Mobile-only Workspace Sub-tabs */}
            <div className="flex lg:hidden bg-[var(--color-surface-ivory)] p-1 rounded-xl border border-black/5 mb-1 shrink-0">
              <button
                type="button"
                onClick={() => setMobileSubTab('chat')}
                className={`flex-1 text-center py-2 rounded-lg text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  mobileSubTab === 'chat'
                    ? 'bg-[var(--color-on-surface)] text-white shadow-sm'
                    : 'text-[#685C57] hover:text-[var(--color-on-surface)]'
                }`}
              >
                Chat & Updates
              </button>
              <button
                type="button"
                onClick={() => setMobileSubTab('summary')}
                className={`flex-1 text-center py-2 rounded-lg text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  mobileSubTab === 'summary'
                    ? 'bg-[var(--color-on-surface)] text-white shadow-sm'
                    : 'text-[#685C57] hover:text-[var(--color-on-surface)]'
                }`}
              >
                Summary & Pricing
              </button>
            </div>

            {/* Split Curation dashboard info */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
              {/* Left Grid: Timeline and Quotation Estimate */}
              <div
                className={`lg:col-span-5 space-y-4 pr-0 lg:pr-4 lg:border-r border-black/5 ${mobileSubTab === 'summary' ? 'block' : 'hidden lg:block'}`}
              >
                {/* Timeline status track */}
                <OrderTimeline selectedOrder={selectedOrder} />

                {/* Interactive Quotation Estimate Card */}
                <QuotationEstimateCard
                  selectedOrder={selectedOrder}
                  handleQuotationDecision={handleQuotationDecision}
                />

                {/* WhatsApp direct help for active order */}
                <button
                  type="button"
                  onClick={handleWhatsAppConsult}
                  className="w-full py-2.5 bg-[#25D366] hover:bg-[#1ebd59] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mt-3"
                >
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                  Discuss Quote on WhatsApp
                </button>

                {/* Display inspiration images in client active order details tracking card */}
                <OrderMediaGallery
                  selectedOrder={selectedOrder}
                  isDirectImageUrl={isDirectImageUrl}
                />
              </div>

              {/* Right Grid: Chat feed sanctuary */}
              <OrderChatFeed
                selectedOrder={selectedOrder}
                mobileSubTab={mobileSubTab}
                chatMessage={chatMessage}
                setChatMessage={setChatMessage}
                handleSendChatMessage={handleSendChatMessage}
                isSendingMessage={isSendingMessage}
                chatEndRef={chatEndRef}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
