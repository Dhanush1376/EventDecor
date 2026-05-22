# Admin route code splitting

All `/admin/*` page components are loaded with `React.lazy()` in `frontend/src/App.jsx` (lines 52–76). They are **not** in the storefront initial bundle.

## Verification

After `npm run build` in `frontend/`:

- Open `dist/assets/js/` — admin chunks are separate files (e.g. `AdminDashboard-*.js`, `AdminProducts-*.js`).
- The entry chunk should not import admin page modules directly.

## Customer `Dashboard.jsx`

`frontend/src/pages/Dashboard.jsx` is the **customer** account dashboard (`/dashboard`), not the admin panel. It is also lazy-loaded in `App.jsx` as `Dashboard`.

## Admin login

`AdminLogin` is lazy-loaded at `/admin/login` (not bundled with public pages).
