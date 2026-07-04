import React, { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { PageHeader, fadeUp, stagger } from '../components/AdminUIKit';
import api from '../../services/api';
import { Skeleton } from '../../components/ui/Skeleton';
import { toast } from 'react-hot-toast';

export default function AdminEnterpriseSearch() {
  const [activeTab, setActiveTab] = useState('global'); // 'global' or 'analytics'

  // --- Global Search State ---
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ products: [], orders: [], users: [], shipments: [] });
  const [loading, setLoading] = useState(false);

  // --- Analytics State ---
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [analyticsSubTab, setAnalyticsSubTab] = useState('dashboard'); // 'dashboard', 'synonyms', 'pins', 'zero'

  // --- Global Search Effect ---
  useEffect(() => {
    if (activeTab !== 'global') return;

    if (query.trim().length < 2) {
      setResults({ products: [], orders: [], users: [], shipments: [] });
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/v1/search/enterprise?q=${encodeURIComponent(query)}`);
        if (res.data && res.data.success) {
          setResults(res.data.data || { products: [], orders: [], users: [], shipments: [] });
        }
      } catch (err) {
        console.error('Enterprise search failed', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, activeTab]);

  // --- Analytics Effect ---
  useEffect(() => {
    if (activeTab === 'analytics' && !stats) {
      fetchStats();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await api.get('/api/v1/search/analytics/dashboard?days=30');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load search analytics');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleReindex = async () => {
    try {
      toast.loading('Starting reindex...', { id: 'reindex' });
      await api.post('/api/v1/search/reindex');
      toast.success('Search reindex triggered successfully', { id: 'reindex' });
    } catch (err) {
      toast.error('Failed to trigger reindex', { id: 'reindex' });
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="w-full space-y-6">
      <PageHeader
        title={
          <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center justify-between">
              <span>Enterprise Search</span>
            </div>
            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-[var(--admin-border-subtle)] mt-1">
              {[
                { id: 'global', label: 'Global Search' },
                { id: 'analytics', label: 'Search Analytics & Settings' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 text-[13px] font-bold tracking-wide capitalize border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-[var(--admin-accent)] text-[var(--admin-accent)]'
                      : 'border-transparent text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        }
        subtitle=""
        icon="manage_search"
        iconColor="info"
      />

      <AnimatePresence mode="wait">
        {activeTab === 'global' ? (
          <motion.div key="global" variants={fadeUp} className="space-y-6">
            <div className={`transition-all duration-500 ease-in-out ${query ? 'mt-0' : 'mt-16'}`}>
              <div
                className={`admin-card overflow-hidden transition-all duration-500 border border-[var(--admin-border-strong)] ${query ? 'p-4 shadow-sm' : 'p-12 shadow-lg'}`}
              >
                {!query && (
                  <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-[var(--admin-info)]/10 text-[var(--admin-info)] rounded-[var(--admin-radius-xl)] flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <span className="material-symbols-outlined text-[40px]">manage_search</span>
                    </div>
                    <h2 className="text-[24px] font-bold text-[var(--admin-text-primary)] tracking-tight">
                      Enterprise Search
                    </h2>
                    <p className="text-[var(--admin-text-secondary)] mt-2 font-medium text-[15px]">
                      Find anything instantly across your entire enterprise.
                    </p>
                  </div>
                )}

                <div className="relative max-w-3xl mx-auto">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--admin-text-tertiary)] text-[24px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Scan barcode, type Order ID, Phone, Customer Name..."
                    className={`w-full pl-16 pr-6 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-strong)] rounded-[var(--admin-radius-xl)] text-[var(--admin-text-primary)] focus:ring-4 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)] outline-none transition-all font-medium ${query ? 'py-4 text-[15px]' : 'py-5 text-[16px] shadow-inner'}`}
                    autoFocus
                  />
                  {loading && (
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center justify-center">
                      <span className="w-6 h-6 border-2 border-[var(--admin-accent)] border-t-transparent rounded-full animate-spin"></span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {query && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
              >
                {/* Orders */}
                <motion.div
                  variants={fadeUp}
                  className="admin-card p-0 h-[400px] flex flex-col bg-[var(--admin-surface)] border border-[var(--admin-border-strong)] shadow-sm"
                >
                  <h3 className="font-bold text-[var(--admin-text-primary)] p-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between tracking-tight">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--admin-info)]/10 text-[var(--admin-info)] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                      </div>
                      Orders
                    </div>
                    <span className="bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] px-2 py-0.5 rounded text-[11px] font-bold border border-[var(--admin-border-strong)] tracking-wider">
                      {results.orders?.length || 0}
                    </span>
                  </h3>
                  <div className="p-2 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                    {!results.orders || results.orders.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-[var(--admin-text-tertiary)] opacity-60 p-6 text-center">
                        <span className="material-symbols-outlined text-[32px] mb-2">
                          shopping_bag
                        </span>
                        <p className="text-[13px] font-medium">No orders found.</p>
                      </div>
                    ) : (
                      results.orders.map((o) => (
                        <div
                          key={o._id}
                          className="p-3 rounded-lg border border-transparent hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer group flex flex-col"
                        >
                          <p className="font-bold text-[13px] text-[var(--admin-accent-text)] group-hover:underline">
                            {o.orderNumber || o._id.substring(0, 8)}
                          </p>
                          <p className="text-[12px] text-[var(--admin-text-secondary)] mt-1 font-medium truncate">
                            {o.shippingAddress?.name}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>

                {/* Products */}
                <motion.div
                  variants={fadeUp}
                  className="admin-card p-0 h-[400px] flex flex-col bg-[var(--admin-surface)] border border-[var(--admin-border-strong)] shadow-sm"
                >
                  <h3 className="font-bold text-[var(--admin-text-primary)] p-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between tracking-tight">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--admin-success)]/10 text-[var(--admin-success)] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                      </div>
                      Products
                    </div>
                    <span className="bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] px-2 py-0.5 rounded text-[11px] font-bold border border-[var(--admin-border-strong)] tracking-wider">
                      {results.products?.length || 0}
                    </span>
                  </h3>
                  <div className="p-2 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                    {!results.products || results.products.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-[var(--admin-text-tertiary)] opacity-60 p-6 text-center">
                        <span className="material-symbols-outlined text-[32px] mb-2">
                          inventory_2
                        </span>
                        <p className="text-[13px] font-medium">No products found.</p>
                      </div>
                    ) : (
                      results.products.map((p) => (
                        <div
                          key={p._id}
                          className="p-3 rounded-lg border border-transparent hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer group flex flex-col"
                        >
                          <p className="font-bold text-[13px] truncate text-[var(--admin-text-primary)] group-hover:text-[var(--admin-accent-text)]">
                            {p.title}
                          </p>
                          <p className="text-[10px] text-[var(--admin-text-secondary)] mt-1.5 font-mono font-bold bg-[var(--admin-bg-subtle)] px-2 py-0.5 rounded w-fit border border-[var(--admin-border-strong)] tracking-wider">
                            SKU: {p.sku || 'N/A'}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>

                {/* Users */}
                <motion.div
                  variants={fadeUp}
                  className="admin-card p-0 h-[400px] flex flex-col bg-[var(--admin-surface)] border border-[var(--admin-border-strong)] shadow-sm"
                >
                  <h3 className="font-bold text-[var(--admin-text-primary)] p-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between tracking-tight">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--admin-warning)]/10 text-[var(--admin-warning)] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">group</span>
                      </div>
                      Customers
                    </div>
                    <span className="bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] px-2 py-0.5 rounded text-[11px] font-bold border border-[var(--admin-border-strong)] tracking-wider">
                      {results.users?.length || 0}
                    </span>
                  </h3>
                  <div className="p-2 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                    {!results.users || results.users.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-[var(--admin-text-tertiary)] opacity-60 p-6 text-center">
                        <span className="material-symbols-outlined text-[32px] mb-2">group</span>
                        <p className="text-[13px] font-medium">No customers found.</p>
                      </div>
                    ) : (
                      results.users.map((u) => (
                        <div
                          key={u._id}
                          className="p-3 rounded-lg border border-transparent hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer group flex items-center gap-3"
                        >
                          <div className="w-10 h-10 rounded-full bg-[var(--admin-surface-muted)] flex items-center justify-center text-[12px] font-bold text-[var(--admin-text-secondary)] shadow-inner">
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[13px] truncate text-[var(--admin-text-primary)] group-hover:text-[var(--admin-accent-text)]">
                              {u.name}
                            </p>
                            <p className="text-[11px] text-[var(--admin-text-tertiary)] truncate mt-0.5">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>

                {/* Shipments */}
                <motion.div
                  variants={fadeUp}
                  className="admin-card p-0 h-[400px] flex flex-col bg-[var(--admin-surface)] border border-[var(--admin-border-strong)] shadow-sm"
                >
                  <h3 className="font-bold text-[var(--admin-text-primary)] p-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between tracking-tight">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">
                          local_shipping
                        </span>
                      </div>
                      Shipments
                    </div>
                    <span className="bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] px-2 py-0.5 rounded text-[11px] font-bold border border-[var(--admin-border-strong)] tracking-wider">
                      {results.shipments?.length || 0}
                    </span>
                  </h3>
                  <div className="p-2 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                    {!results.shipments || results.shipments.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-[var(--admin-text-tertiary)] opacity-60 p-6 text-center">
                        <span className="material-symbols-outlined text-[32px] mb-2">
                          local_shipping
                        </span>
                        <p className="text-[13px] font-medium">No shipments found.</p>
                      </div>
                    ) : (
                      results.shipments.map((s) => (
                        <div
                          key={s._id}
                          className="p-3 rounded-lg border border-transparent hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer group flex flex-col"
                        >
                          <p className="font-bold text-[13px] text-[var(--admin-accent-text)] group-hover:underline truncate">
                            {s.trackingNumber}
                          </p>
                          <p className="text-[12px] text-[var(--admin-text-secondary)] mt-1 font-medium">
                            {s.provider}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div key="analytics" variants={fadeUp} className="space-y-8 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex border-b border-stone-200 overflow-x-auto no-scrollbar">
                {[
                  { id: 'dashboard', label: 'Analytics Dashboard', icon: 'monitoring' },
                  { id: 'synonyms', label: 'Synonyms & Vocabulary', icon: 'translate' },
                  { id: 'pins', label: 'Pinned Results', icon: 'push_pin' },
                  { id: 'zero', label: 'Zero Results Analysis', icon: 'find_replace' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAnalyticsSubTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${
                      analyticsSubTab === tab.id
                        ? 'border-[var(--admin-accent)] text-[var(--admin-accent)]'
                        : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={handleReindex} className="admin-btn admin-btn-primary px-4 py-2">
                  <span className="material-symbols-outlined text-[18px]">sync</span>
                  Rebuild Index
                </button>
                <button onClick={fetchStats} className="admin-btn admin-btn-outline px-4 py-2">
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  Refresh
                </button>
              </div>
            </div>

            {analyticsSubTab === 'dashboard' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="admin-card p-6 flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined">search</span>
                      </div>
                      <p className="text-[var(--admin-text-secondary)] text-xs font-bold uppercase tracking-widest mb-1">
                        Total Searches
                      </p>
                    </div>
                    <h3 className="text-3xl font-display font-bold text-[var(--admin-text-primary)] mt-2">
                      {statsLoading ? (
                        <Skeleton className="h-8 w-24" />
                      ) : (
                        stats?.totalSearches?.toLocaleString() || 0
                      )}
                    </h3>
                  </div>

                  <div className="admin-card p-6 flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined">find_replace</span>
                      </div>
                      <p className="text-[var(--admin-text-secondary)] text-xs font-bold uppercase tracking-widest mb-1">
                        Zero Results Rate
                      </p>
                    </div>
                    <h3 className="text-3xl font-display font-bold text-[var(--admin-text-primary)] mt-2">
                      {statsLoading ? (
                        <Skeleton className="h-8 w-24" />
                      ) : (
                        `${(stats?.zeroResultRate || 0).toFixed(1)}%`
                      )}
                    </h3>
                  </div>

                  <div className="admin-card p-6 flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined">ads_click</span>
                      </div>
                      <p className="text-[var(--admin-text-secondary)] text-xs font-bold uppercase tracking-widest mb-1">
                        Click-Through Rate
                      </p>
                    </div>
                    <h3 className="text-3xl font-display font-bold text-[var(--admin-text-primary)] mt-2">
                      {statsLoading ? (
                        <Skeleton className="h-8 w-24" />
                      ) : (
                        `${(stats?.clickThroughRate || 0).toFixed(1)}%`
                      )}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="admin-card p-0 overflow-hidden flex flex-col h-[500px]">
                    <div className="px-6 py-5 border-b border-[var(--admin-border-subtle)] flex items-center justify-between bg-[var(--admin-bg-subtle)]">
                      <h3 className="font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[var(--admin-text-tertiary)]">
                          trending_up
                        </span>
                        Top Searched Queries
                      </h3>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto">
                      {statsLoading ? (
                        <div className="space-y-4">
                          {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      ) : stats?.topQueries?.length > 0 ? (
                        <div className="space-y-3">
                          {stats.topQueries.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--admin-surface-muted)] transition-colors border border-transparent hover:border-[var(--admin-border)]"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-[var(--admin-text-tertiary)] font-mono text-sm w-5">
                                  {idx + 1}.
                                </span>
                                <span className="font-medium text-[var(--admin-text-primary)]">
                                  {item.query}
                                </span>
                              </div>
                              <span className="bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] px-2.5 py-1 rounded-md text-xs font-bold">
                                {item.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-[var(--admin-text-tertiary)] text-sm">
                          No search data available
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="admin-card p-0 overflow-hidden flex flex-col h-[500px]">
                    <div className="px-6 py-5 border-b border-[var(--admin-border-subtle)] flex items-center justify-between bg-[var(--admin-bg-subtle)]">
                      <h3 className="font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[var(--admin-text-tertiary)]">
                          tune
                        </span>
                        Search Configuration
                      </h3>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto">
                      <div className="space-y-6">
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5">
                          <h4 className="font-bold text-blue-900 mb-2">Algorithm Settings</h4>
                          <p className="text-sm text-blue-700/80 mb-4 leading-relaxed">
                            The search engine utilizes an advanced n-gram and Levenshtein fuzzy
                            matching system. Products, events, and gallery items are pre-indexed for
                            high-performance retrieval.
                          </p>
                        </div>

                        <div>
                          <h4 className="font-bold text-[var(--admin-text-primary)] mb-3 text-sm">
                            Active Features
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-[var(--admin-surface-muted)] rounded-lg border border-[var(--admin-border)]">
                              <span className="text-sm font-medium text-[var(--admin-text-secondary)]">
                                Semantic AI Search
                              </span>
                              <span className="text-green-500 material-symbols-outlined text-[18px]">
                                toggle_on
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-[var(--admin-surface-muted)] rounded-lg border border-[var(--admin-border)]">
                              <span className="text-sm font-medium text-[var(--admin-text-secondary)]">
                                N-gram Fuzzy Search
                              </span>
                              <span className="text-green-500 material-symbols-outlined text-[18px]">
                                toggle_on
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-[var(--admin-surface-muted)] rounded-lg border border-[var(--admin-border)]">
                              <span className="text-sm font-medium text-[var(--admin-text-secondary)]">
                                Visual Image Search
                              </span>
                              <span className="text-green-500 material-symbols-outlined text-[18px]">
                                toggle_on
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {analyticsSubTab === 'synonyms' && (
              <div className="admin-card p-8 text-center animate-in fade-in duration-300">
                <span className="material-symbols-outlined text-6xl text-[var(--admin-text-tertiary)] mb-4">
                  translate
                </span>
                <h2 className="text-xl font-bold text-[var(--admin-text-primary)] mb-2">
                  Synonym Management
                </h2>
                <p className="text-[var(--admin-text-secondary)] max-w-md mx-auto mb-6">
                  Map regional language terms, spelling variations, and industry-specific vocabulary
                  to ensure your customers always find what they're looking for.
                </p>
                <button className="admin-btn admin-btn-primary px-6 py-2.5">
                  + Add Synonym Group
                </button>
              </div>
            )}

            {analyticsSubTab === 'pins' && (
              <div className="admin-card p-8 text-center animate-in fade-in duration-300">
                <span className="material-symbols-outlined text-6xl text-[var(--admin-text-tertiary)] mb-4">
                  push_pin
                </span>
                <h2 className="text-xl font-bold text-[var(--admin-text-primary)] mb-2">
                  Pinned Results
                </h2>
                <p className="text-[var(--admin-text-secondary)] max-w-md mx-auto mb-6">
                  Force specific products to appear at the top of search results for important
                  keywords to drive promotions and targeted sales.
                </p>
                <button className="admin-btn admin-btn-primary px-6 py-2.5">
                  + Create Search Pin
                </button>
              </div>
            )}

            {analyticsSubTab === 'zero' && (
              <div className="admin-card p-8 text-center animate-in fade-in duration-300">
                <span className="material-symbols-outlined text-6xl text-[var(--admin-text-tertiary)] mb-4">
                  find_replace
                </span>
                <h2 className="text-xl font-bold text-[var(--admin-text-primary)] mb-2">
                  Zero Result Queries
                </h2>
                <p className="text-[var(--admin-text-secondary)] max-w-md mx-auto mb-6">
                  Discover what your customers are searching for when they get no results. Use this
                  data to create new synonyms or add new product lines.
                </p>
                <p className="text-[var(--admin-text-tertiary)] italic text-sm">
                  Gathering data...
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
