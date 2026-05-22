import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { couponService } from "../../services/domainServices";
import { useAdmin } from "../context/AdminContext";
import toast from "react-hot-toast";
import { AdminToggle } from "../components/AdminUIKit";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export function AdminCoupons() {
  const navigate = useNavigate();
  const { searchQuery } = useAdmin();
  const queryClient = useQueryClient();

  const { data: coupons = [], isLoading: loading } = useQuery({
    queryKey: ["adminCoupons"],
    queryFn: async () => {
      const res = await couponService.getAll();
      if (!res.success) throw new Error("Failed to load discount coupons");
      return res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
    },
    onError: () => toast.error("Failed to load discount coupons"),
  });

  const filteredCoupons = coupons.filter((c) => {
    return (
      !searchQuery ||
      c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.discountType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => couponService.update(id, { isActive }),
    onSuccess: (_, variables) => {
      toast.success(`Coupon ${variables.isActive ? "activated" : "deactivated"}`);
      queryClient.invalidateQueries({ queryKey: ["adminCoupons"] });
    },
    onError: () => toast.error("Failed to update coupon status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => couponService.delete(id),
    onSuccess: () => {
      toast.success("Coupon deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["adminCoupons"] });
    },
    onError: () => toast.error("Failed to delete coupon"),
  });

  const handleToggleActive = (id, currentStatus) => {
    toggleMutation.mutate({ id, isActive: !currentStatus });
  };

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this coupon?")) return;
    deleteMutation.mutate(id);
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1440px] mx-auto space-y-6 font-body text-on-surface"
    >
      {/* Header */}
      <motion.div
        variants={fadeUp}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-[24px] font-bold text-on-surface font-display">
            Coupons & Offers
          </h1>
          <p className="text-[13px] text-outline">
            {coupons.filter((c) => c.isActive).length} active coupons in store catalog
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/coupons/create")}
          className="px-6 py-3 bg-black text-white rounded-full text-[12px] font-bold uppercase tracking-wider shadow-lg hover:shadow-slate-950/5 hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Create Coupon
        </button>
      </motion.div>

      {/* Loading & Empty State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-[12px] text-outline">Loading active discount coupons...</p>
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-container-highest/60 p-12 text-center flex flex-col items-center justify-center space-y-4">
          <span className="material-symbols-outlined text-[48px] text-outline-variant">
            sell
          </span>
          <div>
            <p className="text-[15px] font-bold text-[#0F172A]">Data Not Found</p>
            <p className="text-[12px] text-[#64748B] mt-1">No promotional coupons exist. Create marketing codes to attract checkout volumes.</p>
          </div>
          <button
            onClick={() => navigate("/admin/coupons/create")}
            className="px-5 py-2.5 bg-black text-white hover:bg-slate-900 rounded-xl text-[12px] font-bold uppercase tracking-wider cursor-pointer shadow-sm transition-all active:scale-95"
          >
            Generate Coupon Code
          </button>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-container-highest/60 p-12 text-center flex flex-col items-center justify-center space-y-4">
          <span className="material-symbols-outlined text-[48px] text-outline-variant">
            search_off
          </span>
          <div>
            <p className="text-[15px] font-bold text-[#0F172A]">Data Not Found</p>
            <p className="text-[12px] text-[#64748B] mt-1">Try adjusting your coupon code keywords or active filters.</p>
          </div>
        </div>
      ) : (
        <motion.div
          variants={fadeUp}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {filteredCoupons.map((c) => {
            const hasLimit = c.usageLimit && c.usageLimit > 0;
            const remaining = hasLimit ? Math.max(0, c.usageLimit - c.usedCount) : "∞";
            const percentUsed = hasLimit ? Math.round((c.usedCount / c.usageLimit) * 100) : 0;
            const isExpired = new Date() > new Date(c.expiryDate);

            return (
              <motion.div
                key={c._id || c.id}
                whileHover={{ y: -2 }}
                className={`bg-white rounded-2xl p-5 border transition-all ${
                  c.isActive && !isExpired 
                    ? "border-surface-container-highest/60" 
                    : "border-surface-container-highest/30 opacity-60 bg-surface-container-low/20"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        c.isActive && !isExpired ? "bg-slate-100 text-black" : "bg-surface-container-low text-outline"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[24px]">
                        sell
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[18px] font-bold text-on-surface font-mono tracking-wider">
                          {c.code}
                        </span>
                      </div>
                      <p className="text-[12px] text-outline">
                        {c.discountType === "percentage"
                          ? `${c.discountValue}% off`
                          : `₹${c.discountValue} off`}{" "}
                        · Min order ₹{c.minOrderAmount?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <AdminToggle
                      checked={c.isActive && !isExpired}
                      onChange={() => handleToggleActive(c._id || c.id, c.isActive)}
                      disabled={isExpired}
                    />
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${
                        isExpired 
                          ? "text-red-600 bg-red-50 border-red-200"
                          : c.isActive 
                          ? "text-emerald-600 bg-emerald-50 border-emerald-200" 
                          : "text-amber-600 bg-amber-50 border-amber-200"
                      }`}
                    >
                      {isExpired ? "Expired" : c.isActive ? "Active" : "Disabled"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2 bg-surface-container-low/40 rounded-xl border border-surface-container-highest/20">
                    <p className="text-[14px] font-bold text-black">{c.usedCount || 0}</p>
                    <p className="text-[10px] text-outline">Used</p>
                  </div>
                  <div className="text-center p-2 bg-surface-container-low/40 rounded-xl border border-surface-container-highest/20">
                    <p className="text-[14px] font-bold text-on-surface">
                      {remaining}
                    </p>
                    <p className="text-[10px] text-outline">Remaining</p>
                  </div>
                  <div className="text-center p-2 bg-surface-container-low/40 rounded-xl border border-surface-container-highest/20">
                    <p className="text-[14px] font-bold text-on-surface">
                      {c.maxDiscount ? `₹${c.maxDiscount}` : "∞"}
                    </p>
                    <p className="text-[10px] text-outline">Max Off</p>
                  </div>
                </div>

                {hasLimit && (
                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] text-outline mb-1 font-medium">
                      <span>
                        Usage: {c.usedCount}/{c.usageLimit}
                      </span>
                      <span>{percentUsed}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black rounded-full transition-all"
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-surface-container-low">
                  <span className="text-[10px] text-outline">
                    Valid: {new Date(c.startDate).toLocaleDateString()} to {new Date(c.expiryDate).toLocaleDateString()}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => navigate(`/admin/coupons/edit/${c._id || c.id}`)}
                      className="p-2 rounded-lg text-outline hover:bg-slate-100 hover:text-black transition-colors cursor-pointer"
                      title="Edit Coupon Curation"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        edit
                      </span>
                    </button>
                    <button
                      onClick={() => handleDelete(c._id || c.id)}
                      className="p-2 rounded-lg text-outline hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
                      title="Delete Coupon"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
