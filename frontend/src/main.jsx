import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import App from "./App.jsx";
import { initAnalytics } from "./utils/analytics";
import { initObservability } from "./utils/observability";

// Initialize observability monitoring layers (Sentry & LogRocket)
initObservability();

// Initialize analytics (consent-aware — won't fire without user consent)
initAnalytics();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
