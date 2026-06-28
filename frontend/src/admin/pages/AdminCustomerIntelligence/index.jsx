import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  BarChart2,
  Search,
  ShoppingBag,
  TrendingUp,
  Target,
  Zap,
  Filter,
  Download,
  Activity,
} from 'lucide-react';
import { useAnalyticsExport } from '../../../hooks/useAnalyticsExport';
import CustomerIntelligenceOverview from './CustomerIntelligenceOverview';
import CustomerSegments from './CustomerSegments';
import ConversionFunnel from './ConversionFunnel';
import SearchIntelligence from './SearchIntelligence';
import ProductIntelligence from './ProductIntelligence';
import MarketingAttribution from './MarketingAttribution';
import RecommendationEffectiveness from './RecommendationEffectiveness';
import LiveOperationsDashboard from './LiveOperationsDashboard';
import CohortMatrix from './CohortMatrix';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart2, component: CustomerIntelligenceOverview },
  { id: 'segments', label: 'Customer Groups', icon: Users, component: CustomerSegments },
  { id: 'funnel', label: 'Shopping Journey', icon: Filter, component: ConversionFunnel },
  { id: 'search', label: 'What They Search For', icon: Search, component: SearchIntelligence },
  {
    id: 'products',
    label: 'Favourite Products',
    icon: ShoppingBag,
    component: ProductIntelligence,
  },
  {
    id: 'attribution',
    label: 'Marketing Attribution',
    icon: TrendingUp,
    component: MarketingAttribution,
  },
  {
    id: 'recommendations',
    label: 'Recommended Products',
    icon: Zap,
    component: RecommendationEffectiveness,
  },
  { id: 'live', label: 'Live Activity', icon: Activity, component: LiveOperationsDashboard },
  { id: 'cohorts', label: 'Loyalty Cohorts', icon: Target, component: CohortMatrix },
];

export default function AdminCustomerIntelligence() {
  const [activeTab, setActiveTab] = useState('overview');
  const { exportToCsv, isExporting } = useAnalyticsExport();

  const ActiveComponent =
    TABS.find((t) => t.id === activeTab)?.component || CustomerIntelligenceOverview;

  const handleExport = () => {
    // Basic mock export data based on current tab
    // In real app, we'd fetch raw dataset or pass it up from the active tab component
    exportToCsv(
      [{ Date: new Date().toISOString(), Tab: activeTab, Status: 'Exported' }],
      `intelligence-${activeTab}-export.csv`,
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Customer Insights</h1>
          <p className="text-gray-500 mt-1">
            Understand what your customers are doing across your platform
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="admin-btn admin-btn-outline"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="border-b border-[var(--admin-border-subtle)] overflow-x-auto no-scrollbar bg-[var(--admin-surface-muted)]">
          <nav className="flex px-4" aria-label="Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group inline-flex items-center gap-2 px-4 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors focus:outline-none
                    ${
                      isActive
                        ? 'border-[var(--admin-accent)] text-[var(--admin-accent)] bg-white'
                        : 'border-transparent text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-gray-100/50'
                    }
                  `}
                >
                  <Icon
                    className={`w-5 h-5 ${isActive ? 'text-[var(--admin-accent)]' : 'text-gray-400 group-hover:text-gray-500'}`}
                  />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ActiveComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
