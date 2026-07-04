import React, { useState, useEffect, useCallback } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader, fadeUp, stagger } from '../components/AdminUIKit';
import api from '../../services/api';
import toast from 'react-hot-toast';

const INITIAL_STAGES = [
  {
    id: 'pending_material',
    name: 'Sourcing Materials',
    icon: 'category',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    tasks: [],
  },
  {
    id: 'assembly',
    name: 'Assembly',
    icon: 'handyman',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    tasks: [],
  },
  {
    id: 'quality_check',
    name: 'Quality Assurance',
    icon: 'fact_check',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    tasks: [],
  },
  {
    id: 'ready_for_warehouse',
    name: 'Ready for Dispatch',
    icon: 'inventory_2',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    tasks: [],
  },
];

export default function AdminProductionHub() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine initial tab based on URL path
  const getInitialTab = () => {
    const path = location.pathname;
    if (path.includes('/qa')) return 'qa';
    if (path.includes('/ready')) return 'ready';
    return 'kanban'; // Default
  };

  const activeTab = getInitialTab();

  const handleTabChange = (tabId) => {
    const basePath = '/admin/production';
    const newPath = tabId === 'kanban' ? basePath : `${basePath}/${tabId}`;
    navigate(newPath);
  };

  const tabs = [
    { id: 'kanban', label: 'Production', icon: 'precision_manufacturing' },
    { id: 'qa', label: 'Quality Check', icon: 'fact_check' },
    { id: 'ready', label: 'Ready for Packing', icon: 'box' },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="flex flex-col flex-1 space-y-6 h-[calc(100vh-80px)]"
    >
      <div>
        <PageHeader
          title="Production Hub"
          subtitle="Track manufacturing stages, manage QA, and hand off finalized products."
          icon="precision_manufacturing"
        />

        {/* Smart Filter Tabs */}
        <div className="flex border-b border-[var(--admin-border-subtle)] overflow-x-auto no-scrollbar mt-4">
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
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col"
          >
            {activeTab === 'kanban' && <KanbanView />}
            {activeTab === 'qa' && (
              <StageView
                stageId="quality_check"
                title="Quality Check"
                icon="fact_check"
                desc="Review artisan work and approve items for packing."
                color="text-purple-500"
                bg="bg-purple-500/10"
              />
            )}
            {activeTab === 'ready' && (
              <StageView
                stageId="ready_for_warehouse"
                title="Ready for Packing"
                icon="box"
                desc="Hand off finalized and QA-approved items to the warehouse."
                color="text-amber-500"
                bg="bg-amber-500/10"
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Sub-components

function KanbanView() {
  const [stages, setStages] = useState(INITIAL_STAGES);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/production/orders/active');
      if (res.data?.success) {
        const orders = res.data.data || [];
        const newStages = JSON.parse(JSON.stringify(INITIAL_STAGES));

        orders.forEach((order) => {
          order.items?.forEach((item) => {
            const stageIndex = newStages.findIndex((s) => s.id === item.currentStage);
            if (stageIndex !== -1) {
              const taskProgress =
                item.currentStage === 'pending_material'
                  ? 10
                  : item.currentStage === 'assembly'
                    ? 50
                    : item.currentStage === 'quality_check'
                      ? 90
                      : 100;

              newStages[stageIndex].tasks.push({
                productionOrderId: order.productionOrderId,
                sku: item.sku,
                currentStage: item.currentStage,
                item: item.productId?.title || 'Unknown Item',
                artisan: order.assignedWorkers?.[0]?.name || 'Unassigned',
                due: order.estimatedCompletionDate
                  ? new Date(order.estimatedCompletionDate).toLocaleDateString()
                  : 'N/A',
                progress: taskProgress,
              });
            }
          });
        });

        setStages(newStages);
      }
    } catch (err) {
      console.error('Failed to fetch production tasks:', err);
      setLoading(false);
    }
  };

  const handleTransition = async (productionOrderId, sku, currentStageId) => {
    const stageIndex = INITIAL_STAGES.findIndex((s) => s.id === currentStageId);
    if (stageIndex === -1 || stageIndex === INITIAL_STAGES.length - 1) return;
    const nextStageId = INITIAL_STAGES[stageIndex + 1].id;

    try {
      setLoading(true);
      const res = await api.post('/api/v1/production/transitions', {
        productionOrderId,
        sku,
        nextStage: nextStageId,
      });
      if (res.data?.success) {
        toast.success(`Moved task to next stage`);
        fetchOrders();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to transition task');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="flex-1 flex overflow-x-auto gap-6 pb-4 snap-x relative pt-2">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--admin-bg)]/50 backdrop-blur-sm rounded-xl">
          <span className="w-8 h-8 border-4 border-[var(--admin-accent)] border-t-transparent rounded-full animate-spin"></span>
        </div>
      )}
      {stages.map((stage, idx) => (
        <motion.div
          variants={fadeUp}
          key={idx}
          className="min-w-[340px] w-[340px] flex flex-col admin-card p-0 shrink-0 snap-start bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-strong)]"
        >
          <div
            className={`p-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between ${stage.bg}`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`material-symbols-outlined ${stage.color} p-1.5 rounded-lg bg-white/50 dark:bg-black/20 shadow-sm text-[18px]`}
              >
                {stage.icon}
              </span>
              <h3 className="font-bold text-[var(--admin-text-primary)] tracking-tight text-[15px]">
                {stage.name}
              </h3>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/80 dark:bg-black/40 ${stage.color} shadow-sm border ${stage.border}`}
            >
              {stage.tasks.length}
            </span>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
            {stage.tasks.map((task, tIdx) => (
              <motion.div
                whileHover={{ scale: 1.02 }}
                key={tIdx}
                className={`p-4 rounded-xl bg-[var(--admin-surface)] border border-[var(--admin-border-strong)] shadow-sm hover:shadow-md transition-all relative overflow-hidden group cursor-grab active:cursor-grabbing`}
              >
                <div
                  className={`absolute top-0 left-0 w-1.5 h-full ${stage.bg.replace('/10', '')}`}
                ></div>

                <div className="flex justify-between items-start mb-3 pl-2">
                  <span className="text-[11px] font-mono font-bold text-[var(--admin-accent-text)] bg-[var(--admin-accent)]/10 px-2 py-0.5 rounded-md border border-[var(--admin-accent)]/20">
                    {task.productionOrderId}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${task.due === 'Overdue' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border border-[var(--admin-border)] shadow-sm'}`}
                  >
                    {task.due}
                  </span>
                </div>

                <h4 className="font-bold text-[var(--admin-text-primary)] text-[14px] mb-4 pl-2 leading-snug">
                  {task.item}
                </h4>

                {/* Progress Bar */}
                <div className="pl-2 mb-4">
                  <div className="flex justify-between text-[10px] text-[var(--admin-text-tertiary)] mb-1.5 font-bold uppercase tracking-wider">
                    <span>Progress</span>
                    <span>{task.progress}%</span>
                  </div>
                  <div className="w-full bg-[var(--admin-bg-subtle)] rounded-full h-1.5 overflow-hidden shadow-inner">
                    <div
                      className={`h-1.5 rounded-full ${stage.color.split(' ')[0].replace('text-', 'bg-')} transition-all duration-500`}
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex justify-between items-center pl-2 border-t border-[var(--admin-border-subtle)] pt-3 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--admin-surface-muted)] to-[var(--admin-border-subtle)] flex items-center justify-center text-[var(--admin-text-primary)] text-[10px] font-black shadow-sm border border-[var(--admin-border)]">
                      {task.artisan.charAt(0)}
                    </div>
                    <span className="text-[12px] font-bold text-[var(--admin-text-secondary)]">
                      {task.artisan}
                    </span>
                  </div>
                  {idx < stages.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTransition(task.productionOrderId, task.sku, task.currentStage);
                      }}
                      className="text-[var(--admin-accent)] hover:text-white transition-colors opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--admin-accent)] flex items-center shadow-sm"
                      title="Move to Next Stage"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  )}
                </div>
              </motion.div>
            ))}

            {stage.tasks.length === 0 && (
              <div className="h-28 flex flex-col items-center justify-center text-[var(--admin-text-tertiary)] text-sm border-2 border-dashed border-[var(--admin-border-subtle)] rounded-xl bg-[var(--admin-surface)]/50">
                <span className="material-symbols-outlined text-3xl mb-2 opacity-50">inbox</span>
                <span className="font-medium text-[13px]">No active tasks</span>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface)]/50">
            <button className="admin-btn admin-btn-outline w-full py-2 bg-[var(--admin-surface)] shadow-sm text-[13px]">
              <span className="material-symbols-outlined text-[18px]">add</span> Add Task
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function StageView({ stageId, title, icon, desc, color, bg }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStageOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/production/orders/active');
      if (res.data?.success) {
        const orders = res.data.data || [];
        const stageTasks = [];

        orders.forEach((order) => {
          order.items?.forEach((item) => {
            if (item.currentStage === stageId) {
              stageTasks.push({
                productionOrderId: order.productionOrderId,
                _id: order._id,
                sku: item.sku,
                currentStage: item.currentStage,
                item: item.productId?.title || 'Unknown Item',
                artisan: order.assignedWorkers?.[0]?.name || 'Unassigned',
                due: order.estimatedCompletionDate
                  ? new Date(order.estimatedCompletionDate).toLocaleDateString()
                  : 'N/A',
              });
            }
          });
        });

        setTasks(stageTasks);
      }
    } catch (err) {
      console.error('Failed to fetch stage tasks:', err);
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [stageId]);

  const handleAction = async (taskId, sku) => {
    try {
      setLoading(true);
      // For simplicity, find the next stage in INITIAL_STAGES
      const stageIndex = INITIAL_STAGES.findIndex((s) => s.id === stageId);
      const nextStageId =
        stageIndex < INITIAL_STAGES.length - 1
          ? INITIAL_STAGES[stageIndex + 1].id
          : 'handover_complete';

      const res = await api.post('/api/v1/production/transitions', {
        productionOrderId: taskId,
        sku,
        nextStage: nextStageId,
      });
      if (res.data?.success) {
        toast.success(`Successfully processed item`);
        fetchStageOrders();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to process item');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStageOrders();
  }, [stageId, fetchStageOrders]);

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center gap-4 mb-8">
        <div
          className={`w-14 h-14 rounded-[var(--admin-radius-lg)] ${bg} ${color} flex items-center justify-center shadow-inner`}
        >
          <span className="material-symbols-outlined text-[28px]">{icon}</span>
        </div>
        <div>
          <h2 className="text-[20px] font-bold text-[var(--admin-text-primary)] tracking-tight">
            {title}
          </h2>
          <p className="text-[var(--admin-text-secondary)] text-sm">{desc}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <span className="w-8 h-8 border-4 border-[var(--admin-accent)] border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="admin-card p-12 flex flex-col items-center justify-center text-center flex-1">
          <span className="material-symbols-outlined text-5xl text-[var(--admin-text-tertiary)] mb-4">
            task
          </span>
          <h3 className="text-xl font-bold text-[var(--admin-text-primary)]">No tasks available</h3>
          <p className="text-[var(--admin-text-secondary)]">
            There are currently no items pending in this stage.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task, idx) => (
            <div
              key={idx}
              className="admin-card p-5 border border-[var(--admin-border-strong)] hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-[var(--admin-text-primary)]">{task.item}</h4>
                  <p className="text-xs text-[var(--admin-text-secondary)] font-mono">{task.sku}</p>
                </div>
                <span className="text-[10px] font-bold bg-[var(--admin-bg-subtle)] px-2 py-1 rounded text-[var(--admin-text-secondary)] border border-[var(--admin-border-strong)]">
                  {task.productionOrderId}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-[16px] text-[var(--admin-text-tertiary)]">
                  person
                </span>
                <span className="text-[13px] text-[var(--admin-text-secondary)] font-medium">
                  {task.artisan}
                </span>
              </div>
              <button
                onClick={() => handleAction(task.productionOrderId, task.sku)}
                className="admin-btn admin-btn-primary w-full"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Complete & Move Forward
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
