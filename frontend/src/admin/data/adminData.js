// Admin portal static taxonomy and chart fallbacks (live data comes from AdminContext/API)

export const productCategories = [
  "Coconut Decorations",
  "Bangle Trays",
  "Decorative Baskets",
  "Chocolate Trays",
  "Dry Fruit Trays",
  "Engagement Ring Trays",
  "Harathi Plates",
  "Jewellery Trays",
  "Photo Bouquets",
  "Traditional Wedding Decor",
  "Pooja Decoration Sets",
  "Floral Decoration Sets",
  "Return Gift Hampers",
];

/** Fallback monthly chart data when analytics API has no order history yet */
export const revenueData = [
  { month: "Jan", revenue: 320000, orders: 94 },
  { month: "Feb", revenue: 380000, orders: 112 },
  { month: "Mar", revenue: 450000, orders: 134 },
  { month: "Apr", revenue: 520000, orders: 156 },
  { month: "May", revenue: 624000, orders: 184 },
  { month: "Jun", revenue: 580000, orders: 172 },
  { month: "Jul", revenue: 690000, orders: 204 },
  { month: "Aug", revenue: 710000, orders: 218 },
  { month: "Sep", revenue: 840000, orders: 245 },
  { month: "Oct", revenue: 980000, orders: 284 },
  { month: "Nov", revenue: 1150000, orders: 342 },
  { month: "Dec", revenue: 1380000, orders: 412 },
];
