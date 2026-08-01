import { CheckCircle2, ShoppingBag, History, ArrowLeft, Info, Paperclip, Send } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

export function OrderChatFeed({
  selectedOrder,
  mobileSubTab,
  chatMessage,
  setChatMessage,
  handleSendChatMessage,
  isSendingMessage,
  chatEndRef,
}) {
  const [showChat, setShowChat] = useState(false);
  const navigate = useNavigate();
  const { attemptAddToCart } = useCart();

  const isApproved =
    selectedOrder?.status === 'Approved' ||
    selectedOrder?.status === 'Ready' ||
    selectedOrder?.convertedToOrder;

  const handleAddToBag = () => {
    attemptAddToCart({
      id: selectedOrder._id,
      title:
        selectedOrder.customProduct?.name ||
        selectedOrder.productSnapshot?.title ||
        selectedOrder.productSnapshot?.name ||
        selectedOrder.occasion ||
        'Custom Order - ' + (selectedOrder.eventType || 'Event'),
      price:
        selectedOrder.quotation?.total ||
        selectedOrder.costEstimation?.total ||
        selectedOrder.budget ||
        0,
      imageSrc:
        selectedOrder.customProduct?.images?.[0] ||
        selectedOrder.productSnapshot?.image ||
        selectedOrder.referenceImages?.[0] ||
        selectedOrder.inspirationImages?.[0],
      type: 'custom',
      product: selectedOrder, // The full order object used by checkout
    });
  };

  if (isApproved && !showChat) {
    return (
      <div
        className={`lg:col-span-7 flex flex-col flex-1 min-h-0 lg:min-h-[400px] ${mobileSubTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}
      >
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4 pt-2">
          <div className="bg-white border border-black/10 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--color-gold)] opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <h2 className="text-xl font-bold text-[#1a1817] mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-[var(--color-gold)]" strokeWidth={1.5} />
              Quotation Approved
            </h2>
            <p className="text-[13px] text-[#685C57] mb-6 leading-relaxed">
              Your custom order quotation has been finalized and approved. Please proceed to
              checkout to secure your booking and schedule the delivery.
            </p>

            <div className="bg-[#fcfaf8] rounded-xl p-5 border border-black/5 mb-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#8C7D73] mb-3">
                Professional Summary
              </h3>
              <p className="text-[13px] text-[#1a1817] whitespace-pre-wrap leading-[1.6]">
                {selectedOrder.orderSummary || 'Quotation details finalized.'}
              </p>
            </div>

            <div className="bg-[#fcfaf8] rounded-xl p-5 border border-black/5 mb-6">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#8C7D73] mb-3">
                Order Notes & Requirements
              </h3>
              <p className="text-[13px] text-[#1a1817] whitespace-pre-wrap leading-[1.6]">
                {selectedOrder.orderNotes || 'No additional notes provided.'}
              </p>
            </div>

            {selectedOrder.convertedToOrder ? (
              <div className="w-full py-3.5 bg-black/5 text-[#8C7D73] rounded-xl text-center text-[11px] font-bold uppercase tracking-widest border border-black/5">
                Order Placed Successfully
              </div>
            ) : (
              <button
                onClick={handleAddToBag}
                className="w-full py-3.5 bg-black hover:bg-black/90 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] cursor-pointer"
              >
                <ShoppingBag className="text-[18px]" strokeWidth={1.5} />
                Add Custom Order to Bag
              </button>
            )}
          </div>

          <div className="text-center mt-6">
            <button
              onClick={() => setShowChat(true)}
              className="text-[10px] font-bold text-[#8C7D73] hover:text-black uppercase tracking-widest flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
            >
              <History className="text-[16px]" strokeWidth={1.5} />
              View Chat History
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`lg:col-span-7 flex flex-col flex-1 min-h-0 lg:h-auto lg:min-h-[400px] ${mobileSubTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}
    >
      {isApproved && showChat && (
        <div className="pb-3 border-b border-black/5 mb-2 flex items-center justify-between shrink-0">
          <button
            onClick={() => setShowChat(false)}
            className="text-[10px] font-bold text-[#8C7D73] hover:text-black uppercase tracking-widest flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ArrowLeft className="text-[16px]" strokeWidth={1.5} />
            Back to Summary
          </button>
        </div>
      )}
      {/* Chat messages viewport */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-4 bg-transparent pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {selectedOrder.messages?.map((msg, i) => {
          // Strictly force Admin messages to the Left, and Customer messages to the Right
          const isAdmin = msg.sender === 'admin';

          const dateVal = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          let displaySenderName = msg.senderName;
          if (isAdmin) {
            if (msg.senderName === 'System Logger' || msg.senderName === 'System') {
              displaySenderName = 'Siri Arts & Crafts';
            } else if (!msg.senderName) {
              displaySenderName = 'Siri Design Team';
            }
          }

          const isLog =
            msg.senderName === 'System Logger' ||
            msg.senderName === 'System' ||
            msg.messageType === 'system';
          const hasAttachments = msg.attachments && msg.attachments.length > 0;

          if (isLog) {
            return (
              <div key={msg._id || msg.createdAt || i} className="flex justify-center py-1.5">
                <span className="px-3 py-1.5 bg-[#F2EFEB] text-[#8C7D73] text-[9px] font-bold uppercase tracking-wider rounded-lg shadow-sm border border-black/5 text-center max-w-[80%] flex items-center gap-1.5">
                  <Info className="text-[14px]" strokeWidth={1.5} />
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg._id || msg.createdAt || i}
              className={`flex flex-col w-full mb-3 ${isAdmin ? 'items-start pr-12' : 'items-end pl-12'}`}
            >
              <div
                className={`relative shadow-sm max-w-[100%] sm:max-w-[90%] ${
                  isAdmin
                    ? 'bg-white text-[var(--color-on-surface)] rounded-2xl rounded-tl-sm px-4 py-3 border border-black/5'
                    : 'bg-[#1A1A1A] text-white rounded-2xl rounded-tr-sm px-4 py-3'
                }`}
              >
                <div className="flex flex-col min-w-0">
                  {isAdmin && (
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--color-gold)] mb-1 text-left block flex items-center gap-1">
                      {msg.messageType === 'file_upload' && (
                        <Paperclip className="text-[12px]" strokeWidth={1.5} />
                      )}
                      {displaySenderName}
                    </span>
                  )}
                  {msg.messageType === 'quotation' && (
                    <div className="bg-black/5 text-[#8C7D73] px-3 py-1.5 rounded-lg mb-2 text-[10px] font-bold uppercase tracking-widest w-fit border border-black/5 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">request_quote</span>
                      Quotation Context
                    </div>
                  )}
                  {hasAttachments && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {msg.attachments.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt="Attachment"
                          className="w-16 h-16 object-cover rounded-lg border border-black/10 shadow-sm"
                        />
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-3 flex-wrap relative">
                    <p className="text-[13px] leading-[1.4] whitespace-pre-wrap flex-1 min-w-[50px] font-medium">
                      {msg.text}
                    </p>
                    <span
                      className={`text-[9px] font-medium tracking-wide shrink-0 ${
                        isAdmin ? 'text-[#8C7D73]' : 'text-white/60'
                      }`}
                      style={{ marginBottom: '-2px' }}
                    >
                      {dateVal}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} className="h-2" />
      </div>

      {/* Chat messages input form */}
      <div className="pt-3 mt-auto shrink-0 border-t border-black/5 pb-2 bg-gradient-to-t from-white to-transparent">
        <form
          onSubmit={handleSendChatMessage}
          className="flex items-end gap-2 bg-[#F7F5F2] p-1.5 rounded-3xl border border-black/10 shadow-inner"
        >
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-transparent px-4 py-2 text-[13px] outline-none text-[var(--color-on-surface)] min-h-[40px]"
          />
          <button
            type="submit"
            disabled={isSendingMessage || !chatMessage.trim()}
            className="w-10 h-10 rounded-full bg-[var(--color-gold)] hover:bg-[#b09653] text-white flex items-center justify-center shadow-md cursor-pointer transition-transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none shrink-0"
          >
            <Send className="text-[18px]" strokeWidth={1.5} />
          </button>
        </form>
      </div>
    </div>
  );
}
