import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Skeleton } from '../../components/ui/Skeleton';
import { toast } from 'react-hot-toast';

export function AdminSearchManagement() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'synonyms', 'pins', 'zero'

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/search/analytics/dashboard?days=30');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load search analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleReindex = async () => {
    try {
      toast.loading('Starting reindex...', { id: 'reindex' });
      await api.post('/admin/search/reindex');
      toast.success('Search reindex triggered successfully', { id: 'reindex' });
    } catch (err) {
      toast.error('Failed to trigger reindex', { id: 'reindex' });
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-display">Search Intelligence</h1>
          <p className="text-stone-500 text-sm mt-1">
            Monitor search performance and manage AI behavior
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReindex}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">sync</span>
            Rebuild Index
          </button>
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      <div className="flex border-b border-stone-200 overflow-x-auto no-scrollbar">
        {[
          { id: 'analytics', label: 'Analytics Dashboard', icon: 'monitoring' },
          { id: 'synonyms', label: 'Synonyms & Vocabulary', icon: 'translate' },
          { id: 'pins', label: 'Pinned Results', icon: 'push_pin' },
          { id: 'zero', label: 'Zero Results Analysis', icon: 'find_replace' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200/60 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-1">
                  Total Searches
                </p>
              </div>
              <h3 className="text-3xl font-display font-bold text-stone-900 mt-2">
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  stats?.totalSearches?.toLocaleString() || 0
                )}
              </h3>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-200/60 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined">find_replace</span>
                </div>
                <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-1">
                  Zero Results Rate
                </p>
              </div>
              <h3 className="text-3xl font-display font-bold text-stone-900 mt-2">
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  `${(stats?.zeroResultRate || 0).toFixed(1)}%`
                )}
              </h3>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-200/60 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined">ads_click</span>
                </div>
                <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-1">
                  Click-Through Rate
                </p>
              </div>
              <h3 className="text-3xl font-display font-bold text-stone-900 mt-2">
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  `${(stats?.clickThroughRate || 0).toFixed(1)}%`
                )}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden flex flex-col h-[500px]">
              <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <h3 className="font-bold text-stone-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-stone-400">trending_up</span>
                  Top Searched Queries
                </h3>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                {loading ? (
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
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-100"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-stone-300 font-mono text-sm w-5">{idx + 1}.</span>
                          <span className="font-medium text-stone-800">{item.query}</span>
                        </div>
                        <span className="bg-stone-100 text-stone-600 px-2.5 py-1 rounded-md text-xs font-bold">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-stone-400 text-sm">
                    No search data available
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden flex flex-col h-[500px]">
              <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <h3 className="font-bold text-stone-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-stone-400">tune</span>
                  Search Configuration
                </h3>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="space-y-6">
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5">
                    <h4 className="font-bold text-blue-900 mb-2">Algorithm Settings</h4>
                    <p className="text-sm text-blue-700/80 mb-4 leading-relaxed">
                      The search engine utilizes an advanced n-gram and Levenshtein fuzzy matching
                      system. Products, events, and gallery items are pre-indexed for
                      high-performance retrieval.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-stone-900 mb-3 text-sm">Active Features</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-100">
                        <span className="text-sm font-medium text-stone-700">
                          Semantic AI Search
                        </span>
                        <span className="text-green-500 material-symbols-outlined text-[18px]">
                          toggle_on
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-100">
                        <span className="text-sm font-medium text-stone-700">
                          N-gram Fuzzy Search
                        </span>
                        <span className="text-green-500 material-symbols-outlined text-[18px]">
                          toggle_on
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-100">
                        <span className="text-sm font-medium text-stone-700">
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

      {activeTab === 'synonyms' && (
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-8 text-center animate-in fade-in duration-300">
          <span className="material-symbols-outlined text-6xl text-stone-300 mb-4">translate</span>
          <h2 className="text-xl font-bold text-stone-900 mb-2">Synonym Management</h2>
          <p className="text-stone-500 max-w-md mx-auto mb-6">
            Map regional language terms, spelling variations, and industry-specific vocabulary to
            ensure your customers always find what they're looking for.
          </p>
          <button className="px-6 py-2.5 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors">
            + Add Synonym Group
          </button>
        </div>
      )}

      {activeTab === 'pins' && (
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-8 text-center animate-in fade-in duration-300">
          <span className="material-symbols-outlined text-6xl text-stone-300 mb-4">push_pin</span>
          <h2 className="text-xl font-bold text-stone-900 mb-2">Pinned Results</h2>
          <p className="text-stone-500 max-w-md mx-auto mb-6">
            Force specific products to appear at the top of search results for important keywords to
            drive promotions and targeted sales.
          </p>
          <button className="px-6 py-2.5 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors">
            + Create Search Pin
          </button>
        </div>
      )}

      {activeTab === 'zero' && (
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-8 text-center animate-in fade-in duration-300">
          <span className="material-symbols-outlined text-6xl text-stone-300 mb-4">
            find_replace
          </span>
          <h2 className="text-xl font-bold text-stone-900 mb-2">Zero Result Queries</h2>
          <p className="text-stone-500 max-w-md mx-auto mb-6">
            Discover what your customers are searching for when they get no results. Use this data
            to create new synonyms or add new product lines.
          </p>
          <p className="text-stone-400 italic text-sm">Gathering data...</p>
        </div>
      )}
    </div>
  );
}
