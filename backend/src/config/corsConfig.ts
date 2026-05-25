export const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://siriartsandcrafts.com",
  "https://www.siriartsandcrafts.com",
  "https://siriarts-n-crafts.vercel.app",
  "https://siri-artsandcrafts.vercel.app",
  "https://siri-arts-n-crafts.onrender.com",
  // Merge production origins from FRONTEND_URLS env var
  ...(process.env.FRONTEND_URLS || '')
    .split(',')
    .map(u => u.trim())
    .filter(Boolean)
    .map(u => u.startsWith('http') ? u : `https://${u}`)
    .filter(u => !['http://localhost:3000', 'http://localhost:5173'].includes(u)),
];

export const ALLOWED_VERCEL_PREVIEWS = new Set([
  'https://siriarts-n-crafts.vercel.app',
  'https://siri-artsandcrafts.vercel.app',
  'https://siri-arts-n-crafts.vercel.app',
]);

export const isOriginAllowed = (origin: string): boolean => {
  // Allow all origins in development (for mobile LAN testing), but not in Jest tests
  if (process.env.NODE_ENV === 'development' && !process.env.JEST_WORKER_ID) return true;
  
  return allowedOrigins.includes(origin) || ALLOWED_VERCEL_PREVIEWS.has(origin);
};
