import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { PageHeader, AdminServiceabilitySkeleton, AdminToggle } from '../components/AdminUIKit';
import { Check, X, Edit } from 'lucide-react';

export default function AdminServiceability({ isEmbedded = false }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const fetchLocations = async () => {
    try {
      const { data } = await api.get('/admin/serviceability');
      setLocations(data.data || []);
    } catch {
      toast.error('Failed to load serviceability locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleEditClick = (loc) => {
    setEditingId(loc.locationCode);
    setEditForm({
      enabled: loc.enabled,
      baseTravelFee: loc.baseTravelFee,
      freeTravelDistanceKm: loc.freeTravelDistanceKm,
      perKmRate: loc.perKmRate,
      stateSurcharge: loc.stateSurcharge,
    });
  };

  const handleSave = async (locationCode) => {
    try {
      await api.patch(`/admin/serviceability/${locationCode}`, editForm);
      toast.success('Serviceability updated successfully');
      setEditingId(null);
      fetchLocations();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update serviceability');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleToggleStatus = async (loc, newStatus) => {
    try {
      setLocations((prev) =>
        prev.map((l) => (l.locationCode === loc.locationCode ? { ...l, enabled: newStatus } : l)),
      );
      await api.patch(`/admin/serviceability/${loc.locationCode}`, { enabled: newStatus });
      toast.success(`${loc.locationName} is now ${newStatus ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update status');
      fetchLocations();
    }
  };

  const activeCount = useMemo(() => locations.filter((l) => l.enabled).length, [locations]);
  const disabledCount = locations.length - activeCount;

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (statusFilter === 'active' && !loc.enabled) return false;
      if (statusFilter === 'disabled' && loc.enabled) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          loc.locationName.toLowerCase().includes(q) || loc.locationCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [locations, statusFilter, search]);

  if (loading && locations.length === 0) {
    return <AdminServiceabilitySkeleton />;
  }

  const cardContent = (
    <div className="bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] shadow-xs overflow-hidden flex flex-col h-full">
      {/* Header & Controls */}
      <div className="p-3.5 sm:p-5 border-b border-[var(--admin-border-subtle)] space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] sm:text-[16px] font-bold text-[var(--admin-text-primary)] tracking-tight">
              Serviceability Configurations
            </h3>
            <p className="text-[12px] text-[var(--admin-text-tertiary)] mt-0.5">
              {activeCount} of {locations.length} States Active
            </p>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 px-2.5 py-1 rounded-[4px] shrink-0">
            {activeCount} Active
          </span>
        </div>

        {/* Search Bar & Status Filter in 1 Single Line */}
        <div className="flex items-center gap-2 flex-nowrap w-full">
          {/* Search Bar (Increased height: 42px sm:44px) */}
          <div className="relative flex-1 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] focus-within:border-[var(--admin-accent)] flex items-center px-3 h-[42px] sm:h-[44px] min-h-[42px] sm:min-h-[44px] max-h-[42px] sm:max-h-[44px] box-border transition-colors">
            <span className="material-symbols-outlined text-[19px] sm:text-[20px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              placeholder="Search states..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-[13px] sm:text-[13.5px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2.5 h-full min-w-0"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer p-1 shrink-0 flex items-center justify-center"
                title="Clear search"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Status Filter Dropdown (Compact 1-line filter kind) */}
          <div className="relative shrink-0 flex items-center h-[42px] sm:h-[44px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ backgroundImage: 'none' }}
              className={`admin-no-arrow min-h-0 h-[42px] sm:h-[44px] max-h-[42px] sm:max-h-[44px] box-border pl-8 pr-7 rounded-[4px] border text-[12px] sm:text-[12.5px] font-bold outline-none cursor-pointer shadow-2xs !appearance-none !bg-none whitespace-nowrap transition-colors ${
                statusFilter !== 'All'
                  ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/10 text-[var(--admin-accent)]'
                  : 'border-[var(--admin-border)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] text-[var(--admin-text-primary)]'
              }`}
            >
              <option value="All">All ({locations.length})</option>
              <option value="active">Active ({activeCount})</option>
              <option value="disabled">Disabled ({disabledCount})</option>
            </select>
            <div
              className={`pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 ${
                statusFilter !== 'All'
                  ? 'text-[var(--admin-accent)]'
                  : 'text-[var(--admin-text-secondary)]'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">tune</span>
            </div>
            <div
              className={`pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 ${
                statusFilter !== 'All'
                  ? 'text-[var(--admin-accent)]'
                  : 'text-[var(--admin-text-tertiary)]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content: Mobile Cards (< sm) & Desktop Table (>= sm) */}
      <div className="flex-1 max-h-[520px] overflow-y-auto">
        {loading ? (
          <div className="text-center text-[var(--admin-text-tertiary)] py-12 text-[13px]">
            Loading serviceability data...
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="text-center text-[var(--admin-text-tertiary)] py-12 text-[13px]">
            No locations matching &ldquo;{search}&rdquo;
          </div>
        ) : (
          <>
            {/* Mobile Cards View (< sm) */}
            <div className="sm:hidden p-3 space-y-2.5">
              {filteredLocations.map((loc) => {
                const isEditing = editingId === loc.locationCode;

                if (isEditing) {
                  return (
                    <div
                      key={loc.locationCode}
                      className="bg-[var(--admin-surface-muted)]/60 rounded-[4px] border border-[var(--admin-accent)]/40 p-3.5 space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-[13.5px] text-[var(--admin-text-primary)] truncate">
                            Edit {loc.locationName}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-[var(--admin-accent)] bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/20 px-1.5 py-0.2 rounded shrink-0">
                            {loc.locationCode}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[10.5px] font-bold ${
                              editForm.enabled ? 'text-emerald-600' : 'text-stone-400'
                            }`}
                          >
                            {editForm.enabled ? 'Active' : 'Disabled'}
                          </span>
                          <AdminToggle
                            size="sm"
                            checked={editForm.enabled}
                            onChange={() =>
                              setEditForm({ ...editForm, enabled: !editForm.enabled })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[var(--admin-text-tertiary)] font-semibold block mb-1">
                            Base Fee (₹)
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={editForm.baseTravelFee}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                baseTravelFee: Number(e.target.value),
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-[var(--admin-border)] rounded-[4px] text-[12px] font-mono outline-none focus:border-[var(--admin-accent)]"
                          />
                        </div>
                        <div>
                          <span className="text-[var(--admin-text-tertiary)] font-semibold block mb-1">
                            Free Km
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={editForm.freeTravelDistanceKm}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                freeTravelDistanceKm: Number(e.target.value),
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-[var(--admin-border)] rounded-[4px] text-[12px] font-mono outline-none focus:border-[var(--admin-accent)]"
                          />
                        </div>
                        <div>
                          <span className="text-[var(--admin-text-tertiary)] font-semibold block mb-1">
                            Per Km Rate (₹)
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={editForm.perKmRate}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                perKmRate: Number(e.target.value),
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-[var(--admin-border)] rounded-[4px] text-[12px] font-mono outline-none focus:border-[var(--admin-accent)]"
                          />
                        </div>
                        <div>
                          <span className="text-[var(--admin-text-tertiary)] font-semibold block mb-1">
                            Surcharge (₹)
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={editForm.stateSurcharge}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                stateSurcharge: Number(e.target.value),
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-[var(--admin-border)] rounded-[4px] text-[12px] font-mono outline-none focus:border-[var(--admin-accent)]"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1 border-t border-[var(--admin-border-subtle)]">
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="h-8 px-3 text-[11.5px] font-bold rounded-[3px] border border-[var(--admin-border)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSave(loc.locationCode)}
                          className="h-8 px-3.5 text-[11.5px] font-bold rounded-[3px] bg-[var(--admin-accent)] text-white hover:opacity-95 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={loc.locationCode}
                    className="bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] p-3 shadow-xs transition-all flex flex-col gap-2.5"
                  >
                    {/* Top Row: Location + Code + Status Toggle */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-[14px] text-[var(--admin-text-primary)] leading-tight">
                            {loc.locationName}
                          </h4>
                          <span className="font-mono text-[10px] font-bold text-[var(--admin-accent)] bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/20 px-1.5 py-0.2 rounded-[3px]">
                            {loc.locationCode}
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-semibold block mt-0.5">
                          {loc.locationType || 'State'}
                        </span>
                      </div>

                      {/* Status Toggle on Right */}
                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        <span
                          className={`text-[10.5px] font-bold ${
                            loc.enabled
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-stone-400 dark:text-stone-500'
                          }`}
                        >
                          {loc.enabled ? 'Active' : 'Disabled'}
                        </span>
                        <AdminToggle
                          size="sm"
                          checked={loc.enabled}
                          onChange={() => handleToggleStatus(loc, !loc.enabled)}
                        />
                      </div>
                    </div>

                    {/* Rates Box */}
                    <div className="bg-[var(--admin-surface-muted)]/70 rounded-[4px] p-2.5 border border-[var(--admin-border-subtle)] flex items-center justify-between text-[11.5px]">
                      <div>
                        <span className="font-mono font-bold text-[var(--admin-text-primary)]">
                          ₹{Number(loc.baseTravelFee || 0).toLocaleString('en-IN')}{' '}
                          <span className="font-sans font-normal text-[10.5px] text-[var(--admin-text-secondary)]">
                            base
                          </span>
                        </span>
                        <span className="text-[var(--admin-text-tertiary)] mx-1.5">•</span>
                        <span className="text-[var(--admin-text-secondary)]">
                          ₹{loc.perKmRate}/km{' '}
                          <span className="text-[var(--admin-text-tertiary)] text-[10.5px]">
                            (after {loc.freeTravelDistanceKm}km)
                          </span>
                        </span>
                      </div>

                      {Number(loc.stateSurcharge || 0) > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 font-mono font-bold text-[11px] shrink-0">
                          +₹{loc.stateSurcharge} Surcharge
                        </span>
                      )}
                    </div>

                    {/* Edit Action */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleEditClick(loc)}
                        className="w-full h-8 rounded-[3px] border border-[var(--admin-border)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer active:scale-95"
                      >
                        <Edit className="w-3.5 h-3.5 text-[var(--admin-text-secondary)]" />
                        <span>Edit Travel Rates</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= sm) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[480px] text-left border-collapse">
                <thead className="sticky top-0 bg-[var(--admin-bg-subtle)] z-10">
                  <tr className="border-b border-[var(--admin-border)]">
                    <th className="px-3.5 py-2.5 text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                      State / Location
                    </th>
                    <th className="px-3.5 py-2.5 text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                      Travel Rates
                    </th>
                    <th className="w-[80px] min-w-[80px] max-w-[80px] px-3.5 py-2.5 text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider text-center">
                      Status
                    </th>
                    <th className="w-[60px] min-w-[60px] max-w-[60px] px-3.5 py-2.5 text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--admin-border-subtle)]">
                  {filteredLocations.map((loc) => {
                    const isEditing = editingId === loc.locationCode;

                    if (isEditing) {
                      return (
                        <tr key={loc.locationCode} className="bg-[var(--admin-surface-muted)]/60">
                          <td colSpan={4} className="p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[13px] text-[var(--admin-text-primary)]">
                                Edit {loc.locationName} ({loc.locationCode})
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] font-medium text-[var(--admin-text-secondary)]">
                                  {editForm.enabled ? 'Active' : 'Disabled'}
                                </span>
                                <AdminToggle
                                  size="sm"
                                  checked={editForm.enabled}
                                  onChange={() =>
                                    setEditForm({ ...editForm, enabled: !editForm.enabled })
                                  }
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                              <div>
                                <span className="text-[var(--admin-text-tertiary)] block mb-1 font-semibold">
                                  Base Fee (₹)
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={editForm.baseTravelFee}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      baseTravelFee: Number(e.target.value),
                                    })
                                  }
                                  className="w-full px-2 py-1 bg-white dark:bg-stone-900 border border-[var(--admin-border)] rounded-[4px] text-[12px] font-mono outline-none focus:border-[var(--admin-accent)]"
                                />
                              </div>
                              <div>
                                <span className="text-[var(--admin-text-tertiary)] block mb-1 font-semibold">
                                  Free Km
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={editForm.freeTravelDistanceKm}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      freeTravelDistanceKm: Number(e.target.value),
                                    })
                                  }
                                  className="w-full px-2 py-1 bg-white dark:bg-stone-900 border border-[var(--admin-border)] rounded-[4px] text-[12px] font-mono outline-none focus:border-[var(--admin-accent)]"
                                />
                              </div>
                              <div>
                                <span className="text-[var(--admin-text-tertiary)] block mb-1 font-semibold">
                                  Per Km (₹)
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={editForm.perKmRate}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      perKmRate: Number(e.target.value),
                                    })
                                  }
                                  className="w-full px-2 py-1 bg-white dark:bg-stone-900 border border-[var(--admin-border)] rounded-[4px] text-[12px] font-mono outline-none focus:border-[var(--admin-accent)]"
                                />
                              </div>
                              <div>
                                <span className="text-[var(--admin-text-tertiary)] block mb-1 font-semibold">
                                  Surcharge (₹)
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={editForm.stateSurcharge}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      stateSurcharge: Number(e.target.value),
                                    })
                                  }
                                  className="w-full px-2 py-1 bg-white dark:bg-stone-900 border border-[var(--admin-border)] rounded-[4px] text-[12px] font-mono outline-none focus:border-[var(--admin-accent)]"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={handleCancel}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-[4px] border border-[var(--admin-border)] hover:bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Cancel</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSave(loc.locationCode)}
                                className="px-3 py-1 text-[11px] font-bold rounded-[4px] bg-[var(--admin-accent)] text-white hover:opacity-95 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save Changes</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={loc.locationCode}
                        className="hover:bg-[var(--admin-surface-muted)]/50 transition-colors group"
                      >
                        {/* Location Name & Code */}
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[13px] text-[var(--admin-text-primary)]">
                              {loc.locationName}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-[var(--admin-accent)] bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/20 px-1.5 py-0.2 rounded-[3px]">
                              {loc.locationCode}
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-semibold block mt-0.5">
                            {loc.locationType || 'State'}
                          </span>
                        </td>

                        {/* Rates & Travel Fees */}
                        <td className="px-3.5 py-3">
                          <div className="text-[12px] font-mono font-bold text-[var(--admin-text-primary)]">
                            ₹{Number(loc.baseTravelFee || 0).toLocaleString('en-IN')}
                            <span className="text-[10.5px] font-normal text-[var(--admin-text-secondary)] font-sans ml-1">
                              base
                            </span>
                          </div>
                          <div className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                            ₹{loc.perKmRate}/km{' '}
                            <span className="text-[var(--admin-text-tertiary)]">
                              (after {loc.freeTravelDistanceKm}km)
                            </span>
                            {Number(loc.stateSurcharge || 0) > 0 && (
                              <span className="text-amber-600 dark:text-amber-400 font-mono font-semibold ml-1.5">
                                +₹{loc.stateSurcharge}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Toggle Switch */}
                        <td className="w-[80px] min-w-[80px] max-w-[80px] px-3.5 py-3 text-center align-middle">
                          <div className="flex items-center justify-center">
                            <AdminToggle
                              size="sm"
                              checked={loc.enabled}
                              onChange={() => handleToggleStatus(loc, !loc.enabled)}
                            />
                          </div>
                        </td>

                        {/* Action Button */}
                        <td className="w-[60px] min-w-[60px] max-w-[60px] px-3.5 py-3 text-right align-middle">
                          <button
                            type="button"
                            onClick={() => handleEditClick(loc)}
                            className="w-7 h-7 rounded-[4px] border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] transition-colors inline-flex items-center justify-center cursor-pointer shadow-2xs"
                            title="Edit Travel Rates"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Card Footer */}
      <div className="p-3 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between text-[11px] text-[var(--admin-text-tertiary)]">
        <span>● Realtime travel fee computation active</span>
        <span className="font-mono font-medium">{filteredLocations.length} Listed</span>
      </div>
    </div>
  );

  if (isEmbedded) {
    return cardContent;
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 sm:pb-8">
      <PageHeader
        title="Serviceability Configurations"
        description="Manage serviceable states and travel expenses."
      />
      {cardContent}
    </div>
  );
}
