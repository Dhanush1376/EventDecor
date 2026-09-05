import { useEffect, useId } from 'react';

/**
 * Centralized scroll lock for overlays, drawers, and modals.
 *
 * WHY reference counting:
 *   The application has overlays that can stack (e.g. CartDrawer → ConfirmModal,
 *   AuthModal → PhoneCollectionModal). When the inner overlay closes, the body
 *   must remain locked because the outer overlay is still open. A simple
 *   boolean toggle would unlock prematurely.
 *
 * WHY NOT position:fixed on body:
 *   The viewport meta uses interactive-widget=resizes-content, and the body
 *   already has overscroll-behavior-y:none. overflow:hidden on body+html is
 *   sufficient to prevent background scrolling without the scroll-position
 *   and iOS-toolbar side effects of position:fixed.
 *
 * USAGE:
 *   useScrollLock(isOpen)          — lock while isOpen is true
 *   useScrollLock(isOpen && cond)  — conditional lock
 *
 * CLEANUP:
 *   Automatically unlocks when the component unmounts or isActive becomes false.
 *   If lockCount somehow goes negative (double-release), it clamps to zero.
 */

// Module-level state shared across all hook instances.
// This is intentionally NOT React state — it must survive re-renders
// and be shared across the entire component tree.
const activeLocks = new Set();

function applyLock() {
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
}

function releaseLock() {
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
}

/**
 * @param {boolean} isActive — true when the overlay/drawer is visible and
 *   should prevent background scrolling.
 */
export function useScrollLock(isActive) {
  const id = useId();

  useEffect(() => {
    if (!isActive) return;

    activeLocks.add(id);
    applyLock();

    return () => {
      activeLocks.delete(id);
      if (activeLocks.size === 0) {
        releaseLock();
      }
    };
  }, [isActive, id]);
}
