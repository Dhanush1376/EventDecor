import React from 'react';
import { Target, Search, MousePointerClick } from 'lucide-react';

export default function BehaviourTab({ profile }) {
  const { intents, funnelMetrics } = profile;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-[var(--admin-accent)]" /> What They Search For
        </h3>

        {intents?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {intents.map((intent, i) => (
              <div
                key={i}
                className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900 capitalize">
                    {intent.intent.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm text-gray-500">Searched {intent.count} times</p>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-[var(--admin-border-strong)] flex items-center justify-center bg-[var(--admin-surface-muted)]">
                  <span className="text-[var(--admin-accent)] font-bold">
                    {Math.min(intent.count * 10, 99)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <Search className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              No significant search intents detected for this customer.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Abandonment metrics */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MousePointerClick className="w-4 h-4 text-purple-500" /> Click Preferences
          </h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Views before Adding to Cart</span>
              <span className="font-semibold text-gray-900">
                {funnelMetrics?.viewsBeforeCart || 0}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Cart Abandonment Rate</span>
              <span className="font-semibold text-amber-600">
                {funnelMetrics?.cartAbandonmentRate || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Checkout Completion Rate</span>
              <span className="font-semibold text-green-600">
                {funnelMetrics?.checkoutCompletionRate || 0}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
