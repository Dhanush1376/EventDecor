import { useState, useCallback } from 'react';
import returnService from '../../services/api/returnService';
import { useAdmin } from '../context/AdminContext';

/**
 * Hook for managing return logic in the Admin Panel
 */
export const useReturnManagement = () => {
  const { showSnackbar } = useAdmin();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [dashboardStats, setDashboardStats] = useState(null);
  const [returnsList, setReturnsList] = useState([]);
  const [exchangesList, setExchangesList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  const [refundStats, setRefundStats] = useState(null);
  const [pickupList, setPickupList] = useState(null);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [highRiskCustomers, setHighRiskCustomers] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [returnSettings, setReturnSettings] = useState(null);

  const [currentReturn, setCurrentReturn] = useState(null);

  const handleError = (err) => {
    const msg = err.response?.data?.message || err.message || 'An error occurred';
    setError(msg);
    showSnackbar(msg, 'error');
    setLoading(false);
    throw err;
  };

  const fetchDashboardStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await returnService.getDashboardStats();
      setDashboardStats(response.data.data);
      setLoading(false);
      return response.data.data;
    } catch (err) {
      handleError(err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSnackbar]);

  const fetchReturnsList = useCallback(
    async (params = {}) => {
      setLoading(true);
      try {
        const response = await returnService.getAllReturns({ page: 1, limit: 20, ...params });
        setReturnsList(response.data.data);
        setPagination(response.data.pagination);
        setLoading(false);
        return response.data;
      } catch (err) {
        handleError(err);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showSnackbar],
  );

  const fetchExchangesList = useCallback(
    async (params = {}) => {
      setLoading(true);
      try {
        const response = await returnService.getAllExchanges({ page: 1, limit: 20, ...params });
        setExchangesList(response.data.data);
        setPagination(response.data.pagination);
        setLoading(false);
        return response.data;
      } catch (err) {
        handleError(err);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showSnackbar],
  );

  const fetchReturnDetails = useCallback(
    async (id) => {
      setLoading(true);
      try {
        const response = await returnService.getReturnDetails(id);
        setCurrentReturn(response.data.data);
        setLoading(false);
        return response.data.data;
      } catch (err) {
        handleError(err);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showSnackbar],
  );

  const approveReturn = async (id) => {
    setLoading(true);
    try {
      await returnService.approveReturn(id);
      showSnackbar('Return request approved successfully', 'success');
      // Refresh current details if looking at one
      if (currentReturn && currentReturn.request._id === id) {
        await fetchReturnDetails(id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      handleError(err);
    }
  };

  const rejectReturn = async (id, data) => {
    setLoading(true);
    try {
      await returnService.rejectReturn(id, data);
      showSnackbar('Return request rejected', 'success');
      if (currentReturn && currentReturn.request._id === id) {
        await fetchReturnDetails(id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      handleError(err);
    }
  };

  const transitionStatus = async (id, data) => {
    setLoading(true);
    try {
      await returnService.transitionStatus(id, data);
      showSnackbar('Status updated successfully', 'success');
      if (currentReturn && currentReturn.request._id === id) {
        await fetchReturnDetails(id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      handleError(err);
    }
  };

  const triggerRefund = async (id) => {
    setLoading(true);
    try {
      await returnService.triggerRefund(id);
      showSnackbar('Refund triggered successfully', 'success');
      if (currentReturn && currentReturn.request._id === id) {
        await fetchReturnDetails(id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      handleError(err);
    }
  };

  const addInternalNote = async (id, noteData) => {
    setLoading(true);
    try {
      await returnService.addInternalNote(id, noteData);
      showSnackbar('Internal note added', 'success');
      if (currentReturn && currentReturn.request._id === id) {
        await fetchReturnDetails(id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      handleError(err);
    }
  };

  const schedulePickup = async (id, data) => {
    setLoading(true);
    try {
      await returnService.schedulePickup(id, data);
      showSnackbar('Pickup scheduled successfully', 'success');
      if (currentReturn && currentReturn.request._id === id) {
        await fetchReturnDetails(id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      handleError(err);
    }
  };

  const completeReturn = async (id) => {
    setLoading(true);
    try {
      await returnService.completeReturn(id);
      showSnackbar('Return completed successfully', 'success');
      if (currentReturn && currentReturn.request._id === id) {
        await fetchReturnDetails(id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      handleError(err);
    }
  };

  const getOrderReturnSummary = async (orderId) => {
    setLoading(true);
    try {
      const response = await returnService.getOrderReturnSummary(orderId);
      setLoading(false);
      return response.data.data;
    } catch (err) {
      handleError(err);
      return null;
    }
  };

  const performBulkAction = async (action, ids, data = {}) => {
    setLoading(true);
    try {
      const response = await returnService.bulkAction({ action, ids, data });
      showSnackbar(response.data.message, 'success');
      await fetchReturnsList(); // Refresh list
    } catch (err) {
      handleError(err);
    }
  };

  const fetchRefundStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await returnService.getRefundStats();
      setRefundStats(response.data.data);
      setLoading(false);
      return response.data.data;
    } catch (err) {
      handleError(err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSnackbar]);

  const fetchPickupList = useCallback(
    async (params = {}) => {
      setLoading(true);
      try {
        const response = await returnService.getPickupList(params);
        setPickupList(response.data.data);
        setLoading(false);
        return response.data.data;
      } catch (err) {
        handleError(err);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showSnackbar],
  );

  const fetchFraudAlerts = useCallback(
    async (params = {}) => {
      setLoading(true);
      try {
        const response = await returnService.getFraudAlerts(params);
        setFraudAlerts(response.data.data);
        setLoading(false);
        return response.data.data;
      } catch (err) {
        handleError(err);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showSnackbar],
  );

  const fetchHighRiskCustomers = useCallback(
    async (params = {}) => {
      setLoading(true);
      try {
        const response = await returnService.getHighRiskCustomers(params);
        setHighRiskCustomers(response.data.data);
        setLoading(false);
        return response.data.data;
      } catch (err) {
        handleError(err);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showSnackbar],
  );

  const fetchAnalytics = useCallback(
    async (params = {}) => {
      setLoading(true);
      try {
        const response = await returnService.getAnalytics(params);
        setAnalyticsData(response.data.data);
        setLoading(false);
        return response.data.data;
      } catch (err) {
        handleError(err);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showSnackbar],
  );

  const [enterpriseAnalytics, setEnterpriseAnalytics] = useState(null);

  const fetchEnterpriseAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await returnService.getEnterpriseAnalytics();
      setEnterpriseAnalytics(response.data.data);
      setLoading(false);
      return response.data.data;
    } catch (err) {
      handleError(err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSnackbar]);

  const fetchReturnSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await returnService.getReturnSettings();
      setReturnSettings(response.data.data);
      setLoading(false);
      return response.data.data;
    } catch (err) {
      handleError(err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSnackbar]);

  const saveReturnSettings = async (data) => {
    setLoading(true);
    try {
      const response = await returnService.updateReturnSettings(data);
      setReturnSettings(response.data.data);
      showSnackbar('Settings updated successfully', 'success');
      setLoading(false);
      return response.data.data;
    } catch (err) {
      handleError(err);
    }
  };

  return {
    loading,
    error,
    dashboardStats,
    returnsList,
    exchangesList,
    pagination,
    currentReturn,
    refundStats,
    pickupList,
    fraudAlerts,
    highRiskCustomers,
    analyticsData,
    enterpriseAnalytics,
    returnSettings,
    fetchDashboardStats,
    fetchReturnsList,
    fetchExchangesList,
    fetchReturnDetails,
    approveReturn,
    rejectReturn,
    transitionStatus,
    triggerRefund,
    addInternalNote,
    performBulkAction,
    fetchRefundStats,
    fetchPickupList,
    fetchFraudAlerts,
    fetchHighRiskCustomers,
    fetchAnalytics,
    fetchEnterpriseAnalytics,
    fetchReturnSettings,
    saveReturnSettings,
    schedulePickup,
    completeReturn,
    getOrderReturnSummary,
  };
};

export default useReturnManagement;
