import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmin } from "../context/AdminContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };
const listContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const typeIcons = {
  order: "shopping_bag",
  booking: "event",
  stock: "warning",
  review: "star",
  payment: "payments",
};

const typeColors = {
  order: "bg-slate-100 text-black border-slate-200 hover:bg-blue-100/50",
  booking: "bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100/50",
  stock: "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100/50",
  review: "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100/50",
  payment: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/50",
};

export function AdminNotifications() {
  const { products, orders, eventBookings, reviews } = useAdmin();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  
  // Persistent read tracking in localStorage
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem("siri_read_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveReadIds = (ids) => {
    setReadIds(ids);
    localStorage.setItem("siri_read_notifications", JSON.stringify(ids));
  };

  // Compile real-time alerts from collections dynamically
  const compiledNotifications = useMemo(() => {
    const list = [];

    // 1. Low Stock Alerts (Stock <= 5)
    products.forEach(p => {
      if (p.stock <= 5) {
        list.push({
          id: `stock-${p.id}`,
          type: "stock",
          title: "Low Stock Alert",
          message: `${p.name} has only ${p.stock} items remaining in inventory.`,
          actionLabel: "Restock Item",
          actionPath: "/admin/inventory",
          time: "Action Required",
          rawDate: new Date(Date.now() - 3600000) // 1 hr ago
        });
      }
    });

    // 2. Pending Orders
    orders.forEach(o => {
      if (o.status === "Pending") {
        list.push({
          id: `order-${o.id}`,
          type: "order",
          title: "New Customer Order",
          message: `Order #${o.id.substring(0, 8).toUpperCase()} placed by ${o.customer} for a total of ₹${o.total.toLocaleString("en-IN")}.`,
          actionLabel: "Process Order",
          actionPath: `/admin/orders/${o.id}`,
          time: o.date || "Just now",
          rawDate: o.rawOrder?.createdAt ? new Date(o.rawOrder.createdAt) : new Date(Date.now() - 7200000)
        });
      }
    });

    // 3. Paid Settlements
    orders.forEach(o => {
      if (o.payment === "Paid") {
        list.push({
          id: `payment-${o.id}`,
          type: "payment",
          title: "Payment Captured",
          message: `Payment of ₹${o.total.toLocaleString("en-IN")} settled securely for Order #${o.id.substring(0, 8).toUpperCase()}.`,
          actionLabel: "Review Receipt",
          actionPath: "/admin/payments",
          time: o.date || "Just now",
          rawDate: o.rawOrder?.updatedAt ? new Date(o.rawOrder.updatedAt) : new Date(Date.now() - 14400000)
        });
      }
    });

    // 4. Pending Booking Consultations
    eventBookings.forEach(b => {
      if (b.status === "Pending") {
        list.push({
          id: `booking-${b.id}`,
          type: "booking",
          title: "Pending Booking Consultation",
          message: `Artisan setup for ${b.eventType} requested on ${b.date} at ${b.venue}.`,
          actionLabel: "Confirm Booking",
          actionPath: `/admin/events/${b.id}`,
          time: "Pending Review",
          rawDate: b.rawEvent?.createdAt ? new Date(b.rawEvent.createdAt) : new Date(Date.now() - 86400000)
        });
      }
    });

    // 5. Unapproved Reviews
    reviews.forEach(r => {
      if (r.status === "pending") {
        list.push({
          id: `review-${r._id || r.id}`,
          type: "review",
          title: "Moderation Pending",
          message: `Customer left a ${r.rating}-Star review: "${r.comment || "No comment provided"}"`,
          actionLabel: "Moderate Review",
          actionPath: "/admin/reviews",
          time: "Needs Review",
          rawDate: r.createdAt ? new Date(r.createdAt) : new Date(Date.now() - 172800000)
        });
      }
    });

    // Sort by date descending
    return list.map(item => ({
      ...item,
      read: readIds.includes(item.id)
    })).sort((a, b) => b.rawDate - a.rawDate);
  }, [products, orders, eventBookings, reviews, readIds]);

  const unreadCount = useMemo(() => {
    return compiledNotifications.filter(n => !n.read).length;
  }, [compiledNotifications]);

  const handleMarkRead = (id) => {
    if (!readIds.includes(id)) {
      saveReadIds([...readIds, id]);
      toast.success("Notification marked as read", { id: "notif-read" });
    }
  };

  const handleMarkAllRead = () => {
    const allIds = compiledNotifications.map(n => n.id);
    saveReadIds(allIds);
    toast.success("All notifications caught up!");
  };

  const handleClearRead = () => {
    saveReadIds([]);
    toast.success("Read logs cleared for fresh intake sync!");
  };

  // Filter list by tab
  const filteredNotifications = useMemo(() => {
    if (activeTab === "unread") {
      return compiledNotifications.filter(n => !n.read);
    }
    if (activeTab === "all") {
      return compiledNotifications;
    }
    return compiledNotifications.filter(n => n.type === activeTab);
  }, [compiledNotifications, activeTab]);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1000px] mx-auto space-y-6 font-body text-on-surface"
    >
      {/* Header Block */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold font-display text-on-surface">
            Notification Center
          </h1>
          <p className="text-[13px] text-outline mt-0.5">
            {unreadCount > 0 ? (
              <span className="text-black font-bold">{unreadCount} actionable alerts needing response</span>
            ) : (
              <span className="text-emerald-600 font-bold">All caught up! No pending alerts</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 bg-slate-100 text-black hover:bg-black hover:text-white rounded-xl text-[12px] font-bold uppercase tracking-wider cursor-pointer transition-all border border-slate-250 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              Mark All Read
            </button>
          )}
          {readIds.length > 0 && (
            <button
              onClick={handleClearRead}
              className="px-4 py-2 border border-outline-variant/40 rounded-xl text-[12px] font-bold uppercase tracking-wider text-outline hover:bg-surface hover:text-on-surface cursor-pointer transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              Clear Read Logs
            </button>
          )}
        </div>
      </motion.div>

      {/* Tabs Filter Bar */}
      <motion.div variants={fadeUp} className="flex border-b border-surface-container-highest/60 overflow-x-auto gap-4 scrollbar-none">
        {[
          { id: "all", label: "All Alerts", count: compiledNotifications.length },
          { id: "unread", label: "Unread", count: unreadCount },
          { id: "stock", label: "Low Stock Alerts", count: compiledNotifications.filter(n => n.type === "stock").length },
          { id: "order", label: "Orders", count: compiledNotifications.filter(n => n.type === "order").length },
          { id: "booking", label: "Consults", count: compiledNotifications.filter(n => n.type === "booking").length },
          { id: "payment", label: "Payments", count: compiledNotifications.filter(n => n.type === "payment").length },
          { id: "review", label: "Reviews", count: compiledNotifications.filter(n => n.type === "review").length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-[13px] font-bold uppercase tracking-wider cursor-pointer border-b-2 transition-all shrink-0 relative ${
              activeTab === tab.id
                ? "border-slate-900 text-black"
                : "border-transparent text-outline hover:text-on-surface"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                activeTab === tab.id ? "bg-black text-white" : "bg-surface-container-highest text-outline"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* Alerts Grid List */}
      <motion.div
        variants={listContainer}
        className="space-y-3"
      >
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-16 text-center bg-white border border-surface-container-highest/60 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center"
            >
              <span className="material-symbols-outlined text-[48px] text-[#64748B]/40 mb-2 block">search_off</span>
              <h3 className="text-[14px] font-bold text-[#0F172A] mb-0.5">Data Not Found</h3>
              <p className="text-[12px] text-[#64748B] max-w-[280px]">No notification alerts available in this category.</p>
            </motion.div>
          ) : (
            filteredNotifications.map(n => {
              const formattedDate = n.rawDate.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit"
              });

              return (
                <motion.div
                  layoutId={n.id}
                  key={n.id}
                  variants={fadeUp}
                  exit={{ opacity: 0, x: -50 }}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border transition-all ${
                    !n.read
                      ? "bg-white border-slate-200 shadow-md shadow-primary/2"
                      : "bg-[#F8F9FB] border-surface-container-highest/40 opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Circle Icon Indicator */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-transform hover:scale-105 duration-300 ${typeColors[n.type]}`}>
                      <span className="material-symbols-outlined text-[20px]">{typeIcons[n.type]}</span>
                    </div>

                    {/* Details Column */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[13px] font-bold ${!n.read ? "text-on-surface" : "text-outline"}`}>
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="flex h-2 w-2 relative shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-on-surface-variant leading-relaxed font-medium">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-outline font-mono">{formattedDate} • {n.time}</p>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => navigate(n.actionPath)}
                      className="px-3.5 py-1.5 bg-surface hover:bg-surface-container-high border border-outline-variant/65 rounded-xl text-[11px] font-bold uppercase tracking-wider text-on-surface cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                    >
                      {n.actionLabel}
                      <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                    </button>

                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="p-2 bg-slate-100 hover:bg-slate-100 text-black rounded-xl cursor-pointer transition-all flex items-center justify-center"
                        title="Mark as Read"
                      >
                        <span className="material-symbols-outlined text-[16px]">done</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
