# Local Development Guide

This guide will help you set up the EventDecor platform on your local machine for development and testing.

## Prerequisites

- **Node.js**: v18.x or higher
- **MongoDB**: v5.x or higher (or a MongoDB Atlas URI)
- **Redis**: v6.x or higher (required for caching and rate limiting)
- **Git**: For version control

## 1. Clone the Repository

```bash
git clone https://github.com/your-org/EventDecor.git
cd EventDecor
```

## 2. Environment Variables

The project uses `.env.local` for local development. Copy the example files:

```bash
# Backend
cd backend
cp .env.example .env.local

# Frontend
cd ../frontend
cp .env.example .env.local
```

### Critical Environment Variables (Backend)

Ensure the following variables are set in your `backend/.env.local`:

- `PORT=5000`
- `NODE_ENV=development`
- `MONGO_URI=mongodb://localhost:27017/eventdecor`
- `REDIS_URL=redis://localhost:6379`
- `JWT_SECRET=your_jwt_secret`
- `SESSION_SECRET=your_session_secret`
- `RAZORPAY_KEY_ID=test_key`
- `RAZORPAY_KEY_SECRET=test_secret`
- `CLOUDINARY_CLOUD_NAME=test_cloud`

## 3. Install Dependencies

Install dependencies for both frontend and backend:

```bash
# In the root directory (if using workspaces, otherwise run in both)
cd backend && npm install
cd ../frontend && npm install
```

## 4. Run the Application

Start the backend and frontend development servers.

### Backend

```bash
cd backend
npm run dev
```

The backend will run on `http://localhost:5000`.

### Frontend (Vite)

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:5173`.

## 5. Seed the Database (Optional)

If you need mock data to start:

```bash
cd backend
npm run seed
```

## 6. Testing locally

Run unit and integration tests:

```bash
cd backend
npm run test
```

## Need Help?

Refer to the [Troubleshooting Guide](troubleshooting.md) for common setup issues.
