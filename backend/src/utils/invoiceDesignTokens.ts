/**
 * Canonical Invoice Design Tokens & Geometry Specification (Backend PDF)
 *
 * Maps canonical 540 coordinate space proportionally to A4 physical page (595.28 pt x 841.89 pt).
 */

export const CANONICAL_INVOICE_PDF = {
  // A4 Physical Page Dimensions in PDF Points (72 points = 1 inch)
  PAGE: {
    width: 595.28,
    height: 841.89,
    marginHorizontal: 30, // Printable width = 535.28 pt (~540 canonical width)
    marginTop: 32,
    marginBottom: 32,
  },

  // Content width on A4 page
  CONTENT_WIDTH: 535.28,

  // Palette matching approved reference
  COLORS: {
    black: '#000000',
    textPrimary: '#111827',
    textSecondary: '#4b5563',
    textMuted: '#6b7280',
    textLight: '#9ca3af',
    cardBg: '#f9fafb',
    cardBorder: '#f3f4f6',
    border: '#e5e7eb',
    dividerDark: '#111827',
    accentGreen: '#15803d',
  },

  // Fonts & Sizes
  FONT: {
    familyBold: 'Helvetica-Bold',
    familyRegular: 'Helvetica',
    familyMono: 'Helvetica',
    storeName: 17,
    legalName: 9,
    headerDetails: 9.5,
    headerTitle: 16,
    cardLabel: 8.5,
    cardTitle: 11,
    cardBody: 9.5,
    cardPin: 10.5,
    tableHeader: 9,
    tableItem: 10,
    tableTotal: 10,
    subtotalsLabel: 10,
    subtotalsValue: 10,
    grandTotalLabel: 10.5,
    grandTotalValue: 13,
    gstHeader: 9,
    gstRow: 9.5,
    gstTotal: 9.5,
    scanLabel: 8,
    footerText: 7.5,
  },
};
