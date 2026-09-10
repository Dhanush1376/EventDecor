import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { PageHeader, AdminServiceabilitySkeleton } from '../components/AdminUIKit';
import { Check, X, Edit } from 'lucide-react';

export default function AdminServiceability({ isEmbedded = false }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const filteredLocations = locations.filter(
    (loc) =>
      loc.locationName.toLowerCase().includes(search.toLowerCase()) ||
      loc.locationCode.toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount = locations.filter((l) => l.enabled).length;

  if (loading && locations.length === 0) {
    return <AdminServiceabilitySkeleton />;
  }

  const cardContent = (
    <div className="bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] shadow-xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[var(--admin-border-subtle)] space-y-3">
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

        {/* Orders-Style Search Bar */}
        <div className="relative w-full bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-3 h-[38px]">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
            search
          </span>
          <input
            type="text"
            placeholder="Search states..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full min-w-0"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer p-1"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto flex-1 max-h-[440px] overflow-y-auto">
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
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-center text-[var(--admin-text-tertiary)] py-10 text-[13px]"
                >
                  Loading serviceability data...
                </td>
              </tr>
            ) : filteredLocations.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-center text-[var(--admin-text-tertiary)] py-10 text-[13px]"
                >
                  No locations matching &ldquo;{search}&rdquo;
                </td>
              </tr>
            ) : (
              filteredLocations.map((loc) => {
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
                            <button
                              type="button"
                              role="switch"
                              aria-checked={editForm.enabled}
                              onClick={() =>
                                setEditForm({ ...editForm, enabled: !editForm.enabled })
                              }
                              style={{
                                width: '38px',
                                height: '20px',
                                minWidth: '38px',
                                minHeight: '20px',
                                maxWidth: '38px',
                                maxHeight: '20px',
                              }}
                              className={`rounded-full p-[2px] transition-colors duration-200 cursor-pointer relative inline-flex items-center shrink-0 border-0 outline-none ${
                                editForm.enabled
                                  ? 'bg-emerald-500'
                                  : 'bg-stone-300 dark:bg-stone-700'
                              }`}
                              title="Toggle Active Status"
                            >
                              <span
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  minWidth: '16px',
                                  minHeight: '16px',
                                }}
                                className={`rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out block ${
                                  editForm.enabled ? 'translate-x-[18px]' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div>
                            <span className="text-[var(--admin-text-tertiary)] block mb-1">
                              Base Fee (₹)
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={editForm.baseTravelFee}
                              onChange={(e) =>
                                setEditForm({ ...editForm, baseTravelFee: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1 bg-white dark:bg-stone-900 border border-[var(--admin-border)] rounded-[4px] text-[12px] font-mono outline-none focus:border-[var(--admin-accent)]"
                            />
                          </div>
                          <div>
                            <span className="text-[var(--admin-text-tertiary)] block mb-1">
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
                            <span className="text-[var(--admin-text-tertiary)] block mb-1">
                              Per Km (₹)
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={editForm.perKmRate}
                              onChange={(e) =>
                                setEditForm({ ...editForm, perKmRate: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1 bg-white dark:bg-stone-900 border border-[var(--admin-border)] rounded-[4px] text-[12px] font-mono outline-none focus:border-[var(--admin-accent)]"
                            />
                          </div>
                          <div>
                            <span className="text-[var(--admin-text-tertiary)] block mb-1">
                              Surcharge (₹)
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={editForm.stateSurcharge}
                              onChange={(e) =>
                                setEditForm({ ...editForm, stateSurcharge: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1 bg-white dark:bg-stone-900 border border-[var(--admin-border)] rounded-[4px] text-[12px] font-mono outline-none focus:border-[var(--admin-accent)]"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={handleCancel}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-[4px] border border-[var(--admin-border)] hover:bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                          <button
                            onClick={() => handleSave(loc.locationCode)}
                            className="px-3 py-1 text-[11px] font-bold rounded-[4px] bg-[var(--admin-accent)] text-white hover:bg-[var(--admin-accent-hover)] transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
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
                        <button
                          type="button"
                          role="switch"
                          aria-checked={loc.enabled}
                          onClick={() => handleToggleStatus(loc, !loc.enabled)}
                          style={{
                            width: '38px',
                            height: '20px',
                            minWidth: '38px',
                            minHeight: '20px',
                            maxWidth: '38px',
                            maxHeight: '20px',
                          }}
                          className={`rounded-full p-[2px] transition-colors duration-200 cursor-pointer relative inline-flex items-center shrink-0 border-0 outline-none ${
                            loc.enabled ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-700'
                          }`}
                          title={
                            loc.enabled
                              ? `${loc.locationName} is Active (click to disable)`
                              : `${loc.locationName} is Disabled (click to enable)`
                          }
                        >
                          <span
                            style={{
                              width: '16px',
                              height: '16px',
                              minWidth: '16px',
                              minHeight: '16px',
                            }}
                            className={`rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out block ${
                              loc.enabled ? 'translate-x-[18px]' : 'translate-x-0'
                            }`}
                          />
                        </button>
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
              })
            )}
          </tbody>
        </table>
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
    <div className="space-y-6">
      <PageHeader
        title="Serviceability Configurations"
        description="Manage serviceable states and travel expenses."
      />
      {cardContent}
    </div>
  );
}
