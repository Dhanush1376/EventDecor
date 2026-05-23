import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const segmentColors = {
  VIP: "text-slate-800 bg-slate-100",
  Regular: "text-black bg-slate-100",
  New: "text-emerald-600 bg-emerald-50",
};

export function AdminCustomers() {
  const navigate = useNavigate();
  const { customers, searchQuery } = useAdmin();
  const [segmentFilter, setSegmentFilter] = useState("All");

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchSeg = segmentFilter === "All" || c.segment === segmentFilter;
      const matchSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSeg && matchSearch;
    });
  }, [customers, segmentFilter, searchQuery]);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1440px] mx-auto space-y-6"
    >
      <motion.div
        variants={fadeUp}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-[24px] font-bold text-on-surface font-display">
            Customers
          </h2>
          <p className="text-[13px] text-outline">
            {customers.length} registered customers
          </p>
        </div>
        <button className="btn-minimal group">
          <span className="material-symbols-outlined text-[18px]">
            download
          </span>
          Export Customers
        </button>
      </motion.div>

      {/* Segment Filter */}
      <motion.div variants={fadeUp} className="flex gap-2">
        {["All", "VIP", "Regular", "New"].map((s) => (
          <button
            key={s}
            onClick={() => setSegmentFilter(s)}
            className={`px-4 py-2 rounded-xl text-[12px] font-semibold cursor-pointer transition-all ${segmentFilter === s ? "bg-black text-white" : "bg-white text-outline border border-surface-container-highest/60 hover:border-slate-900-container/30"}`}
          >
            {s}
          </button>
        ))}
      </motion.div>

      {/* Customer Cards */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-surface-container-highest/60 flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-[48px] text-outline-variant">
            search_off
          </span>
          <p className="text-[14px] font-bold text-[#0F172A] mt-3">Data Not Found</p>
          <p className="text-[11.5px] text-[#64748B] mt-1">No customers matched your search query or segment filters.</p>
        </div>
      ) : (
        <motion.div
          variants={fadeUp}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filtered.map((c) => (
            <motion.div
              key={c.id}
              whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0, 0, 0, 0.04)" }}
              className="bg-white rounded-2xl p-5 border border-surface-container-highest/60 transition-shadow group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-container/20 to-primary/10 flex items-center justify-center">
                    <span className="text-[16px] font-bold text-black font-display">
                      {c.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-on-surface">
                      {c.name}
                    </p>
                    <p className="text-[11px] text-outline">{c.city || "Ongole"}</p>
                    
                    {/* Siri Wallet & Loyalty Progression Stats */}
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="flex items-center gap-0.5 text-[9px] text-green-700 font-bold bg-green-50 px-1.5 py-0.5 rounded-md border border-green-200/50">
                        <span className="material-symbols-outlined text-[11px]">account_balance_wallet</span>
                        ₹{(c.walletBalance || 0).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-0.5 text-[9px] text-slate-700 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                        <span className="material-symbols-outlined text-[11px]">stars</span>
                        {c.siriCoins || 0} Coins
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${segmentColors[c.segment] || "text-gray-600 bg-gray-50"}`}
                  >
                    {c.segment}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold ${
                      c.loyaltyTier === 'Platinum' ? 'text-[#4c84a8] bg-sky-50 border border-sky-200/60' :
                      c.loyaltyTier === 'Gold' ? 'text-slate-800 bg-slate-100 border border-slate-200' :
                      c.loyaltyTier === 'Silver' ? 'text-[#7d8b99] bg-slate-50 border border-slate-200/60' :
                      'text-[#a87c53] bg-amber-50 border border-amber-200/60'
                    }`}
                  >
                    👑 {c.loyaltyTier || 'Bronze'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-surface rounded-xl">
                  <p className="text-[16px] font-bold text-on-surface">
                    {c.orders}
                  </p>
                  <p className="text-[10px] text-outline">Orders</p>
                </div>
                <div className="text-center p-2 bg-surface rounded-xl">
                  <p className="text-[14px] font-bold text-black">
                    {c.totalSpent >= 1000 ? `₹${(c.totalSpent / 1000).toFixed(1)}K` : `₹${c.totalSpent}`}
                  </p>
                  <p className="text-[10px] text-outline">Spent</p>
                </div>
                <div className="text-center p-2 bg-surface rounded-xl">
                  <p className="text-[12px] font-bold text-on-surface">
                    {c.lastOrder.slice(5)}
                  </p>
                  <p className="text-[10px] text-outline">Last Order</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-surface-container-low">
                <a
                  href={`mailto:${c.email}`}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-semibold text-outline hover:bg-surface-container-low cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    mail
                  </span>
                  Email
                </a>
                <a
                  href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-semibold text-green-600 hover:bg-green-50 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    chat
                  </span>
                  WhatsApp
                </a>
                <button
                  onClick={() => navigate(`/admin/customers/${c.id}`)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-semibold text-black hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    visibility
                  </span>
                  Profile
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
