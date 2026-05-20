import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SEO } from "../components/seo/SEO";
import { bookingService } from "../services/domainServices";
import { MandalaArtDecor } from "../components/ui/MandalaArtDecor";
import toast from "react-hot-toast";

const STATUS_STEPS = [
  { id: "inquiry", label: "Inquiry Received", desc: "Our design team is checking setup details" },
  { id: "review", label: "Under Review", desc: "Design architects are mapping prop blueprint dimensions" },
  { id: "discussion", label: "Design Workspace", desc: "Live color palette and layout adjustments" },
  { id: "quotation_sent", label: "Quotation Compiled", desc: "Quotation is active. Awaiting your approval" },
  { id: "confirmed", label: "Booking Confirmed", desc: "Logistics, vehicles, and inventories are locked" },
  { id: "team_assigned", label: "Artisans Assigned", desc: "Setup crews and site leads allocated" },
  { id: "setup_in_progress", label: "Setup In Progress", desc: "Crews are assembling structures onsite" },
  { id: "active", label: "Event Active", desc: "The cinematic setup is complete & live" },
  { id: "pickup_scheduled", label: "Pickup Scheduled", desc: "Crews returning to venue for catalog disassembly" },
  { id: "completed", label: "Completed", desc: "Logistics completed & inventory returned" },
];

export function EventCustomerDashboard() {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chat State
  const [chatMessage, setChatMessage] = useState("");
  const chatEndRef = useRef(null);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("Milestone Deposit");

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
      console.error(err);
      toast.error("Failed to sync event bookings catalog.");
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
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedBooking?.chatHistory]);

  const handleApproveQuote = async (approved) => {
    if (!selectedBooking) return;
    const loadId = toast.loading("Recording your quotation response...");
    try {
      const res = await bookingService.respondQuote(selectedBooking._id || selectedBooking.id, approved);
      toast.dismiss(loadId);
      if (res.success) {
        toast.success(approved ? "Estimate approved successfully!" : "Quote marked for revision.");
        // Reload details
        const updated = await bookingService.getById(selectedBooking._id || selectedBooking.id);
        if (updated.success) {
          setSelectedBooking(updated.data);
          // Sync with main list
          setBookings(prev => prev.map(b => (b._id === updated.data._id ? updated.data : b)));
        }
      }
    } catch (err) {
      toast.dismiss(loadId);
      console.error(err);
      toast.error("Error submitting response.");
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedBooking) return;

    try {
      const res = await bookingService.postChat(selectedBooking._id || selectedBooking.id, chatMessage);
      if (res.success) {
        setChatMessage("");
        const updated = await bookingService.getById(selectedBooking._id || selectedBooking.id);
        if (updated.success) {
          setSelectedBooking(updated.data);
          setBookings(prev => prev.map(b => (b._id === updated.data._id ? updated.data : b)));
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to post message.");
    }
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0 || !selectedBooking) {
      toast.error("Please specify a valid transaction amount.");
      return;
    }

    const loadId = toast.loading("Processing milestone transaction...");
    try {
      const res = await bookingService.submitPayment(selectedBooking._id || selectedBooking.id, {
        amount: amt,
        transactionId: `UPI-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        note: paymentNote,
      });
      toast.dismiss(loadId);
      if (res.success) {
        toast.success(`Milestone payment of ₹${amt.toLocaleString("en-IN")} lodged successfully!`);
        setIsPaymentModalOpen(false);
        setPaymentAmount("");
        // Reload
        const updated = await bookingService.getById(selectedBooking._id || selectedBooking.id);
        if (updated.success) {
          setSelectedBooking(updated.data);
          setBookings(prev => prev.map(b => (b._id === updated.data._id ? updated.data : b)));
        }
      }
    } catch (err) {
      toast.dismiss(loadId);
      console.error(err);
      toast.error("Transaction error. Please try again.");
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Find active step index in status list
  const currentStatusIndex = selectedBooking
    ? STATUS_STEPS.findIndex((s) => s.id === selectedBooking.status)
    : 0;

  return (
    <div className="bg-[#fbf9f6] min-h-screen text-on-surface pt-20 md:pt-32 pb-24 relative overflow-hidden font-body">
      <SEO title="My Events Workspace | Siri Arts & Crafts" description="Track your live event timelines, coordinate theme palette adjustments, and manage payments." />

      <MandalaArtDecor variant={2} size={450} className="-top-24 -right-24 absolute opacity-[0.06] z-0" spinDuration={240} />

      <div className="max-w-[1300px] mx-auto px-4 relative z-10">
        {/* Editorial Heading */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-black/5 pb-6">
          <div className="space-y-1">
            <span className="font-label text-[10px] md:text-[11px] uppercase tracking-[0.4em] text-primary font-bold block">
              PORTFOLIO STUDIO
            </span>
            <h1 className="font-display text-[26px] md:text-[44px] text-black font-light tracking-tight leading-none">
              My Event Design Center.
            </h1>
          </div>
          <Link
            to="/events"
            className="bg-black text-white px-6 py-2.5 rounded-full font-label text-[10px] uppercase tracking-widest font-bold hover:bg-primary hover:text-black transition-colors self-start md:self-auto flex items-center gap-1.5"
          >
            Browse Events & Setups
            <span className="material-symbols-outlined text-[14px] normal-case">add</span>
          </Link>
        </div>

        {loading && bookings.length === 0 ? (
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          /* Empty Curation Workspace state */
          <div className="text-center py-20 bg-white rounded-3xl border border-black/5 shadow-xl max-w-xl mx-auto px-6 space-y-6">
            <div className="w-20 h-20 bg-primary/5 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[36px] normal-case">event_busy</span>
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl text-black font-bold">No Active Visual Workspaces</h3>
              <p className="font-body text-black/45 text-xs max-w-sm mx-auto leading-relaxed">
                You do not have any active side-stage event setups logged. Explore traditional Telugu presentations, jewelry tray packages, or coconut carving sets today.
              </p>
            </div>
            <Link
              to="/events"
              className="inline-block bg-primary text-white px-8 py-3 rounded-full font-label text-[10px] uppercase tracking-widest font-bold shadow-lg hover:shadow-primary/10 transition-all"
            >
              Browse Events & Setups
            </Link>
          </div>
        ) : (
          /* Main Workspace Dashboard */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sidebar list of active client bookings */}
            <div className="lg:col-span-3 space-y-4">
              <h3 className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold">Celebrations list</h3>
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div
                    key={b._id || b.id}
                    onClick={() => handleSelectBooking(b)}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                      selectedBooking?._id === b._id
                        ? "bg-white border-primary/40 shadow-lg scale-[1.02]"
                        : "border-black/5 hover:border-black/10 bg-white/70"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="bg-primary/5 text-primary px-2 py-0.5 rounded-full font-label text-[8px] uppercase tracking-widest font-bold">
                          {b.eventType}
                        </span>
                        <span className="font-mono text-[9px] text-black/30">
                          {new Date(b.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <h4 className="font-display text-[14px] text-black font-bold truncate leading-tight">{b.title}</h4>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-black/40">Status:</span>
                        <span className="font-semibold text-primary capitalize">{b.status.replace("_", " ")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Booking interactive board */}
            {selectedBooking && (
              <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                {/* Center Column: Timelines, Logistics, Invoices & Quotations */}
                <div className="md:col-span-7 space-y-8">
                  {/* Visual Setup/Inquiry Details */}
                  <div className="bg-white rounded-3xl border border-black/5 p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
                    <div className="flex justify-between items-start border-b border-black/5 pb-4">
                      <div>
                        <span className="font-label text-[9px] text-primary uppercase tracking-[0.2em] font-bold block mb-1">
                          Booking Details
                        </span>
                        <h2 className="font-display text-[22px] text-black font-light tracking-tight">{selectedBooking.title}</h2>
                      </div>
                      <span className="bg-stone-100 text-stone-700 px-3 py-1 rounded-full font-label text-[9px] uppercase tracking-widest font-bold">
                        ID: {selectedBooking._id?.substring(18).toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
                      <div className="space-y-0.5">
                        <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">Event Style</span>
                        <span className="font-body text-xs text-black font-bold capitalize">{selectedBooking.eventType}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">Event Date</span>
                        <span className="font-body text-xs text-black font-bold">
                          {new Date(selectedBooking.date).toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">Timing Window</span>
                        <span className="font-body text-xs text-black font-semibold">
                          {selectedBooking.timing?.start} - {selectedBooking.timing?.end}
                        </span>
                      </div>
                      <div className="space-y-0.5 sm:col-span-2">
                        <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">Setup Destination Address</span>
                        <span className="font-body text-xs text-stone-700 font-medium block leading-relaxed">
                          {selectedBooking.venue?.address}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">Setup Type</span>
                        <span className="font-body text-xs text-black font-bold">
                          {selectedBooking.venue?.isOutdoor ? "🍀 Outdoor Lawn" : "🏛️ Indoor Banquet"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Setup/Pickup Timing & Teams */}
                  {(selectedBooking.setupTiming || selectedBooking.pickupTiming || selectedBooking.assignedTeam?.length > 0) && (
                    <div className="bg-white rounded-3xl border border-black/5 p-6 md:p-8 space-y-6 shadow-xl">
                      <h3 className="font-display text-lg text-black font-bold border-b border-black/5 pb-2">Logistics & Crew Roster</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Setup schedule */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-primary">
                            <span className="material-symbols-outlined text-[18px]">build</span>
                            <span className="font-label text-[9px] uppercase tracking-wider font-bold">Decoration Setup Schedule</span>
                          </div>
                          <span className="font-body text-xs text-stone-700 font-bold block">
                            {selectedBooking.setupTiming
                              ? new Date(selectedBooking.setupTiming).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                              : "Pending Logistics Finalization"}
                          </span>
                        </div>

                        {/* Pickup schedule */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-primary">
                            <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                            <span className="font-label text-[9px] uppercase tracking-wider font-bold">Prop Pickup & Disassembly</span>
                          </div>
                          <span className="font-body text-xs text-stone-700 font-bold block">
                            {selectedBooking.pickupTiming
                              ? new Date(selectedBooking.pickupTiming).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                              : "Pending Logistics Finalization"}
                          </span>
                        </div>

                        {/* Assigned team */}
                        {selectedBooking.assignedTeam?.length > 0 && (
                          <div className="sm:col-span-2 space-y-3 pt-2">
                            <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">Assigned Setup Team</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {selectedBooking.assignedTeam.map((team, idx) => (
                                <div key={idx} className="p-3 bg-stone-50 border border-black/5 rounded-xl flex items-center justify-between">
                                  <div>
                                    <span className="font-body text-xs text-black font-bold block">{team.name}</span>
                                    <span className="font-body text-[10px] text-black/40 block capitalize">{team.role}</span>
                                  </div>
                                  {team.contact && (
                                    <a href={`tel:${team.contact}`} className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                                      <span className="material-symbols-outlined text-[16px]">call</span>
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

                  {/* Vertical interactive timeline status indicators */}
                  <div className="bg-white rounded-3xl border border-black/5 p-6 md:p-8 space-y-6 shadow-xl">
                    <h3 className="font-display text-lg text-black font-bold border-b border-black/5 pb-2">Setup Timeline Progress</h3>
                    <div className="relative pl-6 border-l border-black/5 space-y-6 ml-2">
                      {STATUS_STEPS.map((step, idx) => {
                        const isPast = currentStatusIndex > idx;
                        const isCurrent = currentStatusIndex === idx;
                        return (
                          <div key={step.id} className="relative group/step">
                            <div className={`absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full border-2 transition-colors flex items-center justify-center ${
                              isCurrent ? "bg-primary border-primary scale-110 shadow-lg" : isPast ? "bg-primary/25 border-primary" : "bg-white border-black/10"
                            }`}>
                              {isPast && <span className="material-symbols-outlined text-[10px] text-primary font-bold">check</span>}
                            </div>
                            <div className="space-y-0.5">
                              <h4 className={`font-display text-[13px] font-bold ${isCurrent ? "text-primary font-bold" : isPast ? "text-black/60 font-semibold" : "text-black/35 font-normal"}`}>
                                {step.label}
                              </h4>
                              <p className="font-body text-[10px] text-black/40 leading-relaxed font-light">{step.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Financial Quotation Summary details */}
                  <div className="bg-white rounded-3xl border border-black/5 p-6 md:p-8 space-y-6 shadow-xl">
                    <div className="flex justify-between items-center border-b border-black/5 pb-2">
                      <h3 className="font-display text-lg text-black font-bold">Quotation Estimate Details</h3>
                      <span className={`px-2.5 py-0.5 rounded-full font-label text-[8px] uppercase tracking-widest font-bold ${
                        selectedBooking.clientApproved ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        {selectedBooking.clientApproved ? "Approved by Client" : "Awaiting Client Approval"}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between"><span className="text-black/50">Event Decor & Rental:</span><span className="text-black font-semibold">₹{selectedBooking.pricing?.rentalFee?.toLocaleString("en-IN")}</span></div>
                      <div className="flex justify-between"><span className="text-black/50">Bespoke Setup Logistics Crew Labor:</span><span className="text-black font-semibold">₹{selectedBooking.pricing?.setupCharges?.toLocaleString("en-IN")}</span></div>
                      <div className="flex justify-between"><span className="text-black/50">Logistics Transportation Fleet Cost:</span><span className="text-black font-semibold">₹{selectedBooking.pricing?.transportationCost?.toLocaleString("en-IN")}</span></div>
                      {selectedBooking.selectedAddons?.map((addon, idx) => (
                        <div key={idx} className="flex justify-between"><span className="text-black/50">+ {addon.name}:</span><span className="text-black font-semibold">₹{addon.price?.toLocaleString("en-IN")}</span></div>
                      ))}

                      <div className="border-t border-black/5 pt-4 flex justify-between items-end">
                        <span className="font-display text-sm text-black font-bold">Total Estimate Contract Price:</span>
                        <span className="font-display text-lg text-black font-bold italic">₹{selectedBooking.pricing?.totalPrice?.toLocaleString("en-IN")}</span>
                      </div>

                      <div className="border-t border-black/5 pt-4 flex justify-between items-end">
                        <div className="space-y-0.5">
                          <span className="font-display text-[11px] text-stone-900 font-bold block">Milestone Deposit Required:</span>
                          <span className="font-body text-[10px] text-black/40 block">25% to confirm schedules</span>
                        </div>
                        <span className="font-display text-sm text-primary font-bold">₹{selectedBooking.pricing?.depositAmount?.toLocaleString("en-IN")}</span>
                      </div>

                      <div className="border-t border-black/5 pt-4 flex justify-between items-end">
                        <div className="space-y-0.5">
                          <span className="font-display text-[11px] text-stone-900 font-bold block">Pending Balance Remaining:</span>
                          <span className="font-body text-[10px] text-black/40 block capitalize">Payment Status: {selectedBooking.pricing?.paymentStatus}</span>
                        </div>
                        <span className="font-display text-lg text-black font-bold italic">₹{selectedBooking.pricing?.pendingBalance?.toLocaleString("en-IN")}</span>
                      </div>

                      {/* Action buttons on Quote status */}
                      {selectedBooking.status === "quotation_sent" && !selectedBooking.clientApproved && (
                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-black/5 mt-4">
                          <button
                            onClick={() => handleApproveQuote(false)}
                            className="py-3 rounded-full border border-stone-950/20 text-stone-800 font-label text-[10px] uppercase tracking-widest font-bold hover:bg-stone-50 transition-colors"
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
                            setPaymentAmount(selectedBooking.pricing.paymentStatus === "unpaid" ? selectedBooking.pricing.depositAmount : selectedBooking.pricing.pendingBalance);
                            setIsPaymentModalOpen(true);
                          }}
                          className="w-full mt-4 bg-primary text-white py-3 rounded-full font-label text-[10px] uppercase tracking-widest font-bold shadow-lg hover:shadow-primary/10 transition-all flex items-center justify-center gap-1.5"
                        >
                          Lodge Milestone Payment
                          <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Creative design Live Studio Chat thread */}
                <div className="md:col-span-5 bg-white rounded-3xl border border-black/5 p-4 md:p-6 shadow-xl flex flex-col h-[600px]">
                  <div className="border-b border-black/5 pb-3 shrink-0 flex items-center justify-between">
                    <div>
                      <span className="font-label text-[8px] uppercase tracking-widest text-primary font-bold block">LIVE WORKSPACE</span>
                      <h4 className="font-display text-sm text-black font-bold">Creative Design Studio Chat</h4>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-primary animate-pulse">forum</span>
                  </div>

                  {/* Messages list */}
                  <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 no-scrollbar flex flex-col">
                    {selectedBooking.chatHistory?.map((chat, idx) => {
                      const isAdmin = chat.sender === "admin";
                      return (
                        <div key={idx} className={`flex flex-col max-w-[80%] ${isAdmin ? "self-start text-left" : "self-end text-right ml-auto"}`}>
                          <span className="font-label text-[8px] text-black/35 font-bold uppercase tracking-widest mb-1 block">
                            {isAdmin ? "Siri Arts Designer" : "You"}
                          </span>
                          <div className={`p-3.5 rounded-[18px] text-xs leading-relaxed font-light ${
                            isAdmin ? "bg-stone-100 text-stone-900 rounded-tl-none" : "bg-black text-white rounded-tr-none"
                          }`}>
                            {chat.message}
                          </div>
                          <span className="font-mono text-[8px] text-black/25 mt-1 block">
                            {new Date(chat.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Message Input box */}
                  <form onSubmit={handleSendChat} className="border-t border-black/5 pt-3 shrink-0 flex items-center gap-2 mt-auto">
                    <input
                      type="text"
                      placeholder="Discuss color swatches, venue details..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      className="flex-1 bg-[#FAF9F6] border border-black/5 px-4 py-2.5 rounded-full text-xs outline-none focus:border-primary/45 transition-colors"
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

      {/* Payment simulation modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPaymentModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[24px] border border-black/5 shadow-2xl p-6 md:p-8 max-w-md w-full relative z-10 space-y-6"
            >
              <div className="flex justify-between items-start border-b border-black/5 pb-3">
                <div className="space-y-0.5">
                  <span className="font-label text-[8px] uppercase tracking-widest text-primary font-bold">MILESTONE TRANSACTION</span>
                  <h3 className="font-display text-lg text-black font-bold">Lodge UPI/Credit Milestone Payment</h3>
                </div>
                <button onClick={() => setIsPaymentModalOpen(false)} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center active:scale-90">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <form onSubmit={handleProcessPayment} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-label text-[8px] uppercase tracking-widest text-black/50 font-bold block">Payment Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-xs font-semibold focus:border-primary outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-[8px] uppercase tracking-widest text-black/50 font-bold block">Payment Stage Description</label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full px-4 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-xs focus:border-primary outline-none"
                    required
                  />
                </div>

                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-1 text-[11px] leading-relaxed">
                  <span className="font-display font-bold text-primary block">💳 Gilded UPI gateway simulation:</span>
                  <p className="text-stone-600">Clicking below will simulate a secure UPI transaction callback and log credit milestones directly into your Siri Arts studio workspace ledger.</p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-black text-white py-3.5 rounded-full font-label text-[10px] uppercase tracking-widest font-bold hover:bg-primary hover:text-black transition-colors shadow-lg"
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
