import { m as motion } from 'framer-motion';
import { PageHeader, StatusBadge, SkeletonTable, fadeUp, stagger } from '../components/AdminUIKit';
import { useConfirm } from '../../context/ConfirmProvider';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { policyService } from '../../services/domainServices';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from '../../utils/core/errorHelpers';
import { PolicyModalDrawer } from '../components/policies/PolicyModalDrawer';

export function AdminPolicies() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeEditId } = useParams();

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const confirm = useConfirm();

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const data = await policyService.getAll();
      setPolicies(data.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to fetch policies'));
    } finally {
      setLoading(false);
    }
  };

  // Sync route / query parameters to open drawer or modal without leaving page
  useEffect(() => {
    const isAdd =
      location.pathname.endsWith('/add') ||
      location.search.includes('action=add') ||
      location.search.includes('add=true');

    if (isAdd) {
      setEditingPolicy(null);
      setIsPolicyModalOpen(true);
    } else if (routeEditId) {
      const pol = policies.find((p) => p._id === routeEditId);
      if (pol) {
        setEditingPolicy(pol);
        setIsPolicyModalOpen(true);
      }
    }
  }, [location.pathname, location.search, routeEditId, policies]);

  const handleOpenAdd = () => {
    setEditingPolicy(null);
    setIsPolicyModalOpen(true);
  };

  const handleOpenEdit = (pol) => {
    setEditingPolicy(pol);
    setIsPolicyModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsPolicyModalOpen(false);
    setEditingPolicy(null);
    if (
      location.pathname.includes('/policies/add') ||
      location.pathname.includes('/policies/edit/') ||
      location.search.includes('action=add') ||
      location.search.includes('add=true')
    ) {
      navigate('/admin/policies', { replace: true });
    }
  };

  const handleDelete = async (id) => {
    if (
      await confirm({
        title: 'Delete Policy',
        message: 'Are you sure you want to delete this policy?',
        type: 'danger',
      })
    ) {
      try {
        await policyService.delete(id);
        fetchPolicies();
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to delete policy'));
      }
    }
  };

  const filteredPolicies = policies.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (p.title && p.title.toLowerCase().includes(q)) || (p.slug && p.slug.toLowerCase().includes(q))
    );
  });

  const activeCount = policies.filter(
    (p) => p.status === 'published' || p.status === 'active' || p.isActive,
  ).length;

  const columns = [
    { key: 'title', label: 'Policy Title' },
    { key: 'slug', label: 'Slug / URL' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'updatedAt',
      label: 'Last Updated',
      render: (val) =>
        new Date(val).toLocaleString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-3">
          <button
            onClick={() => handleOpenEdit(row)}
            className="text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] transition-colors cursor-pointer bg-transparent border-none p-1 rounded hover:bg-[var(--admin-accent)]/10 flex items-center justify-center"
            title="Edit Policy"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button
            onClick={() => handleDelete(row._id)}
            className="text-[var(--admin-error)] hover:text-red-700 transition-colors cursor-pointer bg-transparent border-none p-1 rounded hover:bg-[var(--admin-error)]/10 flex items-center justify-center"
            title="Delete Policy"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Policy Management"
        subtitle={
          loading ? (
            <span>Loading policies...</span>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
              <span className="font-semibold text-[var(--admin-text-primary)]">
                {policies.length} Total Policies
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {activeCount} Active
              </span>
            </div>
          )
        }
      />

      {/* Sticky 42px Search Toolbar matching other admin pages */}
      <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md">
        <motion.div variants={fadeUp} className="flex flex-row items-center gap-2 w-full">
          <div className="relative flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-2.5 sm:px-3 h-[42px] min-h-[42px] max-h-[42px]">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search policies by title or slug..."
              className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full min-w-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer p-1 flex items-center justify-center shrink-0"
                title="Clear search"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Create Policy Button inside searchbar row */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="h-[42px] min-h-[42px] max-h-[42px] px-3 sm:px-3.5 bg-[var(--admin-accent)] hover:opacity-95 text-white rounded-[4px] flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs shrink-0 gap-1.5 font-semibold text-[13px]"
            title="Create Policy"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="hidden sm:inline">Create Policy</span>
            <span className="sm:hidden">Create</span>
          </button>
        </motion.div>
      </div>

      <motion.div variants={fadeUp} className="admin-card p-6 overflow-hidden">
        {loading ? (
          <SkeletonTable cols={4} rows={4} className="border-0 shadow-none bg-transparent" />
        ) : filteredPolicies.length === 0 ? (
          <div className="text-center py-12 text-[var(--admin-text-tertiary)]">
            <span className="material-symbols-outlined text-4xl mb-3 opacity-50">description</span>
            <p className="text-sm">
              {searchQuery
                ? 'No policies matched your search.'
                : 'No policies found. Click "Create Policy" to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full min-w-[600px]">
              <thead>
                <tr>
                  {columns.map((c, i) => (
                    <th key={i}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPolicies.map((row) => (
                  <tr
                    key={row._id}
                    className="cursor-pointer hover:bg-[var(--admin-surface-hover)]"
                    onClick={() => handleOpenEdit(row)}
                  >
                    {columns.map((c, i) => (
                      <td key={i} onClick={(e) => c.key === 'actions' && e.stopPropagation()}>
                        {c.render ? c.render(row[c.key], row) : row[c.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* In-place Drawer on Mobile / Pop-up Dialog on Desktop */}
      <PolicyModalDrawer
        isOpen={isPolicyModalOpen}
        onClose={handleCloseModal}
        policy={editingPolicy}
        onSuccess={fetchPolicies}
      />
    </motion.div>
  );
}
