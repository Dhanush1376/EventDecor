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
          : 'bg-[#fbf9f6] min-h-screen text-on-surface pt-20 md:pt-32 pb-24 relative overflow-hidden font-body'
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
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-black/5 pb-6">
            <div className="space-y-1">
              <span className="font-label text-[10px] md:text-[11px] uppercase tracking-[0.4em] text-primary font-bold block">
                PORTFOLIO STUDIO
              </span>
              <h2 className="font-display text-[26px] md:text-[44px] text-black font-light tracking-tight leading-none">
                My Event Design Center.
              </h2>
            </div>
            <Link
              to="/events"
              className="bg-black text-white px-6 py-2.5 rounded-full font-label text-[10px] uppercase tracking-widest font-bold hover:bg-primary hover:text-black transition-colors self-start md:self-auto flex items-center gap-1.5"
            >
              Browse Events & Setups
              <span className="material-symbols-outlined text-[14px] normal-case">add</span>
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
          <div className="text-center py-20 bg-surface-bright rounded-lg border border-outline-variant/30 shadow-2xs max-w-xl mx-auto px-6 space-y-6">
            <div className="w-20 h-20 bg-primary/5 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[36px] normal-case">event_busy</span>
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl text-black font-bold">No Active Events</h3>
              <p className="font-body text-black/45 text-xs max-w-sm mx-auto leading-relaxed">
                You have no active event setups. Explore our collections today.
              </p>
            </div>
            <div className="flex justify-center">
              <Link
                to="/events"
                className="group inline-flex items-center gap-2 text-on-surface hover:text-primary transition-colors py-2 font-label text-[11px] uppercase tracking-[0.2em] font-bold border-b-2 border-on-surface hover:border-primary cursor-pointer"
              >
                <span>Browse Events & Setups</span>
                <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">
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
