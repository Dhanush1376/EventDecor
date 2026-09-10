import { m as motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { useAdminEventsData } from './useAdminEventsData';
import { PageHeader, stagger, formatCurrency } from '../../components/AdminUIKit';

// Tabs
import { DashboardTab } from './tabs/DashboardTab';
import { BookingsTab } from './tabs/BookingsTab';
import { CalendarTab } from './tabs/CalendarTab';
import { ShowcasesTab } from './tabs/ShowcasesTab';

export function AdminEvents() {
  const navigate = useNavigate();
  const { customCategories, addCustomCategory, updateCustomCategory, deleteCustomCategory } =
    useAdmin();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const setActiveTab = (id) => {
    setSearchParams({ tab: id });
  };
  const [calendarSummary, setCalendarSummary] = useState(null);
  const {
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
    toggleShowcaseActive,
  } = useAdminEventsData();

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
    setShowCatModal(true);
  };

  const validRevenueBookings = bookings.filter((b) =>
    ['paid', 'partial', 'COD Collected'].includes(b.pricing?.paymentStatus),
  );
  const totalContractVal = validRevenueBookings.reduce(
    (acc, b) => acc + (b.pricing?.totalPrice || 0),
    0,
  );
  const outstandingBal = validRevenueBookings.reduce(
    (acc, b) => acc + (b.pricing?.pendingBalance || 0),
    0,
  );
  const activeBookingsCount = bookings.filter((b) => b.status === 'active').length;
  const upcomingSetupsCount = bookings.filter((b) =>
    ['confirmed', 'team_assigned', 'setup_in_progress'].includes(b.status),
  ).length;

  const activeShowcasesCount = showcases.filter((s) => s.isActive !== false).length;
  const featuredShowcasesCount = showcases.filter((s) => s.isFeatured).length;
  const showcaseCategoriesCount = new Set(showcases.map((s) => s.category).filter(Boolean)).size;

  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const defaultCurrentMonthBookings = bookings.filter(
    (b) => b.date && b.date.substring(0, 7) === currentMonthPrefix,
  );
  const defaultConfirmedCount = defaultCurrentMonthBookings.filter(
    (b) =>
      (b.status || '').toLowerCase() === 'confirmed' || (b.status || '').toLowerCase() === 'booked',
  ).length;
  const defaultPendingCount = defaultCurrentMonthBookings.filter((b) =>
    (b.status || '').toLowerCase().includes('pending'),
  ).length;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6 pb-1 sm:pb-4"
    >
      <PageHeader
        title={
          activeTab === 'calendar'
            ? 'Event Calendar'
            : activeTab === 'bookings'
              ? 'Event Bookings'
              : activeTab === 'showcases'
                ? 'Showcases & Presentations'
                : 'Events & Bookings Overview'
        }
        subtitle={
          activeTab === 'calendar' ? (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
              <span className="font-semibold text-[var(--admin-text-primary)]">
                {calendarSummary?.count ?? defaultCurrentMonthBookings.length} Events this Month
              </span>
              <span className="text-[var(--admin-border-strong)]">•</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {calendarSummary?.confirmed ?? defaultConfirmedCount} Confirmed
              </span>
              <span className="text-[var(--admin-border-strong)]">•</span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {calendarSummary?.pending ?? defaultPendingCount} Pending
              </span>
            </div>
          ) : activeTab === 'bookings' || activeTab === 'dashboard' ? (
            loadingBookings ? (
              <span>Loading bookings summary...</span>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                <span className="font-semibold text-[var(--admin-text-primary)]">
                  {bookings.length} Total Bookings
                </span>
                {upcomingSetupsCount > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {upcomingSetupsCount} Scheduled
                  </span>
                )}
                {activeBookingsCount > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {activeBookingsCount} Live
                  </span>
                )}
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {formatCurrency(totalContractVal)} Volume
                </span>
              </div>
            )
          ) : activeTab === 'showcases' ? (
            loadingShowcases ? (
              <span>Loading showcases summary...</span>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                <span className="font-semibold text-[var(--admin-text-primary)]">
                  {showcases.length} Total Designs
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {activeShowcasesCount} Active
                </span>
                {featuredShowcasesCount > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {featuredShowcasesCount} Featured
                  </span>
                )}
                {showcaseCategoriesCount > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {showcaseCategoriesCount} Categories
                  </span>
                )}
              </div>
            )
          ) : (
            `${bookings.length} active event bookings recorded`
          )
        }
        headerAction={null}
      />

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <DashboardTab
            bookings={bookings}
            showcases={showcases}
            events={events}
            setActiveTab={setActiveTab}
            totalContractVal={totalContractVal}
            outstandingBal={outstandingBal}
            activeBookingsCount={activeBookingsCount}
            upcomingSetupsCount={upcomingSetupsCount}
          />
        )}
        {activeTab === 'bookings' && (
          <BookingsTab
            bookings={bookings}
            loadingBookings={loadingBookings}
            totalContractVal={totalContractVal}
            outstandingBal={outstandingBal}
            activeBookingsCount={activeBookingsCount}
            upcomingSetupsCount={upcomingSetupsCount}
          />
        )}
        {activeTab === 'calendar' && (
          <CalendarTab
            bookings={bookings}
            showcases={showcases}
            onMonthSummaryChange={setCalendarSummary}
          />
        )}
        {activeTab === 'showcases' && (
          <ShowcasesTab
            showcases={showcases}
            loadingShowcases={loadingShowcases}
            handleDeleteShowcase={handleDeleteShowcase}
            toggleShowcaseFeatured={toggleShowcaseFeatured}
            toggleShowcaseActive={toggleShowcaseActive}
          />
        )}
      </AnimatePresence>

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
