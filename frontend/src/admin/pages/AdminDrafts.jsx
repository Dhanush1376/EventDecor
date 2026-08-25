import { m as motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getAllDrafts, deleteDraft, deleteAllDrafts, formatBytes } from '../services/draftService';
import { useDraftContext } from '../context/DraftProvider';
import { useConfirm } from '../../context/ConfirmProvider';
import { FilterBar } from '../components/AdminUIKit';

export function AdminDrafts() {
  const navigate = useNavigate();
  const { refreshStats, isCleaning } = useDraftContext();
  const confirm = useConfirm();

  const [drafts, setDrafts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('All');

  // Load drafts
  const loadDrafts = async () => {
    setIsLoading(true);
    try {
      const data = await getAllDrafts();
      setDrafts(data);
    } catch (error) {
      import('../../utils/core/logger').then(({ default: logger }) => {
        logger.error('Failed to load drafts:', error);
      });
      toast.error('Failed to load drafts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isCleaning) {
      loadDrafts();
    }
  }, [isCleaning]);

  // Derived state
  const modules = useMemo(() => {
    const mods = new Set(drafts.map((d) => d.module).filter(Boolean));
    return ['All', ...Array.from(mods).sort()];
  }, [drafts]);

  const filteredDrafts = useMemo(() => {
    return drafts.filter((draft) => {
      const matchesSearch =
        draft.pageTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        draft.module?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesModule = selectedModule === 'All' || draft.module === selectedModule;
      return matchesSearch && matchesModule;
    });
  }, [drafts, searchQuery, selectedModule]);

  const totalSize = useMemo(() => {
    const bytes = new Blob([JSON.stringify(drafts)]).size;
    return formatBytes(bytes);
  }, [drafts]);

  // Actions
  const handleDelete = async (key) => {
    if (
      await confirm({
        title: 'Delete Draft',
        message: 'Are you sure you want to delete this draft? This cannot be undone.',
        type: 'danger',
      })
    ) {
      await deleteDraft(key);
      await loadDrafts();
      refreshStats();
    }
  };

  const handleClearAll = async () => {
    if (
      await confirm({
        title: 'Delete All Drafts',
        message:
          'Are you sure you want to delete ALL drafts? This will remove all unsaved work across the admin portal.',
        type: 'danger',
      })
    ) {
      await deleteAllDrafts();
      await loadDrafts();
      refreshStats();
    }
  };

  const getModuleColor = (moduleName) => {
    const colors = {
      Products: 'text-purple-600 bg-purple-50 border-purple-200',
      Events: 'text-blue-600 bg-blue-50 border-blue-200',
      Categories: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      Coupons: 'text-amber-600 bg-amber-50 border-amber-200',
      Gallery: 'text-rose-600 bg-rose-50 border-rose-200',
      Settings: 'text-slate-600 bg-slate-50 border-slate-200',
    };
    return colors[moduleName] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="admin-section-root">
      <Helmet>
        <title>Drafts & Auto-Saves | Admin</title>
      </Helmet>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[20px] sm:text-[24px] font-bold text-[var(--admin-text-primary)] font-display tracking-tight leading-none whitespace-nowrap">
            Drafts Manager
          </h1>
          {drafts.length > 0 && (
            <button
              onClick={handleClearAll}
              className="admin-btn h-8 px-3 sm:ml-2 flex items-center gap-1.5 rounded-[var(--admin-radius-md)] bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors font-bold text-[12px] shadow-sm shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              <span className="whitespace-nowrap">Clear All</span>
            </button>
          )}
        </div>

        <div className="flex items-center shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider leading-none mb-1">
              Local Storage
            </p>
            <p className="text-[12px] font-bold text-[var(--admin-text-secondary)] leading-none">
              {totalSize} used
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full">
          <div className="relative flex-1 sm:w-64 shrink-0 bg-[var(--admin-surface-muted)] rounded-md border border-[var(--admin-border)] flex items-center px-3">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              placeholder="Search drafts by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-10 sm:h-8"
            />
          </div>

          <div className="flex items-stretch gap-2 w-full sm:w-auto overflow-hidden">
            <FilterBar
              filters={modules}
              value={selectedModule}
              onChange={setSelectedModule}
              className="flex-1 min-w-0"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="admin-card overflow-hidden min-h-[400px]">
        {isLoading || isCleaning ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <span className="material-symbols-outlined animate-spin text-3xl mb-3">refresh</span>
            <p className="text-sm font-medium">
              {isCleaning ? 'Cleaning expired drafts...' : 'Loading drafts...'}
            </p>
          </div>
        ) : filteredDrafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-center px-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
              <span className="material-symbols-outlined text-4xl text-gray-300">note_stack</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No drafts found</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              {searchQuery || selectedModule !== 'All'
                ? 'Try adjusting your search or filters to find what you are looking for.'
                : 'Any form you start filling out will be automatically saved here as a draft.'}
            </p>
            {(searchQuery || selectedModule !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedModule('All');
                }}
                className="admin-btn admin-btn-outline mt-4"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="admin-table-wrapper border-0 rounded-none">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Draft Title</th>
                  <th>Module</th>
                  <th>Last Auto-Saved</th>
                  <th className="w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredDrafts.map((draft) => (
                    <motion.tr
                      key={draft.key}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      layout
                      className="group cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(draft.pagePath)}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[18px] text-gray-500">
                              edit_document
                            </span>
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-gray-900 group-hover:text-[var(--admin-accent)] transition-colors">
                              {draft.pageTitle || 'Untitled Draft'}
                            </p>
                            <p
                              className="text-[11px] text-gray-500 font-mono mt-0.5 max-w-[200px] sm:max-w-xs truncate"
                              title={draft.key}
                            >
                              {draft.pagePath}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getModuleColor(draft.module)}`}
                        >
                          {draft.module || 'Unknown'}
                        </span>
                      </td>
                      <td>
                        <div className="text-[12px] text-gray-600">
                          {new Intl.DateTimeFormat('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }).format(new Date(draft.updatedAt))}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          ~{formatBytes(new Blob([JSON.stringify(draft.formData)]).size)}
                        </div>
                      </td>
                      <td className="text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => navigate(draft.pagePath)}
                            className="admin-btn-icon text-gray-400 hover:text-[var(--admin-accent)] hover:bg-slate-50"
                            title="Continue Editing"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(draft.key)}
                            className="admin-btn-icon text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete Draft"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
