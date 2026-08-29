import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/AdminUIKit';
import { Check, X, Search, Edit } from 'lucide-react';

export default function AdminServiceability() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const fetchLocations = async () => {
    try {
      const { data } = await api.get('/admin/serviceability');
      setLocations(data.data);
    } catch (err) {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Serviceability Configurations"
        description="Manage serviceable states and travel expenses."
      />

      <div className="admin-card">
        <div className="p-4 border-b border-black/5">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
            <input
              type="text"
              placeholder="Search states..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/5 rounded-lg border-none text-[13px] outline-none focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--admin-border)]">
                <th className="p-4 text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                  Location
                </th>
                <th className="p-4 text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                  Type
                </th>
                <th className="p-4 text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                  Status
                </th>
                <th className="p-4 text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider text-right">
                  Base Fee
                </th>
                <th className="p-4 text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider text-right">
                  Free Distance
                </th>
                <th className="p-4 text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider text-right">
                  Per KM Rate
                </th>
                <th className="p-4 text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider text-right">
                  Surcharge
                </th>
                <th className="p-4 text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center text-[var(--admin-text-tertiary)] py-8 text-[13px]"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredLocations.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center text-[var(--admin-text-tertiary)] py-8 text-[13px]"
                  >
                    No locations found
                  </td>
                </tr>
              ) : (
                filteredLocations.map((loc) => {
                  const isEditing = editingId === loc.locationCode;

                  return (
                    <tr
                      key={loc.locationCode}
                      className="border-b border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-hover)] transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-semibold text-[13px] text-[var(--admin-text-primary)]">
                          {loc.locationName}
                        </div>
                        <div className="text-[11px] text-[var(--admin-text-tertiary)]">
                          {loc.locationCode}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] font-medium">
                          {loc.locationType}
                        </span>
                      </td>
                      <td className="p-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isEditing ? editForm.enabled : loc.enabled}
                            onChange={(e) => {
                              if (isEditing) {
                                setEditForm({ ...editForm, enabled: e.target.checked });
                              } else {
                                handleToggleStatus(loc, e.target.checked);
                              }
                            }}
                          />
                          <div className="w-9 h-5 bg-[var(--admin-border-strong)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </td>
                      <td className="p-4 text-right text-[13px] font-medium text-[var(--admin-text-secondary)]">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={editForm.baseTravelFee === 0 ? '' : editForm.baseTravelFee}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                baseTravelFee: e.target.value === '' ? 0 : Number(e.target.value),
                              })
                            }
                            className="w-20 px-2 py-1 text-right bg-white rounded border border-[var(--admin-border-strong)] text-[12px] outline-none focus:border-[var(--admin-accent)] transition-all"
                          />
                        ) : (
                          `₹${loc.baseTravelFee}`
                        )}
                      </td>
                      <td className="p-4 text-right text-[13px] font-medium text-[var(--admin-text-secondary)]">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={
                              editForm.freeTravelDistanceKm === 0
                                ? ''
                                : editForm.freeTravelDistanceKm
                            }
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                freeTravelDistanceKm:
                                  e.target.value === '' ? 0 : Number(e.target.value),
                              })
                            }
                            className="w-16 px-2 py-1 text-right bg-white rounded border border-[var(--admin-border-strong)] text-[12px] outline-none focus:border-[var(--admin-accent)] transition-all"
                          />
                        ) : (
                          `${loc.freeTravelDistanceKm} km`
                        )}
                      </td>
                      <td className="p-4 text-right text-[13px] font-medium text-[var(--admin-text-secondary)]">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={editForm.perKmRate === 0 ? '' : editForm.perKmRate}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                perKmRate: e.target.value === '' ? 0 : Number(e.target.value),
                              })
                            }
                            className="w-16 px-2 py-1 text-right bg-white rounded border border-[var(--admin-border-strong)] text-[12px] outline-none focus:border-[var(--admin-accent)] transition-all"
                          />
                        ) : (
                          `₹${loc.perKmRate}/km`
                        )}
                      </td>
                      <td className="p-4 text-right text-[13px] font-medium text-[var(--admin-text-secondary)]">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={editForm.stateSurcharge === 0 ? '' : editForm.stateSurcharge}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                stateSurcharge: e.target.value === '' ? 0 : Number(e.target.value),
                              })
                            }
                            className="w-20 px-2 py-1 text-right bg-white rounded border border-[var(--admin-border-strong)] text-[12px] outline-none focus:border-[var(--admin-accent)] transition-all"
                          />
                        ) : (
                          `₹${loc.stateSurcharge}`
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSave(loc.locationCode)}
                              className="p-1.5 rounded bg-green-50 hover:bg-green-100 border border-green-200 text-green-600 transition-colors"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancel}
                              className="p-1.5 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 transition-colors"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditClick(loc)}
                            className="p-1.5 rounded bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-hover)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
