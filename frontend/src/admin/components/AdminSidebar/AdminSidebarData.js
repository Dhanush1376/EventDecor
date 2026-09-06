export const navSections = [
  {
    label: 'Home',
    subtitle: 'Your daily operations summary',
    roles: ['owner', 'manager', 'warehouse', 'production', 'support', 'website_manager'],
    items: [
      {
        label: 'Dashboard',
        icon: 'dashboard',
        path: '/admin',
        keywords: 'stats, home, sales, overview',
        domain: 'revenue',
      },
      {
        label: 'Edit Website',
        icon: 'edit_note',
        path: '/admin/homepage',
        keywords: 'cms, homepage, hero, pages, policy',
        domain: 'settings',
      },
      {
        label: 'Policies',
        icon: 'gavel',
        path: '/admin/policies',
        keywords: 'policy, terms, legal, privacy',
        domain: 'settings',
      },
      {
        label: 'Photo Gallery',
        icon: 'photo_library',
        path: '/admin/gallery',
        keywords: 'photos, heritage, images',
        domain: 'settings',
      },
    ],
  },
  {
    label: 'Orders',
    subtitle: 'Manage sales and customer orders',
    roles: ['owner', 'manager', 'support'],
    items: [
      {
        label: 'All Orders',
        icon: 'shopping_bag',
        path: '/admin/orders',
        keywords: 'sales, checkout, delivery',
        domain: 'orders',
      },
      {
        label: 'Rentals',
        icon: 'car_rental',
        path: '/admin/rentals',
        keywords: 'rentals, leases, active, orders',
        domain: 'orders',
      },
      {
        label: 'Custom Orders',
        icon: 'architecture',
        path: '/admin/custom-orders',
        keywords: 'customization, consultation, bespoke',
        domain: 'orders',
      },
      {
        label: 'Returns & Refunds',
        icon: 'assignment_return',
        path: '/admin/returns',
        keywords: 'returns, refunds, dashboard',
        domain: 'orders',
      },
      {
        label: 'Exchange Hub',
        icon: 'swap_horiz',
        path: '/admin/exchanges',
        keywords: 'returns, exchanges, replacement',
        domain: 'orders',
      },
      {
        label: 'Payments',
        icon: 'payments',
        path: '/admin/payments',
        keywords: 'payments, transactions, settlements, revenue',
        domain: 'orders',
      },
    ],
  },
  {
    label: 'Products & Stock',
    subtitle: 'Manage catalog and inventory',
    roles: ['owner', 'manager', 'website_manager', 'warehouse'],
    items: [
      {
        label: 'Products',
        icon: 'inventory_2',
        path: '/admin/products',
        keywords: 'items, stock, catalog',
        domain: 'products',
      },
      {
        label: 'Add Product',
        icon: 'add_box',
        path: '/admin/products/add',
        keywords: 'create, new',
        domain: 'products',
      },
      {
        label: 'Categories',
        icon: 'category',
        path: '/admin/categories',
        keywords: 'taxonomy, tags, labels',
        domain: 'products',
      },
    ],
  },
  {
    label: 'Events & Bookings',
    subtitle: 'Manage setups and event clients',
    roles: ['owner', 'manager', 'support'],
    items: [
      {
        label: 'Overview',
        icon: 'dashboard',
        path: '/admin/events?tab=dashboard',
        keywords: 'booking, setups, dates, showcases, clients',
        domain: 'orders',
      },
      {
        label: 'Bookings',
        icon: 'assignment',
        path: '/admin/events?tab=bookings',
        keywords: 'bookings, reservations, active, upcoming',
        domain: 'orders',
      },
      {
        label: 'Showcase',
        icon: 'redeem',
        path: '/admin/events?tab=showcases',
        keywords: 'showcase, gallery, portfolio, past events',
        domain: 'orders',
      },
    ],
  },

  {
    label: 'Promotions',
    subtitle: 'Manage discounts and marketing campaigns',
    roles: ['owner', 'manager', 'support', 'website_manager'],
    items: [
      {
        label: 'Discount Coupons',
        icon: 'local_offer',
        path: '/admin/coupons',
        keywords: 'promo, discount, sale, coupon',
        domain: 'orders',
      },
    ],
  },

  {
    label: 'Customers',
    subtitle: 'Manage client relationships',
    roles: ['owner', 'manager', 'support'],
    items: [
      {
        label: 'Customers',
        icon: 'group',
        path: '/admin/customers',
        keywords: 'users, crm, segments, vip',
        domain: 'users',
      },
      {
        label: 'Reviews',
        icon: 'rate_review',
        path: '/admin/reviews',
        keywords: 'reviews, ratings, testimonials, feedback, stars',
        domain: 'users',
      },
    ],
  },

  {
    label: 'Reports',
    subtitle: 'Sales & customer activity',
    roles: ['owner', 'manager'],
    items: [
      {
        label: 'Sales & Revenue',
        icon: 'trending_up',
        path: '/admin/analytics',
        keywords: 'sales, money, revenue, profit, earnings, orders',
        domain: 'revenue',
      },
      {
        label: 'Live Customer Activity',
        icon: 'visibility',
        path: '/admin/analytics/operations',
        keywords: 'customer actions, visitor activity, logs, clicks, searches',
        domain: 'revenue',
      },
    ],
  },

  {
    label: 'System',
    subtitle: 'Configuration and security',
    roles: ['owner'],
    items: [
      {
        label: 'Drafts',
        icon: 'draft',
        path: '/admin/drafts',
        keywords: 'drafts, auto-save, unsaved, offline',
        domain: 'settings',
      },
      {
        label: 'Active Admins',
        icon: 'groups',
        path: '/admin/system/users',
        keywords: 'staff, employees, access, permissions',
        domain: 'users',
      },

      {
        label: 'Notifications',
        icon: 'notifications',
        path: '/admin/system/notifications',
        keywords: 'alerts, rules, emails',
        domain: 'settings',
      },

      {
        label: 'Settings',
        icon: 'settings',
        path: '/admin/system/settings',
        keywords: 'profile, backups, config',
        domain: 'settings',
      },
      {
        label: 'Audit History',
        icon: 'history',
        path: '/admin/system/audit',
        keywords: 'logs, activity, security',
        domain: 'danger',
      },
      {
        label: 'Recycle Bin',
        icon: 'delete_sweep',
        path: '/admin/recycle-bin',
        keywords: 'trash, deleted, restore, purge, recycle bin',
        domain: 'settings',
      },
    ],
  },
];
