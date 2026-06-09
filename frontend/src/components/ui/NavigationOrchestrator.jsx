import React from "react";
import { useLocation } from "react-router-dom";
import { prefetchManager } from "../../utils/prefetchManager";
import { preloadRazorpay } from "../../hooks/useRazorpay";

const PRIORITY_ROUTES = ["/cart", "/checkout", "/dashboard", "/collections"];

function shouldPrefetchAnchor(anchor) {
  if (!anchor) return false;
  const href = anchor.getAttribute("href");
  if (!href || !href.startsWith("/")) return false;
  if (href.startsWith("/admin")) return false;
  return true;
}

export function NavigationOrchestrator() {
  const location = useLocation();
  const [loadingRoute, setLoadingRoute] = React.useState("");
  const completeTimerRef = React.useRef(null);

  React.useEffect(() => {
    prefetchManager.hydrateRouteVisitsFromStorage();
  }, []);

  React.useEffect(() => {
    prefetchManager.markRouteVisit(location.pathname);
    if (completeTimerRef.current) window.clearTimeout(completeTimerRef.current);
    completeTimerRef.current = window.setTimeout(() => setLoadingRoute(""), 180);
    return () => {
      if (completeTimerRef.current) window.clearTimeout(completeTimerRef.current);
    };
  }, [location.pathname]);

  React.useEffect(() => {
    const onPointerIntent = (event) => {
      const anchor = event.target?.closest?.("a[href]");
      if (!shouldPrefetchAnchor(anchor)) return;
      const href = anchor.getAttribute("href");
      prefetchManager.prefetchRoute(href);
    };

    const onNavClick = (event) => {
      const anchor = event.target?.closest?.("a[href]");
      if (!shouldPrefetchAnchor(anchor)) return;
      const href = anchor.getAttribute("href");
      if (href !== location.pathname) {
        setLoadingRoute(href);
      }
    };

    document.addEventListener("mouseover", onPointerIntent, { capture: true, passive: true });
    document.addEventListener("touchstart", onPointerIntent, { capture: true, passive: true });
    document.addEventListener("pointerdown", onPointerIntent, { capture: true, passive: true });
    document.addEventListener("focusin", onPointerIntent, { capture: true, passive: true });
    document.addEventListener("click", onNavClick, { capture: true });

    return () => {
      document.removeEventListener("mouseover", onPointerIntent, { capture: true });
      document.removeEventListener("touchstart", onPointerIntent, { capture: true });
      document.removeEventListener("pointerdown", onPointerIntent, { capture: true });
      document.removeEventListener("focusin", onPointerIntent, { capture: true });
      document.removeEventListener("click", onNavClick, { capture: true });
    };
  }, [location.pathname]);

  React.useEffect(() => {
    let scrollTimeout;
    let isScrolling = false;
    
    const handleScroll = () => {
      isScrolling = true;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, 150);
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrolling) return; // Skip prefetch during fast scroll
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const anchor = entry.target;
          const href = anchor.getAttribute("href");
          prefetchManager.prefetchRoute(href, { kind: "viewport" });
          observer.unobserve(anchor);
        });
      },
      { rootMargin: "280px 0px" }
    );

    // Re-observe after a small delay to account for React re-renders / Suspense
    const timer = setTimeout(() => {
      const anchors = Array.from(document.querySelectorAll('a[href^="/"]'));
      anchors.forEach((anchor) => {
        if (shouldPrefetchAnchor(anchor)) observer.observe(anchor);
      });
    }, 500);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
      clearTimeout(timer);
    };
  }, [location.pathname]);

  React.useEffect(() => {
    const runIdlePrefetch = async () => {
      for (const route of PRIORITY_ROUTES) {
        await prefetchManager.prefetchRoute(route, { kind: "idle" });
      }
      await prefetchManager.prefetchFrequentlyVisitedRoutes();
    };

    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(runIdlePrefetch, { timeout: 1800 });
      return () => cancelIdleCallback(id);
    }

    const timer = window.setTimeout(runIdlePrefetch, 400);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  React.useEffect(() => {
    // Predictive prefetch: after collections, likely next action is product detail/cart.
    if (location.pathname === "/collections") {
      prefetchManager.prefetchRoute("/cart", { kind: "predictive" });
      prefetchManager.prefetchRoute("/checkout", { kind: "predictive" });
    }
    if (location.pathname.startsWith("/product/")) {
      prefetchManager.prefetchRoute("/cart", { kind: "predictive" });
      prefetchManager.prefetchRoute("/checkout", { kind: "predictive" });
    }
    if (location.pathname === "/cart") {
      prefetchManager.prefetchRoute("/checkout", { kind: "predictive" });
      preloadRazorpay();
    }
    if (location.pathname === "/checkout") {
      preloadRazorpay();
    }
  }, [location.pathname]);

  return null;
}

