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

  return <Navigate to="profile" replace />;
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
          <Route path="*" element={<Navigate to="profile" replace />} />
        </Route>
      </Routes>
    </DashboardProvider>
  );
}
