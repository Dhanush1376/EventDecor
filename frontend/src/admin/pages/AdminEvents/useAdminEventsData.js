import { useState, useEffect } from 'react';
import {
  eventService,
  bookingService,
  showcaseService,
  productService,
  userService,
} from '../../../services/domainServices';
import toast from 'react-hot-toast';
import logger from '../../../utils/core/logger';
import { getErrorMessage } from '../../../utils/core/errorHelpers';
import { useConfirm } from '../../../context/ConfirmProvider';

export function useAdminEventsData() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [operationsLoading, setOperationsLoading] = useState(true);

  // Master Portfolio States
  const [events, setEvents] = useState([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);

  // Bookings States
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Showcase state variables
  const [showcases, setShowcases] = useState([]);
  const [loadingShowcases, setLoadingShowcases] = useState(true);
  const confirm = useConfirm();

  const fetchEvents = async () => {
    setLoadingPortfolio(true);
    try {
      const res = await eventService.getAll({ limit: 100 });
      if (res.success) {
        const list = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
        setEvents(list);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load portfolio masteries'));
    } finally {
      setLoadingPortfolio(false);
    }
  };

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const res = await bookingService.adminGetAll();
      if (res.success) {
        const payload = res.data;
        setBookings(Array.isArray(payload) ? payload : payload?.data || []);
      }
    } catch (err) {
      logger.error(err);
      toast.error(getErrorMessage(err, 'Failed to fetch customer event bookings catalog.'));
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchShowcases = async () => {
    setLoadingShowcases(true);
    try {
      const res = await showcaseService.getAll();
      if (res.success) {
        setShowcases(res.data || []);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load side-stage showcase collections.'));
    } finally {
      setLoadingShowcases(false);
    }
  };

  const handleDeleteShowcase = async (id) => {
    if (
      !(await confirm({
        title: 'Withdraw Showcase',
        message: 'Are you sure you want to permanently withdraw this showcase theme?',
        type: 'danger',
      }))
    )
      return;
    try {
      const res = await showcaseService.delete(id);
      if (res.success) {
        toast.success('Collection withdrawn');
        fetchShowcases();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete showcase collection.'));
    }
  };

  const toggleShowcaseFeatured = async (id, currentFeatured) => {
    try {
      const res = await showcaseService.update(id, { featured: !currentFeatured });
      if (res.success) {
        toast.success(`Showcase ${currentFeatured ? 'removed from' : 'marked as'} featured`);
        setShowcases((prev) =>
          prev.map((sc) => ((sc._id || sc.id) === id ? { ...sc, featured: !currentFeatured } : sc)),
        );
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to toggle featured status.'));
    }
  };

  const fetchOperationsData = async () => {
    setOperationsLoading(true);
    try {
      const [teamRes, productsRes] = await Promise.all([
        userService.getTeam(),
        productService.getAll({ limit: 100, sort: 'newest' }),
      ]);

      const teamPayload = teamRes?.data || teamRes;
      const userItems =
        teamPayload?.members || teamPayload?.items || teamPayload?.users || teamPayload?.data || [];
      const staff = (Array.isArray(userItems) ? userItems : [])
        .filter((member) => ['admin', 'manager', 'coordinator'].includes(member.role))
        .map((member) => ({
          name: member.name || member.email,
          role: member.role || 'staff',
          contact: member.phone || member.email || 'Not provided',
        }));

      const productsPayload = productsRes?.data || productsRes;
      let productsList =
        productsPayload?.items || productsPayload?.products || productsPayload?.data || [];
      if (!Array.isArray(productsList) && productsList.data) {
        productsList = productsList.data;
      }
      const inventory = (Array.isArray(productsList) ? productsList : []).map((product) => ({
        item: product.title || product.name,
        stock: Number(product.stock) || 0,
        rented: 0,
        status: Number(product.stock) > 0 ? 'available' : 'out of stock',
      }));

      setTeamMembers(staff);
      setInventoryItems(inventory);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to load live team or inventory data.'));
      setTeamMembers([]);
      setInventoryItems([]);
    } finally {
      setOperationsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvents();
      fetchBookings();
      fetchShowcases();
      fetchOperationsData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleNotification = (e) => {
      const detail = e.detail;
      if ((detail && detail.type === 'booking') || detail?.type === 'payment') {
        fetchBookings();
      }
    };
    window.addEventListener('admin_notification', handleNotification);
    return () => window.removeEventListener('admin_notification', handleNotification);
  }, []);

  return {
    events,
    loadingPortfolio,
    bookings,
    loadingBookings,
    showcases,
    loadingShowcases,
    handleDeleteShowcase,
    teamMembers,
    inventoryItems,
    operationsLoading,
    toggleShowcaseFeatured,
  };
}
