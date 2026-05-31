import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { adminInviteService } from "../../services/domainServices";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  PageHeader,
  FilterBar,
  fadeUp,
  stagger,
  SkeletonDashboard,
} from "../components/AdminUIKit";

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
      toast.error(getErrorMessage(err, "Failed to sync team listings from database."));
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
      ((import.meta.env?.VITE_SUPER_ADMIN_EMAIL) || "").trim().toLowerCase(),
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
      toast.error(getErrorMessage(err, "Failed to create invitation request."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    if (!window.confirm("Are you sure you want to revoke this pending invitation?")) return;
    try {
      const res = await adminInviteService.revokeInvite(inviteId);
      if (res?.success) {
        toast.success("Invitation removed");
        fetchTeamData();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to revoke invitation."));
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

    const loadToast = toast.loading("Updating permissions...");
    try {
      const res = await api.put(`/admin/system/users/${userId}/role`, { role: newRole });
      if (res.data?.success) {
        toast.dismiss(loadToast);
        toast.success("Role updated");
        fetchTeamData();
      }
    } catch (err) {
      toast.dismiss(loadToast);
      toast.error(getErrorMessage(err, "Failed to update role."));
    }
  };

  const handleRemoveAdmin = async (userId, targetEmail, targetRole) => {
    if (!canManageMember(targetRole, targetEmail)) {
      toast.error("Permission denied: You do not have role clearance to remove this user.");
      return;
    }
    if (!window.confirm("Are you sure you want to completely revoke admin access for this user? This will downgrade their account to customer status.")) return;

    const loadToast = toast.loading("Revoking privileges...");
    try {
      const res = await api.delete(`/admin/system/users/${userId}`);
      if (res.data?.success) {
        toast.dismiss(loadToast);
        toast.success("Access revoked");
        fetchTeamData();
      }
    } catch (err) {
      toast.dismiss(loadToast);
      toast.error(getErrorMessage(err, "Failed to revoke admin privileges."));
    }
  };

  // Filter assignable roles for the invite drawer
  const assignableRoles = Object.keys(ROLE_WEIGHTS).filter(
    (role) => !['user', 'customer'].includes(role) && canAssignRole(role)
  );

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6"
    >
      <PageHeader
        title="Team Workspace & Authorization"
        subtitle="Manage team access and invitations"
        headerAction={
          <div className="w-full sm:max-w-md">
            <FilterBar
              filters={["roster", "pending", "history"]}
              value={activeTab}
              onChange={setActiveTab}
              className="pb-0 border-b border-[var(--admin-border-subtle)]"
              formatLabel={(id) => {
                if (id === "roster") return `Active Roster (${members.length})`;
                if (id === "pending") return `Pending Invites (${invites.length})`;
                if (id === "history") return `Invitation History (${history.length})`;
                return id;
              }}
            />
          </div>
        }
      >
        <button
          onClick={() => setIsInviteOpen(true)}
          className="admin-btn admin-btn-primary h-9"
        >
          <span className="material-symbols-outlined text-[16px]">person_add</span>
          Invite Team Member
        </button>
      </PageHeader>



      {loading ? (
        <SkeletonDashboard />
      ) : (
        <AnimatePresence mode="wait">
          {/* Roster Tab */}
          {activeTab === "roster" && (
            <motion.div
              key="roster"
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {members.length === 0 ? (
                <motion.div variants={fadeUp} className="admin-card py-20 text-center flex flex-col items-center justify-center col-span-full">
                  <span className="material-symbols-outlined text-[48px] text-[var(--admin-text-tertiary)] mb-4">search_off</span>
                  <p className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-1">Data Not Found</p>
                  <p className="text-[12px] text-[var(--admin-text-secondary)]">No active team members found in the database.</p>
                </motion.div>
              ) : (
                members.map((m) => {
                  const canManage = canManageMember(m.role, m.email) && String(m._id || m.id) !== String(currentUser?._id || currentUser?.id);
                  return (
                    <motion.div
                      variants={fadeUp}
                      key={m._id || m.id}
                      className="admin-card p-6 group hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-md)] transition-all duration-300"
                    >
                      <div className="flex flex-col h-full justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className="relative shrink-0">
                            {m.avatar ? (
                              <img
                                src={m.avatar}
                                alt={m.name}
                                className="w-14 h-14 rounded-[var(--admin-radius-lg)] object-cover shadow-sm border border-[var(--admin-border-subtle)]"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-[var(--admin-radius-lg)] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] flex items-center justify-center shadow-sm">
                                <span className="text-[var(--admin-text-primary)] text-[18px] font-bold">
                                  {m.name?.split(" ")?.map((n) => n[0])?.join("")?.toUpperCase() || "U"}
                                </span>
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[var(--admin-surface)] rounded-full flex items-center justify-center shadow-sm">
                              <div className="w-2.5 h-2.5 bg-[var(--admin-success)] rounded-full" />
                            </div>
                          </div>
  
                          <div className="min-w-0 flex-1">
                            <h3 className="text-[15px] font-bold text-[var(--admin-text-primary)] leading-tight truncate">
                              {m.name || "Curator"}
                            </h3>
                            <p className="text-[10px] text-[var(--admin-accent)] font-bold tracking-wider uppercase mt-1 mb-1.5">
                              {m.role}
                            </p>
                            <p className="text-[12px] text-[var(--admin-text-secondary)] font-medium truncate">
                              {m.email}
                            </p>
                          </div>
                        </div>
  
                        {/* Controls Area */}
                        <div className="pt-4 border-t border-[var(--admin-border-subtle)]">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase tracking-wider font-bold">
                              Admin Settings
                            </span>
                            {canManage && (
                              <button
                                onClick={() => handleRemoveAdmin(m._id || m.id, m.email, m.role)}
                                className="px-2.5 py-1 text-[10px] text-[var(--admin-error)] bg-[var(--admin-error-light)] border border-transparent hover:border-[var(--admin-error)] rounded-[var(--admin-radius-sm)] font-bold transition-colors cursor-pointer"
                              >
                                Revoke Access
                              </button>
                            )}
                          </div>
  
                          {canManage ? (
                            <div className="space-y-1.5">
                              <label className="admin-label">Update Role Level</label>
                              <select
                                value={m.role}
                                onChange={(e) => handleUpdateRole(m._id || m.id, m.email, m.role, e.target.value)}
                                className="admin-input h-9 py-0 text-[12px] font-bold uppercase tracking-wider"
                              >
                                {Object.keys(ROLE_WEIGHTS)
                                  .filter((role) => !['user', 'customer'].includes(role) && canAssignRole(role))
                                  .map((role) => (
                                    <option key={role} value={role}>
                                      {role.replace("_", " ")}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          ) : (
                            <div className="text-[11px] text-[var(--admin-text-secondary)] font-medium bg-[var(--admin-surface-muted)] p-3 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] flex items-center gap-2">
                              <span className="material-symbols-outlined text-[14px]">lock</span>
                              <span>Managed by Root Account Rules</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
  
          {/* Pending Invites Tab */}
          {activeTab === "pending" && (
            <motion.div
              key="pending"
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {invites.length === 0 ? (
                <motion.div variants={fadeUp} className="admin-card py-20 text-center flex flex-col items-center justify-center col-span-full">
                  <span className="material-symbols-outlined text-[48px] text-[var(--admin-text-tertiary)] mb-4">mail_lock</span>
                  <p className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-1">No Pending Invites</p>
                  <p className="text-[12px] text-[var(--admin-text-secondary)]">All invitations have been processed or expired.</p>
                </motion.div>
              ) : (
                invites.map((inv) => (
                  <motion.div
                    variants={fadeUp}
                    key={inv._id}
                    className="admin-card p-6 flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[var(--admin-radius-md)] bg-[#fffbeb] border border-[#fde68a] flex items-center justify-center text-[#d97706] shrink-0">
                          <span className="material-symbols-outlined text-[20px]">
                            mail_outline
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-[var(--admin-text-primary)] truncate">
                            {inv.email}
                          </p>
                          <span className="admin-badge border-none font-bold text-[9px] uppercase tracking-wider h-5 px-2 bg-[#fffbeb] text-[#d97706] mt-1">
                            {inv.status}
                          </span>
                        </div>
                      </div>
                      {canAssignRole(inv.roleAssigned) && (
                        <button
                          onClick={() => handleRevokeInvite(inv._id)}
                          className="admin-btn-icon w-8 h-8 min-h-0 bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)] hover:bg-[var(--admin-error-light)] hover:text-[var(--admin-error)] border-none"
                          title="Revoke Invitation"
                        >
                          <span className="material-symbols-outlined text-[16px]">cancel</span>
                        </button>
                      )}
                    </div>
  
                    <div className="pt-4 border-t border-[var(--admin-border-subtle)] text-[12px] text-[var(--admin-text-secondary)] space-y-2">
                      <div className="flex justify-between">
                        <span className="font-bold">Role Level:</span>
                        <span className="text-[var(--admin-text-primary)] font-bold uppercase tracking-wider">{inv.roleAssigned.replace("_", " ")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold">Permissions:</span>
                        <span className="text-[var(--admin-text-primary)] truncate ml-4" title={inv.permissionsSummary}>{inv.permissionsSummary}</span>
                      </div>
                      <div className="flex justify-between pt-2 mt-2 border-t border-[var(--admin-border-subtle)] text-[11px]">
                        <span>Invited By:</span>
                        <span className="text-[var(--admin-text-primary)] font-medium">{inv.invitedBy?.name || inv.invitedBy?.email}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>Date:</span>
                        <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
  
          {/* History Tab */}
          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="admin-card overflow-hidden p-0"
            >
              <div className="overflow-x-auto">
                <table className="admin-table w-full min-w-[800px]">
                  <thead>
                    <tr>
                      <th className="pl-6">Invited Email</th>
                      <th>Designation</th>
                      <th>Invited By</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th className="pr-6">Resolved At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-12 text-[var(--admin-text-tertiary)] text-[12px]">
                          No invitation history logs found in database audit trail.
                        </td>
                      </tr>
                    ) : (
                      history.map((h) => {
                        const resolvedDate = h.acceptedAt || h.rejectedAt || h.revokedAt;
                        return (
                          <tr key={h._id} className="hover:bg-[var(--admin-surface-muted)] transition-colors">
                            <td className="pl-6 font-medium text-[var(--admin-text-primary)]">{h.email}</td>
                            <td>
                              <span className="admin-badge admin-badge-neutral text-[9px] font-bold tracking-wider">
                                {h.roleAssigned.replace("_", " ")}
                              </span>
                            </td>
                            <td className="text-[var(--admin-text-secondary)] font-medium">{h.invitedBy?.name || h.invitedBy?.email}</td>
                            <td>
                              <span
                                className={`admin-badge border-none font-bold text-[9px] h-5 px-2 tracking-wider ${
                                  h.status === "accepted"
                                    ? "bg-[var(--admin-success-light)] text-[var(--admin-success)]"
                                    : h.status === "rejected"
                                    ? "bg-[var(--admin-error-light)] text-[var(--admin-error)]"
                                    : h.status === "revoked"
                                    ? "bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)]"
                                    : "bg-[#fffbeb] text-[#d97706]"
                                }`}
                              >
                                {h.status}
                              </span>
                            </td>
                            <td className="text-[var(--admin-text-tertiary)] font-medium">{new Date(h.createdAt).toLocaleDateString()}</td>
                            <td className="pr-6 text-[var(--admin-text-secondary)] font-medium">
                              {resolvedDate ? new Date(resolvedDate).toLocaleDateString() : "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Dynamic Slide-Up Bottom-Sheet Curation Drawer */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isInviteOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[990] flex items-end sm:items-center justify-center admin-section-root p-0 sm:p-4"
            >
              <div
                onClick={() => setIsInviteOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
              />

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ type: "spring", damping: 26, stiffness: 220 }}
                className="relative w-full max-w-xl bg-[var(--admin-surface)] rounded-t-[24px] sm:rounded-[24px] shadow-[0_-8px_30px_rgb(0,0,0,0.18)] z-10 max-h-[92vh] sm:max-h-[85vh] overflow-y-auto custom-scrollbar p-5 sm:p-6 lg:p-8 border-t sm:border border-[var(--admin-border-strong)] flex flex-col pb-[calc(24px+env(safe-area-inset-bottom))] sm:pb-8"
              >
                {/* Grab Handle (Mobile Only) */}
                <div className="w-12 h-1 bg-[var(--admin-border)] rounded-full mx-auto mb-4 shrink-0 sm:hidden" />

                <div className="flex items-start justify-between border-b border-[var(--admin-border-subtle)] pb-4 mb-5 shrink-0">
                  <div>
                    <h3 className="text-[13px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">person_add</span>
                      Invite Team Member
                    </h3>
                    <p className="text-[10.5px] text-[var(--admin-text-tertiary)] mt-0.5 leading-normal">
                      Grants admin access to an existing user email.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsInviteOpen(false)}
                    className="w-7 h-7 rounded-full bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-error-light)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-error)] flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>

                <form onSubmit={handleSendInvite} className="space-y-4 flex-1">
                  <div className="space-y-1">
                    <label className="admin-label">
                      Member Registered Email *
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="e.g. team.member@gmail.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="admin-input"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="admin-label">
                      Team Role Designation *
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="admin-input capitalize"
                    >
                      {assignableRoles.map((role) => (
                        <option key={role} value={role}>
                          {role.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="admin-label">
                      Access Scope Permissions
                    </label>
                    <input
                      type="text"
                      value={invitePermissions}
                      onChange={(e) => setInvitePermissions(e.target.value)}
                      placeholder="e.g. Products, Inventory, Custom Blueprints"
                      className="admin-input"
                    />
                  </div>

                  <button
                    disabled={submitting}
                    type="submit"
                    className="admin-btn admin-btn-primary w-full py-3 text-[11px] font-bold uppercase tracking-wider mt-6 active:scale-95 shadow-sm"
                  >
                    {submitting ? "Sending..." : "Send Invitation Request"}
                  </button>
                </form>

                <div className="border-t border-[var(--admin-border-subtle)] pt-4 mt-5 text-[10.5px] text-[var(--admin-text-tertiary)] leading-relaxed shrink-0">
                  <strong>SMTP Security Note:</strong> Members invited receive an explicit secure email.
                  Access rights to the studio panel are pending until the user logs into their account and clicks accept.
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}
