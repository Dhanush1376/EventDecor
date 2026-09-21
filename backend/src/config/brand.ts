import { getStoreConfigSync } from './storeConfig';

export const BRAND = {
  get name() {
    return getStoreConfigSync().name;
  },
  get accessibleName() {
    return this.name.replace(/&/g, 'and');
  },
  get lowercase() {
    return this.name.toLowerCase();
  },
  get slug() {
    return this.name
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },
};
