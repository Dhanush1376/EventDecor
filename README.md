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

---

## ⚙️ Environment Configuration

### Backend Environment Variables (`/backend/.env`)
Create a `/backend/.env` file with reference to `/backend/.env.example`:
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
