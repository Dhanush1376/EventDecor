import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { customOrderService } from "../../services/domainServices";
import { useAdmin } from "../context/AdminContext";
import toast from "react-hot-toast";

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export function AdminInquiries() {
  const { searchQuery } = useAdmin();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  
  // Workspace tabs: 'active' (Orders List), 'config' (Edit Form Options)
  const [currentWorkspace, setCurrentWorkspace] = useState("active");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ─── ADMIN CHAT & MESSAGE NOTES ───
  const [adminMessageText, setAdminMessageText] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatEndRef = useRef(null);

  // ─── DYNAMIC FORM OPTIONS ───
  const [cmsConfig, setCmsConfig] = useState(null);
  const [isSavingCMS, setIsSavingCMS] = useState(false);

  // ─── QUOTATION BUILDER STATES ───
  const [quoteItems, setQuoteItems] = useState([{ description: "", amount: 0 }]);
  const [quoteTax, setQuoteTax] = useState(0);
  const [quoteShipping, setQuoteShipping] = useState(0);
  const [quoteNotes, setQuoteNotes] = useState("");

  // Sync active lists and form options
  const fetchAdminWorkspaceData = async () => {
    setLoading(true);
    try {
      const res = await customOrderService.adminGetAll({ archived: "false" });
      if (res.success) {
        setOrders(res.data?.items || res.data || []);
      } else {
        setOrders(res.items || res || []);
      }

      const configRes = await customOrderService.getConfig();
      if (configRes?.success) {
        setCmsConfig(configRes.data);
      } else {
        setCmsConfig(configRes);
      }
    } catch (err) {
      toast.error("Failed to load custom orders list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminWorkspaceData();
  }, []);

  // Scroll chat feed
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedOrder?.messages]);

  // Sync quotation items when order is selected
  useEffect(() => {
    if (selectedOrder) {
      if (selectedOrder.quotation?.items && selectedOrder.quotation.items.length > 0) {
        setQuoteItems(selectedOrder.quotation.items.map(it => ({ description: it.description, amount: it.amount })));
      } else {
        // Set standard base quote matching the client budget parameter or 25,000 as preset
        setQuoteItems([{ description: "Custom Decor Setup & Designing", amount: selectedOrder.budget || 25000 }]);
      }
      setQuoteTax(selectedOrder.quotation?.tax || 0);
      setQuoteShipping(selectedOrder.quotation?.shipping || 0);
      setQuoteNotes(selectedOrder.quotation?.notes || "");
    }
  }, [selectedOrder]);

  // Compute estimate summaries live
  const liveQuoteTotal = useMemo(() => {
    const sum = quoteItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    return sum + Number(quoteTax) + Number(quoteShipping);
  }, [quoteItems, quoteTax, quoteShipping]);

  // ─── ADMIN PIPELINE ACTIONS ───
  const handleUpdateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const res = await customOrderService.adminUpdateStatus(id, newStatus);
      if (res.success) {
        toast.success(`Order status updated to: ${newStatus}`);
        setOrders(prev => prev.map(o => o._id === id ? res.data : o));
        if (selectedOrder?._id === id) setSelectedOrder(res.data);
      }
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdatePriority = async (id, newPriority) => {
    try {
      const res = await customOrderService.adminUpdatePriority(id, newPriority);
      if (res.success) {
        toast.success(`Priority set to ${newPriority.toUpperCase()}`);
        setOrders(prev => prev.map(o => o._id === id ? res.data : o));
        if (selectedOrder?._id === id) setSelectedOrder(res.data);
      }
    } catch (err) {
      toast.error("Failed to change priority");
    }
  };

  const handleSaveAdminNotes = async (id, notesVal) => {
    try {
      const res = await customOrderService.adminUpdateNotes(id, notesVal);
      if (res.success) {
        toast.success("Internal notes saved");
        setOrders(prev => prev.map(o => o._id === id ? res.data : o));
        if (selectedOrder?._id === id) setSelectedOrder(res.data);
      }
    } catch (err) {
      toast.error("Failed to save internal notes");
    }
  };

  const handleDispatchQuotation = async () => {
    if (!selectedOrder) return;
    setUpdatingId(selectedOrder._id);
    try {
      const payload = {
        items: quoteItems.filter(it => it.description.trim() !== ""),
        tax: Number(quoteTax) || 0,
        shipping: Number(quoteShipping) || 0,
        notes: quoteNotes,
        status: "sent"
      };

      const res = await customOrderService.adminUpdateQuotation(selectedOrder._id, payload);
      if (res.success) {
        toast.success("Quotation sent to customer successfully!");
        setOrders(prev => prev.map(o => o._id === selectedOrder._id ? res.data : o));
        setSelectedOrder(res.data);
      }
    } catch (err) {
      toast.error("Failed to compile quotation");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSendAdminChatMessage = async (e) => {
    if (e) e.preventDefault();
    if (!adminMessageText.trim() || !selectedOrder) return;

    setIsSendingMessage(true);
    try {
      const res = await customOrderService.postMessage(selectedOrder._id, adminMessageText.trim());
      if (res.success) {
        setSelectedOrder(res.data);
        setAdminMessageText("");
        setOrders(prev => prev.map(o => o._id === selectedOrder._id ? res.data : o));
      }
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleArchiveOrder = async (id) => {
    try {
      const res = await customOrderService.adminArchive(id, true);
      if (res.success) {
        toast.success("Order archived successfully");
        setOrders(prev => prev.filter(o => o._id !== id));
        setSelectedOrder(null);
      }
    } catch (err) {
      toast.error("Failed to archive order");
    }
  };

  const handleSaveCMSConfig = async () => {
    if (!cmsConfig) return;
    setIsSavingCMS(true);
    try {
      const res = await customOrderService.updateConfig(cmsConfig);
      if (res.success) {
        toast.success("Storefront form options saved successfully!");
      }
    } catch (err) {
      toast.error("Failed to save storefront options");
    } finally {
      setIsSavingCMS(false);
    }
  };

  // ─── ANALYTICS SUMMARIES ───
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === "Pending").length;
    const quotesSent = orders.filter(o => o.status === "Quote Sent").length;
    const approved = orders.filter(o => o.status === "Approved").length;
    const valuation = orders.reduce((sum, o) => sum + (o.quotation?.total || 0), 0);
    return { total, pending, quotesSent, approved, valuation };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    
    if (statusFilter !== "All") {
      list = list.filter(o => o.status === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o =>
        (o.customerName || "").toLowerCase().includes(q) ||
        (o.customerEmail || "").toLowerCase().includes(q) ||
        (o.occasion || "").toLowerCase().includes(q) ||
        (o.productType || "").toLowerCase().includes(q) ||
        (o.city || "").toLowerCase().includes(q) ||
        (o._id || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, statusFilter, searchQuery]);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1440px] mx-auto space-y-6 font-body text-[#0F172A]"
    >
      
      {/* Page Header Area */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#0F172A]/10 pb-5">
        <div>
          <h1 className="text-[26px] font-light text-[#0F172A] font-display">
            Custom Orders Manager
          </h1>
          <p className="text-[12px] text-[#64748B] font-light tracking-wide mt-0.5">
            Manage custom customer requests, write quotations, chat with customers, and edit storefront form options.
          </p>
        </div>

        <div className="flex bg-[#F2EFE9] p-1 rounded-full border border-black/5 self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setCurrentWorkspace("active")}
            className={`px-5 py-2.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-300 ${
              currentWorkspace === "active" ? "bg-[#0F172A] text-white shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Orders List
          </button>
          <button
            onClick={() => setCurrentWorkspace("config")}
            className={`px-5 py-2.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-300 ${
              currentWorkspace === "config" ? "bg-[#0F172A] text-white shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Edit Form Options
          </button>
        </div>
      </motion.div>

      {/* ─── WORKSPACE: PIPELINES RETAIN GRID ─── */}
      {currentWorkspace === "active" && (
        <div className="space-y-6">
          
          {/* Enhanced Premium Analytics Panel */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Total Orders", val: stats.total, icon: "assignment_late", color: "bg-white border-black/5 hover:border-[#000000]/30 text-[#0F172A]" },
              { label: "New Requests", val: stats.pending, icon: "fiber_new", color: "bg-white border-black/5 hover:border-[#000000]/30 text-[#000000]" },
              { label: "Quotes Sent", val: stats.quotesSent, icon: "payments", color: "bg-white border-black/5 hover:border-[#000000]/30 text-black" },
              { label: "Approved Orders", val: stats.approved, icon: "task_alt", color: "bg-white border-black/5 hover:border-[#000000]/30 text-emerald-600" },
              { label: "Total Quote Value", val: `₹${stats.valuation.toLocaleString("en-IN")}`, icon: "trending_up", color: "bg-white border-black/5 hover:border-[#000000]/30 text-[#64748B]" }
            ].map((s, i) => (
              <div key={i} className={`rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${s.color}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="material-symbols-outlined text-[20px] opacity-75">{s.icon}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#000000]" />
                </div>
                <p className="text-[22px] font-bold font-mono tracking-tight">{s.val}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Luxury Status Pipeline Segment Controls */}
          <motion.div variants={fadeUp} className="flex flex-wrap gap-2 border-b border-black/5 pb-4">
            {["All", "Pending", "Reviewing", "Quote Sent", "Approved", "In Progress", "Ready", "Delivered", "Cancelled"].map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-4 py-2 rounded-full text-[10.5px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer border ${
                  statusFilter === tab
                    ? "bg-[#0F172A] border-[#0F172A] text-white shadow-sm"
                    : "bg-white border-black/5 text-[#64748B] hover:text-[#0F172A] hover:border-black/15"
                }`}
              >
                {tab}
                {orders.filter(o => tab === "All" ? true : o.status === tab).length > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                    statusFilter === tab ? "bg-white text-[#0F172A]" : "bg-[#F2EFE9] text-[#64748B]"
                  }`}>
                    {orders.filter(o => tab === "All" ? true : o.status === tab).length}
                  </span>
                )}
              </button>
            ))}
          </motion.div>

          {/* Full-Width Catalog Grid Table */}
          <div className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px] min-w-[900px]">
                <thead>
                  <tr className="bg-[#F8F9FB] border-b border-black/5 text-[#64748B] font-bold uppercase tracking-wider">
                    <th className="p-4.5 pl-6">Customer Name</th>
                    <th className="p-4.5">Occasion</th>
                    <th className="p-4.5">Product Type</th>
                    <th className="p-4.5">Event Date</th>
                    <th className="p-4.5">Priority</th>
                    <th className="p-4.5">Status</th>
                    <th className="p-4.5 text-right pr-6">Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-20 text-center text-[#64748B] bg-white">
                        <span className="material-symbols-outlined text-[48px] text-black/15 mb-2 block">search_off</span>
                        <p className="text-[14px] font-bold text-[#0F172A]">Data Not Found</p>
                        <p className="text-[11.5px] text-[#64748B] mt-1 max-w-[280px] mx-auto">No custom orders found matching your search.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(order => {
                      const dateStr = order.eventDate ? new Date(order.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "TBD";
                      const customerInitial = (order.customerName || "C").charAt(0).toUpperCase();

                      return (
                        <tr
                          key={order._id}
                          onClick={() => setSelectedOrder(order)}
                          className="border-b border-black/5 hover:bg-[#F8F9FB] cursor-pointer transition-all duration-300 border-l-4 border-l-transparent hover:border-l-[#000000]"
                        >
                          <td className="p-4.5 pl-6 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#F8F9FB] border border-black/5 text-[#000000] flex items-center justify-center font-bold font-display text-[13px] shadow-sm">
                              {customerInitial}
                            </div>
                            <div>
                              <p className="font-bold text-[#0F172A]">{order.customerName}</p>
                              <span className="text-[10px] text-[#64748B]/70 font-mono tracking-tight">{order.customerEmail}</span>
                            </div>
                          </td>
                          <td className="p-4.5 font-bold uppercase tracking-wider text-[#0F172A]/80">{order.occasion}</td>
                          <td className="p-4.5 text-[#64748B]">{order.productType}</td>
                          <td className="p-4.5 font-mono text-[#0F172A] font-light">{dateStr}</td>
                          <td className="p-4.5">
                            <select
                              value={order.priority}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleUpdatePriority(order._id, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className={`px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border cursor-pointer outline-none transition-all ${
                                order.priority === "high" ? "bg-red-50 text-red-700 border-red-200" :
                                order.priority === "medium" ? "bg-amber-50 text-amber-600 border-amber-200" :
                                "bg-gray-50 text-gray-600 border-gray-200"
                              }`}
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </td>
                          <td className="p-4.5">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              order.status === "Pending" ? "bg-amber-100 text-amber-700" :
                              order.status === "Approved" ? "bg-emerald-100 text-emerald-700" :
                              order.status === "Cancelled" ? "bg-red-100 text-red-700" :
                              "bg-blue-100 text-blue-700"
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="p-4.5 text-right pr-6 font-mono font-bold text-[#000000]">
                            {order.quotation?.total > 0 ? `₹${order.quotation.total.toLocaleString("en-IN")}` : "Custom Quote"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── SLIDING DRAWER DETAIL SHEET ─── */}
          <AnimatePresence>
            {selectedOrder && (
              <>
                {/* Backdrop overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedOrder(null)}
                  className="fixed inset-0 z-45 bg-[#0F172A]/30 backdrop-blur-sm"
                />

                {/* Sliding Content Drawer */}
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed top-0 right-0 h-full w-full max-w-[540px] bg-white z-50 shadow-2xl flex flex-col border-l border-black/5"
                >
                  {/* Drawer Header details */}
                  <div className="p-6 border-b border-black/5 flex items-start justify-between bg-[#F8F9FB]">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white border border-black/5 text-[#000000] flex items-center justify-center font-bold font-display text-[16px] shadow-sm">
                        {(selectedOrder.customerName || "C").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-[17px] font-bold text-[#0F172A]">{selectedOrder.customerName}</h3>
                        <p className="text-[11px] text-[#64748B] mt-0.5">{selectedOrder.customerEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/${selectedOrder.customerPhone?.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 rounded-full bg-white hover:bg-emerald-50 text-emerald-600 border border-black/5 flex items-center justify-center shadow-sm cursor-pointer transition-all active:scale-90"
                        title="WhatsApp Client"
                      >
                        <span className="material-symbols-outlined text-[18px]">chat</span>
                      </a>
                      <a
                        href={`mailto:${selectedOrder.customerEmail}`}
                        className="w-9 h-9 rounded-full bg-white hover:bg-slate-50 text-black border border-black/5 flex items-center justify-center shadow-sm cursor-pointer transition-all active:scale-90"
                        title="Email Client"
                      >
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                      </a>
                      <button
                        onClick={() => setSelectedOrder(null)}
                        className="w-9 h-9 rounded-full bg-white hover:bg-black/5 text-[#64748B] border border-black/5 flex items-center justify-center shadow-sm cursor-pointer transition-all active:scale-90"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Drawer Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Metadata Card grids */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#F8F9FB] p-4.5 rounded-2xl border border-black/5">
                      <div>
                        <span className="text-[8.5px] uppercase tracking-wider text-[#64748B] font-bold">Event Date & Location</span>
                        <p className="text-[12px] font-bold text-[#0F172A] mt-0.5">
                          {selectedOrder.eventDate ? new Date(selectedOrder.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "TBD"} • {selectedOrder.city || "Any Location"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[8.5px] uppercase tracking-wider text-[#64748B] font-bold">Consultation Type</span>
                        <p className="text-[12px] font-bold text-[#0F172A] mt-0.5">{selectedOrder.bookingType}</p>
                      </div>
                    </div>

                    {/* Customer directives */}
                    {selectedOrder.customRequirements && (
                      <div className="space-y-1.5 bg-[#F8F9FB] p-4.5 rounded-2xl border-2 border-dashed border-[#000000]/20">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#000000]">Customer's Special Requirements</span>
                        <p className="text-[12px] text-[#0F172A]/90 leading-relaxed italic">"{selectedOrder.customRequirements}"</p>
                      </div>
                    )}

                    {/* Inspiration visual decks & external links */}
                    {selectedOrder.inspirationImages?.length > 0 && (() => {
                      const isDirectImageUrl = (url) => {
                        if (!url) return false;
                        return url.match(/\.(jpeg|jpg|gif|png|webp|heic)/i) || url.includes("cloudinary.com");
                      };
                      const directImages = selectedOrder.inspirationImages.filter(isDirectImageUrl);
                      const externalLinks = selectedOrder.inspirationImages.filter(url => !isDirectImageUrl(url));

                      return (
                        <div className="space-y-3">
                          {directImages.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#64748B] block">Uploaded Inspiration Images ({directImages.length}):</span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {directImages.map((img, idx) => (
                                  <a
                                    key={idx}
                                    href={img}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative aspect-square rounded-xl overflow-hidden border border-black/5 shadow-sm hover:scale-105 transition-all duration-350 cursor-zoom-in"
                                  >
                                    <img src={img} alt="Inspiration preview" className="w-full h-full object-cover" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {externalLinks.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#64748B] block">Pasted Inspiration Links ({externalLinks.length}):</span>
                              <div className="flex flex-col gap-2">
                                {externalLinks.map((link, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-[#F8F9FB] border border-[#0F172A]/5 rounded-xl px-4 py-2">
                                    <div className="flex items-center gap-2 text-[11px] min-w-0">
                                      <span className="material-symbols-outlined text-[15px] text-[#000000] shrink-0">link</span>
                                      <a
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#0F172A] font-bold hover:underline truncate"
                                      >
                                        {link}
                                      </a>
                                    </div>
                                    <a
                                      href={link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#000000] hover:text-[#0F172A] text-[10px] uppercase font-bold tracking-wider shrink-0 pl-2 cursor-pointer"
                                    >
                                      Open Board
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Curator Correspondence Logs */}
                    <div className="space-y-3 pt-4 border-t border-black/5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#64748B] block">Customer Chat & History</span>
                      <div className="h-[200px] overflow-y-auto space-y-3 bg-[#F8F9FB] p-3 rounded-2xl border border-black/5 shadow-inner">
                        {selectedOrder.messages?.map((msg, i) => {
                          const isMe = msg.sender === "admin";
                          const isLog = msg.senderName === "System";

                          if (isLog) {
                            return (
                              <div key={i} className="text-center py-1">
                                <span className="px-2.5 py-1 bg-black/5 text-[#64748B] text-[8.5px] font-bold uppercase tracking-wider rounded-lg border border-black/5">{msg.text}</span>
                              </div>
                            );
                          }

                          return (
                            <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                              <span className="text-[8.5px] font-bold text-[#64748B] mb-0.5 px-1">{msg.senderName}</span>
                              <div className={`p-3 rounded-2xl text-[11.5px] leading-relaxed max-w-[85%] shadow-sm ${
                                isMe ? "bg-[#0F172A] text-white rounded-tr-none" : "bg-white text-[#0F172A] rounded-tl-none border border-black/5"
                              }`}>
                                {msg.text}
                              </div>
                            </div>
                          );
                        })}
                        <div ref={chatEndRef} />
                      </div>

                      <form onSubmit={handleSendAdminChatMessage} className="flex gap-2">
                        <input
                          type="text"
                          value={adminMessageText}
                          onChange={(e) => setAdminMessageText(e.target.value)}
                          placeholder="Type message to customer..."
                          className="flex-1 bg-[#F8F9FB] border border-black/15 rounded-full px-4 py-2.5 text-[12px] outline-none focus:border-[#000000] transition-all text-[#0F172A]"
                        />
                        <button
                          type="submit"
                          disabled={isSendingMessage || !adminMessageText.trim()}
                          className="w-10 h-10 rounded-full bg-[#0F172A] hover:bg-[#000000] text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                        >
                          <span className="material-symbols-outlined text-[16px]">send</span>
                        </button>
                      </form>
                    </div>

                    {/* Interactive estimate luxury receipt builder */}
                    <div className="space-y-4 pt-4 border-t border-black/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000] block">Create Quotation / Pricing</span>
                      
                      <div className="space-y-3.5 bg-[#F8F9FB] p-4 md:p-5 rounded-2xl border border-black/5 shadow-sm">
                        
                        {/* Price Breakdown Items list (Auto height, no ugly nested scrollbar!) */}
                        <div className="space-y-3">
                          {quoteItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-lg bg-black/5 text-[#64748B] flex items-center justify-center font-mono text-[9px] font-bold shrink-0">
                                {String(idx + 1).padStart(2, "0")}
                              </div>
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => {
                                  const next = [...quoteItems];
                                  next[idx].description = e.target.value;
                                  setQuoteItems(next);
                                }}
                                placeholder="Item Description (e.g. Stage Flower Decor)"
                                className="flex-1 bg-white border border-black/10 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#000000] text-[#0F172A] transition-all"
                              />
                              <div className="relative w-24 shrink-0">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[#64748B]">₹</span>
                                <input
                                  type="number"
                                  value={item.amount}
                                  onChange={(e) => {
                                    const next = [...quoteItems];
                                    next[idx].amount = Number(e.target.value) || 0;
                                    setQuoteItems(next);
                                  }}
                                  placeholder="Price"
                                  className="w-full bg-white border border-black/10 rounded-xl pl-5 pr-2 py-2 text-[12px] outline-none focus:border-[#000000] font-mono text-right text-[#0F172A]"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== idx))}
                                className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center cursor-pointer transition-all shrink-0 active:scale-90"
                                title="Remove Item"
                              >
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </div>
                          ))}
                          
                          <button
                            type="button"
                            onClick={() => setQuoteItems([...quoteItems, { description: "", amount: 0 }])}
                            className="w-full py-2 border border-dashed border-[#000000]/35 text-[#000000] hover:bg-[#000000]/5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">add</span> Add Price Item
                          </button>
                        </div>

                        {/* Taxes and Shipping side-by-side */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-black/5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-[#64748B] tracking-wider block">Taxes (₹)</label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[#64748B]">₹</span>
                              <input
                                type="number"
                                value={quoteTax}
                                onChange={(e) => setQuoteTax(Number(e.target.value) || 0)}
                                className="w-full bg-white border border-black/10 rounded-xl pl-5 pr-3 py-2 text-[12px] outline-none focus:border-[#000000] font-mono text-right text-[#0F172A]"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-[#64748B] tracking-wider block">Shipping & Setup (₹)</label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[#64748B]">₹</span>
                              <input
                                type="number"
                                value={quoteShipping}
                                onChange={(e) => setQuoteShipping(Number(e.target.value) || 0)}
                                className="w-full bg-white border border-black/10 rounded-xl pl-5 pr-3 py-2 text-[12px] outline-none focus:border-[#000000] font-mono text-right text-[#0F172A]"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Special Terms & Notes */}
                        <div className="space-y-1.5 pt-1">
                          <label className="text-[10px] font-bold uppercase text-[#64748B] tracking-wider block">Special Terms / Payment Notes</label>
                          <input
                            type="text"
                            value={quoteNotes}
                            onChange={(e) => setQuoteNotes(e.target.value)}
                            placeholder="E.g. 50% advance payment required, balance on event date..."
                            className="w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 text-[12px] outline-none focus:border-[#000000] text-[#0F172A] transition-all"
                          />
                        </div>

                        {/* Invoice Receipt Block */}
                        <div className="pt-3 border-t border-dashed border-black/10 space-y-1">
                          <div className="flex justify-between items-center font-bold text-[13px] pt-1 text-[#0F172A]">
                            <span>Grand Total:</span>
                            <span className="font-mono text-[15px] text-[#000000]">₹{liveQuoteTotal.toLocaleString("en-IN")}</span>
                          </div>
                        </div>

                      </div>

                      {/* Main action buttons */}
                      <div className="flex gap-2.5">
                        <button
                          type="button"
                          onClick={handleDispatchQuotation}
                          disabled={updatingId === selectedOrder._id}
                          className="flex-1 bg-[#0F172A] hover:bg-[#000000] text-white py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer text-center shadow-md active:scale-95 disabled:opacity-40"
                        >
                          Send Quotation to Customer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchiveOrder(selectedOrder._id)}
                          className="bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 px-4 rounded-xl text-[11px] font-bold uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                        >
                          Archive Order
                        </button>
                      </div>
                    </div>

                    {/* Elite Pipeline status selector card (replaces the cluttered 8-button grid!) */}
                    <div className="space-y-3 pt-4 border-t border-black/5">
                      <div className="bg-[#F8F9FB] p-4.5 rounded-2xl border border-black/5 flex items-center justify-between gap-4">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-[#64748B] font-bold">Active Status</span>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${
                              selectedOrder.status === "Pending" ? "bg-amber-500 animate-pulse" :
                              selectedOrder.status === "Approved" ? "bg-emerald-500" :
                              selectedOrder.status === "Cancelled" ? "bg-red-500" :
                              "bg-slate-900"
                            }`} />
                            <p className="text-[13px] font-bold uppercase tracking-wider text-[#0F172A]">{selectedOrder.status}</p>
                          </div>
                        </div>
                        
                        <div className="w-[180px] space-y-1">
                          <span className="text-[9px] uppercase tracking-wider text-[#64748B] font-bold block text-right">Change Status</span>
                          <div className="relative">
                            <select
                              value={selectedOrder.status}
                              onChange={(e) => handleUpdateStatus(selectedOrder._id, e.target.value)}
                              className="w-full bg-white border border-black/10 rounded-xl pl-3 pr-8 py-2 text-[11px] font-bold uppercase tracking-wider text-[#0F172A] outline-none focus:border-[#000000] cursor-pointer appearance-none shadow-sm"
                            >
                              {["Pending", "Reviewing", "Quote Sent", "Approved", "In Progress", "Ready", "Delivered", "Cancelled"].map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[15px] text-[#64748B] pointer-events-none">expand_more</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* ─── WORKSPACE: STOREFRONT CMS CONFIG CMS ─── */}
      {currentWorkspace === "config" && (
        <div className="bg-white rounded-3xl border border-black/5 p-6 md:p-8 space-y-6 shadow-sm max-w-4xl mx-auto">
          <div>
            <h2 className="text-[18px] font-bold text-[#0F172A] font-display">Manage Form Options (Storefront)</h2>
            <p className="text-[12px] text-[#64748B] font-light mt-0.5">Add, edit, or disable the occasion and product category options that customers see on the custom order form.</p>
          </div>

          {!cmsConfig ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <p className="text-[11px] text-[#64748B]">Syncing dynamic configs...</p>
            </div>
          ) : (
            <div className="space-y-6 pt-4 border-t border-black/5">
              
              {/* Occasions List Config */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-black/5 pb-2">
                  <h4 className="text-[11.5px] font-bold uppercase tracking-wider text-[#000000]">Occasions List (e.g. Wedding, Birthday)</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...(cmsConfig.occasions || [])];
                      next.push({ id: `custom_${Date.now()}`, label: "New Occasion Option", enabled: true });
                      setCmsConfig({ ...cmsConfig, occasions: next });
                    }}
                    className="text-[9.5px] text-[#0F172A] font-bold uppercase tracking-wider flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    + Add New Occasion
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cmsConfig.occasions?.map((oc, index) => (
                    <div key={oc.id} className="flex items-center gap-2 bg-[#F8F9FB] p-3 rounded-2xl border border-black/5">
                      <input
                        type="text"
                        value={oc.label}
                        onChange={(e) => {
                          const next = [...cmsConfig.occasions];
                          next[index].label = e.target.value;
                          setCmsConfig({ ...cmsConfig, occasions: next });
                        }}
                        className="flex-1 bg-white border border-black/10 rounded-xl px-3 py-1.5 text-[11px] outline-none focus:border-[#000000] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...cmsConfig.occasions];
                          next[index].enabled = !next[index].enabled;
                          setCmsConfig({ ...cmsConfig, occasions: next });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border cursor-pointer transition-all duration-300 ${
                          oc.enabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        {oc.enabled ? "Active" : "Disabled"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = cmsConfig.occasions.filter((_, idx) => idx !== index);
                          setCmsConfig({ ...cmsConfig, occasions: next });
                        }}
                        className="text-red-500 hover:text-red-600 font-bold px-2 text-[12px] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decor Categories Config */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-black/5 pb-2">
                  <h4 className="text-[11.5px] font-bold uppercase tracking-wider text-[#000000]">Product Categories (e.g. Table Centerpieces)</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...(cmsConfig.productTypes || [])];
                      next.push({ id: `custom_${Date.now()}`, label: "New Product Category", enabled: true });
                      setCmsConfig({ ...cmsConfig, productTypes: next });
                    }}
                    className="text-[9.5px] text-[#0F172A] font-bold uppercase tracking-wider flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    + Add New Category
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cmsConfig.productTypes?.map((pt, index) => (
                    <div key={pt.id} className="flex items-center gap-2 bg-[#F8F9FB] p-3 rounded-2xl border border-black/5">
                      <input
                        type="text"
                        value={pt.label}
                        onChange={(e) => {
                          const next = [...cmsConfig.productTypes];
                          next[index].label = e.target.value;
                          setCmsConfig({ ...cmsConfig, productTypes: next });
                        }}
                        className="flex-1 bg-white border border-black/10 rounded-xl px-3 py-1.5 text-[11px] outline-none focus:border-[#000000] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...cmsConfig.productTypes];
                          next[index].enabled = !next[index].enabled;
                          setCmsConfig({ ...cmsConfig, productTypes: next });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border cursor-pointer transition-all duration-300 ${
                          pt.enabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        {pt.enabled ? "Active" : "Disabled"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = cmsConfig.productTypes.filter((_, idx) => idx !== index);
                          setCmsConfig({ ...cmsConfig, productTypes: next });
                        }}
                        className="text-red-500 hover:text-red-600 font-bold px-2 text-[12px] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-6 border-t border-black/5 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveCMSConfig}
                  disabled={isSavingCMS}
                  className="bg-[#0F172A] hover:bg-[#000000] text-white px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSavingCMS ? "Saving Options..." : "Save Form Options"}
                </button>
              </div>

            </div>
          )}
        </div>
      )}

    </motion.div>
  );
}
