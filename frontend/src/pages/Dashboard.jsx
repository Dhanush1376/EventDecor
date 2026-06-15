import { useSearchParams } from 'react-router-dom';

function DashboardIndex() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');

  if (tab === 'orders') return <Navigate to="orders" replace />;
  if (tab === 'rentals') return <Navigate to="rentals" replace />;
  if (tab === 'bookings') return <Navigate to="events" replace />;
  if (tab === 'addresses') return <Navigate to="addresses" replace />;
  if (tab === 'preferences') return <Navigate to="settings" replace />;
  if (tab === 'wishlist') return <Navigate to="collections" replace />;
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
          <Route path="collections" element={<CollectionsSection />} />
          <Route path="shopping-bag" element={<ShoppingBagSection />} />
          <Route path="wallet" element={<WalletSection />} />
          <Route path="*" element={<Navigate to="profile" replace />} />
        </Route>
      </Routes>
    </DashboardProvider>
  );
}
