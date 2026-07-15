import api from '../../services/api';

export const recycleBinApi = {
  /** List recycle bin items with search, filter, sort, pagination */
  getItems: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
    });
    const res = await api.get('/admin/recycle-bin', {
      params: Object.fromEntries(query.entries()),
    });
    return res.data;
  },

  /** Get stats/analytics */
  getStats: async () => {
    const res = await api.get('/admin/recycle-bin/stats');
    return res.data;
  },

  /** Get scheduled purge preview */
  getPurgePreview: async () => {
    const res = await api.get('/admin/recycle-bin/purge-preview');
    return res.data;
  },

  /** Get single item with full entity data */
  getItem: async (id) => {
    const res = await api.get(`/admin/recycle-bin/${id}`);
    return res.data;
  },

  /** Check restore conflicts before restoring */
  checkConflicts: async (id) => {
    const res = await api.get(`/admin/recycle-bin/${id}/conflicts`);
    return res.data;
  },

  /** Restore a single item */
  restoreItem: async (id, options = {}) => {
    const res = await api.patch(`/admin/recycle-bin/${id}/restore`, options);
    return res.data;
  },

  /** Permanently delete a single item */
  permanentDelete: async (id) => {
    const res = await api.delete(`/admin/recycle-bin/${id}/permanent`);
    return res.data;
  },

  /** Bulk restore */
  bulkRestore: async (ids) => {
    const res = await api.post('/admin/recycle-bin/bulk-restore', { ids });
    return res.data;
  },

  /** Bulk permanent delete */
  bulkPermanentDelete: async (ids) => {
    const res = await api.post('/admin/recycle-bin/bulk-delete', { ids });
    return res.data;
  },

  /** Empty entire recycle bin */
  emptyBin: async () => {
    const res = await api.post('/admin/recycle-bin/empty');
    return res.data;
  },

  /** Get audit logs */
  getAuditLogs: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
    });
    const res = await api.get('/admin/recycle-bin/audit-logs', {
      params: Object.fromEntries(query.entries()),
    });
    return res.data;
  },

  /** Export audit logs as CSV */
  exportAuditLogs: async (params = {}) => {
    const query = new URLSearchParams({ format: 'csv', ...params });
    const res = await api.get(`/admin/recycle-bin/audit-logs/export`, {
      params: { format: 'csv', ...params },
      responseType: 'blob',
    });

    const blob = res.data;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recycle-bin-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
