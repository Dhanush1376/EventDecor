import React, { useState, useEffect } from 'react';
import { Grid, TrendingUp, Users } from 'lucide-react';
import { customerIntelligenceService } from '../../../services/domainServices';

export default function CohortMatrix() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchCohorts = async () => {
      setLoading(true);
      try {
        const response = await customerIntelligenceService.getCohorts();
        setData(response);
      } catch (err) {
        console.error('Failed to fetch cohorts', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCohorts();
  }, []);

  const getCellColor = (segmentName) => {
    if (['Champions', 'Loyal Customers'].includes(segmentName))
      return 'bg-green-100 border-green-300 text-green-900';
    if (['Potential Loyalists', 'Recent Customers', 'Promising'].includes(segmentName))
      return 'bg-blue-100 border-blue-300 text-blue-900';
    if (['Customers Needing Attention', 'About to Sleep'].includes(segmentName))
      return 'bg-amber-100 border-amber-300 text-amber-900';
    if (['At Risk', 'Cannot Lose Them'].includes(segmentName))
      return 'bg-orange-100 border-orange-300 text-orange-900';
    return 'bg-red-100 border-red-300 text-red-900'; // Hibernating, Lost
  };

  if (loading || !data) return <div className="animate-pulse h-96 bg-gray-100 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Grid className="w-5 h-5 text-[var(--admin-accent)]" />
          RFM Cohort Segmentation
        </h2>
        <p className="text-sm text-gray-500 mb-8">
          Customers segmented based on Recency (how recently they purchased), Frequency (how often),
          and Monetary value.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(data).map(([segment, metrics], idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border-2 flex flex-col justify-between ${getCellColor(segment)}`}
            >
              <h3 className="font-bold mb-3">{segment}</h3>
              <div className="space-y-1 mt-auto">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-1 opacity-80">
                    <Users className="w-4 h-4" /> Users
                  </span>
                  <span className="font-semibold">{metrics.count.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-1 opacity-80">
                    <TrendingUp className="w-4 h-4" /> Avg LTV{' '}
                    <span className="text-[10px] ml-1 bg-white/50 px-1 rounded">(Estimate)</span>
                  </span>
                  <span className="font-semibold">{metrics.ltv}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
