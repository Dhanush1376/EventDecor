# 🎨 Siri Arts & Crafts — Production Backend

A high-performance, scalable Node.js + Express + TypeScript backend for the Siri Arts & Crafts e-commerce platform.

---

## 🚀 Quick Start (Production)

### 1. Prerequisites
- **Node.js**: v18+
- **MongoDB**: Atlas Cluster (Cloud)
- **Media**: Cloudinary Account
- **Payments**: Razorpay Dashboard

### 2. Installation
```bash
cd backend
npm install
npm run build
npm run start
```

---

## 🛠️ Environment Variables (.env)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB Connection String | `mongodb+srv://...` |
| `JWT_SECRET` | Secret for auth tokens | `long_random_string` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Name | `...` |
| `RAZORPAY_KEY_ID` | Razorpay ID | `rzp_test_...` |
| `FRONTEND_URLS` | Allowed CORS origins | `https://site.com,http://localhost:3000` |

---

## 🏥 Uptime Monitoring

To prevent Render "Free Plan" spin-down and monitor health:
1. Go to **[UptimeRobot](https://uptimerobot.com/)** or **[BetterStack](https://betterstack.com/)**.
2. Create a new "HTTP(S)" Monitor.
3. URL: `https://your-app-name.onrender.com/api/health`
4. Interval: Every **14 minutes** (crucial for keeping free instances awake).

---

## 🛡️ Security & Reliability
- **Graceful Shutdown**: Handles SIGTERM/SIGINT to close DB and server connections safely.
- **Exponential Backoff**: MongoDB retries connection on failure with increasing delays.
- **Rate Limiting**: Protects against Brute-force and DoS (100 req/15min per IP).
- **Security Headers**: Helmet.js pre-configured for HSTS, CSP, and XSS protection.
- **Background Jobs**: Node-cron handles weekly CMS cleanup and daily status heartbeats.

---

## 📊 API Documentation (Major Endpoints)

- `POST /api/auth/send-otp` - Trigger email OTP verification
- `POST /api/auth/verify-otp` - Verify email OTP and authenticate

### Products & Events
- `GET /api/products` - Filterable product list
- `GET /api/events` - Ceremonial decoration catalog

### Orders & CMS
- `POST /api/orders` - Initiate Razorpay checkout
- `GET /api/cms` - Fetch site content (Hero, About, SEO)

---

## 🏗️ Deployment Guide (Render.com)

1. **GitHub**: Push your code to a GitHub repository.
2. **New Web Service**: Connect your repo to Render.
3. **Blueprint**: Render will automatically detect `render.yaml`.
4. **Environment Variables**:
   - Manually add `MONGO_URI`, `RAZORPAY_KEY_SECRET`, etc., in the Render Dashboard → Environment tab.
5. **CORS**: Ensure `FRONTEND_URLS` includes your final production frontend URL.
