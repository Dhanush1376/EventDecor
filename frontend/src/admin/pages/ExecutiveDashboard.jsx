import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Activity,
  ShoppingCart,
  Search,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../components/AdminUIKit';

export default function ExecutiveDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get('/analytics/executive-summary');
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (error) {
        console.error('Failed to load executive summary', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-center text-red-500">Failed to load executive metrics.</div>;
  }

  const { snapshot } = data;
  const metrics = snapshot?.metrics || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Executive Summary</h1>
          <p className="text-gray-500 mt-1">High-level business health and revenue metrics</p>
        </div>
      </div>

      {/* Primary Financials */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-green-500">
          <p className="text-sm font-medium text-gray-500 mb-1">Revenue (Today)</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(data.revenueToday)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-indigo-500">
          <p className="text-sm font-medium text-gray-500 mb-1">Orders (Today)</p>
          <p className="text-3xl font-bold text-gray-900">{data.ordersToday}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-green-500 opacity-80">
          <p className="text-sm font-medium text-gray-500 mb-1">Revenue (MTD)</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(data.revenueThisMonth)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-indigo-500 opacity-80">
          <p className="text-sm font-medium text-gray-500 mb-1">Orders (MTD)</p>
          <p className="text-3xl font-bold text-gray-900">{data.ordersThisMonth}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Conversion Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" /> Funnel Health
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Active Customers</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.activeCustomers || 0}</p>
              <p className="text-xs text-green-600 mt-1">Daily unique visitors</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Cart Abandonment</p>
              <p className="text-2xl font-bold text-gray-900">
                {(metrics.cartAbandonmentRate || 0).toFixed(1)}%
              </p>
              <p className="text-xs text-red-600 mt-1">Users leaving at checkout</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Checkout Completion</p>
              <p className="text-2xl font-bold text-gray-900">
                {(metrics.checkoutCompletionRate || 0).toFixed(1)}%
              </p>
              <p className="text-xs text-green-600 mt-1">Successful checkouts</p>
            </div>
          </div>
        </div>

        {/* AI Actionable Insights */}
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl shadow-sm border border-indigo-800 p-6 text-white flex flex-col">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-indigo-100">
            <span className="text-xl">🤖</span> Executive AI Insights
          </h3>
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            {metrics.aiInsights?.length > 0 ? (
              metrics.aiInsights.map((insight, idx) => (
                <div key={idx} className="bg-white/10 p-3 rounded-lg border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    {insight.severity === 'negative' || insight.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-green-400" />
                    )}
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
                      {insight.type}
                    </span>
                  </div>
                  <p className="text-sm text-white">{insight.message}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-indigo-300">Generating baseline data...</div>
            )}
          </div>
        </div>
      </div>

      {/* Traffic & Search Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-500" /> Top Search Trends
          </h3>
          {metrics.topSearches?.length > 0 ? (
            <div className="space-y-3">
              {metrics.topSearches.slice(0, 5).map((search, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                >
                  <span className="font-medium text-gray-700 capitalize">{search.query}</span>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {search.count} searches
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No search data available.</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" /> Top Traffic Sources
          </h3>
          {metrics.trafficSources?.length > 0 ? (
            <div className="space-y-3">
              {metrics.trafficSources.slice(0, 5).map((source, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                >
                  <span className="font-medium text-gray-700 capitalize">
                    {source.channel || 'Direct'}
                  </span>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {source.visitors} visitors
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No traffic source data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
