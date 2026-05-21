# Siri Arts & Crafts — Cinematic E-Commerce & Atelier Portal

Siri Arts & Crafts is an enterprise-grade, high-performance digital sanctuary dedicated to premium architectural event curation and bespoke artisanal scapes. Combining modern luxury styling with strict technical hardening, the platform connects a fluid, gold-morphic React storefront with a secure Node.js/TypeScript Express backend.

---

## 🏛️ System Architecture

This project is organized as a unified monorepo. Dependencies and build pipelines are orchestrated at the root layer to allow single-command bootstrap and execution:

```
├── backend/                  # Node.js + TypeScript Express API Engine
│   ├── src/config/           # Database, Cloudinary, Razorpay, and logger configs
│   ├── src/controllers/      # Secure controller layers (Auth, Orders, CMS)
│   ├── src/models/           # Strict Mongoose Schemas (User, OtpVerification, Order)
│   ├── src/services/         # Transaction-safe domain service architectures
│   └── src/utils/            # Hashing, email, and canonicalization helpers
├── frontend/                 # Optimized Vite + React Storefront Client
│   ├── src/context/          # State synchronization providers (Auth, Cart, Wishlist)
│   ├── src/components/       # Modular UI components and gold-morphic sections
│   ├── src/hooks/            # Throttling contexts and simulated hook bindings
│   └── src/pages/            # Highly engaging editorial layouts and layouts
└── package.json              # Monorepo task runner & concurrently scripts
```

---

## 🚀 Getting Started & Local Development

### 1. Prerequisite Installations
Ensure you have **Node.js (v18+)** and **npm** installed.

### 2. Quick Setup & Dependencies Installation
Installs all dependencies across the root, frontend, and backend recursively in a single command:
```bash
npm run install:all
```

### 3. Run the Monorepo Concurrently
Launches both the React development server (Vite) and the backend API engine (TypeScript-Dev-Node) simultaneously with synchronized logs:
```bash
npm run dev
```

---

## 🔒 Production Security & Hardening Features

The codebase has undergone a complete pre-production audit and hardening sequence:

### 1. Domain-Aware Gmail Canonicalization
To prevent registration bypasses, authorization exploits, and duplicate admin states, Gmail ignores dots (`.`) and sub-addressing `+` qualifiers. We implemented a unified [emailHelper.ts](file:///c:/Users/Dhanush/OneDrive/Desktop/PROJECTS/EventDecor-Ecommerce/backend/src/utils/emailHelper.ts) that normalizes all addresses prior to DB lookup, rate limiting, and verification check matches.

### 2. Synchronous Concurrency Request Locking
React's asynchronous batching leaves a vulnerable window where rapid button clicks can invoke multiple concurrent dispatches. We added synchronous frontend locks (`isSubmittingRef`) to both [Auth.jsx](file:///c:/Users/Dhanush/OneDrive/Desktop/PROJECTS/EventDecor-Ecommerce/frontend/src/pages/Auth.jsx) and [AuthModal.jsx](file:///c:/Users/Dhanush/OneDrive/Desktop/PROJECTS/EventDecor-Ecommerce/frontend/src/components/auth/AuthModal.jsx). This guarantees that double clicks or duplicate keyboard enters trigger only a single API call.

### 3. Transaction-Safe Connection Pooling
To eliminate delivery latency, OTP dispatches utilizenodemailer cached SMTP connections with strict pooling options:
*   `pool: true`
*   `maxConnections: 5`
*   `maxMessages: 100`

### 4. Advanced Log Scrubbing & Security
Removed all debug OTP leaks and bypassed mock variables. The system strictly utilizes cryptographically secure 6-digit random codes hashed with `bcryptjs` for validation. In production, mock payments are completely disabled.

### 5. Manual Production Database Indexing
Since `autoIndex` is disabled in production, compound indexes from Mongoose schemas are **not** created automatically on a new cluster. Run this **once** after the first production deploy (and again after any index schema change):

```bash
cd backend
npm run create-indexes
```

**Production deploy checklist**
1. Set `NODE_ENV=production` and all required env vars (see `.env.example`).
2. Deploy the API and confirm `/api/health` returns `healthy`.
3. Run `npm run create-indexes` against the production `MONGO_URI`.
4. Do **not** run `seedData.ts` in production (it exits immediately when `NODE_ENV=production`).
5. Never add seed scripts to CI/CD pipelines.

### 6. Real-Time (Socket.io) & Redis
- Admin alerts connect to the `/admin` namespace; customer updates use `/user`.
- Set `REDIS_URL` in production when running more than one API instance (Render, Kubernetes, etc.). Without Redis, socket events only reach clients on the same instance.
- Optional: `REQUIRE_REDIS=true` fails startup if `REDIS_URL` is missing (use when horizontally scaled).

### 7. Email Templates
Transactional HTML lives in the repository (not generated at runtime):
| Location | Purpose |
|----------|---------|
| `backend/src/templates/*.hbs` | Handlebars files (e.g. `order-confirmation.hbs`) |
| `backend/src/utils/emailTemplates.ts` | Inline OTP, COD OTP, team invite, diagnostic templates |
| MongoDB `EmailTemplate` collection | Admin-managed marketing templates via the dashboard |

Copy `backend/.env.example` to `backend/.env` and set **`BREVO_API_KEY`** (recommended) or SMTP credentials.

### 8. Performance
- Public GET APIs (`/products`, `/events`, `/gallery`) use **Redis response cache** (120–300s TTL) when `REDIS_URL` is set, plus HTTP `Cache-Control` / ETag versioning.
- Marble texture is loaded from **Cloudinary CDN** (`VITE_MARBLE_TEXTURE_URL`), not the 520KB bundled PNG.
- Run `cd frontend && npm run build:report` to audit JS chunk sizes after changes.

### 9. Security
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for `TRUST_PROXY_HOPS`, refresh cookie path, and Socket.io namespaces.

### 10. CI/CD
GitHub Actions (`.github/workflows/ci.yml`) runs on every PR to `main`:
- `npm run check-env` — validates required backend and `VITE_*` variables before build
- `npm test` — Vitest (frontend) and backend smoke tests
- `npm run build` — TypeScript + Vite production builds

---

## ⚙️ Environment Configuration

### Backend Environment Variables (`/backend/.env`)
Create a `/backend/.env` file from `/backend/.env.example` (includes `BREVO_API_KEY`, `REDIS_URL`, and other keys):
```env
PORT=5000
NODE_ENV=production
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRES_IN=7d
OTP_EXPIRY_MINUTES=5

# SMTP Transporter Configs
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Razorpay Production Keys
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Admin Configs
ADMIN_EMAIL=sirisha.atmakuri@gmail.com
```

### Frontend Environment Variables (`/frontend/.env`)
Create a `/frontend/.env` file with reference to `/frontend/.env.example`:
```env
VITE_API_URL=https://siri-arts-n-crafts.onrender.com/api
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

---

## 📦 Deployment Workflows

### Frontend Deployment: Vercel
1.  Connect your repository to **Vercel**.
2.  Set **Root Directory** to `frontend`.
3.  Set the Build Command to `npm install && npm run build`.
4.  Configure `VITE_API_URL` and `VITE_RAZORPAY_KEY_ID` under Vercel project environment variables.
5.  Set output directory to `dist`.

### Backend Deployment: Render
1.  Create a new **Web Service** on **Render**.
2.  Set **Root Directory** to `backend`.
3.  Choose your closest Region (e.g. `Singapore (Southeast Asia)`).
4.  Use these exact build settings:
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `npm start`
5.  Populate all Environment Variables in Render's configuration tab.

---

## 📜 Monorepo Orchestration Scripts

Run these scripts from the monorepo root:

*   `npm run install:all` - Recursively installs all root, frontend, and backend packages.
*   `npm run dev` - Concurrently runs local React development and Express TypeScript servers.
*   `npm run build:all` - Triggers optimized builds for both frontend assets and backend scripts.

---
© 2026 Siri Arts & Crafts. All rights reserved. Premium Event Scapes & Bespoke Curators.
