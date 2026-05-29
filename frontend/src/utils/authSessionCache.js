import { persistentStorage } from './persistentStorage';

const PROFILE_KEY = 'siri_auth_profile_v1';
// Align with refresh-token lifetime for instant UI restore on reload
const PROFILE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const loadCachedProfile = () => {
  return persistentStorage.getItem(PROFILE_KEY, { decrypt: true, ttl: PROFILE_TTL_MS });
};

export const saveCachedProfile = (user) => {
  if (!user) {
    persistentStorage.removeItem(PROFILE_KEY);
    return;
  }
  const safeUser = {
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    email: user.email,
    _id: user._id || user.id
  };
  persistentStorage.setItem(PROFILE_KEY, safeUser, { encrypt: true, ttl: PROFILE_TTL_MS });
};

export const clearCachedProfile = () => {
  persistentStorage.removeItem(PROFILE_KEY);
};