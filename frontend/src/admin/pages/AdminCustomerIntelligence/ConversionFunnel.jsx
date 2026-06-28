import React, { useState, useEffect } from 'react';
import { Filter, TrendingDown } from 'lucide-react';
import { customerIntelligenceService } from '../../../services/domainServices';

export default function ConversionFunnel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');

  useEffect(() => {
    const fetchFunnel = async () => {
      setLoading(true);
      try {
        const response = await customerIntelligenceService.getFunnel({ range: dateRange });
        setData(response);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFunnel();
  }, [dateRange]);

  if (loading) return <div className="animate-pulse h-96 bg-gray-100 rounded-xl" />;
  if (!data) return <div className="text-gray-500 p-6">No funnel data available.</div>;

  const maxUsers = Math.max(data.homepage || 1, 1);

  const stages = [
    {
      id: 'homepage',
      label: 'Homepage Visitors',
      count: data.homepage || 0,
      dropoff: data.dropoffs?.homepageToCategory,
    },
    {
      id: 'category',
      label: 'Viewed Categories',
      count: data.category || 0,
      dropoff: data.dropoffs?.categoryToProduct,
    },
    {
      id: 'product',
      label: 'Viewed Products',
      count: data.product || 0,
      dropoff: data.dropoffs?.productToCart,
    },
    {
      id: 'cart',
      label: 'Added to Cart',
      count: data.cart || 0,
      dropoff: data.dropoffs?.cartToCheckout,
    },
    {
      id: 'checkout',
      label: 'Started Checkout',
      count: data.checkout || 0,
      dropoff: data.dropoffs?.checkoutToPayment,
    },
    {
      id: 'payment',
      label: 'Reached Payment',
      count: data.payment || 0,
      dropoff: data.dropoffs?.paymentToSuccess,
    },
    { id: 'orderSuccess', label: 'Completed Order', count: data.orderSuccess || 0, dropoff: null },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Filter className="w-5 h-5 text-[var(--admin-accent)]" />
          Shopping Journey
        </h2>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="border border-[var(--admin-border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--admin-accent)]"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="mb-8 flex items-center justify-between pb-6 border-b border-gray-100">
          <div>
            <p className="text-sm text-gray-500">Percentage of Visitors Who Bought</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {data.conversionRate ? data.conversionRate.toFixed(2) : '0.00'}%
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {stages.map((stage, idx) => {
            const widthPct = (stage.count / maxUsers) * 100;
            return (
              <div key={stage.id} className="relative">
                <div className="flex items-end justify-between mb-2">
                  <span className="font-medium text-gray-800">{stage.label}</span>
                  <span className="text-gray-900 font-bold">
                    {stage.count} <span className="text-sm text-gray-500 font-normal">users</span>
                  </span>
                </div>

                {/* Bar */}
                <div className="h-8 w-full bg-gray-100 rounded-md overflow-hidden flex">
                  <div
                    className="h-full bg-[var(--admin-accent)] transition-all duration-1000 ease-out flex items-center justify-end px-3"
                    style={{ width: `${Math.max(widthPct, 2)}%` }} // min width so it's visible
                  >
                    {widthPct > 10 && (
                      <span className="text-xs text-white font-medium">{widthPct.toFixed(1)}%</span>
                    )}
                  </div>
                </div>

                {/* Dropoff Indicator */}
                {stage.dropoff !== null && stage.dropoff !== undefined && (
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 z-10">
                    <TrendingDown className="w-3 h-3" />
                    {stage.dropoff.toFixed(1)}% drop-off
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
