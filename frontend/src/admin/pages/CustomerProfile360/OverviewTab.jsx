import React from 'react';
import ShoppingBag from 'lucide-react/dist/esm/icons/shopping-bag';
import Clock from 'lucide-react/dist/esm/icons/clock';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import { formatCurrency } from '../../components/AdminUIKit';

export default function OverviewTab({ profile }) {
  const { overview } = profile;

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <ShoppingBag className="w-4 h-4" />
            <span className="text-sm font-medium">Total Orders</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{overview?.totalOrders || 0}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Engagement Score</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-gray-900">
              {profile.scores?.engagement?.score || 0}/100
            </p>
            <span className="text-sm font-medium text-gray-500">
              ({profile.scores?.engagement?.rating || 'Low'})
            </span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <TrendingUp className="w-4 h-4 text-[var(--admin-accent)]" />
            <span className="text-sm font-medium">Avg. Order Value</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(overview?.aov || 0)}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium">Last Active</span>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {overview?.lastActive ? new Date(overview.lastActive).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Preferred Categories / Tags */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">What They Like</h3>
          {overview?.topInterests?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {overview.topInterests.map((interest, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] rounded-full text-sm font-medium border border-[var(--admin-border-strong)]"
                >
                  {interest}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Not enough data to determine interests.</p>
          )}
        </div>

        {/* Marketing Attribution Snapshot */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How They Found Us</h3>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Came From</span>
              <span className="text-sm font-medium text-gray-900 capitalize">
                {overview?.acquisition?.source || 'Direct'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">First Page Visited</span>
              <span
                className="text-sm font-medium text-gray-900 truncate max-w-[200px] text-right"
                title={overview?.acquisition?.firstTouch}
              >
                {overview?.acquisition?.firstTouch || 'Homepage'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
