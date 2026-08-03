import { MessageSquare, X, MessageCircle, Send } from 'lucide-react';
import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

export function MobileChatDrawer({
  isMobileChatOpen,
  setIsMobileChatOpen,
  selectedBooking,
  chatHistory,
  chatMessage,
  setChatMessage,
  handleSendChat,
  chatEndRef,
}) {
  return (
    <AnimatePresence>
      {isMobileChatOpen && selectedBooking && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end lg:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsMobileChatOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="relative z-10 w-full flex flex-col"
            style={{ height: '82vh' }}
          >
            <div className="absolute top-[98%] left-0 right-0 h-[50vh] bg-white sm:hidden z-[-1]" />
            <div className="w-full h-full bg-white rounded-t-[28px] flex flex-col relative overflow-hidden">
              {/* Drag handle pill */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-black/10" />
              </div>

              {/* Sheet header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 shrink-0">
                <div>
                  <span className="font-label text-[8px] uppercase tracking-widest text-primary font-bold block">
                    LIVE WORKSPACE
                  </span>
                  <h4 className="font-display text-sm text-black font-bold">
                    Creative Design Studio
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare
                    className="text-[18px] text-primary animate-pulse"
                    strokeWidth={1.5}
                  />
                  <button
                    onClick={() => setIsMobileChatOpen(false)}
                    className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <X className="text-[18px] text-black/60" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Messages list */}
              <div className="flex-1 overflow-y-auto py-4 px-5 space-y-4 no-scrollbar flex flex-col">
                {chatHistory?.length === 0 || !chatHistory ? (
                  <div className="flex flex-col items-center justify-center flex-1 gap-3 py-12">
                    <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <MessageCircle className="text-[28px]" strokeWidth={1.5} />
                    </div>
                    <p className="font-body text-xs text-black/45 text-center max-w-[200px] leading-relaxed">
                      Send a message to discuss color palettes, venue dimensions, or prop
                      customizations.
                    </p>
                  </div>
                ) : (
                  chatHistory.map((chat, idx) => {
                    const isAdmin = chat.sender === 'admin';
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col max-w-[82%] ${isAdmin ? 'self-start text-left' : 'self-end text-right ml-auto'}`}
                      >
                        <span className="font-label text-[8px] text-black/35 font-bold uppercase tracking-widest mb-1 block">
                          {isAdmin ? 'Siri Arts & Crafts Designer' : 'You'}
                        </span>
                        <div
                          className={`p-3.5 rounded-[18px] text-xs leading-relaxed ${
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
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Message input */}
              <form
                onSubmit={handleSendChat}
                className="border-t border-black/5 px-4 py-3 shrink-0 flex items-center gap-2 bg-white"
                style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
              >
                <input
                  type="text"
                  placeholder="Discuss color swatches, venue details..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="flex-1 bg-[#FAF9F6] border border-black/5 px-4 py-3 rounded-lg text-xs outline-none focus:border-primary/45 transition-colors"
                  required
                />
                <button
                  type="submit"
                  className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center hover:bg-primary hover:text-black transition-all shrink-0 active:scale-90"
                >
                  <Send className="text-[17px]" strokeWidth={1.5} />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
