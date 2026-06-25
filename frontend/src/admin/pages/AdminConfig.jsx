import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/core/errorHelpers';
import {
  PageHeader,
  StatCard,
  AdminToggle,
  EmptyState,
  SkeletonDashboard,
  FilterBar,
  SectionHeader,
  fadeUp,
  stagger,
} from '../components/AdminUIKit';

// ─── Constants ──────────────────────────────────────────────────────────────────
const CONFIG_TYPES = [
  { value: 'boolean', label: 'Toggle (On/Off)', icon: 'toggle_on' },
  { value: 'text', label: 'Text', icon: 'text_fields' },
  { value: 'number', label: 'Number', icon: 'tag' },
  { value: 'url', label: 'URL', icon: 'link' },
  { value: 'json', label: 'JSON', icon: 'data_object' },
];

const CATEGORIES = {
  general: { label: 'General', icon: 'settings', color: 'settings' },
  feature_flags: { label: 'Feature Flags', icon: 'flag', color: 'orders' },
  storefront: { label: 'Storefront', icon: 'storefront', color: 'revenue' },
  notifications: { label: 'Notifications', icon: 'notifications', color: 'customers' },
  shipping: { label: 'Shipping & Delivery', icon: 'local_shipping', color: 'products' },
  security: { label: 'Security', icon: 'security', color: 'danger' },
  integrations: { label: 'Integrations', icon: 'extension', color: 'reviews' },
};

const IMPACT_DESCRIPTIONS = {
  MAINTENANCE_MODE:
    'Turning this ON will immediately show a maintenance screen to all storefront visitors. Only admins can access the dashboard.',
  FREE_SHIPPING_MINIMUM:
    'Changing this value updates the checkout page and promotional banners to reflect the new free shipping threshold.',
  GLOBAL_ANNOUNCEMENT_BANNER:
    'This text will appear as a red banner at the very top of your storefront. Leave empty to hide.',
  ENABLE_REVIEWS:
    'Controls whether product reviews are visible on product detail pages and the review submission form.',
  ENABLE_WALLET:
    'Toggles the Siri Pay Wallet feature across checkout, user profiles, and order processing.',
  MAX_CART_ITEMS: 'Limits how many items a customer can add to their cart in a single session.',
  ENABLE_RENTAL: 'Enables or disables the rental product flow across the entire storefront.',
  ENABLE_VISUAL_SEARCH: 'Controls the AI visual search feature on the collections page.',
};

const FILTER_OPTIONS = ['All', 'Public', 'Private', 'Feature Flags', 'Recently Modified'];

// ─── Utilities ──────────────────────────────────────────────────────────────────
function classifyConfig(config) {
  const key = config.key?.toUpperCase() || '';
  if (config.type === 'boolean' || key.startsWith('ENABLE_') || key.includes('MODE'))
    return 'feature_flags';
  if (key.includes('SHIPPING') || key.includes('DELIVERY')) return 'shipping';
  if (key.includes('NOTIFICATION') || key.includes('ALERT') || key.includes('BANNER'))
    return 'notifications';
  if (key.includes('STORE') || key.includes('CART') || key.includes('CHECKOUT'))
    return 'storefront';
  if (key.includes('SECURITY') || key.includes('AUTH') || key.includes('PASSWORD'))
    return 'security';
  if (key.includes('API') || key.includes('WEBHOOK') || key.includes('INTEGRATION'))
    return 'integrations';
  return 'general';
}

function humanizeKey(key) {
  return (key || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bUrl\b/gi, 'URL')
    .replace(/\bApi\b/gi, 'API');
}

function getTimeSince(date) {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Create Config Dialog ────────────────────────────────────────────────────────
function CreateConfigDialog({ isOpen, onClose, onCreate }) {
  const [form, setForm] = useState({
    key: '',
    value: '',
    type: 'text',
    description: '',
    category: 'general',
    isPublic: true,
  });
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setForm({
        key: '',
        value: '',
        type: 'text',
        description: '',
        category: 'general',
        isPublic: true,
      });
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.key.trim()) return toast.error('Configuration key is required');
    const sanitizedKey = form.key
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '');
    onCreate({
      ...form,
      key: sanitizedKey,
      value: form.type === 'boolean' ? (form.value === 'true' ? 'true' : 'false') : form.value,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[1000]"
            style={{ background: 'var(--admin-surface-overlay)', backdropFilter: 'blur(4px)' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed inset-0 z-[1010] flex items-center justify-center p-4"
          >
            <form
              onSubmit={handleSubmit}
              className="w-full max-w-[520px] bg-[var(--admin-surface)] rounded-[var(--admin-radius-2xl)] shadow-[var(--admin-shadow-xl)] border border-[var(--admin-border)] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--admin-border-subtle)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[var(--admin-radius-lg)] bg-[var(--admin-accent)]/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
                      add_circle
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[var(--admin-text-primary)]">
                      New Configuration
                    </h3>
                    <p className="text-[11px] text-[var(--admin-text-tertiary)]">
                      Create a new system variable
                    </p>
                  </div>
                </div>
                <button type="button" onClick={onClose} className="admin-btn-icon w-8 h-8 p-0">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="admin-label">Variable Name *</label>
                  <input
                    ref={inputRef}
                    type="text"
                    required
                    value={form.key}
                    onChange={(e) => setForm({ ...form, key: e.target.value })}
                    placeholder="e.g., FREE_SHIPPING_MINIMUM"
                    className="admin-input font-mono uppercase tracking-wider"
                  />
                  <p className="text-[10px] text-[var(--admin-text-tertiary)]">
                    Use UPPER_SNAKE_CASE. Auto-formatted on save.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="admin-label">Value Type</label>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          type: e.target.value,
                          value: e.target.value === 'boolean' ? 'true' : form.value,
                        })
                      }
                      className="admin-select"
                    >
                      {CONFIG_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="admin-label">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="admin-select"
                    >
                      {Object.entries(CATEGORIES).map(([key, cat]) => (
                        <option key={key} value={key}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="admin-label">
                    {form.type === 'boolean' ? 'Default State' : 'Initial Value'}
                  </label>
                  {form.type === 'boolean' ? (
                    <div className="flex gap-3">
                      {['true', 'false'].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setForm({ ...form, value: v })}
                          className={`flex-1 py-2.5 rounded-[var(--admin-radius-lg)] text-[12px] font-bold uppercase tracking-wider border transition-all ${
                            form.value === v
                              ? v === 'true'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                                : 'bg-red-500/10 border-red-500/30 text-red-600'
                              : 'bg-[var(--admin-surface-muted)] border-[var(--admin-border-subtle)] text-[var(--admin-text-tertiary)] hover:border-[var(--admin-border-strong)]'
                          }`}
                        >
                          {v === 'true' ? '✓ Enabled' : '✕ Disabled'}
                        </button>
                      ))}
                    </div>
                  ) : form.type === 'json' ? (
                    <textarea
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: e.target.value })}
                      placeholder='{"key": "value"}'
                      rows={3}
                      className="admin-textarea font-mono text-[12px]"
                    />
                  ) : (
                    <input
                      type={form.type === 'number' ? 'number' : 'text'}
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: e.target.value })}
                      placeholder={
                        form.type === 'url'
                          ? 'https://example.com'
                          : form.type === 'number'
                            ? '0'
                            : 'Enter value...'
                      }
                      className="admin-input"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="admin-label">Description (optional)</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Explain what this configuration does..."
                    className="admin-input"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-[var(--admin-radius-lg)] admin-card-inset">
                  <div>
                    <p className="text-[12px] font-bold text-[var(--admin-text-primary)]">
                      Publicly Accessible
                    </p>
                    <p className="text-[10px] text-[var(--admin-text-tertiary)]">
                      {form.isPublic
                        ? 'Storefront can read this variable'
                        : 'Only backend & admin can access'}
                    </p>
                  </div>
                  <AdminToggle
                    checked={form.isPublic}
                    onChange={() => setForm({ ...form, isPublic: !form.isPublic })}
                    size="sm"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)]">
                <button type="button" onClick={onClose} className="admin-btn admin-btn-outline">
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  Create Variable
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Delete Confirmation Dialog ──────────────────────────────────────────────────
function DeleteConfirmDialog({ isOpen, configName, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-[1020]"
            style={{ background: 'var(--admin-surface-overlay)', backdropFilter: 'blur(4px)' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[1030] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-[400px] bg-[var(--admin-surface)] rounded-[var(--admin-radius-2xl)] shadow-[var(--admin-shadow-xl)] border border-[var(--admin-border)] p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[24px] text-red-500">warning</span>
              </div>
              <h3 className="text-[16px] font-bold text-[var(--admin-text-primary)] mb-2">
                Delete Configuration?
              </h3>
              <p className="text-[13px] text-[var(--admin-text-secondary)] mb-1">
                This will permanently remove{' '}
                <strong className="font-mono text-[var(--admin-text-primary)]">{configName}</strong>
                .
              </p>
              <p className="text-[11px] text-[var(--admin-text-tertiary)] mb-6">
                Any part of your application relying on this variable may stop working.
              </p>
              <div className="flex gap-3">
                <button onClick={onCancel} className="admin-btn admin-btn-outline flex-1">
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 admin-btn text-white font-bold text-[11px] uppercase tracking-wider rounded-[var(--admin-radius-lg)] transition-all"
                  style={{ background: 'var(--admin-domain-danger)' }}
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Config Row Card ─────────────────────────────────────────────────────────────
function ConfigCard({ config, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(config.value);
  const [editDesc, setEditDesc] = useState(config.description || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const inputRef = useRef(null);

  const category = classifyConfig(config);
  const catMeta = CATEGORIES[category] || CATEGORIES.general;
  const isBoolean = config.type === 'boolean';
  const boolValue = String(config.value).toLowerCase() === 'true';
  const impactText = IMPACT_DESCRIPTIONS[config.key];

  useEffect(() => {
    if (isEditing) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isEditing]);

  const handleSave = () => {
    onUpdate({ ...config, value: editValue, description: editDesc });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(config.value);
    setEditDesc(config.description || '');
    setIsEditing(false);
  };

  const handleToggle = () => {
    const newVal = boolValue ? 'false' : 'true';
    onUpdate({ ...config, value: newVal });
  };

  return (
    <>
      <motion.div
        layout
        variants={fadeUp}
        className={`group admin-card-interactive p-4 sm:p-5 relative overflow-hidden transition-all ${
          isEditing ? 'ring-2 ring-[var(--admin-accent)]/30 shadow-[var(--admin-shadow-md)]' : ''
        }`}
      >
        {/* Category Accent */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[var(--admin-radius-lg)]"
          style={{ backgroundColor: `var(--admin-domain-${catMeta.color})` }}
        />

        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Icon & Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="w-10 h-10 rounded-[var(--admin-radius-lg)] flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `var(--admin-domain-${catMeta.color}-bg)`,
                color: `var(--admin-domain-${catMeta.color})`,
              }}
            >
              <span className="material-symbols-outlined text-[18px]">{catMeta.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] tracking-tight">
                  {humanizeKey(config.key)}
                </h3>
                <span className="font-mono text-[10px] text-[var(--admin-text-placeholder)] bg-[var(--admin-surface-muted)] px-1.5 py-0.5 rounded tracking-wide">
                  {config.key}
                </span>
              </div>

              {/* Description */}
              {isEditing ? (
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Add a description..."
                  className="admin-input text-[12px] mt-1 w-full"
                />
              ) : (
                <p className="text-[12px] text-[var(--admin-text-tertiary)] leading-relaxed">
                  {config.description || 'No description provided'}
                </p>
              )}

              {/* Badges */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className={`admin-badge text-[9px] ${config.isPublic ? 'admin-badge-success' : 'admin-badge-warning'}`}
                >
                  <span className="material-symbols-outlined text-[10px]">
                    {config.isPublic ? 'public' : 'lock'}
                  </span>
                  {config.isPublic ? 'Public' : 'Private'}
                </span>
                <span className="admin-badge admin-badge-neutral text-[9px]">
                  <span className="material-symbols-outlined text-[10px]">
                    {CONFIG_TYPES.find((t) => t.value === config.type)?.icon || 'settings'}
                  </span>
                  {CONFIG_TYPES.find((t) => t.value === config.type)?.label || config.type}
                </span>
                {config.updatedAt && (
                  <span className="text-[10px] text-[var(--admin-text-placeholder)] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[11px]">schedule</span>
                    {getTimeSince(config.updatedAt)}
                  </span>
                )}
              </div>

              {/* Impact warning */}
              {impactText && !isEditing && (
                <div className="mt-3 p-2.5 rounded-[var(--admin-radius-md)] bg-amber-500/5 border border-amber-500/15 text-[11px] text-amber-700 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[14px] mt-0.5 shrink-0 text-amber-500">
                    tips_and_updates
                  </span>
                  <span>{impactText}</span>
                </div>
              )}
            </div>
          </div>

          {/* Value & Actions */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 sm:ml-auto pl-13 sm:pl-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                {config.type === 'boolean' ? (
                  <select
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="admin-select w-[130px] text-[12px]"
                  >
                    <option value="true">✓ Enabled</option>
                    <option value="false">✕ Disabled</option>
                  </select>
                ) : config.type === 'json' ? (
                  <textarea
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={2}
                    className="admin-textarea font-mono text-[11px] w-[200px]"
                  />
                ) : (
                  <input
                    ref={inputRef}
                    type={config.type === 'number' ? 'number' : 'text'}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="admin-input w-[180px] text-[12px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave();
                      if (e.key === 'Escape') handleCancel();
                    }}
                  />
                )}
                <button
                  onClick={handleSave}
                  className="admin-btn admin-btn-primary admin-btn-sm"
                  title="Save"
                >
                  <span className="material-symbols-outlined text-[14px]">check</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="admin-btn admin-btn-outline admin-btn-sm"
                  title="Cancel"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {isBoolean ? (
                  <AdminToggle
                    checked={boolValue}
                    onChange={handleToggle}
                    size="sm"
                    variant={boolValue ? 'accent' : 'default'}
                  />
                ) : (
                  <div className="admin-card-inset px-3 py-2 rounded-[var(--admin-radius-md)] max-w-[220px]">
                    <span
                      className="font-mono text-[12px] text-[var(--admin-text-primary)] font-semibold truncate block"
                      title={String(config.value)}
                    >
                      {String(config.value).length > 30
                        ? `${String(config.value).slice(0, 30)}...`
                        : String(config.value)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                  <button
                    onClick={() => {
                      setEditValue(config.value);
                      setEditDesc(config.description || '');
                      setIsEditing(true);
                    }}
                    className="admin-btn-icon w-8 h-8 p-0 hover:bg-[var(--admin-accent)]/10 hover:text-[var(--admin-accent)]"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button
                    onClick={() => onUpdate({ ...config, isPublic: !config.isPublic })}
                    className="admin-btn-icon w-8 h-8 p-0"
                    title={config.isPublic ? 'Make Private' : 'Make Public'}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {config.isPublic ? 'lock' : 'lock_open'}
                    </span>
                  </button>
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="admin-btn-icon w-8 h-8 p-0 hover:bg-red-500/10 hover:text-red-500"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        configName={config.key}
        onConfirm={() => {
          onDelete(config._id);
          setShowDeleteDialog(false);
        }}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────────
export function AdminConfig() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const fetchConfigs = async () => {
    try {
      const res = await api.get('/config');
      if (res.data?.success) setConfigs(res.data.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load configurations'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleUpdate = useCallback(async (config) => {
    try {
      await api.post('/config', config);
      toast.success(`"${humanizeKey(config.key)}" saved successfully`);
      fetchConfigs();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save configuration'));
    }
  }, []);

  const handleCreate = useCallback(async (config) => {
    try {
      await api.post('/config', config);
      toast.success(`"${humanizeKey(config.key)}" created`);
      fetchConfigs();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create configuration'));
    }
  }, []);

  const handleDelete = useCallback(async (id) => {
    try {
      await api.delete(`/config/${id}`);
      toast.success('Configuration deleted');
      fetchConfigs();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete configuration'));
    }
  }, []);

  // ─── Derived Data ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = configs.length;
    const pub = configs.filter((c) => c.isPublic).length;
    const priv = total - pub;
    const flags = configs.filter((c) => c.type === 'boolean').length;
    return { total, pub, priv, flags };
  }, [configs]);

  const filteredConfigs = useMemo(() => {
    let list = [...configs];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.key?.toLowerCase().includes(q) ||
          humanizeKey(c.key).toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          String(c.value).toLowerCase().includes(q),
      );
    }

    // Filter
    if (filter === 'Public') list = list.filter((c) => c.isPublic);
    else if (filter === 'Private') list = list.filter((c) => !c.isPublic);
    else if (filter === 'Feature Flags') list = list.filter((c) => c.type === 'boolean');
    else if (filter === 'Recently Modified') {
      list = list
        .filter((c) => c.updatedAt)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 10);
    }

    return list;
  }, [configs, search, filter]);

  // Group by category
  const groupedConfigs = useMemo(() => {
    const groups = {};
    filteredConfigs.forEach((c) => {
      const cat = classifyConfig(c);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(c);
    });
    return groups;
  }, [filteredConfigs]);

  const filterCounts = useMemo(
    () => ({
      All: configs.length,
      Public: configs.filter((c) => c.isPublic).length,
      Private: configs.filter((c) => !c.isPublic).length,
      'Feature Flags': configs.filter((c) => c.type === 'boolean').length,
      'Recently Modified': configs.filter((c) => c.updatedAt).length,
    }),
    [configs],
  );

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto space-y-6 pb-20">
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6 pb-10">
      {/* Page Header */}
      <PageHeader
        title="Configuration Center"
        subtitle="Manage application variables, feature flags, and storefront behavior — all from one place."
        icon="tune"
        iconColor="settings"
      >
        <button onClick={() => setShowCreateDialog(true)} className="admin-btn admin-btn-primary">
          <span className="material-symbols-outlined text-[16px]">add</span>
          New Variable
        </button>
      </PageHeader>

      {/* Stats Overview */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon="database"
          label="Total Configs"
          value={stats.total}
          domainColor="settings"
        />
        <StatCard
          icon="public"
          label="Public"
          value={stats.pub}
          domainColor="revenue"
          infoTooltip="Accessible by the storefront"
        />
        <StatCard
          icon="lock"
          label="Private"
          value={stats.priv}
          domainColor="danger"
          infoTooltip="Only accessible by admin & backend"
        />
        <StatCard
          icon="flag"
          label="Feature Flags"
          value={stats.flags}
          domainColor="orders"
          infoTooltip="Boolean on/off toggles"
        />
      </motion.div>

      {/* Search & Filter Bar */}
      <motion.div
        variants={fadeUp}
        className="admin-card p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
      >
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-placeholder)] absolute left-3 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, key, or value..."
            className="admin-input pl-10 w-full"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-placeholder)] hover:text-[var(--admin-text-primary)]"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
        <FilterBar
          filters={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
          counts={filterCounts}
          className="w-full sm:w-auto"
        />
      </motion.div>

      {/* Configs List */}
      {filteredConfigs.length === 0 ? (
        <EmptyState
          icon="settings_suggest"
          title={search ? 'No Matches Found' : 'No Configurations Yet'}
          description={
            search
              ? `No configurations match "${search}". Try a different search term.`
              : 'Create your first configuration variable to start controlling your application behavior from this dashboard.'
          }
          action={
            !search && (
              <button
                onClick={() => setShowCreateDialog(true)}
                className="admin-btn admin-btn-primary admin-btn-sm"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                Create First Variable
              </button>
            )
          }
        />
      ) : (
        Object.entries(groupedConfigs).map(([catKey, items]) => {
          const catMeta = CATEGORIES[catKey] || CATEGORIES.general;
          return (
            <motion.div key={catKey} variants={fadeUp} className="space-y-3">
              <SectionHeader
                icon={catMeta.icon}
                title={catMeta.label}
                description={`${items.length} configuration${items.length !== 1 ? 's' : ''}`}
              />
              <div className="space-y-3">
                {items.map((conf) => (
                  <ConfigCard
                    key={conf._id}
                    config={conf}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </motion.div>
          );
        })
      )}

      {/* Quick-Start Guide — shown when empty */}
      {configs.length === 0 && (
        <motion.div variants={fadeUp} className="admin-card p-6">
          <SectionHeader
            icon="school"
            title="Quick Start Guide"
            description="Examples of popular configurations"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                key: 'MAINTENANCE_MODE',
                type: 'boolean',
                desc: 'Show a maintenance screen to all visitors',
                icon: 'engineering',
              },
              {
                key: 'FREE_SHIPPING_MINIMUM',
                type: 'number',
                desc: 'Minimum order amount for free shipping (₹)',
                icon: 'local_shipping',
              },
              {
                key: 'GLOBAL_ANNOUNCEMENT_BANNER',
                type: 'text',
                desc: 'Display a banner message across the storefront',
                icon: 'campaign',
              },
              {
                key: 'ENABLE_REVIEWS',
                type: 'boolean',
                desc: 'Toggle product reviews on the storefront',
                icon: 'reviews',
              },
              {
                key: 'MAX_CART_ITEMS',
                type: 'number',
                desc: 'Maximum items allowed per cart session',
                icon: 'shopping_cart',
              },
              {
                key: 'ENABLE_VISUAL_SEARCH',
                type: 'boolean',
                desc: 'Enable AI-powered visual search on collections',
                icon: 'image_search',
              },
            ].map((example) => (
              <button
                key={example.key}
                onClick={() => {
                  handleCreate({
                    key: example.key,
                    value: example.type === 'boolean' ? 'true' : '',
                    type: example.type,
                    description: example.desc,
                    isPublic: true,
                  });
                }}
                className="admin-card-interactive p-4 text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-[var(--admin-radius-md)] bg-[var(--admin-accent)]/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[16px] text-[var(--admin-accent)]">
                      {example.icon}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--admin-text-secondary)] font-bold">
                    {example.key}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--admin-text-tertiary)] leading-relaxed">
                  {example.desc}
                </p>
                <p className="text-[10px] text-[var(--admin-accent)] font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">add_circle</span>
                  Click to create
                </p>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Create Dialog */}
      <CreateConfigDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreate={handleCreate}
      />
    </motion.div>
  );
}

export default AdminConfig;
