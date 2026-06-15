import { Link } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/seo/SEO';
import { MandalaArtDecor } from '../components/ui/MandalaArtDecor';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { useState, useEffect, useRef } from 'react';
import { bookingService } from '../services/domainServices';
import toast from 'react-hot-toast';

import logger from '../utils/logger';
const STATUS_STEPS = [
  { id: 'inquiry', label: 'Inquiry Received', desc: 'Our design team is checking setup details' },
  {
    id: 'review',
    label: 'Under Review',
    desc: 'Design architects are mapping prop blueprint dimensions',
  },
  {
    id: 'discussion',
    label: 'Design Workspace',
    desc: 'Live color palette and layout adjustments',
  },
  {
    id: 'quotation_sent',
    label: 'Quotation Compiled',
    desc: 'Quotation is active. Awaiting your approval',
  },
  {
    id: 'confirmed',
    label: 'Booking Confirmed',
    desc: 'Logistics, vehicles, and inventories are locked',
  },
  { id: 'team_assigned', label: 'Artisans Assigned', desc: 'Setup crews and site leads allocated' },
  {
    id: 'setup_in_progress',
    label: 'Setup In Progress',
    desc: 'Crews are assembling structures onsite',
  },
  { id: 'active', label: 'Event Active', desc: 'The cinematic setup is complete & live' },
  {
    id: 'pickup_scheduled',
    label: 'Pickup Scheduled',
    desc: 'Crews returning to venue for catalog disassembly',
  },
  { id: 'completed', label: 'Completed', desc: 'Logistics completed & inventory returned' },
];

export function EventCustomerDashboard({ isEmbedded = false }) {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chat State
  const [chatMessage, setChatMessage] = useState('');
  const chatEndRef = useRef(null);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('Milestone Deposit');

  // Expandable timeline state
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  // Mobile chat bottom-sheet state
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  async function fetchBookings() {
    setLoading(true);
    try {
      const res = await bookingService.getMyBookings();
      if (res.success) {
        const list = res.data || [];
        setBookings(list);
        if (list.length > 0) {
          // Auto select first booking
          setSelectedBooking(list[0]);
        }
      }
    } catch (err) {
      logger.error(err);
      toast.error('Failed to sync event bookings catalog.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBookings();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Scroll chat to bottom when workspace changes or chat updates
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedBooking?.chatHistory]);

  const handleApproveQuote = async (approved) => {
    if (!selectedBooking) return;
    const loadId = toast.loading('Recording your quotation response...');
    try {
      const res = await bookingService.respondQuote(
        selectedBooking._id || selectedBooking.id,
        approved,
      );
      toast.dismiss(loadId);
      if (res.success) {
        toast.success(approved ? 'Estimate approved successfully!' : 'Quote marked for revision.');
        // Reload details
        const updated = await bookingService.getById(selectedBooking._id || selectedBooking.id);
        if (updated.success) {
          setSelectedBooking(updated.data);
          // Sync with main list
          setBookings((prev) => prev.map((b) => (b._id === updated.data._id ? updated.data : b)));
        }
      }
    } catch (err) {
      toast.dismiss(loadId);
      logger.error(err);
      toast.error('Error submitting response.');
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedBooking) return;

    try {
      const res = await bookingService.postChat(
        selectedBooking._id || selectedBooking.id,
        chatMessage,
      );
      if (res.success) {
        setChatMessage('');
        const updated = await bookingService.getById(selectedBooking._id || selectedBooking.id);
        if (updated.success) {
          setSelectedBooking(updated.data);
          setBookings((prev) => prev.map((b) => (b._id === updated.data._id ? updated.data : b)));
        }
      }
    } catch (err) {
      logger.error(err);
      toast.error('Failed to post message.');
    }
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0 || !selectedBooking) {
      toast.error('Please specify a valid transaction amount.');
      return;
    }

    const loadId = toast.loading('Processing milestone transaction...');
    try {
      const res = await bookingService.submitPayment(selectedBooking._id || selectedBooking.id, {
        amount: amt,
        transactionId: `UPI-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        note: paymentNote,
      });
      toast.dismiss(loadId);
      if (res.success) {
        toast.success(`Milestone payment of ₹${amt.toLocaleString('en-IN')} lodged successfully!`);
        setIsPaymentModalOpen(false);
        setPaymentAmount('');
        // Reload
        const updated = await bookingService.getById(selectedBooking._id || selectedBooking.id);
        if (updated.success) {
          setSelectedBooking(updated.data);
          setBookings((prev) => prev.map((b) => (b._id === updated.data._id ? updated.data : b)));
        }
      }
    } catch (err) {
      toast.dismiss(loadId);
      logger.error(err);
      toast.error('Transaction error. Please try again.');
    }
  };

  const handleSelectBooking = async (b) => {
    setLoading(true);
    try {
      const res = await bookingService.getById(b._id || b.id);
      if (res.success) {
        setSelectedBooking(res.data);
      }
    } catch (err) {
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Find active step index in status list
  const currentStatusIndex = selectedBooking
    ? STATUS_STEPS.findIndex((s) => s.id === selectedBooking.status)
    : 0;

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
        {/* Editorial Heading */}
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
          /* Empty Curation Workspace state */
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
          /* Main Workspace Dashboard */
          <div className="space-y-6">
            {/* Horizontal list of bookings at the top (only shown if there are multiple bookings) */}
            {bookings.length > 1 && (
              <div className="space-y-2">
                <h3 className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold">
                  Your Celebrations
                </h3>
                <div className="flex flex-row gap-4 overflow-x-auto pb-3 pt-1 no-scrollbar">
                  {bookings.map((b) => {
                    const isSelected = selectedBooking?._id === b._id;
                    return (
                      <div
                        key={b._id || b.id}
                        onClick={() => handleSelectBooking(b)}
                        className={`flex-shrink-0 min-w-[240px] md:min-w-[280px] p-4 rounded-lg border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-surface-bright border-primary shadow-2xs ring-1 ring-primary/20 scale-[1.01]'
                            : 'border-outline-variant/30 hover:border-outline-variant bg-surface-bright/70'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-center gap-2">
                            <span className="bg-primary/5 text-primary px-2.5 py-0.5 rounded-full font-label text-[8px] uppercase tracking-widest font-bold truncate">
                              {b.eventType}
                            </span>
                            <span className="font-mono text-[9px] text-black/35 shrink-0">
                              {new Date(b.date).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <h4 className="font-display text-[13px] text-black font-bold truncate leading-tight">
                            {b.title}
                          </h4>
                          <div className="flex justify-between items-center text-[10px] pt-1 border-t border-black/5">
                            <span className="text-black/40">Status:</span>
                            <span className="font-semibold text-primary capitalize">
                              {b.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Booking interactive board */}
            {selectedBooking && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Timelines, Logistics, Invoices & Quotations */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Visual Setup/Inquiry Details */}
                  <div className="bg-surface-bright rounded-lg border border-outline-variant/30 p-5 space-y-5 shadow-2xs relative overflow-hidden text-[11px]">
                    <div className="flex flex-col md:flex-row justify-between items-start border-b border-black/5 pb-4 gap-4 md:gap-0">
                      <div>
                        <span className="font-label text-[9px] text-primary uppercase tracking-[0.2em] font-bold block mb-1">
                          Booking Details
                        </span>
                        <h2 className="font-display text-[22px] text-black font-light tracking-tight">
                          {selectedBooking.title}
                        </h2>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        {/* Mobile: Open chat bottom-sheet trigger */}
                        <button
                          type="button"
                          onClick={() => setIsMobileChatOpen(true)}
                          className="lg:hidden flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg font-label text-[9px] uppercase tracking-wider font-bold shadow-md active:scale-95 transition-transform"
                        >
                          <span className="material-symbols-outlined text-[14px]">forum</span>
                          Chat
                        </button>
                        <span className="bg-stone-100 text-stone-700 px-3 py-2 rounded-full font-label text-[9px] uppercase tracking-widest font-bold">
                          ID: {selectedBooking._id?.substring(18).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
                      <div className="space-y-0.5">
                        <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
                          Event Style
                        </span>
                        <span className="font-body text-xs text-black font-bold capitalize">
                          {selectedBooking.eventType}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
                          Event Date
                        </span>
                        <span className="font-body text-xs text-black font-bold">
                          {new Date(selectedBooking.date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
                          Timing Window
                        </span>
                        <span className="font-body text-xs text-black font-semibold">
                          {selectedBooking.timing?.start} - {selectedBooking.timing?.end}
                        </span>
                      </div>
                      <div className="space-y-1.5 col-span-2 sm:col-span-3 lg:col-span-2 bg-primary/5 p-4 rounded-lg border border-primary/10 relative overflow-hidden">
                        <span className="font-label text-[8px] uppercase tracking-widest text-primary font-bold block mb-1">
                          Setup Destination Address
                        </span>
                        {selectedBooking.venue?.name && (
                          <span className="font-display text-xs text-on-surface font-bold flex items-center gap-1.5 leading-none">
                            <span className="material-symbols-outlined text-primary text-[16px]">
                              storefront
                            </span>
                            {selectedBooking.venue.name}
                          </span>
                        )}
                        <span className="font-body text-[11px] text-secondary font-light block leading-relaxed">
                          {selectedBooking.venue?.address || 'Address pending finalization'}
                        </span>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          {selectedBooking.venue?.city && (
                            <span className="font-body text-[9px] text-secondary font-semibold bg-surface-container px-2 py-0.5 rounded-full">
                              City: {selectedBooking.venue.city}
                            </span>
                          )}
                          {selectedBooking.venue?.pincode && (
                            <span className="font-body text-[9px] text-secondary font-semibold bg-surface-container px-2 py-0.5 rounded-full">
                              Pincode: {selectedBooking.venue.pincode}
                            </span>
                          )}
                          {selectedBooking.venue?.googleMapsLink && (
                            <a
                              href={selectedBooking.venue.googleMapsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-label text-[8px] uppercase tracking-wider text-primary font-bold hover:underline flex items-center gap-0.5"
                            >
                              <span className="material-symbols-outlined text-[12px]">
                                directions
                              </span>{' '}
                              Open Navigation
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
                          Setup Type
                        </span>
                        <span className="font-body text-xs text-black font-bold">
                          {selectedBooking.venue?.isOutdoor
                            ? '🍀 Outdoor Lawn'
                            : '🏛️ Indoor Banquet'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Setup/Pickup Timing & Teams */}
                  {(selectedBooking.setupTiming ||
                    selectedBooking.pickupTiming ||
                    selectedBooking.assignedTeam?.length > 0) && (
                    <div className="bg-surface-bright rounded-lg border border-outline-variant/30 p-5 space-y-5 shadow-2xs text-[11px]">
                      <h3 className="font-display text-lg text-black font-bold border-b border-black/5 pb-2">
                        Logistics & Crew Roster
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Setup schedule */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-primary">
                            <span className="material-symbols-outlined text-[18px]">build</span>
                            <span className="font-label text-[9px] uppercase tracking-wider font-bold">
                              Decoration Setup Schedule
                            </span>
                          </div>
                          <span className="font-body text-xs text-stone-700 font-bold block">
                            {selectedBooking.setupTiming
                              ? new Date(selectedBooking.setupTiming).toLocaleString('en-IN', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })
                              : 'Pending Logistics Finalization'}
                          </span>
                        </div>

                        {/* Pickup schedule */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-primary">
                            <span className="material-symbols-outlined text-[18px]">
                              local_shipping
                            </span>
                            <span className="font-label text-[9px] uppercase tracking-wider font-bold">
                              Prop Pickup & Disassembly
                            </span>
                          </div>
                          <span className="font-body text-xs text-stone-700 font-bold block">
                            {selectedBooking.pickupTiming
                              ? new Date(selectedBooking.pickupTiming).toLocaleString('en-IN', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })
                              : 'Pending Logistics Finalization'}
                          </span>
                        </div>

                        {/* Assigned team */}
                        {selectedBooking.assignedTeam?.length > 0 && (
                          <div className="sm:col-span-2 space-y-3 pt-2">
                            <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
                              Assigned Setup Team
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {selectedBooking.assignedTeam.map((team, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 bg-surface-container border border-outline-variant/20 rounded-lg flex items-center justify-between"
                                >
                                  <div>
                                    <span className="font-body text-xs text-black font-bold block">
                                      {team.name}
                                    </span>
                                    <span className="font-body text-[10px] text-black/40 block capitalize">
                                      {team.role}
                                    </span>
                                  </div>
                                  {team.contact && (
                                    <a
                                      href={`tel:${team.contact}`}
                                      className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        call
                                      </span>
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Compact Modern Progress Bar & Highlighted Active Phase */}
                  <div className="bg-surface-bright rounded-lg border border-outline-variant/30 p-5 space-y-5 shadow-2xs text-[11px]">
                    <div className="flex justify-between items-center border-b border-outline-variant/20 pb-3">
                      <div>
                        <span className="font-label text-[8px] uppercase tracking-widest text-primary font-bold block mb-0.5">
                          TIMELINE STATUS
                        </span>
                        <h3 className="font-display text-base text-black font-bold">
                          Setup Progress Tracker
                        </h3>
                      </div>
                      <span className="text-[10px] text-black/50 font-mono">
                        Phase {currentStatusIndex + 1} of {STATUS_STEPS.length}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${((currentStatusIndex + 1) / STATUS_STEPS.length) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-black/35 uppercase tracking-wider font-semibold">
                        <span>Inquiry</span>
                        <span>Active Celebration</span>
                        <span>Completed</span>
                      </div>
                    </div>

                    {/* Highlighted Current Step */}
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                        <span className="material-symbols-outlined text-[16px]">
                          hourglass_empty
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="bg-primary/15 text-primary px-2.5 py-0.5 rounded-full font-label text-[8px] uppercase tracking-wider font-bold">
                          Current Phase: {STATUS_STEPS[currentStatusIndex]?.label}
                        </span>
                        <p className="font-body text-[11px] text-stone-700 leading-relaxed pt-1">
                          {STATUS_STEPS[currentStatusIndex]?.desc}
                        </p>
                      </div>
                    </div>

                    {/* Expandable full history */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                        className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 text-on-surface hover:bg-surface-container transition-colors font-label text-[10px] uppercase tracking-wider font-bold"
                      >
                        <span>
                          {isTimelineExpanded
                            ? 'Hide Full Timeline Roster'
                            : 'View Full Timeline Roster'}
                        </span>
                        <span
                          className={`material-symbols-outlined text-[16px] transition-transform duration-300 ${isTimelineExpanded ? 'rotate-180' : ''}`}
                        >
                          expand_more
                        </span>
                      </button>

                      <AnimatePresence>
                        {isTimelineExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden mt-4 pl-4 border-l border-outline-variant/30 space-y-4 ml-2"
                          >
                            {STATUS_STEPS.map((step, idx) => {
                              const isPast = currentStatusIndex > idx;
                              const isCurrent = currentStatusIndex === idx;
                              return (
                                <div key={step.id} className="relative pl-6">
                                  <div
                                    className={`absolute -left-[23px] top-0 w-3.5 h-3.5 rounded-full border-2 transition-colors flex items-center justify-center ${
                                      isCurrent
                                        ? 'bg-primary border-primary scale-110 shadow-md'
                                        : isPast
                                          ? 'bg-primary/20 border-primary'
                                          : 'bg-surface-bright border-outline-variant/30'
                                    }`}
                                  >
                                    {isPast && (
                                      <span className="material-symbols-outlined text-[8px] text-primary font-bold">
                                        check
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-0.5">
                                    <h4
                                      className={`font-body text-[12px] font-bold ${isCurrent ? 'text-primary font-bold' : isPast ? 'text-black/60 font-semibold' : 'text-black/35 font-normal'}`}
                                    >
                                      {step.label}
                                    </h4>
                                    <p className="font-body text-[10px] text-black/40 leading-relaxed font-light">
                                      {step.desc}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Financial Quotation Summary details */}
                  <div className="bg-surface-bright rounded-lg border border-outline-variant/30 p-5 space-y-5 shadow-2xs text-[11px]">
                    <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-outline-variant/20 pb-3 gap-2">
                      <h3 className="font-display text-lg text-black font-bold">
                        Quotation Estimate Details
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-label text-[8px] uppercase tracking-widest font-bold self-start md:self-auto ${
                          selectedBooking.clientApproved
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {selectedBooking.clientApproved
                          ? 'Approved by Client'
                          : 'Awaiting Client Approval'}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between gap-3">
                        <span className="text-black/50 leading-snug">Event Decor & Rental:</span>
                        <span className="text-black font-semibold shrink-0">
                          ₹{selectedBooking.pricing?.rentalFee?.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-black/50 leading-snug">
                          Bespoke Setup Logistics Crew Labor:
                        </span>
                        <span className="text-black font-semibold shrink-0">
                          ₹{selectedBooking.pricing?.setupCharges?.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-black/50 leading-snug">
                          Logistics Transportation Fleet Cost:
                        </span>
                        <span className="text-black font-semibold shrink-0">
                          ₹{selectedBooking.pricing?.transportationCost?.toLocaleString('en-IN')}
                        </span>
                      </div>
                      {selectedBooking.selectedAddons?.map((addon, idx) => (
                        <div key={idx} className="flex justify-between gap-3">
                          <span className="text-black/50 leading-snug">+ {addon.name}:</span>
                          <span className="text-black font-semibold shrink-0">
                            ₹{addon.price?.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}

                      <div className="border-t border-outline-variant/20 pt-4 flex justify-between items-end gap-3">
                        <span className="font-display text-sm text-on-surface font-bold leading-snug">
                          Total Estimate Contract Price:
                        </span>
                        <span className="font-display text-lg text-on-surface font-bold italic shrink-0">
                          ₹{selectedBooking.pricing?.totalPrice?.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="border-t border-outline-variant/20 pt-4 flex justify-between items-end gap-3">
                        <div className="space-y-0.5">
                          <span className="font-display text-[11px] text-on-surface font-bold block leading-snug">
                            Milestone Deposit Required:
                          </span>
                          <span className="font-body text-[10px] text-secondary block">
                            25% to confirm schedules
                          </span>
                        </div>
                        <span className="font-display text-sm text-primary font-bold shrink-0">
                          ₹{selectedBooking.pricing?.depositAmount?.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="border-t border-outline-variant/20 pt-4 flex justify-between items-end gap-3">
                        <div className="space-y-0.5">
                          <span className="font-display text-[11px] text-on-surface font-bold block leading-snug">
                            Pending Balance Remaining:
                          </span>
                          <span className="font-body text-[10px] text-secondary block capitalize">
                            Payment Status: {selectedBooking.pricing?.paymentStatus}
                          </span>
                        </div>
                        <span className="font-display text-lg text-on-surface font-bold italic shrink-0">
                          ₹{selectedBooking.pricing?.pendingBalance?.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Action buttons on Quote status */}
                      {selectedBooking.status === 'quotation_sent' &&
                        !selectedBooking.clientApproved && (
                          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-outline-variant/20 mt-4">
                            <button
                              onClick={() => handleApproveQuote(false)}
                              className="py-2.5 rounded-full border border-outline-variant text-secondary font-label text-[9px] uppercase tracking-widest font-bold hover:bg-surface-container transition-colors"
                            >
                              Request Revisions
                            </button>
                            <button
                              onClick={() => handleApproveQuote(true)}
                              className="bg-black text-white py-3 rounded-full font-label text-[10px] uppercase tracking-widest font-bold hover:bg-primary hover:text-black transition-colors shadow-lg"
                            >
                              Approve Quotation
                            </button>
                          </div>
                        )}

                      {/* Payment simulation button */}
                      {selectedBooking.pricing?.pendingBalance > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentAmount(
                              selectedBooking.pricing.paymentStatus === 'unpaid'
                                ? selectedBooking.pricing.depositAmount
                                : selectedBooking.pricing.pendingBalance,
                            );
                            setIsPaymentModalOpen(true);
                          }}
                          className="w-full mt-4 bg-primary text-white py-2.5 rounded-full font-label text-[9px] uppercase tracking-widest font-bold shadow-md hover:shadow-primary/10 transition-all flex items-center justify-center gap-1.5"
                        >
                          Lodge Milestone Payment
                          <span className="material-symbols-outlined text-[16px]">
                            account_balance_wallet
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Creative design Live Studio Chat thread — desktop only */}
                <div className="hidden lg:flex lg:col-span-4 bg-surface-bright border border-outline-variant/30 rounded-lg p-5 shadow-2xs flex-col h-[600px] lg:sticky lg:top-24 text-[11px]">
                  <div className="border-b border-outline-variant/20 pb-3 shrink-0 flex items-center justify-between">
                    <div>
                      <span className="font-label text-[8px] uppercase tracking-widest text-primary font-bold block">
                        LIVE WORKSPACE
                      </span>
                      <h4 className="font-display text-sm text-black font-bold">
                        Creative Design Studio Chat
                      </h4>
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
                            {isAdmin ? 'Siri Arts Designer' : 'You'}
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
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Chat Bottom-Sheet Drawer (lg:hidden equivalent — only rendered & shown on mobile) */}
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
              className="relative z-10 bg-white rounded-t-[28px] flex flex-col"
              style={{ height: '82vh' }}
            >
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
                  <span className="material-symbols-outlined text-[18px] text-primary animate-pulse">
                    forum
                  </span>
                  <button
                    onClick={() => setIsMobileChatOpen(false)}
                    className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[18px] text-black/60">
                      close
                    </span>
                  </button>
                </div>
              </div>

              {/* Messages list */}
              <div className="flex-1 overflow-y-auto py-4 px-5 space-y-4 no-scrollbar flex flex-col">
                {selectedBooking.chatHistory?.length === 0 || !selectedBooking.chatHistory ? (
                  <div className="flex flex-col items-center justify-center flex-1 gap-3 py-12">
                    <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[28px]">
                        chat_bubble_outline
                      </span>
                    </div>
                    <p className="font-body text-xs text-black/45 text-center max-w-[200px] leading-relaxed">
                      Send a message to discuss color palettes, venue dimensions, or prop
                      customizations.
                    </p>
                  </div>
                ) : (
                  selectedBooking.chatHistory.map((chat, idx) => {
                    const isAdmin = chat.sender === 'admin';
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col max-w-[82%] ${isAdmin ? 'self-start text-left' : 'self-end text-right ml-auto'}`}
                      >
                        <span className="font-label text-[8px] text-black/35 font-bold uppercase tracking-widest mb-1 block">
                          {isAdmin ? 'Siri Arts Designer' : 'You'}
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
                  <span className="material-symbols-outlined text-[17px]">send</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment simulation modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-bright rounded-lg border border-outline-variant/30 shadow-2xl p-6 md:p-8 max-w-md w-full relative z-10 space-y-6"
            >
              <div className="flex justify-between items-start border-b border-outline-variant/20 pb-3">
                <div className="space-y-0.5">
                  <span className="font-label text-[8px] uppercase tracking-widest text-primary font-bold">
                    MILESTONE TRANSACTION
                  </span>
                  <h3 className="font-display text-lg text-on-surface font-bold">
                    Lodge UPI/Credit Milestone Payment
                  </h3>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center active:scale-90"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <form onSubmit={handleProcessPayment} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-label text-[8px] uppercase tracking-widest text-secondary font-bold block">
                    Payment Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 bg-surface-container-low text-xs font-semibold focus:border-primary outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-[8px] uppercase tracking-widest text-secondary font-bold block">
                    Payment Stage Description
                  </label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 bg-surface-container-low text-xs focus:border-primary outline-none"
                    required
                  />
                </div>

                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 space-y-1 text-[11px] leading-relaxed">
                  <span className="font-display font-bold text-primary block">
                    💳 Gilded UPI gateway simulation:
                  </span>
                  <p className="text-secondary">
                    Clicking below will simulate a secure UPI transaction callback and log credit
                    milestones directly into your Siri Arts & Crafts workspace ledger.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-black text-white py-2.5 rounded-full font-label text-[9px] uppercase tracking-widest font-bold hover:bg-primary hover:text-black transition-colors shadow-md"
                >
                  Confirm simulated deposit
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
