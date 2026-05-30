import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { policyService } from '../../services/domainServices';
import { toast } from 'react-hot-toast';
import {
  PageHeader,
  AdminSkeleton,
  StatusBadge,
  fadeUp,
  stagger
} from '../components/AdminUIKit';
import { AdminPolicyEditor } from './AdminPolicyEditor';

export function AdminPolicies() {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drawer modal states
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeEditId, setActiveEditId] = useState(null);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const data = await policyService.getAll();
      setPolicies(data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch policies');
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
        toast.error(error.response?.data?.message || 'Failed to delete policy');
      }
    }
  };

  const columns = [
    { key: 'title', label: 'Policy Title' },
    { key: 'slug', label: 'Slug / URL' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <StatusBadge status={val} />
      ),
    },
    {
      key: 'updatedAt',
      label: 'Last Updated',
      render: (val) => new Date(val).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-3">
          <button
            onClick={() => {
              setActiveEditId(row._id);
              setShowDrawer(true);
            }}
            className="text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] hover:underline text-xs font-bold tracking-wider cursor-pointer bg-transparent border-none p-0"
          >
            EDIT
          </button>
          <button
            onClick={() => handleDelete(row._id)}
            className="text-[var(--admin-error)] hover:text-red-700 hover:underline text-xs font-bold tracking-wider cursor-pointer bg-transparent border-none p-0"
          >
            DELETE
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
          onClick={() => {
            setActiveEditId(null);
            setShowDrawer(true);
          }}
          className="admin-btn admin-btn-primary h-9"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Create Policy
        </button>
      </PageHeader>

      <motion.div variants={fadeUp} className="admin-card p-6 overflow-hidden">
        {loading ? (
          <div className="space-y-4">
            <AdminSkeleton className="h-12 w-full rounded-[var(--admin-radius-md)]" />
            <AdminSkeleton className="h-12 w-full rounded-[var(--admin-radius-md)]" />
            <AdminSkeleton className="h-12 w-full rounded-[var(--admin-radius-md)]" />
          </div>
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
                  {columns.map((c, i) => <th key={i}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {policies.map(row => (
                  <tr key={row._id}>
                    {columns.map((c, i) => (
                      <td key={i}>
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

      {/* Slide-Up Bottom Drawer Sheet */}
      <AdminPolicyEditor
        isOpen={showDrawer}
        editId={activeEditId}
        onClose={() => {
          setShowDrawer(false);
          fetchPolicies();
        }}
      />
    </motion.div>
  );
}
