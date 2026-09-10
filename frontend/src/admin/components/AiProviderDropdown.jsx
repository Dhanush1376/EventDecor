import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/api/aiService';

export function AiProviderDropdown({ selectedProviderId, onChange, disabled }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await aiService.getProviders();
        if (res.success && Array.isArray(res.data)) {
          // Only show validated and enabled providers
          setProviders(res.data.filter((p) => p.isValidated && p.enabled));
        }
      } catch (err) {
        console.error('Failed to load providers for dropdown:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProviders();
  }, []);

  if (loading) {
    return (
      <select
        disabled
        className="bg-[var(--admin-bg-subtle)] text-[11px] sm:text-[12px] border border-[var(--admin-border)] rounded-[4px] px-2.5 h-9 min-h-[36px] box-border outline-none text-[var(--admin-text-secondary)] opacity-70 w-auto"
      >
        <option>AI...</option>
      </select>
    );
  }

  if (providers.length === 0) {
    return null; // Don't show if no alternative providers exist
  }

  return (
    <select
      value={selectedProviderId || ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled}
      title="Select AI Provider for this request"
      className="bg-[var(--admin-surface)] text-[11.5px] sm:text-[12px] border border-[var(--admin-border)] rounded-[4px] px-2.5 pr-6 outline-none text-[var(--admin-text-primary)] hover:border-[var(--admin-accent)] transition-colors focus:border-[var(--admin-accent)] cursor-pointer shadow-2xs appearance-none relative h-9 min-h-[36px] box-border w-auto max-w-[90px] sm:max-w-[125px] truncate font-medium"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.45rem center',
        backgroundSize: '10px',
      }}
    >
      <option value="">Default</option>
      {providers.map((p) => (
        <option key={p._id || p.id} value={p._id || p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
