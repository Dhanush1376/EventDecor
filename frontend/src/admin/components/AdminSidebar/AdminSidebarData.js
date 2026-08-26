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
        keywords: 'returns, refunds, exchanges, dashboard',
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
      {
        label: 'Inventory',
        icon: 'warehouse',
        path: '/admin/inventory',
        keywords: 'alerts, stock count, storage',
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
    label: 'Rentals',
    subtitle: 'Track rental inventory and returns',
    roles: ['owner', 'manager', 'support'],
    items: [
      {
        label: 'Active Rentals',
        icon: 'car_rental',
        path: '/admin/rentals',
        keywords: 'rentals, leases, returns',
        domain: 'orders',
      },
      {
        label: 'Rental Calendar',
        icon: 'calendar_month',
        path: '/admin/rentals/calendar',
        keywords: 'schedule, availability, tracking',
        domain: 'orders',
      },
      {
        label: 'Due Returns',
        icon: 'assignment_return',
        path: '/admin/rentals/due',
        keywords: 'due, overdue, inspect',
        domain: 'orders',
      },
    ],
  },
  {
    label: 'Website',
    subtitle: 'Manage storefront content',
    roles: ['owner', 'manager', 'website_manager'],
    items: [
      {
        label: 'Edit Website',
        icon: 'edit_note',
        path: '/admin/homepage',
        keywords: 'cms, homepage, hero, pages, policy',
        domain: 'settings',
      },
      {
        label: 'Photo Gallery',
        icon: 'photo_library',
        path: '/admin/gallery',
        keywords: 'photos, heritage, images',
        domain: 'settings',
      },
      {
        label: 'Drafts',
        icon: 'draft',
        path: '/admin/drafts',
        keywords: 'drafts, auto-save, unsaved, offline',
        domain: 'settings',
      },
      {
        label: 'Policies',
        icon: 'gavel',
        path: '/admin/policies',
        keywords: 'policy, terms, legal, privacy',
        domain: 'settings',
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
    label: 'Insights',
    subtitle: 'Business analytics and reports',
    roles: ['owner', 'manager'],
    items: [
      {
        label: 'Analytics',
        icon: 'query_stats',
        path: '/admin/analytics',
        keywords: 'trends, metrics, profits',
        domain: 'revenue',
      },
      {
        label: 'Operational Insights',
        icon: 'insights',
        path: '/admin/analytics/operations',
        keywords: 'operations, performance, delays',
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
        label: 'Global AI Platform',
        icon: 'memory',
        path: '/admin/ai-settings',
        keywords: 'ai, machine learning, providers, models',
        domain: 'settings',
      },

      {
        label: 'WhatsApp Automations',
        icon: 'chat',
        path: '/admin/whatsapp-automations',
        badge: 'NEW',
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
        keywords: 'trash, deleted, restore, recycle, bin',
        domain: 'danger',
        badge: 'NEW',
      },
    ],
  },
];
