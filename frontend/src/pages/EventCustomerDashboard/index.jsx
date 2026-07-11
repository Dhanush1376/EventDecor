import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEO } from '../../components/seo/SEO';
import { MandalaArtDecor } from '../../components/ui/MandalaArtDecor';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { MobileChatDrawer } from '../../components/dashboard/MobileChatDrawer';
import { PaymentModal } from '../../components/dashboard/PaymentModal';
import { DesktopChatWindow } from '../../components/dashboard/DesktopChatWindow';

import { useDashboardData } from './hooks/useDashboardData';
import { BookingList } from './components/BookingList';
import { BookingCard } from './components/BookingCard';
import { BookingDetailsCard } from './components/BookingDetailsCard';
import { LogisticsCard } from './components/LogisticsCard';
import { TimelineTracker } from './components/TimelineTracker';
import { QuotationCard } from './components/QuotationCard';

export function EventCustomerDashboard({
  isEmbedded = false,
  selectedEventBookingId,
  setSelectedEventBookingId,
}) {
  const {
    bookings,
    selectedBooking,
    loading,
    chatMessage,
    setChatMessage,
    chatEndRef,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    paymentAmount,
    setPaymentAmount,
    paymentNote,
    setPaymentNote,
    isTimelineExpanded,
    setIsTimelineExpanded,
    isMobileChatOpen,
    setIsMobileChatOpen,
    handleApproveQuote,
    handleSendChat,
    handleProcessPayment,
    handleSelectBooking,
    currentStatusIndex,
    setSelectedBooking,
  } = useDashboardData(isEmbedded);

  // Sync with dashboard context if embedded
  useEffect(() => {
    if (isEmbedded && setSelectedEventBookingId) {
      setSelectedEventBookingId(selectedBooking?._id || selectedBooking?.id || null);
    }
  }, [selectedBooking, isEmbedded, setSelectedEventBookingId]);

  useEffect(() => {
    if (isEmbedded && selectedEventBookingId === null && selectedBooking) {
      setSelectedBooking(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventBookingId, isEmbedded, setSelectedBooking]);

  return (
    <div
      className={
        isEmbedded
          ? 'text-on-surface font-body'
          : 'bg-[#fbf9f6] min-h-screen text-on-surface pt-20 lg:pt-32 pb-24 relative overflow-hidden font-body'
      }
    >
      {!isEmbedded && (
        <>
          <SEO
            title="My Events Workspace | Siri Arts & Crafts"
            description="Track your live event timelines, coordinate theme palette adjustments, and manage payments."
          />
          <MandalaArtDecor
            variant={2}
            size={450}
            className="-top-24 -right-24 absolute opacity-[0.06] z-0"
            spinDuration={240}
          />
        </>
      )}

      <div className={isEmbedded ? '' : 'max-w-[1300px] mx-auto px-4 relative z-10'}>
        {!isEmbedded && (
          <div className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-black/5 pb-6">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.3em] text-secondary font-bold block">
                Portfolio Studio
              </span>
              <h2 className="font-bold text-[32px] lg:text-[40px] text-on-surface tracking-tight leading-none">
                My Event Design Center.
              </h2>
            </div>
            <Link
              to="/events"
              className="bg-[#2A2927] hover:bg-black text-white px-6 py-3 rounded-[32px] font-bold text-[9px] uppercase tracking-widest transition-all self-start lg:self-auto flex items-center gap-2 shadow-lg"
            >
              BROWSE EVENTS & SETUPS
              <span className="material-symbols-outlined text-[14px]">add</span>
            </Link>
          </div>
        )}

        {loading && bookings.length === 0 ? (
          isEmbedded ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="p-5 rounded-lg bg-surface-bright border border-outline-variant/30 shadow-2xs space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-24 bg-stone-100 rounded" />
                    <div className="h-6 w-20 bg-stone-100 rounded-full" />
                  </div>
                  <div className="h-5 w-3/4 bg-stone-100 rounded" />
                  <div className="h-4 w-full bg-stone-100 rounded" />
                  <div className="h-4 w-2/3 bg-stone-100 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <DashboardSkeleton />
          )
        ) : bookings.length === 0 ? (
          <div className="bg-surface-bright rounded-lg p-8 text-center shadow-sm flex flex-col items-center justify-center min-h-[35vh] relative overflow-hidden border border-black/5">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#8c7335]/5 rounded-full blur-3xl pointer-events-none" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-16 h-16 rounded-full bg-[#8c7335]/5 text-[#8c7335] flex items-center justify-center mb-5 relative"
            >
              <div
                className="absolute inset-0 rounded-full border border-[#8c7335]/20 animate-ping"
                style={{ animationDuration: '3s' }}
              />
              <span className="material-symbols-outlined text-[24px] relative z-10">
                event_busy
              </span>
            </motion.div>
            <h3 className="font-display font-medium text-[18px] lg:text-[20px] text-black mb-2">
              No Active Events
            </h3>
            <p className="text-[11px] text-black/40 max-w-[280px] mb-6 leading-normal">
              You have no active event setups. Explore our collections today.
            </p>
            <div className="flex justify-center mt-6">
              <Link
                to="/events"
                className="group flex items-center gap-2 text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a] pb-2 border-b-[1.5px] border-[#1a1a1a] transition-all hover:opacity-70"
              >
                Browse Events & Setups
                <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {!isEmbedded && (
              <BookingList
                bookings={bookings}
                selectedBooking={selectedBooking}
                handleSelectBooking={handleSelectBooking}
              />
            )}

            {isEmbedded && !selectedBooking && (
              <div className="space-y-4">
                {bookings.map((booking, idx) => (
                  <BookingCard
                    key={booking._id || booking.id}
                    booking={booking}
                    idx={idx}
                    onClick={() => handleSelectBooking(booking)}
                  />
                ))}
              </div>
            )}

            {selectedBooking && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-6">
                  {isEmbedded && (
                    <button
                      onClick={() => {
                        setSelectedBooking(null);
                        if (setSelectedEventBookingId) setSelectedEventBookingId(null);
                      }}
                      className="hidden lg:flex group items-center gap-2 text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.2em] text-secondary hover:text-[#1a1a1a] transition-all mb-2 cursor-pointer bg-transparent border-0 p-0"
                    >
                      <span className="material-symbols-outlined text-[16px] transition-transform group-hover:-translate-x-1">
                        arrow_back
                      </span>
                      Back to Events
                    </button>
                  )}
                  <BookingDetailsCard
                    selectedBooking={selectedBooking}
                    setIsMobileChatOpen={setIsMobileChatOpen}
                  />

                  <LogisticsCard selectedBooking={selectedBooking} />

                  <TimelineTracker
                    currentStatusIndex={currentStatusIndex}
                    isTimelineExpanded={isTimelineExpanded}
                    setIsTimelineExpanded={setIsTimelineExpanded}
                  />

                  <QuotationCard
                    selectedBooking={selectedBooking}
                    handleApproveQuote={handleApproveQuote}
                    setPaymentAmount={setPaymentAmount}
                    setIsPaymentModalOpen={setIsPaymentModalOpen}
                  />
                </div>

                <DesktopChatWindow
                  selectedBooking={selectedBooking}
                  chatMessage={chatMessage}
                  setChatMessage={setChatMessage}
                  handleSendChat={handleSendChat}
                  chatEndRef={chatEndRef}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <MobileChatDrawer
        isMobileChatOpen={isMobileChatOpen}
        setIsMobileChatOpen={setIsMobileChatOpen}
        selectedBooking={selectedBooking}
        chatHistory={selectedBooking?.chatHistory}
        chatMessage={chatMessage}
        setChatMessage={setChatMessage}
        handleSendChat={handleSendChat}
        chatEndRef={chatEndRef}
      />

      <PaymentModal
        isPaymentModalOpen={isPaymentModalOpen}
        setIsPaymentModalOpen={setIsPaymentModalOpen}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentNote={paymentNote}
        setPaymentNote={setPaymentNote}
        handleProcessPayment={handleProcessPayment}
      />
    </div>
  );
}

export default EventCustomerDashboard;
