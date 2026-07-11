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
import { MyReturns } from './returns/MyReturns';
import { ReturnRequestPage } from './returns/ReturnRequestPage';
import { ExchangeRequestPage } from './returns/ExchangeRequestPage';
import { MyCustomOrders } from './MyCustomOrders';

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

  return (
    <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-10 text-center shadow-xs flex flex-col items-center justify-center min-h-[50vh] hidden lg:flex">
      <div className="w-16 h-16 rounded-full bg-surface-container-low border border-outline-variant/20 flex items-center justify-center mb-4 text-secondary">
        <span className="material-symbols-outlined text-[32px]">dashboard</span>
      </div>
      <h2 className="font-display text-xl lg:text-2xl font-bold text-on-surface mb-2 tracking-wide uppercase">
        Welcome to your Dashboard
      </h2>
      <p className="text-secondary text-[11px] lg:text-[13px] max-w-md mx-auto uppercase tracking-wider font-bold">
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
          <Route path="returns" element={<MyReturns />} />
          <Route path="returns/new" element={<ReturnRequestPage />} />
          <Route path="custom-orders" element={<MyCustomOrders />} />

          <Route path="returns/exchanges/new" element={<ExchangeRequestPage />} />
          <Route path="*" element={<Navigate to="profile" replace />} />
        </Route>
      </Routes>
    </DashboardProvider>
  );
}
