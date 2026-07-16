import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import whatsappAutomationService from '../../services/whatsappAutomationService';
import { toast } from 'react-hot-toast';

const AnalyticsDashboard = () => {
  const [data, setData] = useState({ dailyTrends: [], statusDistribution: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await whatsappAutomationService.getAnalytics();
        if (res.data?.data) {
          setData(res.data.data);
        }
      } catch (err) {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading)
    return (
      <div className="p-8 text-center text-[var(--admin-text-secondary)]">Loading analytics...</div>
    );

  return (
    <div className="space-y-6">
      {/* Top Cost Metrics */}
      {data.cost && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="admin-card p-5 bg-gradient-to-br from-indigo-50 to-blue-50 border-blue-100">
            <h3 className="text-[13px] font-semibold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">payments</span> Total Spend
              (30d)
            </h3>
            <div className="text-[28px] font-bold text-blue-900">
              ₹{data.cost.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[12px] text-blue-600 mt-1">
              {((data.cost.totalSpend / data.cost.monthlyBudget) * 100).toFixed(1)}% of ₹
              {data.cost.monthlyBudget} budget
            </p>
          </div>

          <div className="admin-card p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
            <h3 className="text-[13px] font-semibold text-green-800 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>{' '}
              Remaining Budget
            </h3>
            <div className="text-[28px] font-bold text-green-900">
              ₹
              {Math.max(0, data.cost.monthlyBudget - data.cost.totalSpend).toLocaleString(
                undefined,
                { minimumFractionDigits: 2 },
              )}
            </div>
            <p className="text-[12px] text-green-600 mt-1">Resets 1st of next month</p>
          </div>

          <div className="admin-card p-5 bg-gradient-to-br from-purple-50 to-fuchsia-50 border-purple-100">
            <h3 className="text-[13px] font-semibold text-purple-800 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">calculate</span> Avg Cost /
              Message
            </h3>
            <div className="text-[28px] font-bold text-purple-900">
              ₹{data.cost.avgCostPerMsg.toFixed(2)}
            </div>
            <p className="text-[12px] text-purple-600 mt-1">Blended across all providers</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Trends */}
        <div className="admin-card p-5">
          <h3 className="text-[16px] font-semibold text-[var(--admin-text-primary)] mb-4">
            Message Delivery Trends
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.dailyTrends}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--admin-border)"
                />
                <XAxis dataKey="date" stroke="var(--admin-text-secondary)" fontSize={12} />
                <YAxis yAxisId="left" stroke="var(--admin-text-secondary)" fontSize={12} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="var(--admin-text-secondary)"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--admin-surface)',
                    border: '1px solid var(--admin-border)',
                    borderRadius: '8px',
                  }}
                  itemStyle={{ color: 'var(--admin-text-primary)' }}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="sent"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorSent)"
                  name="Delivered"
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="failed"
                  stroke="#EF4444"
                  fillOpacity={1}
                  fill="url(#colorFailed)"
                  name="Failed"
                />
                <Area
                  yAxisId="right"
                  type="step"
                  dataKey="spend"
                  stroke="#6366F1"
                  fillOpacity={0}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Spend (₹)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="admin-card p-5">
          <h3 className="text-[16px] font-semibold text-[var(--admin-text-primary)] mb-4">
            Status Distribution
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.statusDistribution}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--admin-border)"
                />
                <XAxis dataKey="name" stroke="var(--admin-text-secondary)" fontSize={12} />
                <YAxis stroke="var(--admin-text-secondary)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--admin-surface)',
                    border: '1px solid var(--admin-border)',
                    borderRadius: '8px',
                  }}
                  cursor={{ fill: 'var(--admin-hover)' }}
                />
                <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} name="Messages" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
