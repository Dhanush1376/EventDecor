import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import {
  eventService,
  bookingService,
  showcaseService,
  productService,
  userService,
} from '../../services/domainServices';
import toast from 'react-hot-toast';
import logger from '../../utils/logger';
import { getErrorMessage } from '../../utils/errorHelpers';
import { formatCurrency, fadeUp, stagger } from '../components/AdminUIKit';

const EVENT_CATEGORIES = [
  'Wedding Ceremony',
  'Engagement Ceremony',
  'House Warming Ceremony',
  'Baby Shower Ceremony',
  'Naming Ceremony',
  'Festival Decorations',
];

const DECOR_STYLES = ['Traditional', 'Floral', 'Modern', 'Royal', 'Minimalist', 'Rustic'];

export function AdminEvents() {
  const navigate = useNavigate();
  const {
    refreshEvents,
    searchQuery,
    customCategories,
    addCustomCategory,
    updateCustomCategory,
    deleteCustomCategory,
  } = useAdmin();
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, bookings, calendar, packages, inventory, team
  const [teamMembers, setTeamMembers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [operationsLoading, setOperationsLoading] = useState(true);

  // Category Modal States
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', description: '', image: '' });
  const [editingCatId, setEditingCatId] = useState(null);

  const handleSaveCat = (e) => {
    e.preventDefault();
    if (!catForm.name) return;
    if (editingCatId) {
      updateCustomCategory('events', editingCatId, catForm);
    } else {
      addCustomCategory('events', catForm);
    }
    setCatForm({ name: '', description: '', image: '' });
    setEditingCatId(null);
  };

  const handleEditCat = (cat) => {
    setEditingCatId(cat.id);
    setCatForm({ name: cat.name, description: cat.description || '', image: cat.image || '' });
  };

  // Master Portfolio States
  const [events, setEvents] = useState([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);

  // Bookings States
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  // Replaced drawer Operations State with standalone AdminBookingDetail route

  // End of form data

  // Showcase state variables
  const [showcases, setShowcases] = useState([]);
  const [loadingShowcases, setLoadingShowcases] = useState(false);

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
    if (!window.confirm('Are you sure you want to permanently withdraw this showcase theme?'))
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
      const productsList =
        productsPayload?.items || productsPayload?.products || productsPayload?.data || [];
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

  // Drawer logic moved to AdminBookingDetail.jsx

  // Replaced handleEdit, handleCancel, handleSubmit with standalone pages

  // Drawer logic handles removed.

  const getCalendarDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) days.push({ day: null, dateStr: null });
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ day: i, dateStr });
    }
    return days;
  };

  const calendarDays = getCalendarDays();
  const currentMonthName = new Date().toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const totalContractVal = bookings.reduce((acc, b) => acc + (b.pricing?.totalPrice || 0), 0);
  const outstandingBal = bookings.reduce((acc, b) => acc + (b.pricing?.pendingBalance || 0), 0);
  const activeBookingsCount = bookings.filter((b) => b.status === 'active').length;
  const upcomingSetupsCount = bookings.filter((b) =>
    ['confirmed', 'team_assigned', 'setup_in_progress'].includes(b.status),
  ).length;

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: 'dashboard' },
    { id: 'bookings', label: 'Bookings', icon: 'assignment' },
    { id: 'showcases', label: 'Showcase', icon: 'redeem' },
    { id: 'inventory', label: 'Inventory', icon: 'inventory' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar_month' },
    { id: 'packages', label: 'Packages', icon: 'celebration' },
    { id: 'team', label: 'Team', icon: 'groups' },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6 pb-20">
      <PageHeader
        title="Events & Bookings Manager"
        subtitle={`${bookings.length} active event bookings recorded`}
        icon="event"
        iconColor="orders"
        headerAction={
          <div className="w-full sm:max-w-md">
            <FilterBar
              filters={tabs.map((t) => t.id)}
              value={activeTab}
              onChange={setActiveTab}
              className="pb-0 border-b border-[var(--admin-border-subtle)]"
            />
          </div>
        }
      >
        <button
          onClick={() => navigate('/admin/showcases/add')}
          className="admin-btn admin-btn-primary h-9"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Showcase
        </button>
      </PageHeader>

      <AnimatePresence mode="wait">
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="space-y-6"
          >
            <div className="admin-grid-stats">
              <StatCard
                icon="account_balance_wallet"
                label="Total Bookings Value"
                value={formatCurrency(totalContractVal)}
                change="Active Bookings"
                changeType="up"
                color="var(--admin-info)"
              />
              <StatCard
                icon="pending_actions"
                label="Pending Payments"
                value={formatCurrency(outstandingBal)}
                change="To Collect"
                changeType="up"
                color="var(--admin-warning)"
              />
              <StatCard
                icon="event_available"
                label="Setups Today"
                value={activeBookingsCount}
                change="Live Events"
                changeType="up"
                color="var(--admin-success)"
              />
              <StatCard
                icon="edit_calendar"
                label="Upcoming Setups"
                value={upcomingSetupsCount}
                change="Scheduled"
                changeType="up"
                color="var(--admin-accent)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartCard title="New Event Inquiries">
                <div className="space-y-3 mt-4">
                  {bookings.slice(0, 4).map((b) => (
                    <div
                      key={b._id || b.id}
                      onClick={() => navigate(`/admin/bookings/${b._id || b.id}`)}
                      className="p-3 bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] flex items-center justify-between hover:border-[var(--admin-border-strong)] cursor-pointer transition-colors"
                    >
                      <div className="space-y-1 min-w-0 flex-1 pr-4">
                        <span className="admin-badge admin-badge-neutral text-[9px] uppercase font-bold">
                          {b.eventType}
                        </span>
                        <h4 className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate">
                          {b.title}
                        </h4>
                        <p className="text-[11px] text-[var(--admin-text-tertiary)] truncate">
                          {b.venue?.address}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[12px] font-bold text-[var(--admin-text-primary)] block">
                          {formatCurrency(b.pricing?.totalPrice)}
                        </span>
                        <StatusBadge status={b.status.replace('_', '')} />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className="w-full mt-4 py-2 text-[12px] font-bold text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] transition-colors text-center"
                >
                  View All Bookings →
                </button>
              </ChartCard>

              <ChartCard title="Occasion Category Distributions">
                <div className="space-y-4 mt-4">
                  {[
                    {
                      label: 'Wedding Ceremony',
                      count: bookings.filter((b) => b.eventType === 'wedding').length,
                      color: 'var(--admin-accent)',
                    },
                    {
                      label: 'Engagement Ceremony',
                      count: bookings.filter((b) => b.eventType === 'engagement').length,
                      color: 'var(--admin-text-primary)',
                    },
                    {
                      label: 'Haldi & Mehndi',
                      count: bookings.filter((b) => b.eventType === 'haldi').length,
                      color: 'var(--admin-warning)',
                    },
                    {
                      label: 'Reception Gala',
                      count: bookings.filter((b) => b.eventType === 'reception').length,
                      color: 'var(--admin-success)',
                    },
                    {
                      label: 'Puja Decor',
                      count: bookings.filter((b) => b.eventType === 'festival').length,
                      color: 'var(--admin-text-secondary)',
                    },
                  ].map((cat, idx) => {
                    const pct = bookings.length > 0 ? (cat.count / bookings.length) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-[var(--admin-text-secondary)]">{cat.label}</span>
                          <span className="text-[var(--admin-text-primary)]">
                            {cat.count} Setups ({Math.round(pct)}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-[var(--admin-surface-muted)] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>
            </div>
          </motion.div>
        )}
        {/* BOOKINGS */}
        {activeTab === 'bookings' && (
          <motion.div
            key="bookings"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="admin-card overflow-hidden"
          >
            {loadingBookings ? (
              <SkeletonDashboard />
            ) : bookings.length === 0 ? (
              <div className="py-16 flex justify-center bg-[var(--admin-surface)]">
                <EmptyState
                  icon="event_busy"
                  title="No Bookings Yet"
                  description="Active event setups and consultations will appear here."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="admin-table w-full min-w-[800px]">
                  <thead>
                    <tr>
                      <th>Customer Details</th>
                      <th>Event Type</th>
                      <th>Date & Venue</th>
                      <th>Total Price</th>
                      <th>Booking Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr
                        key={b._id || b.id}
                        className="admin-table-row-clickable"
                        onClick={() => navigate(`/admin/events/${b._id || b.id}`)}
                      >
                        <td>
                          <div className="space-y-0.5">
                            <span className="text-[12px] font-bold text-[var(--admin-text-primary)] block">
                              {b.user?.name || 'Anonymous Client'}
                            </span>
                            <span className="text-[11px] text-[var(--admin-text-tertiary)] block">
                              {b.user?.phone || 'No contact'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-1">
                            <span className="admin-badge admin-badge-neutral text-[9px] uppercase font-bold">
                              {b.eventType}
                            </span>
                            <h4 className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate max-w-[150px]">
                              {b.title}
                            </h4>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-0.5">
                            <span className="text-[12px] font-bold text-[var(--admin-text-primary)] block">
                              {new Date(b.date).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="text-[11px] text-[var(--admin-text-tertiary)] truncate max-w-[180px] block">
                              {b.venue?.address}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-0.5">
                            <span className="text-[12px] font-bold text-[var(--admin-text-primary)] block">
                              {formatCurrency(b.pricing?.totalPrice)}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider ${b.pricing?.paymentStatus === 'paid' ? 'text-[var(--admin-success)]' : 'text-[var(--admin-warning)]'}`}
                            >
                              {b.pricing?.paymentStatus}
                            </span>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={b.status.replace('_', '')} />
                        </td>
                        <td className="text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/events/${b._id || b.id}`);
                            }}
                            className="admin-btn admin-btn-outline h-8 min-h-0 text-[10px] px-3 py-0"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
        {/* CALENDAR */}
        {activeTab === 'calendar' && (
          <motion.div
            key="calendar"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="admin-card p-6 space-y-6"
          >
            <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-4">
              <div>
                <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                  Monthly Event Schedule
                </span>
                <h3 className="text-[16px] font-bold text-[var(--admin-text-primary)]">
                  {currentMonthName}
                </h3>
              </div>
              <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--admin-accent)]" /> Wedding
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--admin-text-primary)]" />{' '}
                  Engagement
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--admin-warning)]" /> Haldi
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-[11px]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="py-2 font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-md)]"
                >
                  {day}
                </div>
              ))}
              {calendarDays.map((cell, idx) => {
                const dayBookings = cell.dateStr
                  ? bookings.filter((b) => b.date.substring(0, 10) === cell.dateStr)
                  : [];
                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] p-2 flex flex-col justify-between text-left transition-colors ${
                      cell.day
                        ? 'bg-[var(--admin-surface)] hover:border-[var(--admin-border-strong)]'
                        : 'bg-[var(--admin-bg-subtle)]'
                    }`}
                  >
                    {cell.day && (
                      <span className="font-bold text-[var(--admin-text-tertiary)]">
                        {cell.day}
                      </span>
                    )}
                    {dayBookings.length > 0 && (
                      <div className="space-y-1.5 mt-2">
                        {dayBookings.map((b) => (
                          <div
                            key={b._id}
                            onClick={() => navigate(`/admin/bookings/${b._id || b.id}`)}
                            className={`p-1.5 text-[10px] font-bold rounded-[var(--admin-radius-sm)] text-white truncate cursor-pointer shadow-sm ${
                              b.eventType === 'wedding'
                                ? 'bg-[var(--admin-accent)]'
                                : b.eventType === 'engagement'
                                  ? 'bg-[var(--admin-text-primary)] text-white'
                                  : 'bg-[var(--admin-warning)] text-white'
                            }`}
                            title={b.title}
                          >
                            {b.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
        {/* PACKAGES */}
        {activeTab === 'packages' && (
          <motion.div
            key="packages"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                  Decor Packages & Themes
                </h3>
                <p className="text-[12px] text-[var(--admin-text-tertiary)] mt-0.5">
                  Manage published catalogs visible to customer discovery masonry grids.
                </p>
              </div>
              <button
                onClick={() => navigate('/admin/events/add')}
                className="admin-btn admin-btn-primary h-9"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Publish Theme Curation
              </button>
            </div>

            {loadingPortfolio ? (
              <SkeletonDashboard />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {events.map((ev) => (
                  <div
                    key={ev._id || ev.id}
                    className="admin-card overflow-hidden p-0 flex flex-col group"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-[var(--admin-bg-subtle)] shrink-0">
                      <img
                        src={ev.image}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        alt={ev.title}
                      />
                      <span className="absolute top-3 left-3 admin-badge bg-[var(--admin-surface)] text-[var(--admin-text-primary)] border-none shadow-[var(--admin-shadow-sm)] font-bold">
                        {ev.category}
                      </span>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)] leading-snug">
                            {ev.title}
                          </h4>
                          <span className="text-[11px] font-bold text-[var(--admin-accent)] shrink-0">
                            {ev.pricing}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--admin-text-secondary)] line-clamp-2 leading-relaxed">
                          {ev.description}
                        </p>
                      </div>
                      <div className="flex gap-2 pt-4 mt-4 border-t border-[var(--admin-border-subtle)]">
                        <button
                          onClick={() => navigate(`/admin/events/edit/${ev._id || ev.id}`)}
                          className="admin-btn admin-btn-outline flex-1 min-h-[32px] h-8 text-[11px] px-0"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                        </button>
                        <button
                          onClick={() => navigate(`/events/${ev._id || ev.id}`)}
                          className="admin-btn-icon w-8 h-8 min-h-0 bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)]"
                        >
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
        {/* INVENTORY */}
        {activeTab === 'inventory' && (
          <motion.div
            key="inventory"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="space-y-6"
          >
            <div className="admin-card p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-4">
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                  Rental Inventory Stock Ledger
                </h3>
                <span className="admin-badge admin-badge-neutral">
                  {inventoryItems.length} Props tracked
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {operationsLoading ? (
                  <SkeletonDashboard />
                ) : inventoryItems.length > 0 ? (
                  inventoryItems.map((prop, idx) => (
                    <div
                      key={idx}
                      className="p-5 bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] flex flex-col justify-between h-36"
                    >
                      <div>
                        <StatusBadge status={prop.status} className="mb-2" />
                        <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)] leading-tight line-clamp-2">
                          {prop.item}
                        </h4>
                      </div>
                      <div className="flex justify-between items-end border-t border-[var(--admin-border)] pt-3 text-[11px]">
                        <span className="text-[var(--admin-text-tertiary)]">
                          Stock:{' '}
                          <strong className="text-[var(--admin-text-primary)] font-bold">
                            {prop.stock}
                          </strong>
                        </span>
                        <span className="text-[var(--admin-text-tertiary)]">
                          Rented:{' '}
                          <strong className="text-[var(--admin-text-primary)] font-bold">
                            {prop.rented}
                          </strong>
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-10 text-center text-[var(--admin-text-tertiary)] text-[12px]">
                    No product inventory is available yet.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
        {/* TEAM */}
        {activeTab === 'team' && (
          <motion.div
            key="team"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="space-y-6"
          >
            <div className="admin-card p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-4">
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                  Available Setup Staff & Crew
                </h3>
                <span className="admin-badge admin-badge-neutral">
                  {teamMembers.length} Staff members
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {operationsLoading ? (
                  <SkeletonDashboard />
                ) : teamMembers.length > 0 ? (
                  teamMembers.map((team, idx) => (
                    <div
                      key={idx}
                      className="p-5 bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] flex items-center justify-between"
                    >
                      <div>
                        <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                          {team.name}
                        </h4>
                        <span className="text-[11px] text-[var(--admin-text-secondary)] font-medium block mt-0.5 capitalize">
                          {team.role}
                        </span>
                        <span className="text-[11px] text-[var(--admin-text-tertiary)] block mt-1">
                          {team.contact}
                        </span>
                      </div>
                      <StatusBadge status="active" className="opacity-80" />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-10 text-center text-[var(--admin-text-tertiary)] text-[12px]">
                    No team members are available for allocation yet.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}{' '}
        {/* SHOWCASES */}
        {activeTab === 'showcases' && (
          <motion.div
            key="showcases"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="space-y-6"
          >
            <div className="admin-card p-6 space-y-6">
              <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                Tambulam & Gift Presentation Designs
              </h4>
              {loadingShowcases ? (
                <SkeletonDashboard />
              ) : showcases.length === 0 ? (
                <div className="py-20 text-center text-[var(--admin-text-tertiary)] text-[12px]">
                  No tambulam or gift designs have been created yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {showcases.map((sc) => (
                    <div
                      key={sc._id || sc.id}
                      className="bg-[var(--admin-surface-muted)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative h-40 overflow-hidden bg-[var(--admin-bg-subtle)]">
                          <img
                            src={sc.image}
                            className="w-full h-full object-cover"
                            alt={sc.title}
                          />
                          <span className="absolute top-2 left-2 admin-badge bg-[var(--admin-accent)] text-white border-none font-bold shadow-sm">
                            {sc.category?.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="p-4 space-y-2">
                          <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)] truncate">
                            {sc.title}
                          </h4>
                          <span className="text-[12px] font-bold text-[var(--admin-accent)] block">
                            {formatCurrency(sc.rentalPrice)} / day
                          </span>
                          <p className="text-[11px] text-[var(--admin-text-secondary)] line-clamp-2">
                            {sc.description}
                          </p>
                        </div>
                      </div>
                      <div className="p-4 border-t border-[var(--admin-border-subtle)] flex gap-2">
                        <button
                          onClick={() => navigate(`/admin/showcases/edit/${sc._id || sc.id}`)}
                          className="admin-btn admin-btn-outline flex-1 min-h-[32px] h-8 text-[11px] px-0"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteShowcase(sc._id || sc.id)}
                          className="admin-btn-icon w-8 h-8 min-h-0 bg-[var(--admin-error-light)] text-[var(--admin-error)] hover:bg-[var(--admin-error)] hover:text-white border-none"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawer removed */}

      {/* Category Modal */}
      <AnimatePresence>
        {showCatModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCatModal(false)}
              className="absolute inset-0"
              style={{ background: 'var(--admin-surface-overlay)', backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-[var(--admin-surface)] rounded-[var(--admin-radius-2xl)] shadow-[var(--admin-shadow-2xl)] p-8 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar border border-[var(--admin-border)]"
            >
              <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-5 mb-6">
                <div>
                  <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                    STUDIO THEMES
                  </span>
                  <h3 className="text-[16px] font-bold text-[var(--admin-text-primary)]">
                    Theme Categories
                  </h3>
                </div>
                <button
                  onClick={() => setShowCatModal(false)}
                  className="admin-btn-icon w-8 h-8 min-h-0 bg-[var(--admin-surface-muted)]"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <form
                onSubmit={handleSaveCat}
                className="bg-[var(--admin-bg-subtle)] p-5 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] mb-8 space-y-4"
              >
                <h4 className="text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider">
                  {editingCatId ? 'Edit Theme' : 'Create New Theme'}
                </h4>
                <div className="space-y-2">
                  <label className="admin-label">Name *</label>
                  <input
                    type="text"
                    value={catForm.name}
                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                    className="admin-input"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="admin-label">Description</label>
                  <input
                    type="text"
                    value={catForm.description}
                    onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  {editingCatId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(null);
                        setCatForm({ name: '', description: '', image: '' });
                      }}
                      className="admin-btn admin-btn-outline h-9 px-4"
                    >
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="admin-btn h-9 px-6">
                    {editingCatId ? 'Save Changes' : 'Add Theme'}
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                <h4 className="text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider mb-4">
                  Active Themes
                </h4>
                {customCategories?.events?.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-4 bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] shadow-sm"
                  >
                    <div>
                      <span className="text-[13px] font-bold text-[var(--admin-text-primary)] block">
                        {cat.name}
                      </span>
                      {cat.description && (
                        <span className="text-[11px] text-[var(--admin-text-secondary)] block mt-0.5">
                          {cat.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleEditCat(cat)}
                        className="admin-btn-icon w-8 h-8 min-h-0 bg-[var(--admin-surface-muted)]"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                      </button>
                      <button
                        onClick={() => deleteCustomCategory('events', cat.id)}
                        className="admin-btn-icon w-8 h-8 min-h-0 bg-[var(--admin-error-light)] text-[var(--admin-error)] border-none hover:bg-[var(--admin-error)] hover:text-white"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
