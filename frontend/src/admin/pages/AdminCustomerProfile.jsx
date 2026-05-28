import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import {
  StatusBadge,
  formatCurrency,
  fadeUp,
  stagger,
} from "../components/AdminUIKit";

export function AdminCustomerProfile() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { customers, orders } = useAdmin();
  const customer = customers.find((c) => c.id === customerId);
  const customerOrders = orders.filter((o) => o.customer === customer?.name);

  if (!customer) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-[48px] text-[var(--admin-text-tertiary)] mb-4">
          person_off
        </span>
        <p className="text-[16px] font-bold text-[var(--admin-text-primary)] mb-4">Customer not found</p>
        <button
          onClick={() => navigate("/admin/customers")}
          className="admin-btn h-10 px-6"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6"
    >
      <motion.div variants={fadeUp} className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin/customers")}
          className="admin-btn-icon w-10 h-10 min-h-0 bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border border-[var(--admin-border)]"
        >
          <span className="material-symbols-outlined text-[20px]">
            arrow_back
          </span>
        </button>
        <h2 className="text-[20px] font-bold text-[var(--admin-text-primary)] leading-none">
          Customer Profile
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Sidebar Profile */}
        <div className="space-y-6">
          <motion.div
            variants={fadeUp}
            className="admin-card p-8 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-[var(--admin-bg-subtle)] flex items-center justify-center mx-auto mb-5 border-[3px] border-[var(--admin-surface)] shadow-[var(--admin-shadow-md)]">
              <span className="text-[32px] font-bold text-[var(--admin-text-primary)]">
                {customer.name
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            </div>
            <h2 className="text-[20px] font-bold text-[var(--admin-text-primary)] leading-tight">
              {customer.name}
            </h2>
            <p className="text-[12px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider mt-1.5 mb-5">{customer.city}</p>
            
            <div className="flex justify-center gap-2 mb-6">
              <span
                className={`admin-badge border-none font-bold text-[10px] uppercase tracking-wider h-6 px-2.5 shadow-sm ${
                  customer.segment === "VIP" ? "bg-[var(--admin-text-primary)] text-white" : 
                  customer.segment === "New" ? "bg-[var(--admin-success-light)] text-[var(--admin-success)]" : 
                  "bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)]"
                }`}
              >
                {customer.segment}
              </span>
            </div>

            <div className="mt-6 pt-6 border-t border-[var(--admin-border-subtle)] space-y-5 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--admin-radius-md)] bg-[var(--admin-surface-muted)] flex items-center justify-center shrink-0 border border-[var(--admin-border-subtle)]">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
                    mail
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
                    Email
                  </p>
                  <p className="text-[13px] text-[var(--admin-text-primary)] font-medium mt-0.5">
                    {customer.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--admin-radius-md)] bg-[var(--admin-surface-muted)] flex items-center justify-center shrink-0 border border-[var(--admin-border-subtle)]">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
                    phone
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
                    Phone
                  </p>
                  <p className="text-[13px] text-[var(--admin-text-primary)] font-medium mt-0.5">
                    {customer.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--admin-radius-md)] bg-[var(--admin-surface-muted)] flex items-center justify-center shrink-0 border border-[var(--admin-border-subtle)]">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
                    calendar_today
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
                    Joined
                  </p>
                  <p className="text-[13px] text-[var(--admin-text-primary)] font-medium mt-0.5">
                    May 2025
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <a
                href={`mailto:${customer.email}`}
                className="admin-btn admin-btn-outline flex-1 h-10 px-0 hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)]"
              >
                <span className="material-symbols-outlined text-[16px]">
                  mail
                </span>
                Email
              </a>
              <a
                href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn flex-1 h-10 px-0 bg-[var(--admin-success)] hover:bg-[var(--admin-success-light)] border-none shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">
                  chat
                </span>
                WhatsApp
              </a>
            </div>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Stats */}
          <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                label: "Total Spent",
                value: formatCurrency(customer.totalSpent),
                icon: "payments",
              },
              {
                label: "Total Orders",
                value: customer.orders,
                icon: "shopping_bag",
              },
              {
                label: "Last Order",
                value: customer.lastOrder,
                icon: "history",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="admin-card p-5"
              >
                <div className="w-10 h-10 rounded-[var(--admin-radius-md)] bg-[var(--admin-surface-muted)] flex items-center justify-center mb-4 border border-[var(--admin-border-subtle)]">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
                    {s.icon}
                  </span>
                </div>
                <p className="text-[20px] font-bold text-[var(--admin-text-primary)] leading-none mb-1">
                  {s.value}
                </p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] mt-1.5">{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Order History */}
          <motion.div
            variants={fadeUp}
            className="admin-card overflow-hidden p-0"
          >
            <div className="p-6 border-b border-[var(--admin-border-subtle)]">
              <h2 className="text-[16px] font-bold text-[var(--admin-text-primary)]">
                Order History
              </h2>
            </div>
            
            <AnimatePresence mode="wait">
              {customerOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <motion.table
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="admin-table w-full min-w-[700px]"
                  >
                    <thead>
                      <tr>
                        <th className="pl-6">Order ID</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th className="pr-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-[var(--admin-surface-muted)] transition-colors">
                          <td className="pl-6">
                            <p className="font-bold text-[var(--admin-text-primary)] text-[13px] uppercase tracking-wider">{o.id}</p>
                          </td>
                          <td className="text-[var(--admin-text-secondary)] font-medium">{o.date}</td>
                          <td className="font-bold text-[var(--admin-text-primary)] text-[14px]">
                            {formatCurrency(o.total)}
                          </td>
                          <td>
                            <StatusBadge status={o.status} />
                          </td>
                          <td className="pr-6 text-right">
                            <button
                              onClick={() => navigate(`/admin/orders/${o.id}`)}
                              className="admin-btn-icon w-8 h-8 min-h-0 ml-auto bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                visibility
                              </span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </motion.table>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-16 text-center flex flex-col items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[48px] text-[var(--admin-text-tertiary)] mb-4">search_off</span>
                  <p className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-1">No Orders Found</p>
                  <p className="text-[12px] text-[var(--admin-text-secondary)]">This customer hasn't placed any orders yet.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
