# Checkout component decomposition (L-07)

`frontend/src/pages/Checkout.jsx` is loaded via `React.lazy()` in `App.jsx`, so it is already a separate route chunk from the home page.

## Planned step components

| Component | Responsibility |
|-----------|----------------|
| `CheckoutAddressStep` | Saved addresses, new address form, step 1 |
| `CheckoutPaymentStep` | Payment method selection, step 2 |
| `CheckoutReviewStep` | Review + confirm, step 3 |
| `CheckoutSummary` | Sticky order totals sidebar |

Each step module can be `React.lazy()`-loaded when `activeStep` advances to reduce the initial checkout chunk size.

## Current status

Implemented: `CheckoutProvider` + lazy `CheckoutAddressStep`, `CheckoutOrderSummaryStep`, `CheckoutPaymentStep`, `CheckoutSidebar`. Shell in `pages/Checkout.jsx` (~100 lines).

Verify chunk sizes: `cd frontend && npm run build` then inspect `dist/assets/`.
