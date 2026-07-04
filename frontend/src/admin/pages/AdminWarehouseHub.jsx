import React, { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader, fadeUp, stagger } from '../components/AdminUIKit';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminWarehouseHub() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine initial tab based on URL path
  const getInitialTab = () => {
    const path = location.pathname;
    if (path.includes('/receive')) return 'receive';
    if (path.includes('/pick')) return 'pick';
    if (path.includes('/pack')) return 'pack';
    if (path.includes('/dispatch')) return 'dispatch';
    if (path.includes('/count')) return 'count';
    return 'scan'; // Default
  };

  const activeTab = getInitialTab();

  const handleTabChange = (tabId) => {
    const basePath = '/admin/warehouse';
    const newPath = tabId === 'scan' ? basePath : `${basePath}/${tabId}`;
    navigate(newPath);
  };

  const tabs = [
    { id: 'scan', label: 'Scan Item', icon: 'qr_code_scanner' },
    { id: 'receive', label: 'Receive', icon: 'move_to_inbox' },
    { id: 'pick', label: 'Pick', icon: 'front_hand' },
    { id: 'pack', label: 'Pack', icon: 'inventory' },
    { id: 'dispatch', label: 'Dispatch', icon: 'local_shipping' },
    { id: 'count', label: 'Stock Count', icon: 'calculate' },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Warehouse Hub"
        subtitle="Command center for fulfillment, scanning, and stock management."
        icon="warehouse"
      />

      {/* Smart Filter Tabs */}
      <div className="flex border-b border-[var(--admin-border-subtle)] overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 font-semibold text-[14px] border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[var(--admin-accent)] text-[var(--admin-accent)]'
                : 'border-transparent text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-border-strong)]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'scan' && <ScannerView />}
          {activeTab === 'receive' && (
            <GenericTaskView
              endpoint="/api/v1/warehouse/dispatch/tasks"
              title="Receive Items"
              icon="move_to_inbox"
              emptyMessage="No inbound shipments to receive."
              color="text-green-500"
              bg="bg-green-500/10"
              isReceive={true}
            />
          )}
          {activeTab === 'pick' && <PickView />}
          {activeTab === 'pack' && (
            <GenericTaskView
              endpoint="/api/v1/warehouse/packages/active"
              title="Pack Orders"
              icon="inventory"
              emptyMessage="No items waiting to be packed."
              color="text-amber-500"
              bg="bg-amber-500/10"
            />
          )}
          {activeTab === 'dispatch' && (
            <GenericTaskView
              endpoint="/api/v1/warehouse/dispatch/tasks"
              title="Dispatch"
              icon="local_shipping"
              emptyMessage="No packed orders ready for dispatch."
              color="text-purple-500"
              bg="bg-purple-500/10"
            />
          )}
          {activeTab === 'count' && (
            <GenericTaskView
              endpoint="/api/v1/warehouse/inventory/count"
              title="Stock Count"
              icon="calculate"
              emptyMessage="No cycle counts assigned today."
              color="text-rose-500"
              bg="bg-rose-500/10"
              isCount={true}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// Sub-components

function ScannerView() {
  const [scanValue, setScanValue] = useState('');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/warehouse/scans/recent');
      if (res.data?.success) {
        setActivities(
          res.data.data.map((scan) => ({
            time: new Date(scan.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            action: `Processed scan: ${scan.rawPayload}`,
            user: scan.workerId === 'You' ? 'You' : scan.workerId || 'Worker',
          })),
        );
      }
    } catch (err) {
      console.error('Failed to load scans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (e) => {
    e?.preventDefault();
    if (!scanValue.trim()) return;

    try {
      const res = await api.post('/api/v1/warehouse/scan', { rawPayload: scanValue.trim() });
      if (res.data?.success) {
        toast.success(`Scan processed successfully`);
        setActivities((prev) =>
          [
            {
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              action: `Processed scan: ${scanValue.trim()}`,
              user: 'You',
            },
            ...prev,
          ].slice(0, 10),
        );
        setScanValue('');
      }
    } catch (err) {
      toast.error(`Scan failed: ${err.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <motion.div
          variants={fadeUp}
          className="admin-card overflow-hidden p-6 shadow-md border-[var(--admin-border-strong)]"
        >
          <h3 className="font-bold text-[var(--admin-text-primary)] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--admin-accent)]">
              barcode_scanner
            </span>
            Rapid Barcode Scanner
          </h3>
          <form onSubmit={handleScan} className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--admin-text-tertiary)]">
              qr_code
            </span>
            <input
              type="text"
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              placeholder="Scan or type barcode, SKU, or Bin ID..."
              className="w-full pl-14 pr-32 py-5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-strong)] rounded-[var(--admin-radius-xl)] text-[var(--admin-text-primary)] focus:ring-4 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)] outline-none text-[15px] transition-all shadow-inner font-medium"
              autoFocus
            />
            <button
              type="submit"
              className="admin-btn admin-btn-primary absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2.5 shadow-sm"
            >
              Process
            </button>
          </form>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-[var(--admin-radius-xl)] border border-indigo-500/20 p-6 flex items-start gap-4 shadow-sm"
        >
          <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0 shadow-sm border border-indigo-500/10">
            <span className="material-symbols-outlined">lightbulb</span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--admin-text-primary)] mb-1.5">
              Efficiency Tip
            </h4>
            <p className="text-[13px] text-[var(--admin-text-secondary)] leading-relaxed font-medium">
              Use a handheld bluetooth scanner to process items up to 3x faster without interacting
              with the keyboard or mouse.
            </p>
          </div>
        </motion.div>
      </div>

      <div className="space-y-6">
        <motion.div
          variants={fadeUp}
          className="admin-card overflow-hidden p-0 border-[var(--admin-border-strong)] shadow-md"
        >
          <div className="p-5 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface)]">
            <h3 className="font-bold text-[var(--admin-text-primary)] flex items-center gap-2 text-[14px]">
              <span className="material-symbols-outlined text-green-500 bg-green-500/10 p-1.5 rounded-lg text-[18px]">
                history
              </span>
              Recent Activity
            </h3>
          </div>
          <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar bg-[var(--admin-surface)]">
            {loading ? (
              <div className="py-10 flex items-center justify-center">
                <span className="w-6 h-6 border-2 border-[var(--admin-accent)] border-t-transparent rounded-full animate-spin"></span>
              </div>
            ) : activities.length === 0 ? (
              <div className="py-10 text-center text-[var(--admin-text-tertiary)] flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">
                  qr_code_scanner
                </span>
                <span className="text-[13px] font-medium">No recent scans.</span>
              </div>
            ) : (
              activities.map((act, idx) => (
                <div
                  key={idx}
                  className="flex gap-4 items-start relative before:absolute before:left-[11px] before:top-6 before:bottom-[-24px] before:w-[2px] before:bg-[var(--admin-border-subtle)] last:before:hidden"
                >
                  <div className="w-6 h-6 rounded-full bg-[var(--admin-surface)] border-2 border-[var(--admin-border-strong)] flex items-center justify-center shrink-0 z-10 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-[var(--admin-text-tertiary)]"></div>
                  </div>
                  <div className="bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-hover)] p-3 rounded-lg border border-transparent hover:border-[var(--admin-border-strong)] flex-1 transition-all cursor-default">
                    <p className="text-[13px] font-bold text-[var(--admin-text-primary)] leading-tight">
                      {act.action}
                    </p>
                    <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1.5 flex items-center gap-1 font-bold tracking-wide uppercase">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>{' '}
                      {act.time} &bull; {act.user}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function PickView() {
  const [picklists, setPicklists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPicklists();
  }, []);

  const fetchPicklists = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/warehouse/picklists/active');
      if (res.data?.success) {
        setPicklists(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch picklists:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      variants={fadeUp}
      className="admin-card overflow-hidden p-0 shadow-md border-[var(--admin-border-strong)]"
    >
      <div className="p-5 border-b border-[var(--admin-border-subtle)] flex justify-between items-center bg-[var(--admin-surface)]">
        <h3 className="font-bold text-[var(--admin-text-primary)] flex items-center gap-2 text-[15px]">
          <span className="material-symbols-outlined text-[var(--admin-info)] bg-[var(--admin-info)]/10 p-1.5 rounded-lg text-[18px]">
            inventory
          </span>
          Active Picklists
        </h3>
        <button
          onClick={fetchPicklists}
          className="admin-btn admin-btn-outline px-3 py-1.5 text-sm h-8"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto bg-[var(--admin-surface)] min-h-[300px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--admin-bg-subtle)] text-[var(--admin-text-secondary)] text-[11px] uppercase tracking-wider">
              <th className="p-4 font-bold border-b border-[var(--admin-border-strong)]">
                Order ID
              </th>
              <th className="p-4 font-bold border-b border-[var(--admin-border-strong)]">Items</th>
              <th className="p-4 font-bold border-b border-[var(--admin-border-strong)]">
                Bin Location
              </th>
              <th className="p-4 font-bold border-b border-[var(--admin-border-strong)]">
                Assigned To
              </th>
              <th className="p-4 font-bold border-b border-[var(--admin-border-strong)] text-right">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border-subtle)] text-[13px] text-[var(--admin-text-primary)]">
            {loading ? (
              <tr>
                <td
                  colSpan="5"
                  className="p-12 text-center text-[var(--admin-text-tertiary)] font-medium"
                >
                  <div className="flex flex-col items-center justify-center gap-3">
                    <span className="w-6 h-6 border-2 border-[var(--admin-accent)] border-t-transparent rounded-full animate-spin"></span>
                    Loading active picklists...
                  </div>
                </td>
              </tr>
            ) : picklists.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className="p-12 text-center text-[var(--admin-text-tertiary)] font-medium"
                >
                  <div className="flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">
                      task_alt
                    </span>
                    No active picklists assigned to you. All caught up!
                  </div>
                </td>
              </tr>
            ) : (
              picklists.map((job) => (
                <tr
                  key={job._id}
                  className="hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer group"
                >
                  <td className="p-4 font-bold text-[var(--admin-accent-text)] group-hover:underline">
                    {job.pickListId}
                  </td>
                  <td className="p-4">
                    <span className="bg-[var(--admin-surface-muted)] px-2 py-0.5 rounded text-[11px] font-bold border border-[var(--admin-border-strong)]">
                      {job.items?.length || 0} items
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="bg-[var(--admin-info)]/10 text-[var(--admin-info)] px-2 py-0.5 rounded border border-[var(--admin-info)]/20 font-mono text-[11px] font-bold shadow-sm">
                      {job.location?.bin || 'Multiple'}
                    </span>
                  </td>
                  <td className="p-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[var(--admin-surface-muted)] border border-[var(--admin-border-strong)] flex items-center justify-center text-[10px] font-bold">
                      ME
                    </div>
                    <span className="text-[var(--admin-text-secondary)] font-medium text-[12px]">
                      You
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span
                      className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold border ${job.status === 'in_progress' ? 'bg-[var(--admin-warning)]/10 text-[var(--admin-warning)] border-[var(--admin-warning)]/20' : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border-[var(--admin-border-strong)]'}`}
                    >
                      {job.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function GenericTaskView({
  endpoint,
  title,
  icon,
  emptyMessage,
  color,
  bg,
  isCount = false,
  isReceive = false,
}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get(endpoint);
      if (res.data?.success) {
        setTasks(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [endpoint]);

  const handleAction = async (task) => {
    try {
      const payload = isCount ? task.sku : task.packageId || task._id;
      const res = await api.post('/api/v1/warehouse/scan', { rawPayload: payload });
      if (res.data?.success) {
        toast.success(`Successfully processed ${payload}`);
        setTasks((prev) => prev.filter((t) => t._id !== task._id));
      }
    } catch (err) {
      toast.error(`Action failed: ${err.message || 'Unknown error'}`);
    }
  };

  return (
    <motion.div
      variants={fadeUp}
      className="admin-card overflow-hidden p-0 shadow-md border-[var(--admin-border-strong)]"
    >
      <div className="p-5 border-b border-[var(--admin-border-subtle)] flex justify-between items-center bg-[var(--admin-surface)]">
        <h3 className="font-bold text-[var(--admin-text-primary)] flex items-center gap-2 text-[15px]">
          <span className={`material-symbols-outlined ${color} ${bg} p-1.5 rounded-lg text-[18px]`}>
            {icon}
          </span>
          {title}
        </h3>
        <button
          onClick={fetchTasks}
          className="admin-btn admin-btn-outline px-3 py-1.5 text-sm h-8"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto bg-[var(--admin-surface)] min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <span className="w-8 h-8 border-4 border-[var(--admin-accent)] border-t-transparent rounded-full animate-spin"></span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-[var(--admin-text-tertiary)]">
            <span className="material-symbols-outlined text-5xl mb-4 opacity-50">{icon}</span>
            <p className="font-medium">{emptyMessage}</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--admin-bg-subtle)] text-[var(--admin-text-secondary)] text-[11px] uppercase tracking-wider">
                <th className="p-4 font-bold border-b border-[var(--admin-border-strong)]">
                  {isCount ? 'SKU / Product' : 'ID'}
                </th>
                <th className="p-4 font-bold border-b border-[var(--admin-border-strong)]">
                  {isCount ? 'Expected Stock' : 'Status'}
                </th>
                <th className="p-4 font-bold border-b border-[var(--admin-border-strong)]">
                  Details
                </th>
                <th className="p-4 font-bold border-b border-[var(--admin-border-strong)] text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border-subtle)] text-[13px] text-[var(--admin-text-primary)]">
              {tasks.map((task) => (
                <tr
                  key={task._id}
                  className="hover:bg-[var(--admin-surface-hover)] transition-colors group"
                >
                  <td className="p-4">
                    {isCount ? (
                      <div>
                        <div className="font-bold">{task.sku}</div>
                        <div className="text-[11px] text-[var(--admin-text-secondary)]">
                          {task.title}
                        </div>
                      </div>
                    ) : (
                      <span className="font-bold text-[var(--admin-accent-text)]">
                        {task.packageId || task._id}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {isCount ? (
                      <span className="font-mono bg-[var(--admin-surface-muted)] px-2 py-0.5 rounded text-[12px] font-bold border border-[var(--admin-border-strong)]">
                        {task.stock} units
                      </span>
                    ) : (
                      <span className="bg-[var(--admin-surface-muted)] px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold border border-[var(--admin-border-strong)]">
                        {task.status?.replace('_', ' ') || 'Pending'}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {isCount ? (
                      <span className="text-[12px] text-[var(--admin-text-secondary)]">
                        Location: Warehouse A
                      </span>
                    ) : (
                      <span className="text-[12px] text-[var(--admin-text-secondary)]">
                        {task.items?.length || 0} items
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleAction(task)}
                      className="admin-btn admin-btn-primary admin-btn-sm text-[12px]"
                    >
                      {isCount ? 'Verify Count' : 'Process'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}
