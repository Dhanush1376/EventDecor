export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getMatchingProductCategory(
  predicted: string,
  dbCategories?: string[],
): string | null {
  const categories = dbCategories || [
    'Coconut Decorations',
    'Bangle Trays',
    'Decorative Baskets',
    'Chocolate Trays',
    'Dry Fruit Trays',
    'Engagement Ring Trays',
    'Harathi Plates',
    'Jewellery Trays',
    'Photo Bouquets',
    'Traditional Wedding Decor',
    'Pooja Decoration Sets',
    'Floral Decoration Sets',
    'Return Gift Hampers',
  ];
  const p = predicted.toLowerCase();

  let mapped: string | null = null;
  if (p === 'wedding' || p === 'traditional') {
    mapped = 'Traditional Wedding Decor';
  } else if (p === 'pooja') {
    mapped = 'Pooja Decoration Sets';
  } else if (p === 'engagement') {
    mapped = 'Engagement Ring Trays';
  } else if (p === 'floral') {
    mapped = 'Floral Decoration Sets';
  }

  if (mapped && categories.some((c) => c.toLowerCase() === mapped!.toLowerCase())) {
    return categories.find((c) => c.toLowerCase() === mapped!.toLowerCase())!;
  }

  const match = categories.find((c) => c.toLowerCase().includes(p) || p.includes(c.toLowerCase()));
  return match || null;
}

export function getMatchingEventCategory(
  predicted: string,
  dbCategories?: string[],
): string | null {
  const categories = dbCategories || [
    'Wedding Ceremony',
    'Engagement Ceremony',
    'Reception Decoration',
    'Traditional Pooja Setup',
  ];
  const p = predicted.toLowerCase();

  let mapped: string | null = null;
  if (p === 'wedding') {
    mapped = 'Wedding Ceremony';
  } else if (p === 'engagement') {
    mapped = 'Engagement Ceremony';
  } else if (p === 'pooja' || p === 'traditional') {
    mapped = 'Traditional Pooja Setup';
  }

  if (mapped && categories.some((c) => c.toLowerCase() === mapped!.toLowerCase())) {
    return categories.find((c) => c.toLowerCase() === mapped!.toLowerCase())!;
  }

  const match = categories.find((c) => c.toLowerCase().includes(p) || p.includes(c.toLowerCase()));
  return match || null;
}

export function getMatchingGalleryCategory(
  predicted: string,
  dbCategories?: string[],
): string | null {
  const categories = dbCategories || [
    'Traditional Wedding Decor',
    'Floral Decoration Sets',
    'Plate Decoration & Packing',
  ];
  const p = predicted.toLowerCase();

  let mapped: string | null = null;
  if (p === 'wedding' || p === 'traditional') {
    mapped = 'Traditional Wedding Decor';
  } else if (p === 'floral') {
    mapped = 'Floral Decoration Sets';
  } else if (p === 'engagement' || p === 'plate') {
    mapped = 'Plate Decoration & Packing';
  }

  if (mapped && categories.some((c) => c.toLowerCase() === mapped!.toLowerCase())) {
    return categories.find((c) => c.toLowerCase() === mapped!.toLowerCase())!;
  }

  const match = categories.find((c) => c.toLowerCase().includes(p) || p.includes(c.toLowerCase()));
  return match || null;
}
