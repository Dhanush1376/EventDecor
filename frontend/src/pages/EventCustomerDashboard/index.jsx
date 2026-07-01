import { Link } from 'react-router-dom';
import { SEO } from '../../components/seo/SEO';
import { MandalaArtDecor } from '../../components/ui/MandalaArtDecor';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { MobileChatDrawer } from '../../components/dashboard/MobileChatDrawer';
import { PaymentModal } from '../../components/dashboard/PaymentModal';
import { DesktopChatWindow } from '../../components/dashboard/DesktopChatWindow';

import { useDashboardData } from './hooks/useDashboardData';
import { BookingList } from './components/BookingList';
import { BookingDetailsCard } from './components/BookingDetailsCard';
import { LogisticsCard } from './components/LogisticsCard';
import { TimelineTracker } from './components/TimelineTracker';
import { QuotationCard } from './components/QuotationCard';

export function EventCustomerDashboard({ isEmbedded = false }) {
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
  } = useDashboardData();

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
          <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-10 text-center shadow-xs flex flex-col items-center justify-center min-h-[40vh]">
            <div className="w-12 h-12 rounded-full bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-center mb-4 text-secondary">
              <span className="material-symbols-outlined text-[20px]">event_busy</span>
            </div>
            <h3 className="font-bold text-[10px] uppercase tracking-widest text-on-surface mb-2">
              No Active Events
            </h3>
            <p className="text-secondary text-[9px] font-bold uppercase tracking-widest max-w-[250px] mb-6">
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
            <BookingList
              bookings={bookings}
              selectedBooking={selectedBooking}
              handleSelectBooking={handleSelectBooking}
            />

            {selectedBooking && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-6">
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
