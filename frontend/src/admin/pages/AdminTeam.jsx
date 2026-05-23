import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { adminInviteService } from "../../services/domainServices";
import api from "../../services/api";
import toast from "react-hot-toast";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const ROLE_WEIGHTS = {
  owner: 100,
  super_admin: 90,
  main_admin: 85,
  admin: 80,
  moderator: 70,
  support_admin: 60,
  support: 50,
  order_manager: 40,
  content_manager: 30,
  manager: 20,
  coordinator: 10,
  customer: 0,
  user: 0
};

export function AdminTeam() {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("roster"); // roster, pending, history

  // Modal Invitation Drawer
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("admin");
  const [invitePermissions, setInvitePermissions] = useState("Access Admin Portal & Dashboard");
  const [submitting, setSubmitting] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchTeamData = async () => {
    try {
      // 1. Fetch active roster (members)
      const res = await api.get("/users/team");
      if (res.data?.success) {
        setMembers(res.data.data.members || []);
      }

      // 2. Fetch pending invites
      const pendingRes = await adminInviteService.getPendingInvites({ limit: 50 });
      if (pendingRes?.success) {
        setInvites(pendingRes.data?.data || pendingRes.data?.results || pendingRes.data || []);
      }

      // 3. Fetch invitation history
      const historyRes = await adminInviteService.getInviteHistory({ limit: 50 });
      if (historyRes?.success) {
        setHistory(historyRes.data?.data || historyRes.data?.results || historyRes.data || []);
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

  // Helper check: Can current user manage target user?
  const canManageMember = (targetRole, targetEmail) => {
    if (!currentUser) return false;
    
    // Protect primary super admin configured in env
    const protectedEmails = [
      (process.env.REACT_APP_SUPER_ADMIN_EMAIL || "").trim().toLowerCase(),
      "siriarts.superadmin@gmail.com" // safety fallback
    ];
    if (targetEmail && protectedEmails.includes(targetEmail.toLowerCase())) {
      return false;
    }

    const actorWeight = ROLE_WEIGHTS[currentUser.role] || 0;
    const targetWeight = ROLE_WEIGHTS[targetRole] || 0;

    if (actorWeight < 90) return false; // Only super admins & owners
    if (currentUser.role === 'owner') return true;

    // Super Admin can only manage roles strictly lower than super_admin
    return actorWeight > targetWeight;
  };

  // Helper check: Can current user assign/invite to a role?
  const canAssignRole = (roleToAssign) => {
    if (!currentUser) return false;
    const actorWeight = ROLE_WEIGHTS[currentUser.role] || 0;
    const targetWeight = ROLE_WEIGHTS[roleToAssign] || 0;

    if (actorWeight < 90) return false;
    if (currentUser.role === 'owner') return true;

    // Super Admin cannot assign owner or super_admin roles
    return targetWeight < 90;
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!canAssignRole(inviteRole)) {
      toast.error("Privilege escalation blocked: You cannot assign a role equal to or higher than your own.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminInviteService.sendInvite({
        email: inviteEmail,
        role: inviteRole,
        permissionsSummary: invitePermissions,
      });
      if (res?.success) {
        toast.success(`Access invitation dispatched to ${inviteEmail}!`);
        setInviteEmail("");
        setInvitePermissions("Access Admin Portal & Dashboard");
        setIsInviteOpen(false);
        fetchTeamData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create invitation request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    if (!confirm("Are you sure you want to revoke this pending invitation?")) return;
    try {
      const res = await adminInviteService.revokeInvite(inviteId);
      if (res?.success) {
        toast.success("Invitation revoked successfully.");
        fetchTeamData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to revoke invitation.");
    }
  };

  const handleUpdateRole = async (userId, targetEmail, currentRole, newRole) => {
    if (!canManageMember(currentRole, targetEmail)) {
      toast.error("Permission denied: You do not have role clearance to modify this user.");
      return;
    }
    if (!canAssignRole(newRole)) {
      toast.error("Privilege escalation blocked: You cannot elevate a user to a role equal to or higher than your own.");
      return;
    }

    const loadToast = toast.loading("Updating administrative privileges...");
    try {
      const res = await api.put(`/admin/system/users/${userId}/role`, { role: newRole });
      if (res.data?.success) {
        toast.dismiss(loadToast);
        toast.success("Administrative role updated successfully.");
        fetchTeamData();
      }
    } catch (err) {
      toast.dismiss(loadToast);
      toast.error(err.response?.data?.message || "Failed to update administrator role.");
    }
  };

  const handleRemoveAdmin = async (userId, targetEmail, targetRole) => {
    if (!canManageMember(targetRole, targetEmail)) {
      toast.error("Permission denied: You do not have role clearance to remove this user.");
      return;
    }
    if (!confirm("Are you sure you want to completely revoke admin access for this user? This will downgrade their account to customer status.")) return;

    const loadToast = toast.loading("Revoking administrator privileges...");
    try {
      const res = await api.delete(`/admin/system/users/${userId}`);
      if (res.data?.success) {
        toast.dismiss(loadToast);
        toast.success("Access privileges revoked successfully.");
        fetchTeamData();
      }
    } catch (err) {
      toast.dismiss(loadToast);
      toast.error(err.response?.data?.message || "Failed to revoke admin privileges.");
    }
  };

  // Filter assignable roles for the invite drawer
  const assignableRoles = Object.keys(ROLE_WEIGHTS).filter(
    (role) => !['user', 'customer'].includes(role) && canAssignRole(role)
  );

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
            Manage administrative access rights, role hierarchies, and active invitations
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

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-surface-container-low gap-6">
        <button
          onClick={() => setActiveTab("roster")}
          className={`pb-3 text-[12px] uppercase tracking-widest font-bold border-b-2 cursor-pointer transition-all ${
            activeTab === "roster" ? "border-primary text-primary" : "border-transparent text-outline hover:text-on-surface"
          }`}
        >
          Active Roster ({members.length})
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-3 text-[12px] uppercase tracking-widest font-bold border-b-2 cursor-pointer transition-all ${
            activeTab === "pending" ? "border-primary text-primary" : "border-transparent text-outline hover:text-on-surface"
          }`}
        >
          Pending Invites ({invites.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 text-[12px] uppercase tracking-widest font-bold border-b-2 cursor-pointer transition-all ${
            activeTab === "history" ? "border-primary text-primary" : "border-transparent text-outline hover:text-on-surface"
          }`}
        >
          Invitation History ({history.length})
        </button>
      </div>

      {/* Roster Tab */}
      {activeTab === "roster" && (
        <div className="space-y-6">
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
              members.map((m) => {
                const canManage = canManageMember(m.role, m.email) && String(m._id || m.id) !== String(currentUser?._id || currentUser?.id);
                return (
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
                                  ?.split(" ")
                                  ?.map((n) => n[0])
                                  ?.join("")
                                  ?.toUpperCase() || "U"}
                              </span>
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                          </div>
                        </div>

                        <div className="flex-1 pt-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[16px] font-bold text-on-surface font-display leading-tight">
                              {m.name || "Curator"}
                            </h3>
                          </div>
                          <p className="text-[11px] text-primary font-bold tracking-tight uppercase">
                            {m.role}
                          </p>
                          <p className="text-[11px] text-outline font-medium mt-1 font-mono break-all">
                            {m.email}
                          </p>
                        </div>
                      </div>

                      {/* Controls Area */}
                      <div className="pt-5 border-t border-surface-container-low flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-outline-variant uppercase tracking-[0.2em] font-bold">
                            Administrative Controls
                          </span>
                          {canManage && (
                            <button
                              onClick={() => handleRemoveAdmin(m._id || m.id, m.email, m.role)}
                              className="px-3 py-1 text-[10px] text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100/60 rounded-lg font-bold transition-colors cursor-pointer"
                            >
                              Revoke Access
                            </button>
                          )}
                        </div>

                        {canManage ? (
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-outline font-bold">Update Role Level</label>
                            <select
                              value={m.role}
                              onChange={(e) => handleUpdateRole(m._id || m.id, m.email, m.role, e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-on-surface outline-none focus:border-slate-900 transition-all font-semibold"
                            >
                              {Object.keys(ROLE_WEIGHTS)
                                .filter((role) => !['user', 'customer'].includes(role) && canAssignRole(role))
                                .map((role) => (
                                  <option key={role} value={role}>
                                    {role.toUpperCase()}
                                  </option>
                                ))}
                            </select>
                          </div>
                        ) : (
                          <div className="text-[10.5px] text-slate-400 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px]">lock</span>
                            <span>Managed by Root Account/Hierarchy Rules</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </div>
      )}

      {/* Pending Invites Tab */}
      {activeTab === "pending" && (
        <div className="space-y-6">
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {invites.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-[2rem] border border-surface-container-highest/60 flex flex-col items-center justify-center p-6 shadow-sm col-span-full">
                <span className="material-symbols-outlined text-[48px] text-[#64748B]/40 mb-2 block">mail_lock</span>
                <p className="text-[14px] font-bold text-[#0F172A] mt-1">No Pending Invites</p>
                <p className="text-[12px] text-[#64748B] max-w-[280px]">All invitations have been processed or expired.</p>
              </div>
            ) : (
              invites.map((inv) => (
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
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase mt-1 inline-block text-amber-600 bg-amber-50 border-amber-200">
                            {inv.status}
                          </span>
                        </div>
                      </div>
                      {canAssignRole(inv.roleAssigned) && (
                        <button
                          onClick={() => handleRevokeInvite(inv._id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-outline/40 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Revoke Invitation"
                        >
                          <span className="material-symbols-outlined text-[18px]">cancel</span>
                        </button>
                      )}
                    </div>

                    <div className="pt-3 border-t border-surface-container-low text-[11.5px] text-outline space-y-1">
                      <p>
                        Role Level: <strong className="text-on-surface uppercase">{inv.roleAssigned}</strong>
                      </p>
                      <p>
                        Permissions: <strong className="text-on-surface">"{inv.permissionsSummary}"</strong>
                      </p>
                      <p className="text-[9.5px] text-outline-variant font-mono">
                        Invited By: {inv.invitedBy?.name || inv.invitedBy?.email} <br />
                        Date: {new Date(inv.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="bg-white rounded-[2rem] border border-surface-container-highest/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-slate-50 border-b border-surface-container-low text-outline font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Invited Email</th>
                  <th className="px-6 py-4">Designation</th>
                  <th className="px-6 py-4">Invited By</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created At</th>
                  <th className="px-6 py-4">Resolved At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-outline">
                      No invitation history logs found in database audit trail.
                    </td>
                  </tr>
                ) : (
                  history.map((h) => {
                    const resolvedDate = h.acceptedAt || h.rejectedAt || h.revokedAt;
                    return (
                      <tr key={h._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-medium text-[#0F172A]">{h.email}</td>
                        <td className="px-6 py-4 text-primary font-bold uppercase text-[10px]">{h.roleAssigned}</td>
                        <td className="px-6 py-4 text-outline font-medium">{h.invitedBy?.name || h.invitedBy?.email}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                              h.status === "accepted"
                                ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                                : h.status === "rejected"
                                ? "text-rose-600 bg-rose-50 border-rose-200"
                                : h.status === "revoked"
                                ? "text-slate-500 bg-slate-50 border-slate-200"
                                : "text-amber-600 bg-amber-50 border-amber-200"
                            }`}
                          >
                            {h.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-outline-variant font-mono">{new Date(h.createdAt).toLocaleString()}</td>
                        <td className="px-6 py-4 text-outline font-mono">
                          {resolvedDate ? new Date(resolvedDate).toLocaleString() : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                      Grants admin access to an existing user email. A popup will show up on their next login.
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
                      Member Registered Email
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
                      {assignableRoles.map((role) => (
                        <option key={role} value={role}>
                          {role.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-outline uppercase tracking-wider font-bold">
                      Access Scope Permissions
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
                <strong>SMTP Security Note:</strong> Members invited receive an explicit secure email.
                Access rights to the studio panel are pending until the user logs into their account and clicks accept.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
