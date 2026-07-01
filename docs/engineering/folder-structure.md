# Folder Structure & Modules

EventDecor utilizes a Domain-Driven / Feature-First architecture on the backend to enforce bounded contexts and prevent spaghetti dependencies.

## Backend Structure

```text
backend/
├── src/
│   ├── config/              # Environment, DB, Logger configurations
│   ├── controllers/         # Bounded context controllers (orchestration only)
│   │   ├── auth/            # Authentication, Invites, 2FA
│   │   ├── cms/             # Content, Pages, Galleries
│   │   ├── commerce/        # Orders, Coupons, Refunds, Reconciliation
│   │   ├── customer/        # Support, Policies, Location
│   │   ├── discovery/       # Search, AI Vision, Recommendations
│   │   ├── events/          # Event management and bookings
│   │   ├── media/           # Uploads and optimizations
│   │   ├── notifications/   # Alerts, Email triggers
│   │   ├── products/        # Catalog, Categories, Reviews
│   │   ├── rentals/         # Rental inventory and policies
│   │   ├── system/          # Health, Metrics, Admin Config
│   │   └── users/           # Profiles, Loyalty
│   ├── middleware/          # Global middleware (Auth, Rate Limit, Errors)
│   ├── models/              # Mongoose database schemas
│   ├── routes/              # Express routers mirroring the `controllers` structure
│   ├── services/            # Core business logic and external integrations
│   ├── utils/               # Shared utilities (formatters, pagination)
│   ├── validators/          # Joi/Zod request validation schemas
│   ├── jobs/                # BullMQ background job definitions
│   └── app.ts               # Express application setup
```

## Architectural Principles

1. **Controllers are Thin**: Controllers belong in `src/controllers/[domain]/`. They are strictly responsible for orchestrating the HTTP request: extracting params, passing them to a Service, and returning the structured API Response. They must NOT contain complex algorithms or direct DB manipulation.
2. **Services are Fat**: Heavy business logic, transactions, and external API calls (e.g., Razorpay, Redis) live in `src/services/`. Services should be reusable across different controllers or background jobs.
3. **Lazy Routing**: To optimize startup time and memory footprint, `src/routes/registerApiRoutes.ts` uses a custom `lazyRouter` to defer loading modules until their specific route is hit for the first time.

## Frontend Structure

```text
frontend/
├── src/
│   ├── admin/               # Admin panel (components, pages, services, styles)
│   ├── animations/          # Framer-motion configurations and presets
│   ├── assets/              # Static media, icons, placeholders
│   ├── checkout/            # Checkout flow logic and components
│   ├── components/          # Reusable UI elements, modals, layouts
│   ├── config/              # Environment and global configuration
│   ├── constants/           # Enums and global constants
│   ├── context/             # React Context Providers (Auth, Cart, Wishlist)
│   ├── hooks/               # Custom React hooks (queries, mutations)
│   ├── pages/               # Top-level Page components (Storefront)
│   ├── providers/           # App-wide providers (QueryClient, Network)
│   ├── routes/              # React Router definitions
│   ├── services/            # API interceptors and frontend services
│   ├── styles/              # Global CSS, admin overrides
│   └── utils/               # Formatting, security, storage utilities
```
