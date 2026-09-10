/**
 * Canonical Invoice Design Tokens & Geometry Specification
 *
 * Single Source of Truth for visual dimensions, typography, and layout.
 * Canonical coordinate space: 540 CSS pixels width.
 */

export const CANONICAL_INVOICE = {
  // Dimension tokens
  CANVAS_WIDTH: 540,
  CANVAS_PADDING: 24, // p-6 = 24px
  CONTENT_WIDTH: 492, // 540 - (24 * 2)
  OUTER_RADIUS: 28, // rounded-[28px]
  CARD_RADIUS: 16, // rounded-2xl = 16px

  // Unified canonical typography font-family across all pages
  FONT_FAMILY:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",

  // Color Palette (Neutral Premium / Approved Reference)
  COLORS: {
    bg: '#ffffff',
    cardBg: '#f9fafb',
    border: '#e5e7eb',
    cardBorder: '#f3f4f6',
    black: '#000000',
    textPrimary: '#111827',
    textSecondary: '#4b5563',
    textMuted: '#6b7280',
    textLight: '#9ca3af',
    tableHeaderBg: '#f3f4f6',
    dividerDark: '#111827',
    accentGreen: '#15803d',
  },

  // Proportional Font Sizes (Fixed inside 540px canvas)
  TYPOGRAPHY: {
    storeName: '17px',
    legalName: '9px',
    headerDetails: '9.5px',
    headerTitle: '16px',
    cardLabel: '8.5px',
    cardTitle: '11.5px',
    cardBody: '9.5px',
    cardPin: '10.5px',
    tableHeader: '9px',
    tableItem: '10.5px',
    tableTotal: '10.5px',
    subtotalsLabel: '10px',
    subtotalsValue: '10px',
    grandTotalLabel: '10.5px',
    grandTotalValue: '13.5px',
    gstHeader: '9px',
    gstRow: '9.5px',
    gstTotal: '9.5px',
    scanLabel: '8px',
    footerText: '7.5px',
  },

  // QR and Barcode Geometry
  BARCODE: {
    width: 1.25,
    height: 36,
  },
  QR: {
    size: 68,
  },
};
