import React, { useState, useEffect } from 'react';
import { aiService } from '../../../services/api/aiService';

const AiUsageDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadUsage = async () => {
      try {
        setLoading(true);
        const res = await aiService.getUsageSummary();
        setSummary(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load usage statistics');
      } finally {
        setLoading(false);
      }
    };
    loadUsage();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">error</span>
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Requests Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <span className="material-symbols-outlined text-8xl">analytics</span>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Requests Today</h3>
          <p className="text-4xl font-bold text-gray-900 tracking-tight">
            {summary.today?.totalRequests || 0}
          </p>
        </div>

        {/* Provider Specific Cards */}
        {summary.today?.providerStats?.map((stat) => (
          <div key={stat._id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600">
                <span className="material-symbols-outlined text-[18px]">memory</span>
              </span>
              <h3 className="text-sm font-bold text-gray-900">{stat._id} Usage</h3>
            </div>

            <div className="mb-6">
              <p className="text-3xl font-bold text-gray-900 flex items-baseline gap-1.5">
                {stat.totalRequests}
                <span className="text-sm font-medium text-gray-500">requests</span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Success Rate</p>
                <p className="text-sm font-bold text-green-600">
                  {Math.round((stat.successRequests / stat.totalRequests) * 100) || 0}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Avg Latency</p>
                <p className="text-sm font-bold text-gray-900">
                  {Math.round(stat.avgLatency)}
                  <span className="text-xs text-gray-500 font-normal">ms</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Tokens</p>
                <p className="text-sm font-bold text-gray-900">
                  {(stat.totalInputTokens + stat.totalOutputTokens).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(!summary.today?.providerStats || summary.today.providerStats.length === 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          <span className="material-symbols-outlined text-4xl mb-2 opacity-50">data_usage</span>
          <p className="text-sm">No AI requests logged today.</p>
        </div>
      )}
    </div>
  );
};

export default AiUsageDashboard;
