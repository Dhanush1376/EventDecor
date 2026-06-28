import React, { useState, useEffect } from 'react';
import { Zap, Eye, MousePointerClick, ShoppingCart, CreditCard } from 'lucide-react';
import { customerIntelligenceService } from '../../../services/domainServices';

export default function RecommendationEffectiveness() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await customerIntelligenceService.getRecommendations({ range: '30d' });
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
  if (!data) return <div className="text-gray-500 p-6">No recommendation data available.</div>;

  const { funnel, rates, revenue } = data;

  const StatBox = ({ label, value, rate, icon: Icon, colorClass }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 right-0 p-4 opacity-10 ${colorClass}`}>
        <Icon className="w-24 h-24 -mr-8 -mt-8" />
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-20`}>
          <Icon
            className={`w-5 h-5 ${colorClass.replace('text-', 'bg-').replace('100', '600')}`}
            style={{ color: 'currentColor' }}
          />
        </div>
        <h3 className="text-gray-500 font-medium text-sm">{label}</h3>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
        {rate !== undefined && (
          <p className="text-sm font-medium text-gray-500 mt-1">
            <span className="text-[var(--admin-accent)]">{rate.toFixed(1)}%</span> conversion rate
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] rounded-xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 text-[var(--admin-text-primary)]">
            <Zap className="w-6 h-6 text-[var(--admin-accent)]" />
            AI Recommendations ROI
          </h2>
          <p className="text-[var(--admin-text-secondary)] max-w-lg">
            Track how effective your personalized product recommendations are at driving clicks,
            cart additions, and ultimate revenue.
          </p>
        </div>
        <div className="bg-white/50 backdrop-blur-sm p-6 rounded-xl border border-[var(--admin-border-subtle)] text-center min-w-[200px]">
          <p className="text-[var(--admin-text-secondary)] text-sm font-medium mb-1">
            Attributed Revenue
          </p>
          <p className="text-4xl font-bold text-[var(--admin-text-primary)]">
            ₹{revenue.toLocaleString()}
          </p>
          <p className="text-xs text-[var(--admin-text-tertiary)] mt-2">Last 30 Days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox
          label="Recommendations Shown"
          value={funnel.shown}
          icon={Eye}
          colorClass="text-blue-500"
        />
        <StatBox
          label="Products Clicked"
          value={funnel.clicked}
          rate={rates.clickRate}
          icon={MousePointerClick}
          colorClass="text-[var(--admin-accent)]"
        />
        <StatBox
          label="Added to Cart"
          value={funnel.carted}
          rate={rates.cartRate}
          icon={ShoppingCart}
          colorClass="text-purple-500"
        />
        <StatBox
          label="Purchased"
          value={funnel.purchased}
          rate={rates.purchaseRate}
          icon={CreditCard}
          colorClass="text-green-500"
        />
      </div>

      {/* Funnel Visualisation */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Recommendation Funnel</h3>

        <div className="space-y-4">
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                  Impressions
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-blue-600">100%</span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-100">
              <div
                style={{ width: '100%' }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
              ></div>
            </div>
          </div>

          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-[var(--admin-accent)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border-strong)]">
                  Clicks
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-[var(--admin-accent)]">
                  {rates.clickRate.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-100">
              <div
                style={{ width: `${Math.max(rates.clickRate, 1)}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[var(--admin-accent)]"
              ></div>
            </div>
          </div>

          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-purple-600 bg-purple-200">
                  Add to Cart
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-purple-600">
                  {rates.cartRate.toFixed(1)}% (of clicks)
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-purple-100">
              <div
                style={{ width: `${Math.max((funnel.carted / funnel.shown) * 100, 1)}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500"
              ></div>
            </div>
          </div>

          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
                  Purchases
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-green-600">
                  {rates.purchaseRate.toFixed(1)}% (of carts)
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-green-100">
              <div
                style={{ width: `${Math.max((funnel.purchased / funnel.shown) * 100, 1)}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
