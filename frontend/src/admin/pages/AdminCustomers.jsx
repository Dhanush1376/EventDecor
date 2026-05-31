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
  EmptyState,
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
        icon="group"
        iconColor="users"
        mobileRow={true}
        headerAction={
          <div className="w-full sm:max-w-md">
            <FilterBar
              filters={["All", "VIP", "Regular", "New"]}
              value={segmentFilter}
              onChange={setSegmentFilter}
            />
          </div>
        }
      >
        <button 
          className="p-1.5 hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-95 border-none bg-transparent"
          title="Export Customers"
          onClick={() => {
            const headers = "Name,Email,Phone,Orders,Spent,Segment\n";
            const rows = customers
              .map(c => `"${c.name}","${c.email || ''}","${c.phone || ''}",${c.ordersCount || 0},${c.totalSpent || 0},"${c.segment || 'Regular'}"`)
              .join("\n");
            const blob = new Blob([headers + rows], { type: "text/csv" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `SiriArts_Customers_${new Date().toISOString().slice(0, 10)}.csv`);
            link.click();
            toast.success("Customers list exported");
          }}
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
        </button>
      </PageHeader>



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
            className="admin-card py-16 flex justify-center"
          >
            <EmptyState
              icon={searchQuery || segmentFilter !== "All" ? "search_off" : "group"}
              title={searchQuery || segmentFilter !== "All" ? "No Matches Found" : "No Customers Yet"}
              description={searchQuery || segmentFilter !== "All" ? "No customers match the search or filter criteria." : "When customers create accounts or place orders, they will appear here."}
              action={
                (searchQuery || segmentFilter !== "All") && (
                  <button onClick={() => setSegmentFilter("All")} className="admin-btn admin-btn-outline">
                    Clear Filters
                  </button>
                )
              }
            />
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
                    
                    <div className="mt-1 flex flex-col items-end gap-1 text-[11px] text-[var(--admin-text-secondary)] font-semibold">
                      <span className="flex items-center gap-1 shrink-0 whitespace-nowrap">
                        <span className="material-symbols-outlined text-[13px] text-emerald-600 shrink-0">account_balance_wallet</span>
                        <span className="whitespace-nowrap">{formatCurrency(c.walletBalance || 0)}</span>
                      </span>
                      <span className="flex items-center gap-1 shrink-0 whitespace-nowrap">
                        <span className="material-symbols-outlined text-[13px] text-amber-500 shrink-0">stars</span>
                        <span className="whitespace-nowrap">{c.siriCoins || 0} Coins</span>
                      </span>
                    </div>
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
                    className="admin-btn admin-btn-outline min-h-[36px] h-8 text-[10px] px-2 hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)] justify-center gap-1.5 w-full transition-all"
                  >
                    <span className="material-symbols-outlined text-[14px] shrink-0">mail</span>
                    <span className="hidden sm:inline truncate">Email</span>
                  </a>
                  <a
                    href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-btn admin-btn-outline min-h-[36px] h-8 text-[10px] px-2 border-[var(--admin-success-light)] text-[var(--admin-success)] hover:bg-[var(--admin-success-light)] justify-center gap-1.5 w-full transition-all"
                  >
                    <span className="material-symbols-outlined text-[14px] shrink-0">chat</span>
                    <span className="hidden sm:inline truncate">WhatsApp</span>
                  </a>
                  <button
                    onClick={() => navigate(`/admin/customers/${c.id}`)}
                    className="admin-btn min-h-[36px] h-8 text-[10px] px-2 bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-border-strong)] justify-center gap-1.5 w-full transition-all"
                  >
                    <span className="material-symbols-outlined text-[14px] shrink-0">visibility</span>
                    <span className="hidden sm:inline truncate">Profile</span>
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
