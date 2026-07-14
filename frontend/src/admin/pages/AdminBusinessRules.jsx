import React, { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import {
  PageHeader,
  fadeUp,
  stagger,
  StatCard,
  AdminToggle,
  SkeletonDashboard,
} from '../components/AdminUIKit';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

export default function AdminBusinessRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Rule Form State
  const [newRule, setNewRule] = useState({ title: '', category: '', conditions: '', action: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/rules');
      if (res.data?.success) {
        setRules(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
      toast.error('Failed to load business rules');
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (id) => {
    try {
      // Optimistic update
      setRules(rules.map((r) => (r._id === id ? { ...r, active: !r.active } : r)));
      await api.patch(`/admin/rules/${id}/toggle`);
      toast.success('Rule status updated');
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      // Revert on error
      setRules(rules.map((r) => (r._id === id ? { ...r, active: !r.active } : r)));
      toast.error(error?.response?.data?.message || 'Failed to toggle rule');
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!newRule.title || !newRule.category || !newRule.conditions || !newRule.action) {
      return toast.error('Please fill in all fields');
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/admin/rules', newRule);
      if (res.data?.success) {
        setRules([res.data.data, ...rules]);
        toast.success('Rule created successfully');
        setIsModalOpen(false);
        setNewRule({ title: '', category: '', conditions: '', action: '' });
      }
    } catch (error) {
      console.error('Failed to create rule:', error);
      toast.error(error?.response?.data?.message || 'Failed to create rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCount = rules.filter((r) => r.active).length;

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <PageHeader
          title="Business Rules Engine"
          subtitle="Configure system automation, event hooks, and complex conditional logic workflows."
          icon="rule_folder"
        />
        <motion.button
          variants={fadeUp}
          onClick={() => setIsModalOpen(true)}
          className="admin-btn admin-btn-primary px-6 py-3 whitespace-nowrap"
        >
          <span className="material-symbols-outlined">add</span>
          Create New Rule
        </motion.button>
      </div>

      <motion.div variants={fadeUp} className="admin-grid-stats">
        <StatCard label="Total Rules" value={rules.length} icon="rule" domainColor="primary" />
        <StatCard label="Active Rules" value={activeCount} icon="bolt" domainColor="success" />
        <StatCard
          label="Disabled Rules"
          value={rules.length - activeCount}
          icon="power_off"
          domainColor="warning"
        />
        <StatCard
          label="Events Fired (24h)"
          value="—"
          change="Not tracked yet"
          changeType="horizontal_rule"
          icon="moving"
          domainColor="info"
        />
      </motion.div>

      {loading ? (
        <SkeletonDashboard />
      ) : (
        <motion.div
          variants={fadeUp}
          className="admin-card overflow-hidden p-0 shadow-lg border border-[var(--admin-border-strong)]"
        >
          <div className="grid grid-cols-1 divide-y divide-[var(--admin-border-subtle)] bg-[var(--admin-surface)]">
            {rules.length === 0 ? (
              <div className="py-24 text-center text-[var(--admin-text-tertiary)] flex flex-col items-center">
                <div className="w-24 h-24 bg-[var(--admin-bg-subtle)] rounded-full flex items-center justify-center mb-6 shadow-inner border border-[var(--admin-border-strong)]">
                  <span className="material-symbols-outlined text-5xl opacity-50">rule_folder</span>
                </div>
                <h3 className="text-2xl font-bold text-[var(--admin-text-primary)] mb-2 tracking-tight">
                  No Business Rules
                </h3>
                <p className="font-medium text-lg">Create a rule to automate your workflows.</p>
              </div>
            ) : (
              <AnimatePresence>
                {rules.map((rule) => (
                  <motion.div
                    layout
                    key={rule._id || rule.id}
                    className="p-6 lg:p-8 hover:bg-[var(--admin-surface-hover)] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-6 group"
                  >
                    <div className="flex items-start gap-6 flex-1">
                      <div
                        className={`w-12 h-12 rounded-[var(--admin-radius-lg)] mt-1 flex items-center justify-center shrink-0 ${rule.active ? 'bg-[var(--admin-success)]/10 text-[var(--admin-success)] shadow-inner' : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)] border border-[var(--admin-border-strong)]'}`}
                      >
                        <span className="material-symbols-outlined text-[24px]">
                          {rule.active ? 'bolt' : 'power_off'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <h3
                            className={`font-bold text-[16px] tracking-tight ${rule.active ? 'text-[var(--admin-text-primary)]' : 'text-[var(--admin-text-secondary)]'}`}
                          >
                            {rule.title}
                          </h3>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[var(--admin-bg-subtle)] text-[var(--admin-text-secondary)] border border-[var(--admin-border-strong)] tracking-widest">
                            {rule.category}
                          </span>
                        </div>
                        <div className="bg-[var(--admin-bg-subtle)] rounded-xl p-3 sm:p-4 border border-[var(--admin-border-strong)] text-[12px] sm:text-[13px] flex flex-col mt-4 max-w-4xl gap-3 w-full break-words">
                          <div className="flex items-start gap-3">
                            <span className="font-bold text-[var(--admin-text-inverse)] px-2 py-0.5 bg-[var(--admin-text-primary)] rounded text-[10px] tracking-wider shrink-0 mt-0.5 uppercase">
                              IF
                            </span>
                            <span className="text-[var(--admin-text-secondary)] font-medium leading-relaxed">
                              {rule.conditions}
                            </span>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="font-bold text-[var(--admin-accent-text)] px-2 py-0.5 bg-[var(--admin-accent)]/10 rounded border border-[var(--admin-accent)]/20 text-[10px] tracking-wider shrink-0 mt-0.5 uppercase">
                              THEN
                            </span>
                            <span className="text-[var(--admin-text-primary)] font-bold leading-relaxed">
                              {rule.action}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 border-t lg:border-t-0 border-[var(--admin-border-subtle)] pt-6 lg:pt-0 pl-[4.5rem] lg:pl-0 mt-4 lg:mt-0 w-full lg:w-auto">
                      <div className="flex items-center min-w-[120px]">
                        <AdminToggle
                          label=""
                          checked={rule.active}
                          onChange={() => toggleRule(rule._id)}
                          variant="success"
                          className="border-none"
                        />
                        <span
                          className={`ml-3 text-[12px] font-bold uppercase tracking-wider ${rule.active ? 'text-[var(--admin-success)]' : 'text-[var(--admin-text-tertiary)]'}`}
                        >
                          {rule.active ? 'Active' : 'Off'}
                        </span>
                      </div>

                      <div className="w-px h-8 bg-[var(--admin-border-strong)] hidden lg:block"></div>

                      <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                        <button
                          className="admin-btn admin-btn-sm admin-btn-outline flex-1 sm:flex-none"
                          title="Edit Rule"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          <span className="sm:hidden ml-2">Edit</span>
                        </button>
                        <button
                          className="admin-btn admin-btn-sm admin-btn-outline !text-[var(--admin-error)] hover:!bg-[var(--admin-error)]/10 !border-[var(--admin-error)]/30 flex-1 sm:flex-none"
                          title="Delete Rule"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          <span className="sm:hidden ml-2">Delete</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      )}

      {/* Create Rule Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[var(--admin-surface)] rounded-2xl shadow-2xl border border-[var(--admin-border-strong)] overflow-hidden"
            >
              <div className="p-6 border-b border-[var(--admin-border-subtle)] flex items-center justify-between bg-[var(--admin-bg-subtle)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--admin-accent)]/10 text-[var(--admin-accent-text)] flex items-center justify-center">
                    <span className="material-symbols-outlined">add_circle</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[var(--admin-text-primary)]">
                      Create New Rule
                    </h2>
                    <p className="text-sm text-[var(--admin-text-secondary)]">
                      Define conditional logic for system automation.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--admin-surface-hover)] text-[var(--admin-text-secondary)] transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateRule} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[var(--admin-text-primary)]">
                      Rule Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Auto-approve low risk refunds"
                      className="admin-input w-full"
                      value={newRule.title}
                      onChange={(e) => setNewRule({ ...newRule, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[var(--admin-text-primary)]">
                      Category
                    </label>
                    <select
                      className="admin-input w-full"
                      value={newRule.category}
                      onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                      required
                    >
                      <option value="" disabled>
                        Select category...
                      </option>
                      <option value="Orders">Orders</option>
                      <option value="Payments">Payments</option>
                      <option value="Security">Security</option>
                      <option value="Inventory">Inventory</option>
                      <option value="Discounts">Discounts</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[var(--admin-text-primary)] text-[var(--admin-text-inverse)] rounded text-[10px] tracking-wider uppercase">
                      IF
                    </span>
                    Conditions
                  </label>
                  <textarea
                    placeholder="e.g. Order amount < $50 AND Customer trust score > 90"
                    className="admin-input w-full h-24 resize-none font-mono text-sm"
                    value={newRule.conditions}
                    onChange={(e) => setNewRule({ ...newRule, conditions: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[var(--admin-accent)]/10 text-[var(--admin-accent-text)] border border-[var(--admin-accent)]/20 rounded text-[10px] tracking-wider uppercase">
                      THEN
                    </span>
                    Action
                  </label>
                  <textarea
                    placeholder="e.g. Automatically approve refund and notify customer"
                    className="admin-input w-full h-24 resize-none font-mono text-sm"
                    value={newRule.action}
                    onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--admin-border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="admin-btn admin-btn-outline px-6 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="admin-btn admin-btn-primary px-8 py-2 min-w-[140px]"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    ) : (
                      'Save Rule'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
