import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useRegisterSW } from "virtual:pwa-register/react";
import toast from "react-hot-toast";

const DEFERRED_PATHS = ["/checkout", "/cart"];

/**
 * Prompts users to reload when a new service worker is ready.
 * Defers the prompt during checkout/cart to avoid losing payment state.
 */
export function PwaUpdatePrompt() {
  const location = useLocation();
  const toastIdRef = useRef(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
  });

  useEffect(() => {
    const shouldDefer = DEFERRED_PATHS.some((p) => location.pathname.startsWith(p));

    if (!needRefresh) {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      return;
    }

    if (shouldDefer) return;

    if (toastIdRef.current) return;

    toastIdRef.current = toast(
      (t) => (
        <div className="flex flex-col gap-2 text-sm">
          <span>A new version is available.</span>
          <button
            type="button"
            className="rounded-md bg-white/20 px-3 py-1.5 font-medium hover:bg-white/30"
            onClick={() => {
              updateServiceWorker(true);
              toast.dismiss(t.id);
              toastIdRef.current = null;
            }}
          >
            Reload to update
          </button>
        </div>
      ),
      { duration: Infinity, id: "pwa-update-prompt" }
    );
  }, [needRefresh, location.pathname, updateServiceWorker]);

  return null;
}
