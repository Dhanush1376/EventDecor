import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';

export function VisualSearchAnalytics({
  analyticsDays,
  setAnalyticsDays,
  analyticsLoading,
  analytics,
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <select
          value={analyticsDays}
          onChange={(e) => setAnalyticsDays(parseInt(e.target.value))}
          className="admin-input py-1.5 text-[12px] w-auto bg-white"
        >
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
        </select>
      </div>

      {analyticsLoading ? (
        <div className="flex justify-center py-20">
          <span className="animate-spin material-symbols-outlined text-4xl text-primary/30">
            sync
          </span>
        </div>
      ) : analytics ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="admin-card p-5">
              <p className="text-[11px] text-stone-500 font-bold uppercase tracking-wider mb-1">
                Total Searches
              </p>
              <p className="text-[28px] font-bold">{analytics.totalSearches.toLocaleString()}</p>
              <div className="mt-2 text-[11px] text-stone-400">Past {analyticsDays} days</div>
            </div>
            <div className="admin-card p-5">
              <p className="text-[11px] text-stone-500 font-bold uppercase tracking-wider mb-1">
                Success Rate
              </p>
              <div className="flex items-end gap-2">
                <p className="text-[28px] font-bold text-green-600">{analytics.successRate}%</p>
              </div>
              <div className="mt-2 text-[11px] text-stone-400">
                {analytics.failedSearches} failed searches
              </div>
            </div>
            <div className="admin-card p-5">
              <p className="text-[11px] text-stone-500 font-bold uppercase tracking-wider mb-1">
                Avg Confidence
              </p>
              <p className="text-[28px] font-bold text-[var(--admin-accent)]">
                {analytics.averageConfidence}%
              </p>
              <div className="mt-2 text-[11px] text-stone-400">AI prediction accuracy</div>
            </div>
            <div className="admin-card p-5">
              <p className="text-[11px] text-stone-500 font-bold uppercase tracking-wider mb-1">
                Avg Latency
              </p>
              <p className="text-[28px] font-bold font-mono text-blue-600">
                {analytics.averageDurationMs}ms
              </p>
              <div className="mt-2 text-[11px] text-stone-400">Processing time per image</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="admin-card p-6">
              <h3 className="text-[14px] font-bold mb-4 uppercase tracking-wider">
                Search Volume Trend
              </h3>
              <div className="h-64">
                {analytics.dailyUsage.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.dailyUsage}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        dy={10}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        dx={-10}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                        itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#334155"
                        fill="rgba(51, 65, 85, 0.1)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-stone-400 text-[12px]">
                    No data available
                  </div>
                )}
              </div>
            </div>

            <div className="admin-card p-6">
              <h3 className="text-[14px] font-bold mb-4 uppercase tracking-wider">
                Top Detected Categories
              </h3>
              <div className="h-64">
                {analytics.topCategories.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.topCategories}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="category"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        dy={10}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        dx={-10}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                        cursor={{ fill: '#f1f5f9' }}
                      />
                      <Bar dataKey="count" fill="#334155" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-stone-400 text-[12px]">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
