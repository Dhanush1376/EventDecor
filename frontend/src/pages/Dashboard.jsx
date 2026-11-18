import { LayoutDashboard } from 'lucide-react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { DashboardProvider } from '../context/DashboardContext';
import { DashboardLayout } from './Dashboard/DashboardLayout';
import { ProfileSection } from './Dashboard/ProfileSection';
import { OrdersSection } from './Dashboard/OrdersSection';
import { RentalsSection } from './Dashboard/RentalsSection';
import { EventsSection } from './Dashboard/EventsSection';
import { AddressesSection } from './Dashboard/AddressesSection';
import { SettingsSection } from './Dashboard/SettingsSection';
import { WalletSection } from './Dashboard/WalletSection';
import { NotificationsSection } from './Dashboard/NotificationsSection';

import { WhatsAppReturnPage } from './returns/WhatsAppReturnPage';

function DashboardIndex() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');

  if (tab === 'orders') return <Navigate to="orders" replace />;
  if (tab === 'rentals') return <Navigate to="rentals" replace />;
  if (tab === 'bookings') return <Navigate to="events" replace />;
  if (tab === 'addresses') return <Navigate to="addresses" replace />;
  if (tab === 'preferences') return <Navigate to="settings" replace />;
  if (tab === 'wishlist') return <Navigate to="/wishlist" replace />;
  if (tab === 'loyalty') return <Navigate to="wallet" replace />;
  if (tab === 'notifications') return <Navigate to="notifications" replace />;
  if (tab === 'returns') return <Navigate to="orders" replace />;

  return (
    <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-10 text-center shadow-xs flex flex-col items-center justify-center min-h-[50vh] hidden lg:flex">
      <div className="w-16 h-16 rounded-full bg-surface-container-low border border-outline-variant/20 flex items-center justify-center mb-4 text-secondary">
        <LayoutDashboard className="text-[32px]" strokeWidth={1.5} />
      </div>
      <h2 className="font-display text-2xl lg:text-3xl font-light text-on-surface mb-3 tracking-tight">
        Welcome to your Dashboard
      </h2>
      <p className="text-secondary text-[13px] lg:text-[14px] max-w-md mx-auto leading-relaxed">
        Select an option from the sidebar to manage your profile, orders, events, and account
        settings.
      </p>
    </div>
  );
}

export function Dashboard() {
  return (
    <DashboardProvider>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardIndex />} />
          <Route path="profile" element={<ProfileSection />} />
          <Route path="orders" element={<OrdersSection />} />
          <Route path="rentals" element={<RentalsSection />} />
          <Route path="events" element={<EventsSection />} />
          <Route path="addresses" element={<AddressesSection />} />
          <Route path="settings" element={<SettingsSection />} />
          <Route path="wallet" element={<WalletSection />} />
          <Route path="custom-orders" element={<Navigate to="/dashboard/orders" replace />} />
          <Route path="notifications" element={<NotificationsSection />} />
          {/* Returns & exchanges are requested over WhatsApp; history lives on each order. */}
          <Route path="returns/new" element={<WhatsAppReturnPage defaultType="return" />} />
          <Route
            path="returns/exchanges/new"
            element={<WhatsAppReturnPage defaultType="exchange" />}
          />
          <Route path="returns/*" element={<Navigate to="/dashboard/orders" replace />} />

          <Route path="*" element={<Navigate to="/dashboard/profile" replace />} />
        </Route>
      </Routes>
    </DashboardProvider>
  );
}
