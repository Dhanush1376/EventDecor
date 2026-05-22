import { safeLocalStorage } from './storage';

const LEGACY_THEME_KEYS = [
  'theme',
  'siri_theme',
  'siri-theme',
  'darkMode',
  'dark-mode',
  'color-mode',
  'chakra-ui-color-mode',
];

const DEPLOY_VERSION_KEY = 'siri_app_deploy_version';

/**
 * Removes obsolete dark-mode / theme keys that caused flash or wrong color-scheme after deploys.
 * Bumps a deploy marker so clients can invalidate stale CMS cache once per release.
 */
export function purgeLegacyClientStorage(deployVersion = import.meta.env.VITE_BUILD_ID || '') {
  try {
    for (const key of LEGACY_THEME_KEYS) {
      safeLocalStorage.removeItem(key);
    }

    if (deployVersion) {
      const previous = safeLocalStorage.getItem(DEPLOY_VERSION_KEY);
      if (previous && previous !== deployVersion) {
        safeLocalStorage.removeItem('siri_arts_website_content');
      }
      safeLocalStorage.setItem(DEPLOY_VERSION_KEY, deployVersion);
    }

    document.documentElement.style.colorScheme = 'only light';
    document.documentElement.classList.remove('dark');
  } catch {
    // Non-fatal — app must still boot
  }
}
