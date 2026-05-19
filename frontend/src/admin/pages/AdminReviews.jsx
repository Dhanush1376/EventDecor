import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { loyaltyService } from "../../services/domainServices";
import toast from "react-hot-toast";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await loyaltyService.adminGetReviews();
      if (res.success) {
        const payload = res.data;
        setReviews(Array.isArray(payload) ? payload : payload?.data || []);
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
      toast.error("Could not fetch customer reviews feed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReviews();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleModerate = async (reviewId, action) => {
    const toastId = toast.loading(action === 'approve' ? "Disbursing review rewards..." : "Rejecting review...");
    try {
      const res = await loyaltyService.adminModerateReview(reviewId, action);
      if (res.success) {
        toast.success(res.message || `Review successfully ${action}d!`, { id: toastId, duration: 4000 });
        fetchReviews(); // Refresh feed
      } else {
        toast.error(res.message || "Failed to update review status", { id: toastId });
      }
    } catch (err) {
      console.error("Error moderating review:", err);
      toast.error("Review moderation action failed.", { id: toastId });
    }
  };

  const filtered = reviews.filter((r) => {
    const statusVal = r.status || "pending";
    const matchesFilter = filter === "all" || statusVal === filter;
    
    const customer = r.user?.name || "Bespoke Customer";
    const product = r.product?.title || "Handcrafted Product";
    const comment = r.comment || "";

    const matchesSearch =
      !searchQuery ||
      customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1440px] mx-auto space-y-6"
    >
      {/* Title block */}
      <motion.div variants={fadeUp} className="flex justify-between items-center">
        <div>
          <h1 className="text-[24px] font-bold text-on-surface font-display">
            Reviews & Testimonials
          </h1>
          <p className="text-[13px] text-outline">
            {reviews.length} total reviews ·{" "}
            {reviews.filter((r) => r.status === "pending").length} pending approval payout
          </p>
        </div>

        {/* Dynamic Search Input */}
        <div className="relative w-72">
          <input
            type="text"
            placeholder="Search customer, item, or comment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-outline-variant/30 rounded-xl px-4 py-2 text-xs outline-none focus:border-slate-900 transition-all font-semibold"
          />
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="flex gap-2">
        {["all", "pending", "approved", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-[12px] font-semibold capitalize cursor-pointer transition-all ${
              filter === f 
                ? "bg-black text-white" 
                : "bg-white text-outline border border-surface-container-highest/60 hover:border-slate-900-container/30"
            }`}
          >
            {f}
          </button>
        ))}
      </motion.div>

      {/* Reviews feed */}
      <motion.div variants={fadeUp} className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 border-2 border-slate-250 border-t-primary rounded-full animate-spin" />
            <span className="text-[11px] uppercase tracking-widest text-secondary font-semibold">
              Loading Review Ledger...
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-surface-container-highest/60 flex flex-col items-center justify-center p-6 shadow-sm">
            <span className="material-symbols-outlined text-[48px] text-[#64748B]/40 mb-2 block">search_off</span>
            <p className="text-[14px] font-bold text-[#0F172A] mt-1">No Reviews Found</p>
            <p className="text-[12px] text-[#64748B] max-w-[280px]">No testimonials or reviews matched your active filters or search terms.</p>
          </div>
        ) : (
          filtered.map((r) => {
            const customer = r.user?.name || "Bespoke Customer";
            const product = r.product?.title || "Handcrafted Product";
            const comment = r.comment || "";
            const rating = r.rating || 5;
            const date = new Date(r.createdAt).toLocaleDateString("en-IN", {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });

            return (
              <motion.div
                key={r._id}
                whileHover={{ y: -2 }}
                className="bg-white rounded-2xl p-5 border border-surface-container-highest/60 transition-shadow shadow-xs"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-container/20 to-primary/10 flex items-center justify-center">
                      <span className="text-[14px] font-bold text-black font-display">
                        {customer.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold text-on-surface">
                          {customer}
                        </p>
                        <span className="text-[9px] text-secondary font-mono">({r.user?.email})</span>
                      </div>
                      <p className="text-[11px] text-outline">
                        {product} · {date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className="material-symbols-outlined text-[16px]"
                          style={{
                            color:
                              i < rating
                                ? "var(--color-primary)"
                                : "var(--color-surface-container-highest)",
                            fontVariationSettings: "'FILL' 1",
                          }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold ${
                        r.status === "approved" ? "text-emerald-700 bg-emerald-50 border border-emerald-200/50" :
                        r.status === "rejected" ? "text-red-700 bg-red-50 border border-red-200/50" :
                        "text-amber-700 bg-amber-50 border border-amber-200/50"
                      }`}
                    >
                      {r.status || "pending"}
                    </span>
                  </div>
                </div>

                <p className="text-[13px] text-on-surface-variant leading-relaxed mb-4 italic">
                  "{comment}"
                </p>

                <div className="flex items-center gap-3 border-t border-outline-variant/30 pt-3">
                  {r.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleModerate(r._id, 'approve')}
                        className="btn-minimal group !bg-emerald-600 !text-white !border-emerald-600 !py-1.5 !px-3 !text-[11px] flex items-center gap-1.5 cursor-pointer rounded-lg hover:brightness-110 transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          check
                        </span>
                        Approve & Pay ₹20 Reward
                      </button>

                      <button
                        onClick={() => handleModerate(r._id, 'reject')}
                        className="btn-minimal group !text-red-500 !border-red-100 hover:!bg-red-50 !py-1.5 !px-3 !text-[11px] flex items-center gap-1.5 cursor-pointer rounded-lg transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          close
                        </span>
                        Reject
                      </button>
                    </>
                  )}

                  {r.status === "approved" && (
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      Approved & Siri Cash disbursed successfully
                    </span>
                  )}

                  {r.status === "rejected" && (
                    <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">block</span>
                      Review rejected from listing feed
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>
    </motion.div>
  );
}
