import { m as motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { StatCard, formatCurrency, stagger } from '../AdminUIKit';

export function AdminDashboardStats({ dashboardStats, pendingOrders, eventBookings, customers }) {
  const navigate = useNavigate();

  return (
    <motion.div variants={stagger} className="admin-grid-stats">
      <StatCard
        icon="payments"
        label="Total Revenue"
        value={formatCurrency(
          dashboardStats?.stats?.totalSales !== undefined ? dashboardStats.stats.totalSales : 0,
        )}
        change={
          dashboardStats?.stats?.revenueChange ? `${dashboardStats.stats.revenueChange}%` : ''
        }
        changeType={
          dashboardStats?.stats?.revenueChange > 0
            ? 'up'
            : dashboardStats?.stats?.revenueChange < 0
              ? 'down'
              : ''
        }
        domainColor="revenue"
        infoTooltip="Total gross revenue before refunds."
        onClick={() => navigate('/admin/payments')}
        sparklinePath="M0,20 Q15,5 30,20 T60,8 T90,18 T100,5"
        progress={
          Math.min(100, Math.round(((dashboardStats?.stats?.totalSales || 0) / 100000) * 100)) || 5
        }
      />
      <StatCard
        icon="shopping_bag"
        label="Pending Orders"
        value={
          dashboardStats?.stats?.pendingOrders !== undefined
            ? dashboardStats.stats.pendingOrders
            : pendingOrders
        }
        change={pendingOrders > 0 ? 'Needs Review' : 'Healthy'}
        changeType={pendingOrders > 3 ? 'down' : 'up'}
        domainColor="orders"
        infoTooltip="Orders that have not been fulfilled yet."
        onClick={() => navigate('/admin/orders')}
        sparklinePath="M0,8 Q20,25 40,12 T80,18 T100,10"
        progress={Math.min(100, Math.round((pendingOrders / 20) * 100)) || 5}
      />
      <StatCard
        icon="event"
        label="Active Bookings"
        value={
          dashboardStats?.stats?.totalEvents !== undefined
            ? dashboardStats.stats.totalEvents
            : eventBookings?.filter((b) => b.status !== 'Cancelled').length || 0
        }
        change={dashboardStats?.stats?.eventsChange ? `${dashboardStats.stats.eventsChange}%` : ''}
        changeType={
          dashboardStats?.stats?.eventsChange > 0
            ? 'up'
            : dashboardStats?.stats?.eventsChange < 0
              ? 'down'
              : ''
        }
        domainColor="orders"
        infoTooltip="Upcoming event consultations and setups."
        onClick={() => navigate('/admin/events')}
        sparklinePath="M0,22 Q20,12 40,25 T80,8 T100,18"
        progress={
          Math.min(
            100,
            Math.round(
              ((eventBookings?.filter((b) => b.status !== 'Cancelled').length || 0) / 50) * 100,
            ),
          ) || 5
        }
      />
      <StatCard
        icon="group"
        label="Total Customers"
        value={(dashboardStats?.stats?.totalCustomers !== undefined
          ? dashboardStats.stats.totalCustomers
          : customers?.length || 0
        ).toLocaleString()}
        change={
          dashboardStats?.stats?.customersChange ? `${dashboardStats.stats.customersChange}%` : ''
        }
        changeType={
          dashboardStats?.stats?.customersChange > 0
            ? 'up'
            : dashboardStats?.stats?.customersChange < 0
              ? 'down'
              : ''
        }
        domainColor="users"
        infoTooltip="Registered customers and accounts."
        onClick={() => navigate('/admin/customers')}
        sparklinePath="M0,25 Q20,18 40,10 T80,5 T100,2"
        progress={Math.min(100, Math.round(((customers?.length || 0) / 100) * 100)) || 5}
      />
    </motion.div>
  );
}
