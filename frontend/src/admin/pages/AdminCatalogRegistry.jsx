import React, { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { PageHeader, fadeUp, stagger, StatCard, SkeletonDashboard } from '../components/AdminUIKit';
import { catalogService } from '../../services/domainServices';
import { toast } from 'react-hot-toast';
import {
  Settings,
  CheckCircle,
  Clock,
  AlertTriangle,
  Layers,
  Type,
  Hash,
  ShieldCheck,
  Database,
  RefreshCw,
  EyeOff,
  Eye,
} from 'lucide-react';

export default function AdminCatalogRegistry() {
  const [activeTab, setActiveTab] = useState('registry'); // 'registry', 'pending', 'learning', 'health'
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Registry State
  const [activeAttribute, setActiveAttribute] = useState('color');
  const [registryValues, setRegistryValues] = useState([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Pending State
  const [pendingValues, setPendingValues] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // Learning State
  const [learningLogs, setLearningLogs] = useState([]);
  const [learningLoading, setLearningLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'registry') {
      fetchRegistry();
    } else if (activeTab === 'pending') {
      fetchPending();
    } else if (activeTab === 'learning') {
      fetchLearning();
    }
  }, [activeTab, activeAttribute, searchQuery]);

  const fetchStats = async () => {
    try {
      const res = await catalogService.getStats();
      if (res.success) setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch catalog stats:', error);
    }
  };

  const fetchRegistry = async () => {
    try {
      setRegistryLoading(true);
      const res = await catalogService.getRegistry({
        attributeSlug: activeAttribute,
        search: searchQuery,
      });
      if (res.success) {
        setRegistryValues(res.data);
      }
    } catch (error) {
      toast.error('Failed to load registry values');
    } finally {
      setRegistryLoading(false);
    }
  };

  const fetchPending = async () => {
    try {
      setPendingLoading(true);
      const res = await catalogService.getPendingApprovals();
      if (res.success) setPendingValues(res.data);
    } catch (error) {
      toast.error('Failed to load pending approvals');
    } finally {
      setPendingLoading(false);
    }
  };

  const fetchLearning = async () => {
    try {
      setLearningLoading(true);
      const res = await catalogService.getLearningLog();
      if (res.success) setLearningLogs(res.data);
    } catch (error) {
      toast.error('Failed to load learning logs');
    } finally {
      setLearningLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const res = await catalogService.approveValue(id);
      if (res.success) {
        toast.success('Approved successfully');
        setPendingValues(pendingValues.filter((v) => v._id !== id));
        fetchStats();
      }
    } catch (error) {
      toast.error('Failed to approve value');
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await catalogService.rejectValue(id);
      if (res.success) {
        toast.success('Rejected successfully');
        setPendingValues(pendingValues.filter((v) => v._id !== id));
        fetchStats();
      }
    } catch (error) {
      toast.error('Failed to reject value');
    }
  };

  const handleRunHealthScan = async () => {
    const toastId = toast.loading('Running full catalog health scan...');
    try {
      const res = await catalogService.triggerHealthScan();
      if (res.success) {
        toast.success(`Scan complete! Health Score: ${res.score}/100`, {
          id: toastId,
          duration: 5000,
        });
        fetchStats();
        if (activeTab === 'registry') fetchRegistry();
      } else {
        toast.error('Scan failed', { id: toastId });
      }
    } catch (error) {
      toast.error('Scan failed', { id: toastId });
    }
  };

  if (!stats && loading) return <SkeletonDashboard />;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="p-6 max-w-7xl mx-auto space-y-6"
    >
      <PageHeader
        title="Catalog Intelligence"
        subtitle="Enterprise-grade registry, normalization, and AI governance"
        action={{
          label: 'Run Health Scan',
          icon: RefreshCw,
          onClick: handleRunHealthScan,
          variant: 'primary',
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Database}
          title="Total Values"
          value={stats?.registry?.total || 0}
          trend="Approved"
          trendValue={stats?.registry?.approved || 0}
          color="indigo"
        />
        <StatCard
          icon={Clock}
          title="Pending Approval"
          value={stats?.registry?.pending || 0}
          trend="Requires Review"
          trendValue="!"
          color={stats?.registry?.pending > 0 ? 'orange' : 'emerald'}
        />
        <StatCard
          icon={ShieldCheck}
          title="AI Memory"
          value={stats?.aiCorrections || 0}
          trend="Corrections learned"
          trendValue="+"
          color="blue"
        />
        <StatCard
          icon={CheckCircle}
          title="Catalog Health"
          value="98%"
          trend="Excellent"
          trendValue="+"
          color="emerald"
        />
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-neutral-200">
          {[
            { id: 'registry', label: 'Registry Browser', icon: Layers },
            {
              id: 'pending',
              label: `Pending Queue (${stats?.registry?.pending || 0})`,
              icon: Clock,
            },
            { id: 'learning', label: 'AI Learning', icon: ShieldCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'registry' && (
            <motion.div variants={fadeUp} className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex bg-neutral-100 p-1 rounded-lg w-fit">
                  {['color', 'material', 'size', 'tag'].map((attr) => (
                    <button
                      key={attr}
                      onClick={() => setActiveAttribute(attr)}
                      className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                        activeAttribute === attr
                          ? 'bg-white shadow-sm text-indigo-600'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      {attr}s
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Search values..."
                  className="px-4 py-2 border border-neutral-200 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {registryLoading ? (
                <div className="h-64 flex items-center justify-center text-neutral-500">
                  Loading registry...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 text-sm text-neutral-500">
                        <th className="py-3 font-medium">Canonical Value</th>
                        <th className="py-3 font-medium">Usage Count</th>
                        <th className="py-3 font-medium">Visibility</th>
                        <th className="py-3 font-medium">Synonyms</th>
                        <th className="py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-sm">
                      {registryValues.map((val) => (
                        <tr key={val._id} className="hover:bg-neutral-50">
                          <td className="py-3 font-medium text-neutral-900">
                            {val.value}
                            {val.parentId && (
                              <span className="ml-2 text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded">
                                Child
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-neutral-600">{val.usageCount}</td>
                          <td className="py-3">
                            {val.isVisible ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <Eye className="w-3 h-3" /> Visible
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-neutral-500">
                                <EyeOff className="w-3 h-3" /> Hidden
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-neutral-500">
                            {val.synonyms?.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {val.synonyms.map((s) => (
                                  <span
                                    key={s._id}
                                    className="px-2 py-0.5 bg-neutral-100 text-xs rounded border border-neutral-200"
                                  >
                                    {s.term}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <button className="text-indigo-600 hover:text-indigo-700 font-medium text-xs">
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                      {registryValues.length === 0 && (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-neutral-500">
                            No values found in this registry
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'pending' && (
            <motion.div variants={fadeUp} className="space-y-4">
              {pendingLoading ? (
                <div className="h-64 flex items-center justify-center text-neutral-500">
                  Loading pending approvals...
                </div>
              ) : pendingValues.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-neutral-500 space-y-2">
                  <CheckCircle className="w-12 h-12 text-emerald-400" />
                  <p>All caught up! No pending approvals.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingValues.map((val) => (
                    <div
                      key={val._id}
                      className="border border-orange-200 bg-orange-50/50 rounded-xl p-4 space-y-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">
                            {val.attributeSlug}
                          </div>
                          <div className="text-lg font-bold text-neutral-900">{val.value}</div>
                        </div>
                        {val.confidence < 70 && (
                          <div className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                            <AlertTriangle className="w-3 h-3" /> Low Confidence
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-neutral-600 space-y-1">
                        <div className="font-medium text-neutral-900">AI Reasoning:</div>
                        <ul className="list-disc pl-4">
                          {val.confidenceReasons?.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-orange-200/50">
                        <button
                          onClick={() => handleApprove(val._id)}
                          className="flex-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(val._id)}
                          className="flex-1 bg-white border border-neutral-200 text-neutral-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-neutral-50 transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'learning' && (
            <motion.div variants={fadeUp}>
              {learningLoading ? (
                <div className="h-64 flex items-center justify-center text-neutral-500">
                  Loading learning logs...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 text-sm text-neutral-500">
                        <th className="py-3 font-medium">Attribute Type</th>
                        <th className="py-3 font-medium">AI Original Input</th>
                        <th className="py-3 font-medium">Admin Corrected Value</th>
                        <th className="py-3 font-medium">Correction Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-sm">
                      {learningLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-neutral-50">
                          <td className="py-3 font-medium text-neutral-600 capitalize">
                            {log.attributeSlug}
                          </td>
                          <td className="py-3 text-red-600 line-through decoration-red-300">
                            {log.originalValue}
                          </td>
                          <td className="py-3 font-medium text-emerald-600">
                            {log.correctedValue}
                          </td>
                          <td className="py-3 text-neutral-500">{log.correctionCount} times</td>
                        </tr>
                      ))}
                      {learningLogs.length === 0 && (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-neutral-500">
                            No learning logs recorded yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
