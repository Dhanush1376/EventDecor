import React, { useEffect } from 'react';
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
  useEffect(() => {
    if (selectedOrder) {
      document.body.classList.add('filters-open');
    } else {
      document.body.classList.remove('filters-open');
    }
    return () => document.body.classList.remove('filters-open');
  }, [selectedOrder]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
      {/* Left Box: Active customer order request brief list */}
      <OrderList
        myOrders={myOrders}
        selectedOrder={selectedOrder}
        setSelectedOrder={setSelectedOrder}
      />

      {/* Backdrop overlay for mobile drawer */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/40 z-[999] lg:hidden backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setSelectedOrder(null)}
        />
      )}

      {/* Right Box: Master Curation Workspace & chat portal */}
      <div
        className={`lg:col-span-8 bg-white border border-black/5 p-5 lg:p-8 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
          selectedOrder
            ? 'fixed inset-x-0 bottom-0 z-[1000] h-[90vh] rounded-t-[2.5rem] shadow-[0_-20px_40px_rgba(0,0,0,0.15)] translate-y-0 lg:relative lg:inset-auto lg:h-auto lg:min-h-[560px] lg:rounded-[2.5rem] lg:z-auto lg:shadow-sm pointer-events-auto'
            : 'fixed inset-x-0 bottom-0 z-[1000] h-[90vh] translate-y-full rounded-t-[2.5rem] lg:translate-y-0 lg:relative lg:inset-auto lg:h-auto lg:min-h-[560px] lg:rounded-[2.5rem] lg:flex lg:shadow-sm pointer-events-none lg:pointer-events-auto'
        }`}
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
          <div className="flex flex-col flex-1 gap-5 lg:gap-6 overflow-hidden">
            {/* Mobile Drawer Handle */}
            <div className="w-12 h-1.5 bg-black/10 rounded-full mx-auto lg:hidden shrink-0" />

            {/* Workspace top profile header */}
            <div className="flex items-center justify-between border-b border-black/5 pb-2.5">
              <div className="min-w-0 pr-3 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-[14px] lg:text-[16px] font-bold text-[var(--color-on-surface)] truncate">
                    {selectedOrder.occasion}
                  </h3>
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-[var(--color-on-surface)] text-white">
                    {selectedOrder.status}
                  </span>
                </div>
                <p className="text-[10px] text-[#685C57] truncate">
                  {selectedOrder.productType} • {selectedOrder.quantity} Setup(s)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileSubTab('summary')}
                  className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 hover:bg-black/10 text-[10px] font-bold uppercase tracking-widest text-black transition-colors cursor-pointer border-none shrink-0"
                >
                  <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                  View Details
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="lg:hidden aspect-square w-8 h-8 min-w-[32px] min-h-[32px] p-0 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[var(--color-on-surface)] transition-colors shrink-0 cursor-pointer border-none"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Mobile-only Workspace Sub-tabs */}
            <div className="flex lg:hidden bg-[#F7F5F2] p-1 rounded-full border border-black/5 mb-2 mt-1 shrink-0">
              <button
                type="button"
                onClick={() => setMobileSubTab('chat')}
                className={`flex-1 text-center py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer relative ${
                  mobileSubTab === 'chat'
                    ? 'bg-black text-white shadow-md'
                    : 'text-[#685C57] hover:text-black'
                }`}
              >
                Chat & Updates
                {selectedOrder?.messages?.some(
                  (m) =>
                    m.sender === 'admin' &&
                    new Date(m.createdAt).getTime() >
                      parseInt(localStorage.getItem(`order_readAt_${selectedOrder._id}`) || 0),
                ) &&
                  mobileSubTab !== 'chat' && (
                    <span className="absolute top-1.5 right-3 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white" />
                  )}
              </button>
              <button
                type="button"
                onClick={() => setMobileSubTab('summary')}
                className={`flex-1 text-center py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer relative ${
                  mobileSubTab === 'summary'
                    ? 'bg-black text-white shadow-md'
                    : 'text-[#685C57] hover:text-black'
                }`}
              >
                Quotation
                {selectedOrder?.status !== 'Pending' && mobileSubTab !== 'summary' && (
                  <span className="absolute top-1.5 right-3 w-2 h-2 bg-[var(--color-gold)] rounded-full animate-pulse border border-white" />
                )}
              </button>
            </div>

            {/* Split Curation dashboard info */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
              {/* Left Grid: Timeline and Quotation Estimate */}
              <div
                className={`lg:col-span-5 overflow-y-auto space-y-4 pr-0 lg:pr-4 lg:border-r border-black/5 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${mobileSubTab === 'summary' ? 'block' : 'hidden lg:block'}`}
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
