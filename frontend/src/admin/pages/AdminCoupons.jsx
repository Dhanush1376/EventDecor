import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { couponService } from "../../services/domainServices";
import { useAdmin } from "../context/AdminContext";
import toast from "react-hot-toast";
import {
  PageHeader,
  AdminToggle,
  StatusBadge,
  EmptyState,
  SkeletonCard,
  fadeUp,
  stagger,
} from "../components/AdminUIKit";

export function AdminCoupons() {
  const navigate = useNavigate();
  const { searchQuery } = useAdmin();
  const queryClient = useQueryClient();

  // Route-based creation instead of drawer

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
      toast.success("Coupon deleted");
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
      variants={stagger}
      className="space-y-6"
    >
      {/* Header */}
      <PageHeader
        title="Coupons & Offers"
        subtitle={`${coupons.filter((c) => c.isActive).length} active coupons in store catalog`}
      >
        <button
          onClick={() => navigate("/admin/coupons/add")}
          className="admin-btn admin-btn-primary h-9"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Create Coupon
        </button>
      </PageHeader>

      {/* Loading & Empty State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} className="h-56" />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <EmptyState
          icon="sell"
          title="No Coupons"
          description="No coupons exist. Create some to attract customers."
          action={
            <button
              onClick={() => {
                navigate("/admin/coupons/add");
              }}
              className="admin-btn admin-btn-primary admin-btn-sm"
            >
              Create Coupon
            </button>
          }
        />
      ) : filteredCoupons.length === 0 ? (
        <EmptyState
          icon="search_off"
          title="No Results"
          description="Try adjusting your coupon code keywords or active filters."
        />
      ) : (
        <motion.div
          variants={stagger}
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
                variants={fadeUp}
                className={`admin-card p-5 transition-all hover:shadow-[var(--admin-shadow-md)] hover:border-[var(--admin-border-strong)] ${
                  !c.isActive || isExpired ? "opacity-60" : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-[var(--admin-radius-lg)] flex items-center justify-center shrink-0 ${
                        c.isActive && !isExpired
                          ? "bg-[var(--admin-accent-light)] text-[var(--admin-accent)]"
                          : "bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">
                        sell
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] font-bold text-[var(--admin-text-primary)] font-mono tracking-wider">
                          {c.code}
                        </span>
                      </div>
                      <p className="text-[12px] text-[var(--admin-text-secondary)] mt-0.5">
                        {c.discountType === "percentage"
                          ? `${c.discountValue}% off`
                          : `₹${c.discountValue} off`}
                        {" "}· Min order ₹{c.minOrderAmount?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <AdminToggle
                      checked={c.isActive && !isExpired}
                      onChange={() => handleToggleActive(c._id || c.id, c.isActive)}
                      disabled={isExpired}
                    />
                    <StatusBadge
                      status={isExpired ? "Cancelled" : c.isActive ? "Active" : "Inactive"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Used", value: c.usedCount || 0 },
                    { label: "Remaining", value: remaining },
                    { label: "Max Off", value: c.maxDiscount ? `₹${c.maxDiscount}` : "∞" },
                  ].map((stat, i) => (
                    <div key={i} className="text-center p-2.5 bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]">
                      <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">{stat.value}</p>
                      <p className="text-[10px] text-[var(--admin-text-tertiary)] font-semibold uppercase tracking-wider mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {hasLimit && (
                  <div className="mb-3">
                    <div className="flex justify-between text-[11px] text-[var(--admin-text-tertiary)] mb-1.5 font-medium">
                      <span>
                        Usage: {c.usedCount}/{c.usageLimit}
                      </span>
                      <span>{percentUsed}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--admin-surface-muted)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--admin-accent)] rounded-full transition-all"
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-[var(--admin-border-subtle)]">
                  <span className="text-[11px] text-[var(--admin-text-tertiary)] font-medium">
                    Valid: {new Date(c.startDate).toLocaleDateString()} to {new Date(c.expiryDate).toLocaleDateString()}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => navigate(`/admin/coupons/edit/${c._id || c.id}`)}
                      className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                      title="Edit Coupon"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        edit
                      </span>
                    </button>
                    <button
                      onClick={() => handleDelete(c._id || c.id)}
                      className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)]"
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
