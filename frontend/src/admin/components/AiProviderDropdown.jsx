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
        className="bg-[var(--admin-bg-subtle)] text-[10px] sm:text-[11px] border border-[var(--admin-border)] rounded-lg px-2 py-1 outline-none text-[var(--admin-text-secondary)] opacity-70"
      >
        <option>Loading Providers...</option>
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
      className="bg-[var(--admin-surface)] text-[10px] sm:text-[11px] border border-[var(--admin-border)] rounded-lg px-2 py-1 outline-none text-[var(--admin-text-primary)] hover:border-[var(--admin-accent)] transition-colors focus:ring-1 focus:ring-[var(--admin-accent)] cursor-pointer shadow-sm appearance-none pr-6 relative h-[32px] sm:h-[36px] min-w-[130px] font-semibold"
      style={{
        backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23707070%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right .5rem top 50%',
        backgroundSize: '.65rem auto',
      }}
    >
      <option value="">Global Default</option>
      {providers.map((p) => (
        <option key={p._id || p.id} value={p._id || p.id}>
          {p.name} ({p.provider})
        </option>
      ))}
    </select>
  );
}
