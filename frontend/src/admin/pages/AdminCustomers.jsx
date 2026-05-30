import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import {
  PageHeader,
  FilterBar,
  formatCurrency,
  fadeUp,
  stagger,
} from "../components/AdminUIKit";

export function AdminCustomers() {
  const navigate = useNavigate();
  const { customers, dataLoading, searchQuery } = useAdmin();
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
      variants={stagger}
      className="space-y-6"
    >
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customers`}
        mobileRow={true}
      >
        <button className="admin-btn admin-btn-ghost" title="Export Customers">
          <span className="material-symbols-outlined text-[20px]">download</span>
        </button>
      </PageHeader>

      <motion.div variants={fadeUp}>
        <FilterBar
          filters={["All", "VIP", "Regular", "New"]}
          value={segmentFilter}
          onChange={setSegmentFilter}
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {dataLoading ? (
          <motion.div
            key="loading"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
          >
            {[...Array(6)].map((_, i) => (
               <div key={i} className="admin-skeleton admin-card h-[280px]" />
            ))}
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={fadeUp}
            className="admin-card py-24 flex flex-col items-center justify-center text-center"
          >
            <span className="material-symbols-outlined text-[48px] text-[var(--admin-text-tertiary)] mb-4">
              search_off
            </span>
            <p className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-1">Data Not Found</p>
            <p className="text-[12px] text-[var(--admin-text-secondary)]">No customers found.</p>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
          >
            {filtered.map((c) => (
              <motion.div
                key={c.id}
                variants={fadeUp}
                className="admin-card p-6 group hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-md)] transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-[var(--admin-radius-lg)] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] flex items-center justify-center shrink-0 group-hover:border-[var(--admin-accent)] group-hover:text-[var(--admin-accent)] transition-colors">
                      <span className="text-[14px] font-bold text-[var(--admin-text-primary)] group-hover:text-[var(--admin-accent)]">
                        {c.name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-[var(--admin-text-primary)] leading-tight truncate">
                        {c.name}
                      </p>
                      <p className="text-[11px] text-[var(--admin-text-tertiary)] font-medium uppercase tracking-wider mt-0.5">{c.city || "Ongole"}</p>
                      
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="admin-badge admin-badge-success h-5 px-1.5 border-none font-bold text-[9px] shrink-0">
                          <span className="material-symbols-outlined text-[11px] mr-1">account_balance_wallet</span>
                          {formatCurrency(c.walletBalance || 0)}
                        </span>
                        <span className="admin-badge admin-badge-neutral h-5 px-1.5 font-bold text-[9px] shrink-0">
                          <span className="material-symbols-outlined text-[11px] mr-1">stars</span>
                          {c.siriCoins || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      className={`admin-badge h-5 px-2 font-bold text-[8px] border-none shadow-sm ${
                        c.segment === "VIP" ? "bg-[var(--admin-text-primary)] text-white" :
                        c.segment === "New" ? "bg-[var(--admin-success-light)] text-[var(--admin-success)]" :
                        "bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)]"
                      }`}
                    >
                      {c.segment}
                    </span>
                    <span
                      className={`admin-badge h-5 px-2 font-bold text-[8px] shadow-sm ${
                        c.loyaltyTier === 'Platinum' ? 'bg-[#f0f9ff] text-[#0284c7] border-[#bae6fd]' :
                        c.loyaltyTier === 'Gold' ? 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border-[var(--admin-border-strong)]' :
                        c.loyaltyTier === 'Silver' ? 'bg-[#f8fafc] text-[var(--admin-text-secondary)] border-[#e2e8f0]' :
                        'bg-[#fffbeb] text-[#d97706] border-[#fde68a]'
                      }`}
                    >
                      👑 {c.loyaltyTier || 'Bronze'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3 mb-5 p-3 bg-[var(--admin-surface-muted)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]">
                  <div className="text-center">
                    <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                      {c.orders}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] mt-0.5">Orders</p>
                  </div>
                  <div className="text-center border-l border-r border-[var(--admin-border)]">
                    <p className="text-[14px] font-bold text-[var(--admin-accent)]">
                      {c.totalSpent >= 1000 ? `₹${(c.totalSpent / 1000).toFixed(1)}K` : `₹${c.totalSpent}`}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] mt-0.5">Spent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[12px] font-bold text-[var(--admin-text-primary)] mt-0.5">
                      {c.lastOrder.slice(5)}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] mt-0.5">Last Order</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[var(--admin-border-subtle)]">
                  <a
                    href={`mailto:${c.email}`}
                    className="admin-btn admin-btn-outline min-h-[36px] h-8 text-[10px] px-1 hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)] justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px] shrink-0">mail</span>
                    <span className="truncate">Email</span>
                  </a>
                  <a
                    href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-btn admin-btn-outline min-h-[36px] h-8 text-[10px] px-1 border-[var(--admin-success-light)] text-[var(--admin-success)] hover:bg-[var(--admin-success-light)] justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px] shrink-0">chat</span>
                    <span className="truncate">WhatsApp</span>
                  </a>
                  <button
                    onClick={() => navigate(`/admin/customers/${c.id}`)}
                    className="admin-btn min-h-[36px] h-8 text-[10px] px-1 bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-border-strong)] justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px] shrink-0">visibility</span>
                    <span className="truncate">Profile</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
