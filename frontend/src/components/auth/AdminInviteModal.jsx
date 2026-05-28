import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { adminInviteService } from "../../services/domainServices";
import { refreshAccessToken } from "../../services/api";
import toast from "react-hot-toast";
import logger from "../../utils/logger";

export function AdminInviteModal() {
  const { user, isAuthenticated, checkAuth } = useAuth();
  const [invite, setInvite] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const checkPendingInvitation = async () => {
      if (!isAuthenticated || !user) return;
      try {
        const res = await adminInviteService.getMyPendingInvite();
        if (active && res?.success && res?.data) {
          setInvite(res.data);
          setIsOpen(true);
        }
      } catch (err) {
        if (err?.response?.status !== 401 && err?.code !== 'ERR_NO_SESSION') {
          logger.error("Failed to check pending admin invitations:", err);
        }
      }
    };

    checkPendingInvitation();

    // Poll every 30 seconds to show new invitations instantly
    const intervalId = setInterval(checkPendingInvitation, 30000);

    // Check again when user logging state changes
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [isAuthenticated, user]);

  const handleResponse = async (action) => {
    if (!invite || submitting) return;
    setSubmitting(true);
    const actionText = action === "accept" ? "accepting" : "rejecting";
    const loadingToast = toast.loading(`Processing invitation...`);

    try {
      const res = await adminInviteService.respondToInvite(invite._id, action);
      if (res?.success) {
        toast.dismiss(loadingToast);
        if (action === "accept") {
          toast.success("Welcome to the Admin Portal! Upgrading your access privileges...");
          
          // Refresh access token to encode the new administrative role in the JWT
          const token = await refreshAccessToken();
          if (token) {
            await checkAuth(); // Sync user state across the entire React application
          }

          // Small delay for micro-animations, then redirect to admin dashboard
          setTimeout(() => {
            window.location.href = "/admin";
          }, 1000);
        } else {
          toast.success("Invitation declined successfully.");
        }
        setIsOpen(false);
        setInvite(null);
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || `Failed to respond to invitation.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && invite && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          {/* Blur Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-[480px] bg-white/90 dark:bg-[#121824]/90 backdrop-blur-2xl border border-outline-variant/30 dark:border-slate-800 rounded-[2.5rem] shadow-Luxury p-8 overflow-hidden font-body text-on-surface"
          >
            {/* Elegant Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative space-y-6">
              {/* Header Icon & Title */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-inner">
                  <span className="material-symbols-outlined text-[32px] animate-pulse">
                    shield_person
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-primary uppercase font-bold tracking-[0.3em] block">
                    Access Invitation
                  </span>
                  <h2 className="text-[22px] font-bold text-[#0F172A] dark:text-white font-display tracking-tight leading-tight">
                    Invite to Admin Portal
                  </h2>
                </div>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 font-light leading-relaxed max-w-[340px]">
                  You have been invited by <strong className="font-semibold text-slate-800 dark:text-slate-200">{invite.invitedBy?.name || invite.invitedBy?.email}</strong> to join the administrative team.
                </p>
              </div>

              {/* Roles and Permissions Summary Card */}
              <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
                    Assigned Role
                  </span>
                  <span className="px-3.5 py-1 bg-primary text-white text-[10px] uppercase font-bold tracking-wider rounded-full shadow-sm">
                    {invite.roleAssigned}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold block">
                    Access & Scope Rights
                  </span>
                  <p className="text-[13px] text-[#0F172A] dark:text-slate-200 font-medium italic leading-relaxed">
                    "{invite.permissionsSummary}"
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  disabled={submitting}
                  onClick={() => handleResponse("reject")}
                  className="flex-1 h-12 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-full flex items-center justify-center font-bold text-[12px] uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Decline
                </button>
                <button
                  disabled={submitting}
                  onClick={() => handleResponse("accept")}
                  className="flex-1 h-12 bg-primary text-white rounded-full flex items-center justify-center gap-2 font-bold text-[12px] uppercase tracking-wider hover:bg-[#0F172A] dark:hover:bg-white dark:hover:text-black transition-all shadow-md shadow-primary/10 disabled:opacity-40 cursor-pointer"
                >
                  {submitting ? (
                    <div className="skeleton-box inline-block w-4 h-4 rounded-md" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                      <span>Accept Access</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-center">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal max-w-[360px] mx-auto">
                  Accepting this invitation grants immediate workspace access permissions. You will be redirected to the admin portal console.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
