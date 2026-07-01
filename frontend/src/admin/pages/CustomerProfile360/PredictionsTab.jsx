import React from 'react';
import BrainCircuit from 'lucide-react/dist/esm/icons/brain-circuit';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import ArrowUpCircle from 'lucide-react/dist/esm/icons/arrow-up-circle';

export default function PredictionsTab({ predictions, overview }) {
  if (!predictions) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
        <BrainCircuit className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No Predictions Available</p>
        <p className="text-sm text-gray-500">
          Not enough data to generate ML predictions for this customer.
        </p>
      </div>
    );
  }

  const { churnProbability, nextPurchaseDate, recommendedUpsells } = predictions;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[var(--admin-bg-subtle)] to-[var(--admin-surface-muted)] rounded-xl p-6 border border-[var(--admin-border-subtle)] flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--admin-text-primary)] flex items-center gap-2 mb-1">
            <span className="text-xl">🔮</span> AI-Generated Forecast
          </h2>
          <p className="text-sm text-[var(--admin-text-secondary)]">
            Predictions are based on historical engagement, purchase intervals, and peer affinities.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Churn Risk */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <TrendingDown className="w-24 h-24 text-red-500 -mr-8 -mt-8" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-500" /> Risk of Leaving{' '}
            <span className="text-xs font-normal text-[var(--admin-accent)] bg-[var(--admin-bg-subtle)] px-2 py-0.5 rounded-full ml-1">
              (Prediction)
            </span>
          </h3>
          <div className="flex items-end gap-3 mb-2">
            <span
              className={`text-4xl font-bold ${churnProbability > 70 ? 'text-red-600' : churnProbability > 40 ? 'text-amber-500' : 'text-green-500'}`}
            >
              {churnProbability}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mt-4">
            <div
              className={`h-2 rounded-full ${churnProbability > 70 ? 'bg-red-500' : churnProbability > 40 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${churnProbability}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Chance that they will stop shopping in the next 30 days.
          </p>
        </div>

        {/* Next Purchase Date */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-[var(--admin-accent)]" /> Next Purchase Date{' '}
            <span className="text-xs font-normal text-[var(--admin-accent)] bg-[var(--admin-bg-subtle)] px-2 py-0.5 rounded-full ml-1">
              (Prediction)
            </span>
          </h3>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {nextPurchaseDate
              ? new Date(nextPurchaseDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Unknown'}
          </div>
          <p className="text-sm text-[var(--admin-accent)] font-medium mt-3 border-t border-gray-100 pt-3">
            Estimated Order Value: ₹{Math.round(overview?.aov || 0).toLocaleString()}{' '}
            <span className="text-xs font-normal text-[var(--admin-accent)] bg-[var(--admin-bg-subtle)] px-2 py-0.5 rounded-full ml-1">
              (Estimate)
            </span>
          </p>
        </div>
      </div>

      {/* Upsell Recommendations */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          Recommended Products{' '}
          <span className="text-xs font-normal text-[var(--admin-accent)] bg-[var(--admin-bg-subtle)] px-2 py-0.5 rounded-full ml-2">
            (AI Suggested)
          </span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {recommendedUpsells && recommendedUpsells.length > 0 ? (
            recommendedUpsells.map((upsell, i) => (
              <div
                key={i}
                className="flex flex-col p-4 border border-[var(--admin-border-subtle)] rounded-lg hover:border-[var(--admin-accent)] hover:shadow-md transition-all"
              >
                <img
                  src={upsell.image}
                  alt={upsell.name}
                  className="w-full h-32 object-cover rounded mb-3 bg-gray-50"
                />
                <p className="font-medium text-gray-900 text-sm flex-1">{upsell.name}</p>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                  <span className="font-bold text-gray-900 text-sm">₹{upsell.price}</span>
                  <span className="text-xs px-2 py-0.5 bg-[var(--admin-bg-subtle)] text-[var(--admin-accent)] rounded font-medium">
                    {upsell.confidence}% Match
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-6 text-gray-500 text-sm border border-dashed border-gray-200 rounded-lg">
              No specific products recommended right now.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
