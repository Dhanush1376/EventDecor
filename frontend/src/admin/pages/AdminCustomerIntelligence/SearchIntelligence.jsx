import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, Target, TrendingUp } from 'lucide-react';
import { customerIntelligenceService } from '../../../services/domainServices';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#64748b',
];

export default function SearchIntelligence() {
  const [dashboardData, setDashboardData] = useState(null);
  const [intentsData, setIntentsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dash, intents] = await Promise.all([
          customerIntelligenceService.getSearchDashboard(),
          customerIntelligenceService.getSearchIntents(),
        ]);
        setDashboardData(dash);
        setIntentsData(intents);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="animate-pulse h-96 bg-gray-100 rounded-xl" />;
  if (!dashboardData) return <div className="text-gray-500 p-6">No search data available.</div>;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1 flex items-center gap-2">
            <Search className="w-4 h-4" /> Total Searches
          </div>
          <div className="text-2xl font-bold text-gray-900">{dashboardData.totalSearches}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1 flex items-center gap-2">
            <Target className="w-4 h-4 text-green-500" /> Search Success Rate
          </div>
          <div className="text-2xl font-bold text-green-600">
            {dashboardData.metrics.successRate.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--admin-accent)]" /> Click Rate
          </div>
          <div className="text-2xl font-bold text-[var(--admin-accent)]">
            {dashboardData.metrics.clickRate.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" /> Zero Results
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {dashboardData.zeroResults.reduce((acc, c) => acc + c.count, 0)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Intents Pie Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Intent Breakdown</h3>
          <div className="h-64">
            {intentsData && intentsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={intentsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="intent"
                  >
                    {intentsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name.replace('_', ' ')]} />
                  <Legend formatter={(value) => value.replace('_', ' ').toUpperCase()} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No intent data
              </div>
            )}
          </div>
        </div>

        {/* Top Keywords & Zero Results */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Keywords</h3>
            <div className="space-y-3">
              {dashboardData.topKeywords.slice(0, 5).map((kw, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-medium w-4">{i + 1}.</span>
                    <span className="font-medium text-gray-800">{kw.query}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      {kw.intent}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{kw.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-red-50 p-6 rounded-xl border border-red-100 shadow-sm">
            <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" /> Need Attention (Zero Results)
            </h3>
            <div className="space-y-3">
              {dashboardData.zeroResults.length === 0 ? (
                <p className="text-sm text-green-700">No zero-result searches recently!</p>
              ) : (
                dashboardData.zeroResults.slice(0, 5).map((kw, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="font-medium text-red-800">{kw.query}</span>
                    <span className="text-sm font-semibold text-red-900">
                      {kw.count} <span className="text-xs font-normal opacity-70">misses</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
