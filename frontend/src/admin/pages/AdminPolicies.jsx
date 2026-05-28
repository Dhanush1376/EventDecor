import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { policyService } from '../../services/domainServices';
import { Skeleton } from '../../components/ui';

export function AdminPolicies() {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const data = await policyService.getAll();
      setPolicies(data.data || []);
    } catch (error) {
      console.error('Failed to fetch policies', error);
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
        console.error('Failed to delete policy', error);
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
        <span className={`px-2 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full ${val === 'published' ? 'bg-[#f6f2e8] text-[#c29b38]' : 'bg-gray-100 text-gray-500'}`}>
          {val}
        </span>
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
            onClick={() => navigate(`/admin/policies/${row._id}`)}
            className="text-[#c29b38] hover:underline text-sm font-bold tracking-wider"
          >
            EDIT
          </button>
          <button
            onClick={() => handleDelete(row._id)}
            className="text-red-500 hover:underline text-sm font-bold tracking-wider"
          >
            DELETE
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-body font-semibold text-[#1a1c1a] tracking-tight">
            Policy Management
          </h1>
          <p className="text-sm text-[#685c57] mt-1">
            Manage legal and storefront policies across your platform.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/policies/new')}
          className="bg-[#1a1c1a] text-white px-5 py-2.5 rounded hover:bg-[#2d302d] transition-colors text-sm font-bold tracking-wide uppercase"
        >
          Create Policy
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-hidden">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded" />
            <Skeleton className="h-12 w-full rounded" />
            <Skeleton className="h-12 w-full rounded" />
          </div>
        ) : policies.length === 0 ? (
          <div className="text-center py-12 text-[#685c57]">
            <span className="material-symbols-outlined text-4xl mb-3 opacity-50">description</span>
            <p className="text-sm">No policies found. Click "Create Policy" to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--admin-border-subtle)] text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                  {columns.map((c, i) => <th key={i} className="pb-3">{c.label}</th>)}
                </tr>
              </thead>
              <tbody className="text-[13px] text-[var(--admin-text-primary)]">
                {policies.map(row => (
                  <tr key={row._id} className="border-b border-[var(--admin-border-subtle)] last:border-b-0">
                    {columns.map((c, i) => (
                      <td key={i} className="py-4 pr-4">
                        {c.render ? c.render(row[c.key], row) : row[c.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
