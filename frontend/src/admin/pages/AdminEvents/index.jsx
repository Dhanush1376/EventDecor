import { m as motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { useAdminEventsData } from './useAdminEventsData';
import { PageHeader, stagger } from '../../components/AdminUIKit';

// Tabs
import { DashboardTab } from './tabs/DashboardTab';
import { BookingsTab } from './tabs/BookingsTab';
import { CalendarTab } from './tabs/CalendarTab';
import { InventoryTab } from './tabs/InventoryTab';
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

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: 'dashboard' },
    { id: 'bookings', label: 'Bookings', icon: 'assignment' },
    { id: 'showcases', label: 'Showcase', icon: 'redeem' },
    { id: 'inventory', label: 'Inventory', icon: 'inventory' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar_month' },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6 pb-20">
      <PageHeader
        title="Events & Bookings Manager"
        subtitle={`${bookings.length} active event bookings recorded`}
        icon="event"
        iconColor="orders"
      >
        <button
          onClick={() => navigate('/admin/showcases/add')}
          className="admin-btn admin-btn-primary h-9"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Showcase
        </button>
      </PageHeader>

      {/* Smart Filter Tabs */}
      <div className="flex border-b border-[var(--admin-border-subtle)] overflow-x-auto no-scrollbar mt-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 font-semibold text-[14px] border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[var(--admin-accent)] text-[var(--admin-accent)]'
                : 'border-transparent text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-border-strong)]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <DashboardTab
            bookings={bookings}
            setActiveTab={setActiveTab}
            totalContractVal={totalContractVal}
            outstandingBal={outstandingBal}
            activeBookingsCount={activeBookingsCount}
            upcomingSetupsCount={upcomingSetupsCount}
          />
        )}
        {activeTab === 'bookings' && (
          <BookingsTab bookings={bookings} loadingBookings={loadingBookings} />
        )}
        {activeTab === 'calendar' && <CalendarTab bookings={bookings} />}
        {activeTab === 'inventory' && (
          <InventoryTab inventoryItems={inventoryItems} operationsLoading={operationsLoading} />
        )}
        {activeTab === 'showcases' && (
          <ShowcasesTab
            showcases={showcases}
            loadingShowcases={loadingShowcases}
            handleDeleteShowcase={handleDeleteShowcase}
            toggleShowcaseFeatured={toggleShowcaseFeatured}
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
