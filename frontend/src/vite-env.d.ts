/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_BUILD_ID: string;
  readonly VITE_SITE_URL: string;
  readonly VITE_RAZORPAY_KEY_ID: string;
  readonly VITE_MARBLE_TEXTURE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
