/**
 * Centralized Shipping Configuration
 *
 * Validates and exposes shipping integration credentials from the environment.
 * Prevents scattered process.env checks across adapters.
 */

export const shippingConfig = {
  shiprocket: {
    get apiUrl() {
      return process.env.SHIPROCKET_API_URL || 'https://apiv2.shiprocket.in/v1/external';
    },
    get email() {
      return process.env.SHIPROCKET_EMAIL;
    },
    get password() {
      return process.env.SHIPROCKET_PASSWORD;
    },
    get isConfigured() {
      return Boolean(this.email && this.password);
    },
  },
  delhivery: {
    get apiUrl() {
      return process.env.DELHIVERY_API_URL || 'https://track.delhivery.com';
    },
    get apiKey() {
      return process.env.DELHIVERY_API_KEY;
    },
    get isConfigured() {
      return Boolean(this.apiKey);
    },
  },
  bluedart: {
    get apiUrl() {
      return process.env.BLUEDART_API_URL;
    },
    get apiKey() {
      return process.env.BLUEDART_API_KEY;
    },
    get licenseKey() {
      return process.env.BLUEDART_LICENSE_KEY;
    },
    get isConfigured() {
      return Boolean(this.apiKey && this.apiUrl);
    },
  },
  dtdc: {
    get apiUrl() {
      return process.env.DTDC_API_URL;
    },
    get apiKey() {
      return process.env.DTDC_API_KEY;
    },
    get customerCode() {
      return process.env.DTDC_CUSTOMER_CODE;
    },
    get isConfigured() {
      return Boolean(this.apiKey && this.apiUrl);
    },
  },
  xpressbees: {
    get apiUrl() {
      return process.env.XPRESSBEES_API_URL;
    },
    get apiKey() {
      return process.env.XPRESSBEES_API_KEY;
    },
    get secretKey() {
      return process.env.XPRESSBEES_SECRET_KEY;
    },
    get isConfigured() {
      return Boolean(this.apiKey && this.apiUrl);
    },
  },
};
