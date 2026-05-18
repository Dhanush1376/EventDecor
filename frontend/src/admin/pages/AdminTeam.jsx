import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../services/api";
import toast from "react-hot-toast";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export function AdminTeam() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);

  // Modal Invitation Drawer
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("manager");
  const [invitePermissions, setInvitePermissions] = useState("Full Access");
  const [submitting, setSubmitting] = useState(false);

  const fetchTeamData = async () => {
    try {
      const res = await api.get("/users/team");
      if (res.data?.success) {
        setMembers(res.data.data.members || []);
        setInvites(res.data.data.invites || []);
      }
    } catch (err) {
      toast.error("Failed to sync team listings from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, []);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/users/team/invite", {
        email: inviteEmail,
        role: inviteRole,
        permissions: invitePermissions,
      });
      if (res.data?.success) {
        toast.success(`Invitation dispatched to ${inviteEmail} via SMTP!`);
        setInviteEmail("");
        setInvitePermissions("Full Access");
        setIsInviteOpen(false);
        fetchTeamData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to dispatch email invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelInvite = async (inviteId) => {
    if (!confirm("Are you sure you want to deactivate and cancel this invitation?")) return;
    try {
      const res = await api.delete(`/users/team/invite/${inviteId}`);
      if (res.data?.success) {
        toast.success("Invitation cancelled successfully.");
        fetchTeamData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel invitation.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 font-body">
        <div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-[12px] text-outline font-medium uppercase tracking-widest">
          Syncing active team roster...
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1440px] mx-auto space-y-8 font-body text-on-surface"
    >
      {/* Header Workspace */}
      <motion.div
        variants={fadeUp}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-[24px] font-bold text-on-surface font-display tracking-tight">
            Team Workspace & Authorization
          </h1>
          <p className="text-[13px] text-outline mt-0.5">
            Manage administrative access rights, role designations, and active invitations
          </p>
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          className="btn-minimal group cursor-pointer flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Invite Team Member
        </button>
      </motion.div>

      {/* Roster & Active Directory Grid */}
      <div className="space-y-6">
        <div>
          <h2 className="text-[15px] font-bold text-on-surface uppercase tracking-wider mb-4">
            Active Roster Directory ({members.length})
          </h2>
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {members.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-[2rem] border border-surface-container-highest/60 flex flex-col items-center justify-center p-6 shadow-sm col-span-full">
                <span className="material-symbols-outlined text-[48px] text-[#64748B]/40 mb-2 block">search_off</span>
                <p className="text-[14px] font-bold text-[#0F172A] mt-1">Data Not Found</p>
                <p className="text-[12px] text-[#64748B] max-w-[280px]">No active team members found in the database.</p>
              </div>
            ) : (
              members.map((m) => (
                <motion.div
                  key={m._id || m.id}
                  whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(115,92,0,0.04)" }}
                  className="bg-white rounded-[2rem] p-8 border border-surface-container-highest/60 transition-all duration-300 relative group"
                >
                  <div className="flex flex-col gap-6">
                    <div className="flex items-start gap-5">
                      {/* Dynamic Avatar */}
                      <div className="relative">
                        {m.avatar ? (
                          <img
                            src={m.avatar}
                            alt={m.name}
                            className="w-16 h-16 rounded-2xl object-cover shadow-lg border-2 border-white"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-container to-primary-container/80 flex items-center justify-center shadow-lg border-2 border-white">
                            <span className="text-white text-[20px] font-bold font-display tracking-tight">
                              {m.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </span>
                          </div>
                        )}
                        {/* Active Status Indicator */}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                        </div>
                      </div>

                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[16px] font-bold text-on-surface font-display leading-tight">
                            {m.name || "Active Curator"}
                          </h3>
                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                        </div>
                        <p className="text-[12px] text-black font-bold tracking-tight uppercase">
                          {m.role || "Manager"}
                        </p>
                        <p className="text-[11px] text-outline font-medium mt-1 font-mono break-all">
                          {m.email}
                        </p>
                      </div>
                    </div>

                    {/* Roster Access Permissions */}
                    <div className="pt-5 border-t border-surface-container-low">
                      <p className="text-[9px] text-outline-variant uppercase tracking-[0.2em] font-bold mb-3">
                        Access Scope
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-3 py-1 bg-surface-container-low rounded-full text-[9px] text-on-surface-variant font-bold border border-surface-container-highest/40">
                          {m.role === "admin"
                            ? "Full Suite Access"
                            : m.role === "manager"
                            ? "Catalog & Bookings"
                            : "Visual Portfolios"}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        </div>

        {/* Invited / Pending Permissions Directory */}
        {invites.length > 0 && (
          <div className="pt-6">
            <h2 className="text-[15px] font-bold text-on-surface uppercase tracking-wider mb-4">
              Pending Team Invitations ({invites.length})
            </h2>
            <motion.div
              variants={fadeUp}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {invites.map((inv) => (
                <motion.div
                  key={inv._id}
                  className="bg-white rounded-[2rem] p-7 border border-surface-container-highest/60 relative group flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/50 flex items-center justify-center text-amber-600">
                          <span className="material-symbols-outlined text-[20px]">
                            mail_outline
                          </span>
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-on-surface font-mono break-all">
                            {inv.email}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase mt-1 inline-block ${
                              inv.status === "declined"
                                ? "text-rose-600 bg-rose-50 border-rose-200"
                                : "text-amber-600 bg-amber-50 border-amber-200"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelInvite(inv._id)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-outline/40 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Cancel Invitation"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>

                    <div className="pt-3 border-t border-surface-container-low text-[11px] text-outline space-y-1">
                      <p>
                        Role Scope: <strong className="text-on-surface uppercase">{inv.role}</strong>
                      </p>
                      <p>
                        Scope Rights:{" "}
                        <strong className="text-on-surface">"{inv.permissions}"</strong>
                      </p>
                      <p className="text-[9px] text-outline-variant font-mono">
                        Invited: {new Date(inv.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}
      </div>

      {/* Dynamic Slide-Over Invitation Drawer */}
      <AnimatePresence>
        {isInviteOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop Lock */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInviteOpen(false)}
              className="absolute inset-0 bg-black/35 backdrop-blur-xs"
            />

            {/* Content Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-[460px] bg-white h-full shadow-2xl p-8 flex flex-col justify-between border-l border-surface-container-highest/60"
            >
              <div className="space-y-6 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-surface-container-low pb-4">
                  <div>
                    <h3 className="text-[18px] font-bold text-on-surface font-display">
                      Invite Member Access
                    </h3>
                    <p className="text-[11px] text-outline">
                      Dispatches email request to member for authorization verification
                    </p>
                  </div>
                  <button
                    onClick={() => setIsInviteOpen(false)}
                    className="p-2 rounded-full hover:bg-surface-container-low cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <form onSubmit={handleSendInvite} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-outline uppercase tracking-wider font-bold">
                      Member Email Address
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="e.g. team.member@gmail.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-4 py-3.5 bg-[#F8F9FB] border border-surface-container-highest rounded-xl text-[12px] text-on-surface outline-none focus:border-slate-900 font-mono transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-outline uppercase tracking-wider font-bold">
                      Team Role Designation
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-4 py-3.5 bg-[#F8F9FB] border border-surface-container-highest rounded-xl text-[12px] text-on-surface outline-none focus:border-slate-900 font-medium transition-all"
                    >
                      <option value="manager">Event Manager (CMS & Bookings)</option>
                      <option value="coordinator">Product Coordinator (Catalog CRUD)</option>
                      <option value="admin">Co-Administrator (Full Studio Access)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-outline uppercase tracking-wider font-bold">
                      Custom Access Scope Permissions
                    </label>
                    <input
                      type="text"
                      value={invitePermissions}
                      onChange={(e) => setInvitePermissions(e.target.value)}
                      placeholder="e.g. Products, Inventory, Custom Blueprints"
                      className="w-full px-4 py-3.5 bg-[#F8F9FB] border border-surface-container-highest rounded-xl text-[12px] text-on-surface outline-none focus:border-slate-900 font-medium transition-all"
                    />
                  </div>

                  <button
                    disabled={submitting}
                    type="submit"
                    className="w-full py-4 bg-black text-white hover:bg-slate-100 font-bold rounded-2xl text-[12px] uppercase tracking-wider shadow-lg shadow-slate-950/5 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                  >
                    {submitting && (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    Send Invitation Request
                  </button>
                </form>
              </div>

              <div className="border-t border-surface-container-low pt-4 text-[10px] text-outline leading-normal">
                <strong>SMTP Security Note:</strong> Members invited receive an explicit secure email
                with an invitation responder token. Access rights to the studio panel are pending
                until the user actively clicks and accepts the request.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
