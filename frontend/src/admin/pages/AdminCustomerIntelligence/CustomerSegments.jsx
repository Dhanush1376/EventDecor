import React, { useState, useEffect } from 'react';
import { Users, Search, Filter } from 'lucide-react';
import { customerIntelligenceService } from '../../../services/domainServices';

export default function CustomerSegments() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const response = await customerIntelligenceService.getCustomers({
          page,
          limit: 10,
          search: searchTerm,
        });
        setCustomers(response.data);
        setMeta(response.meta);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    const debounce = setTimeout(() => {
      fetchCustomers();
    }, 500);
    return () => clearTimeout(debounce);
  }, [page, searchTerm]);

  const getHealthColor = (health) => {
    switch (health) {
      case 'Healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Warning':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'At Risk':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Dormant':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            className="w-full pl-10 pr-4 py-2 border border-[var(--admin-border)] rounded-lg focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)] outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="admin-btn admin-btn-outline">
          <Filter className="w-4 h-4" />
          Filter Segments
        </button>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Tier</th>
                <th className="px-6 py-4">Health Score</th>
                <th className="px-6 py-4">Engagement</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3" />
                        Joined {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{c.email}</div>
                      <div className="text-xs text-gray-500">{c.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border border-[var(--admin-border-strong)]">
                        {c.loyaltyTier}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getHealthColor(c.health)}`}
                      >
                        {c.health}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${c.engagement > 70 ? 'bg-green-500' : c.engagement > 30 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${c.engagement}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700">{c.engagement}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* Linking to the new 360 profile which we will build in Phase 3 */}
                      <a
                        href={`/admin/customers/${c._id}/360`}
                        className="text-[var(--admin-accent)] font-medium text-sm hover:underline"
                      >
                        View 360°
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing page {page} of {meta.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                disabled={page === meta.pages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
