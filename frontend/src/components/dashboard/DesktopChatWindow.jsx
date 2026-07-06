import React from 'react';

export function DesktopChatWindow({
  selectedBooking,
  chatMessage,
  setChatMessage,
  handleSendChat,
  chatEndRef,
}) {
  return (
    <div className="hidden lg:flex lg:col-span-4 bg-surface-bright border border-outline-variant/30 rounded-lg p-5 shadow-2xs flex-col h-[600px] lg:sticky lg:top-24 text-[11px]">
      <div className="border-b border-outline-variant/20 pb-3 shrink-0 flex items-center justify-between">
        <div>
          <span className="font-label text-[8px] uppercase tracking-widest text-primary font-bold block">
            LIVE WORKSPACE
          </span>
          <h4 className="font-display text-sm text-black font-bold">Creative Design Studio Chat</h4>
        </div>
        <span className="material-symbols-outlined text-[18px] text-primary animate-pulse">
          forum
        </span>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 no-scrollbar flex flex-col">
        {selectedBooking.chatHistory?.map((chat, idx) => {
          const isAdmin = chat.sender === 'admin';
          return (
            <div
              key={idx}
              className={`flex flex-col max-w-[85%] ${isAdmin ? 'self-start text-left' : 'self-end text-right ml-auto'}`}
            >
              <span className="font-label text-[8px] text-black/35 font-bold uppercase tracking-widest mb-1 block">
                {isAdmin ? 'Siri Arts & Crafts Designer' : 'You'}
              </span>
              <div
                className={`p-3 rounded-[18px] text-xs leading-relaxed font-light ${
                  isAdmin
                    ? 'bg-[#F5F3EF] text-stone-900 rounded-tl-none'
                    : 'bg-black text-white rounded-tr-none'
                }`}
              >
                {chat.message}
              </div>
              <span className="font-mono text-[8px] text-black/25 mt-1 block">
                {new Date(chat.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Message Input box */}
      <form
        onSubmit={handleSendChat}
        className="border-t border-black/5 pt-3 shrink-0 flex items-center gap-2 mt-auto"
      >
        <input
          type="text"
          placeholder="Discuss color swatches, venue details..."
          value={chatMessage}
          onChange={(e) => setChatMessage(e.target.value)}
          className="flex-1 bg-surface-container-low border border-outline-variant/30 px-4 py-2.5 rounded-lg text-xs outline-none focus:border-primary transition-colors text-on-surface font-semibold"
          required
        />
        <button
          type="submit"
          className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-primary hover:text-black transition-all shrink-0 active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">send</span>
        </button>
      </form>
    </div>
  );
}
