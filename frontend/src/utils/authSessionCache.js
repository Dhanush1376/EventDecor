import { safeLocalStorage } from './storage';

const PROFILE_KEY = 'siri_auth_profile_v1';
// Align with refresh-token lifetime for instant UI restore on reload
const PROFILE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const loadCachedProfile = () => {
  try {
    const raw = safeLocalStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const { user, storedAt } = JSON.parse(raw);
    if (!user || Date.now() - storedAt > PROFILE_TTL_MS) {
      safeLocalStorage.removeItem(PROFILE_KEY);
      return null;
    }
    return user;
  } catch {
    return null;
  }
};

export const saveCachedProfile = (user) => {
  if (!user) {
    safeLocalStorage.removeItem(PROFILE_KEY);
    return;
  }
  try {
    const safeUser = { name: user.name, avatar: user.avatar, role: user.role, email: user.email, _id: user._id || user.id };
    safeLocalStorage.setItem(PROFILE_KEY, JSON.stringify({ user: safeUser, storedAt: Date.now() }));
  } catch {
    // quota or private mode
  }
};

export const clearCachedProfile = () => {
  safeLocalStorage.removeItem(PROFILE_KEY);
};
