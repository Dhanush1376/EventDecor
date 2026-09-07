/**
 * Global hook to manage visual viewport height and keyboard offset
 * This ensures that drawers, modals, and bottom sheets can correctly
 * anchor to the top of the mobile keyboard when it opens.
 */
export function useKeyboardAwareViewport() {
  // Deprecated: Obsolete competing viewport calculations removed to ensure
  // single stable drawer positioning and eliminate viewport thrashing on iOS Safari.
}
