import React from"react";
import { motion } from"framer-motion";
import { useParams, useNavigate } from"react-router-dom";
import { useAdmin } from"../context/AdminContext";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export function AdminCustomerProfile() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { customers, orders } = useAdmin();
  const customer = customers.find((c) => c.id === customerId);
  const customerOrders = orders.filter((o) => o.customer === customer?.name);

  if (!customer) {
    return (
      <div className="max-w-[900px] mx-auto py-20 text-center">
        <span className="material-symbols-outlined text-[64px] text-outline-variant">
          person_off
        </span>
        <p className="text-[16px] text-outline mt-4">Customer not found</p>
        <button
          onClick={() => navigate("/admin/customers")}
          className="btn-minimal group"
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
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1000px] mx-auto space-y-6"
    >
      <motion.div variants={fadeUp} className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin/customers")}
          className="w-10 h-10 rounded-xl bg-white border border-surface-container-highest/60 flex items-center justify-center text-outline hover:text-black hover:border-slate-900-container/30 cursor-pointer transition-all hover:shadow-sm active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">
            arrow_back
          </span>
        </button>
        <h2 className="text-[24px] font-bold text-on-surface">
          Customer Profile
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Sidebar Profile */}
        <div className="space-y-6">
          <motion.div
            variants={fadeUp}
            className="bg-white rounded-3xl border border-surface-container-highest/60 p-6 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-container/20 to-primary/10 flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg">
              <span className="text-[32px] font-bold text-black">
                {customer.name
                  .split("")
                  .map((n) => n[0])
                  .join("")}
              </span>
            </div>
            <h2 className="text-[20px] font-bold text-on-surface">
              {customer.name}
            </h2>
            <p className="text-[13px] text-outline mb-4">{customer.city}</p>
            <span
              className={`inline-flex px-3 py-1 rounded-full text-[11px] sm:text-[11px] font-bold ${customer.segment ==="VIP" ?"text-slate-800 bg-slate-100" : customer.segment ==="New" ?"text-emerald-600 bg-emerald-50" :"text-black bg-slate-100"}`}
            >
              {customer.segment}
            </span>

            <div className="mt-6 pt-6 border-t border-surface-container-low space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px] text-slate-800">
                    mail
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-outline font-semibold uppercase tracking-wider">
                    Email
                  </p>
                  <p className="text-[13px] text-on-surface font-medium">
                    {customer.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px] text-slate-800">
                    phone
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-outline font-semibold uppercase tracking-wider">
                    Phone
                  </p>
                  <p className="text-[13px] text-on-surface font-medium">
                    {customer.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px] text-slate-800">
                    calendar_today
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-outline font-semibold uppercase tracking-wider">
                    Joined
                  </p>
                  <p className="text-[13px] text-on-surface font-medium">
                    May 2025
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-surface-container-low flex gap-3">
              <a
                href={`mailto:${customer.email}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[12px] font-bold text-outline border-2 border-surface-container-highest/60 hover:bg-surface hover:text-on-surface hover:border-slate-900-container/30 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">
                  mail
                </span>{""}
                Email
              </a>
              <a
                href={`https://wa.me/${customer.phone.replace(/[^0-9]/g,"")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[12px] font-bold text-white bg-green-600 hover:bg-green-700 shadow-md transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">
                  chat
                </span>{""}
                WhatsApp
              </a>
            </div>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Stats */}
          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">
            {[
              {
                label:"Total Spent",
                value: `₹${customer.totalSpent.toLocaleString()}`,
                icon:"payments",
              },
              {
                label:"Total Orders",
                value: customer.orders,
                icon:"shopping_bag",
              },
              {
                label:"Last Order",
                value: customer.lastOrder,
                icon:"history",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="bg-white rounded-3xl border border-surface-container-highest/60 p-5"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[20px] text-slate-800">
                    {s.icon}
                  </span>
                </div>
                <p className="text-[18px] font-bold text-on-surface">
                  {s.value}
                </p>
                <p className="text-[12px] text-outline">{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Order History */}
          <motion.div
            variants={fadeUp}
            className="bg-white rounded-3xl border border-surface-container-highest/60 overflow-hidden"
          >
            <div className="p-6 border-b border-surface-container-low">
              <h2 className="text-[16px] font-bold text-on-surface">
                Order History
              </h2>
            </div>
            {customerOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-surface text-left text-outline border-b border-surface-container-highest/60">
                      <th className="p-4 pl-6 font-semibold">Order ID</th>
                      <th className="p-4 font-semibold">Date</th>
                      <th className="p-4 font-semibold">Amount</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 pr-6 font-semibold text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerOrders.map((o) => (
                      <tr
                        key={o.id}
                        className="border-b border-surface-container-low hover:bg-surface transition-colors"
                      >
                        <td className="p-4 pl-6 font-bold text-black">
                          {o.id}
                        </td>
                        <td className="p-4 text-outline">{o.date}</td>
                        <td className="p-4 font-bold text-on-surface">
                          ₹{o.total.toLocaleString()}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${o.status ==="Delivered" ?"text-green-700 bg-green-50" : o.status ==="Cancelled" ?"text-red-600 bg-red-50" :"text-black bg-slate-100"}`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <button
                            onClick={() => navigate(`/admin/orders/${o.id}`)}
                            className="p-2 rounded-xl text-outline hover:bg-white hover:shadow-sm hover:text-slate-800 border border-transparent hover:border-slate-900-container/30 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              visibility
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-[14px] text-outline">
                  No orders found for this customer.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
