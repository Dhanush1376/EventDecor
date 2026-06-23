import { useState, useMemo } from 'react';

/**
 * A generic hook for handling table filters, search, and pagination in admin tables.
 */
export function useAdminTableFilters(data, searchQuery = '', searchFields = []) {
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredData = useMemo(() => {
    let list = data || [];

    // Filter by status
    if (statusFilter !== 'All') {
      list = list.filter((item) => item.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery && searchFields.length > 0) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) => {
        return searchFields.some((field) => {
          const val = item[field];
          if (val && typeof val === 'string') {
            return val.toLowerCase().includes(q);
          }
          if (val && typeof val === 'number') {
            return String(val).toLowerCase().includes(q);
          }
          return false;
        });
      });
    }

    return list;
  }, [data, statusFilter, searchQuery, searchFields]);

  return {
    statusFilter,
    setStatusFilter,
    filteredData,
  };
}
