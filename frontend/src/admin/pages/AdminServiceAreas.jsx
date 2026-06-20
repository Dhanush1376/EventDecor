import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import rentalService from '../../services/rentalService';
import toast from 'react-hot-toast';

const RADIUS_PRESETS = [10, 25, 50, 100, 200];

export default function AdminServiceAreas() {
  const navigate = useNavigate();
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    center: { lat: 15.5057, lng: 80.0499 }, // Ongole default
    radiusKm: 25,
    address: 'Ongole, Andhra Pradesh',
    isActive: true,
  });

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      const res = await rentalService.getServiceAreas();
      if (res.success) setAreas(res.data || []);
    } catch (_err) {
      toast.error('Failed to load service areas');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.address) return toast.error('Name and address are required');
    setSaving(true);
    try {
      const res = editId
        ? await rentalService.updateServiceArea(editId, formData)
        : await rentalService.createServiceArea(formData);
      if (res.success) {
        await fetchAreas();
        resetForm();
        toast.success(editId ? 'Service area updated' : 'Service area created');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (area) => {
    setEditId(area._id);
    setFormData({
      name: area.name,
      center: area.center,
      radiusKm: area.radiusKm,
      address: area.address,
      isActive: area.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this service area?')) return;
    try {
      await rentalService.deleteServiceArea(id);
      setAreas((prev) => prev.filter((a) => a._id !== id));
      toast.success('Service area deleted');
    } catch (_err) {
      toast.error('Failed to delete');
    }
  };

  const resetForm = () => {
    setEditId(null);
    setShowForm(false);
    setFormData({
      name: '',
      center: { lat: 15.5057, lng: 80.0499 },
      radiusKm: 25,
      address: 'Ongole, Andhra Pradesh',
      isActive: true,
    });
  };

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/rental-orders')}
            className="w-10 h-10 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="text-[18px] font-bold text-[var(--admin-text-primary)]">
              Service Areas
            </h1>
            <p className="text-[12px] text-[var(--admin-text-secondary)]">
              Configure rental delivery zones
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2.5 bg-[var(--admin-accent)] text-white rounded-xl text-[11px] font-bold uppercase tracking-wider cursor-pointer hover:brightness-110 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Area
        </button>
      </div>

      {/* Map Preview (Static) */}
      <div className="admin-card border border-[var(--admin-border)] rounded-2xl overflow-hidden">
        <div className="h-[300px] bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center relative">
          <div className="text-center">
            <span className="material-symbols-outlined text-[48px] text-blue-300 block mb-2">
              map
            </span>
            <p className="text-[13px] font-bold text-blue-400">Interactive Map</p>
            <p className="text-[11px] text-blue-300 max-w-[300px] mt-1">
              Service areas are defined by center coordinates and radius. Add Leaflet or Google Maps
              integration for interactive editing.
            </p>
          </div>
          {/* Overlay circles representing areas */}
          {areas
            .filter((a) => a.isActive)
            .map((area, i) => (
              <div
                key={area._id}
                className="absolute"
                style={{ top: `${40 + i * 15}%`, left: `${30 + i * 20}%` }}
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-blue-400 bg-blue-100/30 flex items-center justify-center animate-pulse">
                    <span className="material-symbols-outlined text-[20px] text-blue-500">
                      location_on
                    </span>
                  </div>
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-blue-600 whitespace-nowrap bg-white/80 px-1.5 py-0.5 rounded">
                    {area.name}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Service Areas List */}
      {loading ? (
        <div className="admin-card p-12 text-center border border-[var(--admin-border)] rounded-2xl">
          <div className="skeleton-box w-8 h-8 rounded-lg inline-block" />
        </div>
      ) : areas.length === 0 ? (
        <div className="admin-card p-12 text-center border border-[var(--admin-border)] rounded-2xl">
          <span className="material-symbols-outlined text-[40px] text-[var(--admin-text-tertiary)] block mb-2">
            location_off
          </span>
          <p className="text-[13px] text-[var(--admin-text-secondary)]">
            No service areas configured
          </p>
          <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1">
            Add a service area to enable location-based rental delivery
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {areas.map((area) => (
            <motion.div
              key={area._id}
              layout
              className="admin-card p-4 border border-[var(--admin-border)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${area.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">location_on</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                      {area.name}
                    </p>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${area.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}
                    >
                      {area.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--admin-text-secondary)]">{area.address}</p>
                  <p className="text-[10px] text-[var(--admin-text-tertiary)]">
                    {area.center?.lat?.toFixed(4)}°N, {area.center?.lng?.toFixed(4)}°E •{' '}
                    {area.radiusKm} km radius
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(area)}
                  className="px-3 py-1.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-lg text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] hover:border-[var(--admin-accent)] cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(area._id)}
                  className="px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-[10px] font-bold uppercase tracking-wider text-red-600 hover:bg-red-100 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={resetForm}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-4">
                {editId ? 'Edit Service Area' : 'New Service Area'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ongole Hub"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ongole, Andhra Pradesh"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.center.lat}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          center: { ...formData.center, lat: Number(e.target.value) },
                        })
                      }
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.center.lng}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          center: { ...formData.center, lng: Number(e.target.value) },
                        })
                      }
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-2">
                    Radius: {formData.radiusKm} km
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="200"
                    value={formData.radiusKm}
                    onChange={(e) => setFormData({ ...formData, radiusKm: Number(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex gap-2 mt-2">
                    {RADIUS_PRESETS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFormData({ ...formData, radiusKm: r })}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${formData.radiusKm === r ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {r} km
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={resetForm}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-[11px] font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-[var(--admin-accent)] text-white rounded-xl text-[11px] font-bold cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
