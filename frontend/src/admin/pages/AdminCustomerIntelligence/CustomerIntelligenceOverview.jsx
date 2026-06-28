import React, { useState, useEffect } from 'react';
import {
  Users,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { customerIntelligenceService } from '../../../services/domainServices';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function CustomerIntelligenceOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const response = await customerIntelligenceService.getOverview();
        setData(response);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  if (loading) return <div className="animate-pulse h-96 bg-gray-100 rounded-lg" />;
  if (error) return <div className="text-red-500 p-4 bg-red-50 rounded-lg">{error}</div>;
  if (!data?.snapshot)
    return <div className="p-4 text-gray-500">No data available for this period.</div>;

  const { metrics } = data.snapshot;
  const insights = metrics.aiInsights || [];

  const StatCard = ({ title, value, subtext, icon: Icon, trend }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="p-2 bg-[var(--admin-surface-muted)] rounded-lg border border-[var(--admin-border-subtle)]">
          <Icon className="w-5 h-5 text-[var(--admin-accent)]" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {trend && (
          <span
            className={`flex items-center text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {trend > 0 ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {subtext && <p className="text-sm text-gray-500 mt-1">{subtext}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 🤖 AI Insights Panel */}
      {insights.length > 0 && (
        <div className="bg-[var(--admin-surface-muted)] rounded-xl p-6 border border-[var(--admin-border-subtle)]">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[var(--admin-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--admin-text-primary)]">
              AI-Generated Insights
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg bg-white border ${
                  insight.severity === 'positive'
                    ? 'border-green-200'
                    : insight.severity === 'warning'
                      ? 'border-amber-200'
                      : insight.severity === 'negative'
                        ? 'border-red-200'
                        : 'border-[var(--admin-border-strong)]'
                }`}
              >
                <p className="text-sm text-gray-800">{insight.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Today" value={metrics.activeCustomers || 0} icon={Users} />
        <StatCard
          title="Abandoned Carts"
          value={`${(metrics.cartAbandonmentRate || 0).toFixed(1)}%`}
          icon={ShoppingCart}
        />
        <StatCard
          title="Completed Checkouts"
          value={`${(metrics.checkoutCompletionRate || 0).toFixed(1)}%`}
          icon={TrendingUp}
        />
        <StatCard
          title="Searches with No Results"
          value={(metrics.zeroResultSearches || []).reduce((acc, curr) => acc + curr.count, 0)}
          icon={AlertCircle}
        />
      </div>

      {/* Charts / Visuals */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend (Past 30 Days)</h3>
        {data.revenueTrend && data.revenueTrend.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.revenueTrend}
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₹${value.toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--admin-accent, #4f46e5)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-400 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Not enough historical data points yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
