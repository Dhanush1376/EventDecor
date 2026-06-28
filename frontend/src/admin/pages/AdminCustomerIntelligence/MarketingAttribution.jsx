import React, { useState, useEffect } from 'react';
import { TrendingUp, Globe, ShoppingBag } from 'lucide-react';
import { customerIntelligenceService } from '../../../services/domainServices';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function MarketingAttribution() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await customerIntelligenceService.getAttribution({ range: '30d' });
        setData(response);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="animate-pulse h-96 bg-gray-100 rounded-xl" />;
  if (data.length === 0)
    return <div className="text-gray-500 p-6">No attribution data available.</div>;

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalConversions = data.reduce((sum, item) => sum + item.conversions, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Tracked Revenue</p>
            <p className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[var(--admin-surface-muted)] rounded-lg">
            <ShoppingBag className="w-6 h-6 text-[var(--admin-accent)]" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Attributed Conversions</p>
            <p className="text-2xl font-bold text-gray-900">{totalConversions}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-500" />
          Channel Performance (Last 30 Days)
        </h3>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="channel" axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" orientation="left" stroke="#6366f1" />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
              <Tooltip cursor={{ fill: '#f3f4f6' }} />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="visitors"
                name="Visitors"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="conversions"
                name="Conversions"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3 text-right">Visitors</th>
                <th className="px-4 py-3 text-right">Conversions</th>
                <th className="px-4 py-3 text-right">Conv. Rate</th>
                <th className="px-4 py-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 capitalize">{row.channel}</td>
                  <td className="px-4 py-3 text-right">{row.visitors.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{row.conversions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{row.conversionRate.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">
                    ₹{row.revenue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
