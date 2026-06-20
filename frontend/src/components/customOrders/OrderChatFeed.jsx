import React from 'react';

export function OrderChatFeed({
  selectedOrder,
  mobileSubTab,
  chatMessage,
  setChatMessage,
  handleSendChatMessage,
  isSendingMessage,
  chatEndRef,
}) {
  return (
    <div
      className={`lg:col-span-7 flex flex-col min-h-[300px] ${mobileSubTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}
    >
      {/* Chat messages viewport */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[260px] pb-4 bg-[var(--color-surface-ivory)]/30 p-2.5 rounded-2xl border border-black/5 shadow-inner">
        {selectedOrder.messages?.map((msg, i) => {
          const isAdmin = msg.sender === 'admin';
          const isLog = msg.senderName === 'System';
          const dateVal = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          if (isLog) {
            return (
              <div key={msg._id || msg.createdAt || i} className="text-center py-1">
                <span className="px-2 py-0.5 bg-black/5 text-[#685C57] text-[8.5px] font-bold uppercase tracking-wider rounded-lg border border-black/5">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg._id || msg.createdAt || i}
              className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
            >
              <span className="text-[8px] font-bold text-[#685C57] mb-0.5 px-1">
                {msg.senderName} ({dateVal})
              </span>
              <div
                className={`p-3.5 rounded-2xl text-[12px] leading-relaxed shadow-sm ${
                  isAdmin
                    ? 'bg-white text-[var(--color-on-surface)] border border-black/5 rounded-tl-none'
                    : 'bg-[var(--color-on-surface)] text-white rounded-tr-none'
                }`}
              >
                <p>{msg.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Chat messages input form */}
      <form onSubmit={handleSendChatMessage} className="flex gap-2 pt-4 mt-auto">
        <input
          type="text"
          value={chatMessage}
          onChange={(e) => setChatMessage(e.target.value)}
          placeholder="Type your message here..."
          className="flex-1 bg-[var(--color-surface-ivory)] border border-black/10 rounded-full px-4 py-2.5 text-[12.5px] outline-none focus:border-[var(--color-gold)] transition-all text-[var(--color-on-surface)]"
        />
        <button
          type="submit"
          disabled={isSendingMessage || !chatMessage.trim()}
          className="w-10 h-10 rounded-full bg-[var(--color-on-surface)] hover:bg-[var(--color-gold)] text-white flex items-center justify-center shadow-md cursor-pointer transition-all shrink-0 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </form>
    </div>
  );
}
