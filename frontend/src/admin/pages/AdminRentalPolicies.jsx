import { AdminToggle } from '../components/AdminUIKit';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import rentalService from '../../services/rentalService';
import toast from 'react-hot-toast';

const DOC_OPTIONS = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'voter_id', label: 'Voter ID' },
];

export default function AdminRentalPolicies() {
  const navigate = useNavigate();
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCondition, setNewCondition] = useState('');

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const res = await rentalService.getPolicy();
        if (res.success) setPolicy(res.data);
      } catch (_err) {
        toast.error('Failed to load rental policy');
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await rentalService.updatePolicy(policy);
      if (res.success) {
        setPolicy(res.data);
        toast.success('Rental policy saved');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (path, value) => {
    const keys = path.split('.');
    setPolicy((prev) => {
      const next = { ...prev };
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const addCondition = () => {
    if (!newCondition.trim()) return;
    setPolicy((prev) => ({
      ...prev,
      returnConditions: [...(prev.returnConditions || []), newCondition.trim()],
    }));
    setNewCondition('');
  };

  const removeCondition = (idx) => {
    setPolicy((prev) => ({
      ...prev,
      returnConditions: prev.returnConditions.filter((_, i) => i !== idx),
    }));
  };

  const toggleDoc = (doc) => {
    setPolicy((prev) => {
      const current = prev.requiredDocuments || [];
      return {
        ...prev,
        requiredDocuments: current.includes(doc)
          ? current.filter((d) => d !== doc)
          : [...current, doc],
      };
    });
  };

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto p-6 space-y-6">
        <div className="skeleton-box h-8 w-48 rounded-lg" />
        <div className="skeleton-box h-96 rounded-2xl" />
      </div>
    );
  }

  if (!policy) return null;

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
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
              Rental Policies
            </h1>
            <p className="text-[12px] text-[var(--admin-text-secondary)]">
              Configure late fees, damage policies, and verification rules
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-[var(--admin-accent)] text-white rounded-xl text-[11px] font-bold uppercase tracking-wider cursor-pointer hover:brightness-110 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Policy'}
        </button>
      </div>

      {/* Late Return Fee */}
      <div className="admin-card p-5 border border-[var(--admin-border)] rounded-2xl">
        <h3 className="text-[12px] font-bold text-[var(--admin-text-primary)] mb-1">
          Late Return Fee
        </h3>
        <p className="text-[11px] text-[var(--admin-text-secondary)] mb-3">
          Amount charged per day after rental end date
        </p>
        <div className="relative max-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)] font-bold">
            ₹
          </span>
          <input
            type="number"
            min="0"
            value={policy.lateReturnFeePerDay || ''}
            onChange={(e) => updateField('lateReturnFeePerDay', Number(e.target.value))}
            className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-xl pl-7 pr-3 py-2.5 text-[13px] outline-none focus:border-[var(--admin-accent)]"
          />
        </div>
      </div>

      {/* Damage Policy */}
      <div className="admin-card p-5 border border-[var(--admin-border)] rounded-2xl">
        <h3 className="text-[12px] font-bold text-[var(--admin-text-primary)] mb-1">
          Damage Policy
        </h3>
        <p className="text-[11px] text-[var(--admin-text-secondary)] mb-3">
          Penalty amounts for different damage levels
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: 'minor', label: 'Minor Damage (₹)', color: 'border-l-yellow-400' },
            { key: 'major', label: 'Major Damage (₹)', color: 'border-l-orange-400' },
            { key: 'complete', label: 'Complete Loss (₹)', color: 'border-l-red-400' },
          ].map((d) => (
            <div
              key={d.key}
              className={`p-3 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] ${d.color} border-l-4 rounded-xl`}
            >
              <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                {d.label}
              </label>
              <input
                type="number"
                min="0"
                value={policy.damagePolicy?.[d.key] ?? ''}
                onChange={(e) => updateField(`damagePolicy.${d.key}`, Number(e.target.value))}
                className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[13px] outline-none"
              />
              {d.key === 'complete' && (
                <p className="text-[9px] text-[var(--admin-text-tertiary)] mt-1">
                  0 = full product cost
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lost Product Policy */}
      <div className="admin-card p-5 border border-[var(--admin-border)] rounded-2xl">
        <h3 className="text-[12px] font-bold text-[var(--admin-text-primary)] mb-3">
          Lost Product Policy
        </h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
              Charge Type
            </label>
            <select
              value={policy.lostProductPolicy?.type || 'full_cost'}
              onChange={(e) => updateField('lostProductPolicy.type', e.target.value)}
              className="bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-xl px-3 py-2 text-[12px] cursor-pointer outline-none"
            >
              <option value="full_cost">Full Product Cost</option>
              <option value="percentage">Percentage of Cost</option>
            </select>
          </div>
          {policy.lostProductPolicy?.type === 'percentage' && (
            <div>
              <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                Percentage (%)
              </label>
              <input
                type="number"
                min="0"
                max="200"
                value={policy.lostProductPolicy?.percentage ?? 100}
                onChange={(e) =>
                  updateField('lostProductPolicy.percentage', Number(e.target.value))
                }
                className="bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-xl px-3 py-2 text-[13px] outline-none w-24"
              />
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Policy */}
      <div className="admin-card p-5 border border-[var(--admin-border)] rounded-2xl">
        <h3 className="text-[12px] font-bold text-[var(--admin-text-primary)] mb-3">
          Cancellation Policy
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
              Free Cancel Window (hours)
            </label>
            <input
              type="number"
              min="0"
              value={policy.cancellationPolicy?.freeCancelHours ?? 24}
              onChange={(e) =>
                updateField('cancellationPolicy.freeCancelHours', Number(e.target.value))
              }
              className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-xl px-3 py-2 text-[13px] outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
              Post-Confirm Charge (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={policy.cancellationPolicy?.postConfirmChargePercent ?? 50}
              onChange={(e) =>
                updateField('cancellationPolicy.postConfirmChargePercent', Number(e.target.value))
              }
              className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-xl px-3 py-2 text-[13px] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Return Conditions */}
      <div className="admin-card p-5 border border-[var(--admin-border)] rounded-2xl">
        <h3 className="text-[12px] font-bold text-[var(--admin-text-primary)] mb-3">
          Return Conditions
        </h3>
        <div className="space-y-2 mb-3">
          {(policy.returnConditions || []).map((c, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 bg-[var(--admin-bg-subtle)] rounded-lg"
            >
              <span className="text-[12px] text-[var(--admin-text-primary)]">{c}</span>
              <button onClick={() => removeCondition(i)} className="text-red-500 cursor-pointer">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCondition()}
            placeholder="Add return condition..."
            className="flex-1 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-xl px-3 py-2 text-[12px] outline-none"
          />
          <button
            onClick={addCondition}
            className="px-4 py-2 bg-[var(--admin-accent)] text-white rounded-xl text-[11px] font-bold cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>

      {/* Identity Verification */}
      <div className="admin-card p-5 border border-[var(--admin-border)] rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[12px] font-bold text-[var(--admin-text-primary)]">
              Identity Verification
            </h3>
            <p className="text-[11px] text-[var(--admin-text-secondary)]">
              Require identity documents before rental
            </p>
          </div>
          <AdminToggle
            checked={policy.identityVerificationRequired}
            onChange={() =>
              updateField('identityVerificationRequired', !policy.identityVerificationRequired)
            }
          />
        </div>

        {policy.identityVerificationRequired && (
          <div>
            <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-2">
              Required Documents
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DOC_OPTIONS.map((doc) => (
                <button
                  key={doc.value}
                  type="button"
                  onClick={() => toggleDoc(doc.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${(policy.requiredDocuments || []).includes(doc.value) ? 'border-indigo-500 bg-indigo-50' : 'border-[var(--admin-border)] bg-[var(--admin-surface)] hover:border-indigo-300'}`}
                >
                  <span className="text-[11px] font-bold">{doc.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Terms & Conditions */}
      <div className="admin-card p-5 border border-[var(--admin-border)] rounded-2xl">
        <h3 className="text-[12px] font-bold text-[var(--admin-text-primary)] mb-3">
          Terms & Conditions
        </h3>
        <textarea
          rows={6}
          value={policy.termsAndConditions || ''}
          onChange={(e) => updateField('termsAndConditions', e.target.value)}
          placeholder="Enter rental terms and conditions that customers must accept..."
          className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-xl px-4 py-3 text-[12px] outline-none focus:border-[var(--admin-accent)] resize-none"
        />
      </div>

      {/* Sticky Save Footer */}
      <div className="sticky bottom-0 bg-[var(--admin-surface)] border-t border-[var(--admin-border)] p-4 -mx-4 sm:-mx-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-[var(--admin-accent)] text-white rounded-xl text-[12px] font-bold uppercase tracking-wider cursor-pointer hover:brightness-110 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
