import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import { playSuccessBeep, playErrorBeep } from "../../utils/audioUtils";
import toast from "react-hot-toast";

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };
const slideDrawer = {
  hidden: { x: "100%" },
  show: { x: 0 },
  exit: { x: "100%" },
};

const statusColors = {
  "Pending": "text-amber-700 bg-amber-50 border-amber-200",
  "Confirmed": "text-slate-900 bg-slate-100 border-slate-300",
  "Packed": "text-purple-700 bg-purple-50 border-purple-200",
  "Ready to Ship": "text-sky-700 bg-sky-50 border-sky-200",
  "Shipped": "text-blue-700 bg-slate-100 border-slate-300",
  "Out for Delivery": "text-teal-700 bg-teal-50 border-teal-200",
  "Delivered": "text-emerald-700 bg-emerald-50 border-emerald-250",
  "Cancelled": "text-rose-700 bg-rose-50 border-rose-200",
  "Returned": "text-slate-650 bg-slate-50 border-slate-200",
  "Refunded": "text-slate-500 bg-slate-50 border-slate-200",
};

const statusIcons = {
  "Pending": "schedule",
  "Confirmed": "thumb_up",
  "Packed": "inventory_2",
  "Ready to Ship": "conveyor_belt",
  "Shipped": "local_shipping",
  "Out for Delivery": "directions_run",
  "Delivered": "verified",
  "Cancelled": "cancel",
  "Returned": "keyboard_return",
  "Refunded": "payments",
};

const allStatuses = [
  "Pending",
  "Confirmed",
  "Packed",
  "Ready to Ship",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Returned",
  "Refunded",
];

export function AdminOrders() {
  const navigate = useNavigate();
  const { orders, updateOrderStatus, updateOrderNotes, searchQuery } = useAdmin();
  
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'kanban'
  const [filterStatus, setFilterStatus] = useState("All");
  
  // Quick-edit details drawer state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const codStats = useMemo(() => {
    let totalVolume = 0;
    let pendingRemittance = 0;
    let settledPayouts = 0;
    let courierDeductions = 0;
    
    orders.forEach((o) => {
      if (o.rawOrder?.paymentMethod?.toLowerCase() === 'cod') {
        totalVolume += o.total;
        if (o.status === 'Delivered' && o.rawOrder?.settlementStatus !== 'Settled') {
          pendingRemittance += o.total;
        } else if (o.rawOrder?.settlementStatus === 'Settled' || o.status === 'Settled') {
          const charges = o.rawOrder?.courierCharges || 150;
          courierDeductions += charges;
          settledPayouts += o.rawOrder?.settledAmount || (o.total - charges);
        }
      }
    });

    return { totalVolume, pendingRemittance, settledPayouts, courierDeductions };
  }, [orders]);

  // Capture physical barcode scanner keyboard inputs
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyPress = (e) => {
      const currentTime = Date.now();
      
      // Fast barcode keyboard sweeps (< 50ms)
      if (currentTime - lastKeyTime > 50) {
        buffer = "";
      }
      lastKeyTime = currentTime;

      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") {
        return;
      }

      if (e.key === "Enter") {
        if (buffer.length >= 3) {
          const scannedCode = buffer.trim().toUpperCase();
          buffer = "";
          
          const matchedOrder = orders.find((o) => {
            const cleanId = o.id.toUpperCase();
            const cleanAWB = (o.trackingNumber || "").toUpperCase();
            const customBarcode = `SR-${o.id.substring(o.id.length - 8).toUpperCase()}-IN`;
            const invoiceNum = (o.invoiceNumber || "").toUpperCase();
            return (
              scannedCode === cleanId ||
              scannedCode === cleanAWB ||
              scannedCode === customBarcode ||
              scannedCode === invoiceNum ||
              scannedCode.includes(cleanId.substring(0, 8))
            );
          });

          if (matchedOrder) {
            playSuccessBeep();
            toast.success(`Order Found! Opening Full Details for #${matchedOrder.id.substring(matchedOrder.id.length - 8).toUpperCase()}`);
            navigate(`/admin/orders/${matchedOrder.id}`);
          } else {
            playErrorBeep();
            toast.error(`Scan mismatch! Code "${scannedCode}" not found in orders list.`);
          }
        }
        return;
      }

      if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [orders, navigate]);

  // Derive selected order data from orders list dynamically
  const selectedOrderData = selectedOrder ? orders.find((o) => o.id === selectedOrder.id) : null;

  const handleSaveNote = async (orderId, noteText) => {
    await updateOrderNotes(orderId, noteText);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = filterStatus === "All" || o.status === filterStatus;
      const matchSearch =
        !searchQuery ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.phone.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [orders, filterStatus, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts = { All: orders.length };
    allStatuses.forEach(
      (s) => (counts[s] = orders.filter((o) => o.status === s).length)
    );
    return counts;
  }, [orders]);

  // Export orders to CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      return toast.error("No orders found to export");
    }

    const headers = "Order ID,Customer,Phone,Items Summary,Total Amount,Payment Type,Status,Order Date\n";
    const rows = filteredOrders
      .map((o) => {
        const itemsList = o.items.map((i) => `${i.name} (x${i.quantity || 1})`).join(" | ");
        return `"${o.id}","${o.customer}","${o.phone}","${itemsList}",${o.total},"${o.payment}","${o.status}","${o.date}"`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SiriArts_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
    toast.success("CSV Order Export generated successfully!");
  };

  const openOrderDrawer = (order) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-left">
          <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
            Inquiry & Order Hub
          </h2>
          <p className="text-[12px] text-slate-500 mt-0.5">
            {orders.length} transactions managing handcrafted traditional setups
          </p>
        </div>

        {/* View Toggle and Export Controls */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 border border-slate-200/60 rounded-xl p-0.5 shadow-xs">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider cursor-pointer transition-all ${
                viewMode === "table" ? "bg-white text-slate-900 shadow-xs border border-slate-200/30" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">view_list</span>
              Table View
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider cursor-pointer transition-all ${
                viewMode === "kanban" ? "bg-white text-slate-900 shadow-xs border border-slate-200/30" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">dashboard</span>
              Kanban Board
            </button>
          </div>

          <button onClick={handleExportCSV} className="px-4 py-2 text-[11.5px] font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-black rounded-lg shadow-xs flex items-center gap-1.5 transition-all">
            <span className="material-symbols-outlined text-[16px]">
              download
            </span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Real-time Logistics & COD Remittance Reconciliation Ledger */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs relative overflow-hidden text-left">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-slate-200"></div>
        <div className="space-y-1">
          <span className="block text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">COD Order Volume</span>
          <p className="text-[18px] font-semibold text-slate-900">₹{codStats.totalVolume.toLocaleString()}</p>
          <span className="text-[9.5px] text-slate-450">Total cash-delivery orders initiated</span>
        </div>
        <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-5">
          <span className="block text-[9.5px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Courier Collections Pending
          </span>
          <p className="text-[18px] font-semibold text-amber-600">₹{codStats.pendingRemittance.toLocaleString()}</p>
          <span className="text-[9.5px] text-slate-450">Cash held by agents, awaiting bank transfer</span>
        </div>
        <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5">
          <span className="block text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">Courier Shipping Deductions</span>
          <p className="text-[18px] font-semibold text-rose-600">₹{codStats.courierDeductions.toLocaleString()}</p>
          <span className="text-[9.5px] text-slate-455">Aggregated logistics & COD partner fees</span>
        </div>
        <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5 bg-emerald-50/15 p-2 rounded-xl border border-emerald-100/50">
          <span className="block text-[9.5px] text-emerald-800 font-bold uppercase tracking-wider">Net Bank Payouts</span>
          <p className="text-[18px] font-semibold text-emerald-600">₹{codStats.settledPayouts.toLocaleString()}</p>
          <span className="text-[9.5px] text-emerald-600/80">Reconciled remittance successfully credited</span>
        </div>
      </div>

      {/* Table Filters Tab */}
      {viewMode === "table" && (
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar scroll-smooth">
          {["All", ...allStatuses].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11.5px] font-semibold whitespace-nowrap cursor-pointer transition-all border ${
                filterStatus === s
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:border-slate-350"
              }`}
            >
              {s}{" "}
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  filterStatus === s ? "bg-white/20 text-white" : "bg-slate-100 text-slate-450"
                }`}
              >
                {statusCounts[s]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* CONTENT SWITCHER */}
      <AnimatePresence mode="wait">
        {viewMode === "table" ? (
          /* TABLE VIEW */
          <motion.div
            key="table"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-450 border-b border-slate-200 select-none">
                    <th className="p-4 font-bold tracking-wider uppercase text-[9px] w-28 text-left">Order ID</th>
                    <th className="p-4 font-bold tracking-wider uppercase text-[9px] text-left">Client Info</th>
                    <th className="p-4 font-bold tracking-wider uppercase text-[9px] hidden md:table-cell text-left">Details Curation</th>
                    <th className="p-4 font-bold tracking-wider uppercase text-[9px] text-left">Total Cost</th>
                    <th className="p-4 font-bold tracking-wider uppercase text-[9px] hidden sm:table-cell text-left">Payment</th>
                    <th className="p-4 font-bold tracking-wider uppercase text-[9px] text-left">Status Indicator</th>
                    <th className="p-4 font-bold tracking-wider uppercase text-[9px] hidden lg:table-cell text-left">Curation Date</th>
                    <th className="p-4 font-bold tracking-wider uppercase text-[9px] text-left">Required Date</th>
                    <th className="p-4 font-bold tracking-wider uppercase text-[9px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => {
                    const isVip = o.total >= 15000;
                    const isNew = o.date && o.date.includes("Today");

                    return (
                      <tr
                        key={o.id}
                        className="border-b border-slate-100 last:border-none hover:bg-slate-50/50 transition-colors group cursor-pointer"
                        onClick={() => openOrderDrawer(o)}
                      >
                        <td className="p-4 font-semibold text-black group-hover:text-slate-900 transition-colors text-left">
                          <div className="flex items-center gap-1.5">
                            #{o.id.substring(o.id.length - 8).toUpperCase()}
                            {isNew && (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" title="Recent order" />
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-left">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 text-[12.5px]">{o.customer}</span>
                            <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px] text-slate-400">call</span>
                              {o.phone}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-500 hidden md:table-cell max-w-[200px] truncate text-left">
                          {o.items.map((i) => `${i.name} (x${i.quantity || 1})`).join(", ")}
                        </td>
                        <td className="p-4 font-bold text-slate-800 text-left">
                          <div className="flex flex-col">
                            <span>₹{o.total.toLocaleString()}</span>
                            {isVip && (
                              <span className="text-[7.5px] uppercase tracking-widest font-extrabold text-black mt-0.5 bg-slate-100 px-1 w-max rounded">
                                VIP Collection
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 hidden sm:table-cell text-left">
                          <span
                            className={`px-2 py-0.5 rounded border text-[9.5px] font-semibold uppercase tracking-wider ${
                              o.payment === "Paid"
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                : o.payment === "COD"
                                ? "text-amber-700 bg-amber-50 border-amber-200"
                                : "text-rose-600 bg-rose-50 border-rose-200"
                            }`}
                          >
                            {o.payment}
                          </span>
                        </td>
                        <td className="p-4 text-left">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[10px] font-semibold ${statusColors[o.status]}`}
                          >
                            <span className="material-symbols-outlined text-[13px]">{statusIcons[o.status]}</span>
                            {o.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-450 hidden lg:table-cell text-left">{o.date}</td>
                        <td className="p-4 text-left">
                          {o.needByDate ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-250 text-[10px] font-bold">
                              <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                              {new Date(o.needByDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openOrderDrawer(o)}
                              className="p-1.5 rounded-lg text-slate-450 hover:bg-slate-100 hover:text-slate-800 border border-transparent hover:border-slate-200 cursor-pointer"
                              title="Quick Details Panel"
                            >
                              <span className="material-symbols-outlined text-[15px]">visibility</span>
                            </button>
                            <button
                              onClick={() => navigate(`/admin/orders/${o.id}`)}
                              className="p-1.5 rounded-lg text-slate-450 hover:bg-slate-100 hover:text-black border border-transparent hover:border-slate-200 cursor-pointer"
                              title="Full Invoice & Prints"
                            >
                              <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                            </button>
                            <a
                              href={`https://wa.me/${o.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-450 hover:bg-emerald-50 hover:text-emerald-600 border border-transparent hover:border-emerald-250 flex items-center justify-center"
                              title="Direct Whatsapp"
                            >
                              <span className="material-symbols-outlined text-[15px]">chat</span>
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredOrders.length === 0 && (
              <div className="py-20 text-center text-slate-400">
                <span className="material-symbols-outlined text-[36px] text-slate-300">search_off</span>
                <p className="text-[12px] font-bold mt-2 text-slate-700">Data Not Found</p>
                <p className="text-[11px] mt-0.5 text-slate-450">Try adjusting filters or search queries</p>
              </div>
            )}
          </motion.div>
        ) : (
          /* KANBAN BOARD */
          <motion.div
            key="kanban"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start"
          >
            {filteredOrders.length === 0 ? (
              <div className="py-20 text-center text-slate-400 bg-white rounded-xl border border-slate-200 w-full col-span-full flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-[36px] text-slate-300">search_off</span>
                <p className="text-[12px] font-bold mt-2 text-slate-700">Data Not Found</p>
                <p className="text-[11px] mt-0.5 text-slate-450">Try adjusting your active search keywords or status tabs.</p>
              </div>
            ) : (
              allStatuses.slice(0, 5).map((status) => {
                const statusOrders = filteredOrders.filter((o) => o.status === status);

                return (
                  <div key={status} className="bg-slate-50/65 rounded-xl p-3 border border-slate-200/80 space-y-3 min-h-[350px] flex flex-col">
                    {/* Column Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 shrink-0 select-none">
                      <div className="flex items-center gap-1.5 text-left">
                        <span className={`material-symbols-outlined text-[15px] ${statusColors[status].split(" ")[0]}`}>
                          {statusIcons[status]}
                        </span>
                        <span className="text-[11.5px] font-bold text-slate-700">{status}</span>
                      </div>
                      <span className="text-[9.5px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                        {statusOrders.length}
                      </span>
                    </div>

                    {/* Cards Pool */}
                    <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[500px] custom-scrollbar pr-0.5">
                      {statusOrders.map((o) => {
                        const hasNote = Boolean(o.notes);

                        return (
                          <div
                            key={o.id}
                            onClick={() => openOrderDrawer(o)}
                            className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-black hover:shadow-xs transition-all duration-200 cursor-pointer group text-left"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-slate-800 group-hover:text-black transition-colors">
                                #{o.id.substring(o.id.length - 8).toUpperCase()}
                              </span>
                              <span className="text-[10px] font-bold text-slate-900">
                                ₹{o.total.toLocaleString()}
                              </span>
                            </div>

                            <p className="text-[12px] font-semibold text-slate-700 mt-2 truncate">
                              {o.customer}
                            </p>

                            <p className="text-[10px] text-slate-400 truncate mt-1">
                              {o.items.map((i) => i.name).join(", ")}
                            </p>

                            {/* Interactive status selector dropdown */}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3 gap-2" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={o.status}
                                onChange={(e) => {
                                  updateOrderStatus(o.id, e.target.value);
                                  toast.success(`Moved #${o.id.substring(o.id.length - 6).toUpperCase()} to ${e.target.value}`);
                                }}
                                className="text-[9px] font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 cursor-pointer outline-none max-w-[100px]"
                              >
                                {allStatuses.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>

                              <div className="flex items-center gap-1.5">
                                {hasNote && (
                                  <span className="material-symbols-outlined text-[13px] text-amber-500" title="Contains team note">
                                    sticky_note_2
                                  </span>
                                )}
                                <a
                                  href={`https://wa.me/${o.phone.replace(/[^0-9]/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[11px] font-bold">chat</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {statusOrders.length === 0 && (
                        <div className="py-10 text-center text-slate-300 border border-dashed border-slate-200 rounded-lg select-none flex flex-col items-center justify-center">
                          <span className="material-symbols-outlined text-[18px] mb-1">inbox</span>
                          <span className="text-[9px] uppercase font-bold tracking-wider">Empty</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* QUICK EDIT SIDE DRAWER PANEL */}
      <AnimatePresence>
        {isDrawerOpen && selectedOrder && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[999] cursor-pointer"
            />

            {/* Slide block drawer */}
            <motion.aside
              initial="hidden"
              animate="show"
              exit="exit"
              variants={slideDrawer}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="fixed right-0 top-0 h-screen w-full sm:w-[480px] bg-white z-[1000] shadow-xl flex flex-col overflow-hidden border-l border-slate-200"
            >
              {/* Drawer Header */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 text-left">
                <div>
                  <h3 className="text-[14px] font-bold text-slate-800">
                    Order Details Panel
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    #{selectedOrder.id.toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-7 h-7 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Drawer Scroll Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-left">
                {/* 1. Client Card */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Customer Profile</p>
                      <h4 className="text-[13px] font-bold text-slate-800 mt-0.5">{selectedOrder.customer}</h4>
                    </div>
                    <a
                      href={`https://wa.me/${selectedOrder.phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white rounded-lg text-[9.5px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
                    >
                      <span className="material-symbols-outlined text-[12px] font-bold">chat</span>
                      WhatsApp
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 text-[11.5px] pt-2 border-t border-slate-200/50">
                    <p className="text-slate-450 font-medium">Phone:</p> <p className="font-semibold text-slate-700">{selectedOrder.phone}</p>
                    <p className="text-slate-455 font-medium">Payment Mode:</p> <p className="font-semibold text-slate-700">{selectedOrder.payment}</p>
                    <p className="text-slate-455 font-medium">Invoice Date:</p> <p className="font-semibold text-slate-700">{selectedOrder.date}</p>
                    {selectedOrder.needByDate && (
                      <>
                        <p className="text-emerald-800 font-bold">Need-By Date:</p>
                        <p className="font-bold text-emerald-800 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                          {new Date(selectedOrder.needByDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. Items List */}
                <div className="space-y-3">
                  <h4 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-700">Curated Items</h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <img src={item.image} alt="Traditional wedding event decoration" className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
                          )}
                          <div>
                            <p className="text-[12px] font-bold text-slate-800">{item.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Quantity: {item.quantity || 1}</p>
                          </div>
                        </div>
                        <span className="text-[11.5px] font-bold text-slate-700">
                          ₹{Number(item.price * (item.quantity || 1)).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    <span className="text-[12px] text-slate-700">Order Grand Total:</span>
                    <span className="text-[13.5px] text-black font-bold">₹{selectedOrder.total.toLocaleString()}</span>
                  </div>
                </div>

                {/* 3. Transaction Timeline */}
                <div className="space-y-4">
                  <h4 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-700">Delivery Timeline</h4>
                  <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 ml-3">
                    {allStatuses.slice(0, 5).map((st, sidx) => {
                      const isDone = allStatuses.indexOf(selectedOrder.status) >= sidx;
                      const isCurrent = selectedOrder.status === st;

                      return (
                        <div key={st} className="relative flex items-center justify-between">
                          <span
                            className={`absolute -left-[30.5px] w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center transition-all ${
                              isDone ? "border-black" : "border-slate-200"
                            }`}
                          >
                            {isDone && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                          </span>
                          <div>
                            <p className={`text-[12px] font-bold ${isCurrent ? "text-black" : "text-slate-600"}`}>
                              {st}
                            </p>
                          </div>
                          {isCurrent && (
                            <span className="text-[9px] uppercase font-bold tracking-widest text-black bg-slate-100 px-2 py-0.5 rounded-full animate-pulse border border-slate-200">
                              Active State
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Staff Notes Form */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
                    Internal Staff Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Type logistics references, customer specifications, or event notes..."
                    defaultValue={selectedOrderData?.notes || ""}
                    onBlur={(e) => handleSaveNote(selectedOrder.id, e.target.value)}
                    className="w-full bg-white rounded-lg border border-slate-200 p-3 text-[12px] text-slate-700 outline-none focus:border-black resize-none font-sans"
                  />
                  <p className="text-[9px] text-slate-400 leading-normal block">
                    * Note auto-saves when you click out of the box. Saved notes are only visible to logged-in studio staff.
                  </p>
                </div>
              </div>

              {/* Drawer Footer Controls */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center gap-3 text-left">
                <div className="flex-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Direct Status Override
                  </label>
                  <select
                    value={selectedOrderData?.status || selectedOrder.status}
                    onChange={(e) => {
                      updateOrderStatus(selectedOrder.id, e.target.value);
                      toast.success(`Updated order status to ${e.target.value}`);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold text-slate-800 cursor-pointer outline-none shadow-xs"
                  >
                    {allStatuses.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    navigate(`/admin/orders/${selectedOrder.id}`);
                  }}
                  className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:text-black hover:bg-slate-50 rounded-lg text-[11.5px] font-semibold cursor-pointer self-end flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                  Full Details
                </button>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 bg-black text-white rounded-lg text-[11.5px] font-semibold hover:bg-slate-900 cursor-pointer shadow-xs self-end"
                >
                  Done
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
