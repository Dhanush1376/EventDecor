import { safeSessionStorage } from './storage';

const PROFILE_KEY = 'siri_auth_profile_v1';
const PROFILE_TTL_MS = 15 * 60 * 1000;

export const loadCachedProfile = () => {
  try {
    const raw = safeSessionStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const { user, storedAt } = JSON.parse(raw);
    if (!user || Date.now() - storedAt > PROFILE_TTL_MS) {
      safeSessionStorage.removeItem(PROFILE_KEY);
      return null;
    }
    return user;
  } catch {
    return null;
  }
};

export const saveCachedProfile = (user) => {
  if (!user) {
    safeSessionStorage.removeItem(PROFILE_KEY);
    return;
  }
  try {
    safeSessionStorage.setItem(PROFILE_KEY, JSON.stringify({ user, storedAt: Date.now() }));
  } catch {
    // quota or private mode
  }
};

export const clearCachedProfile = () => {
  safeSessionStorage.removeItem(PROFILE_KEY);
};
