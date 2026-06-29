import { m as motion } from 'framer-motion';
import { PageHeader, StatusBadge, SkeletonTable, fadeUp, stagger } from '../components/AdminUIKit';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { policyService } from '../../services/domainServices';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from '../../utils/core/errorHelpers';

export function AdminPolicies() {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  // Drawer state removed in favor of routing

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

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this policy?')) {
      try {
        await policyService.delete(id);
        fetchPolicies();
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to delete policy'));
      }
    }
  };

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
            onClick={() => navigate(`/admin/policies/edit/${row._id}`)}
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
        subtitle="Manage legal and storefront policies across your platform."
      >
        <button
          onClick={() => navigate('/admin/policies/add')}
          className="admin-btn admin-btn-primary h-9"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Create Policy
        </button>
      </PageHeader>

      <motion.div variants={fadeUp} className="admin-card p-6 overflow-hidden">
        {loading ? (
          <SkeletonTable cols={4} rows={4} className="border-0 shadow-none bg-transparent" />
        ) : policies.length === 0 ? (
          <div className="text-center py-12 text-[var(--admin-text-tertiary)]">
            <span className="material-symbols-outlined text-4xl mb-3 opacity-50">description</span>
            <p className="text-sm">No policies found. Click "Create Policy" to get started.</p>
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
                {policies.map((row) => (
                  <tr key={row._id}>
                    {columns.map((c, i) => (
                      <td key={i}>{c.render ? c.render(row[c.key], row) : row[c.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
