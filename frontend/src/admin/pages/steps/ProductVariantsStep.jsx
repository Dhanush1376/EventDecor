import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';

const PRESET_ATTRIBUTES = [
  {
    id: 'Size',
    name: 'Size',
    icon: 'straighten',
    placeholder: 'e.g. 10 Inch or Large',
    popularValues: [
      'Standard',
      'Small (S)',
      'Medium (M)',
      'Large (L)',
      'Extra Large (XL)',
      '6 Inch',
      '8 Inch',
      '10 Inch',
      '12 Inch',
      'Set of 3',
    ],
  },
  {
    id: 'Color',
    name: 'Color',
    icon: 'palette',
    placeholder: 'e.g. Antique Brass or Maroon',
    popularValues: [
      'Gold',
      'Silver',
      'Antique Brass',
      'Brown',
      'Red',
      'Maroon',
      'Emerald Green',
      'Royal Blue',
      'Yellow',
      'White / Pearl',
      'Pink',
      'Bronze',
      'Copper',
      'Multi-Color',
    ],
  },
  {
    id: 'Material',
    name: 'Material',
    icon: 'category',
    placeholder: 'e.g. Pure Brass or Teakwood',
    popularValues: [
      'Pure Brass',
      'Wood / Rosewood',
      'Clay / Terracotta',
      'Silk Fabric',
      'Velvet',
      'Copper',
      'White Marble',
      'Glass',
      'Resin',
      'Metal Alloy',
    ],
  },
  {
    id: 'Finish',
    name: 'Finish',
    icon: 'auto_awesome',
    placeholder: 'e.g. Antique Vintage',
    popularValues: [
      'Polished Glossy',
      'Antique Vintage',
      'Matte Finish',
      'Hand-painted Meenakari',
      'Embossed / Carved',
      'Lacquered Gold',
    ],
  },
  {
    id: 'Style',
    name: 'Style',
    icon: 'design_services',
    placeholder: 'e.g. Temple / Heritage',
    popularValues: [
      'Traditional Indian',
      'Temple / Heritage',
      'Modern Minimalist',
      'Royal Mughal',
      'Festive Floral',
    ],
  },
  {
    id: 'Pack / Set Size',
    name: 'Pack / Set Size',
    icon: 'inventory_2',
    placeholder: 'e.g. Set of 4',
    popularValues: ['Single Piece', 'Set of 2', 'Set of 3', 'Set of 4', 'Set of 6', 'Set of 12'],
  },
  {
    id: 'Weight',
    name: 'Weight',
    icon: 'scale',
    placeholder: 'e.g. 500g or 1 kg',
    popularValues: ['250g', '500g', '1 kg', '2 kg', '3 kg', '5 kg'],
  },
];

const PRESET_BADGES = [
  'Trending',
  'Best Seller',
  'Heritage Craft',
  'Handmade',
  'New Arrival',
  'Limited Edition',
  'Eco-Friendly',
];

const PRESET_TAGS = [
  'Wedding',
  'Pooja',
  'Diwali',
  'Temple Decor',
  'Housewarming',
  'Handcrafted',
  'Brass Decor',
  'Return Gifts',
  'Festive',
];

export function ProductVariantsStep({
  formData,
  setFormData,
  focusedField,
  newVariant,
  setNewVariant,
  handleAddVariant,
  handleRemoveVariant,
  handleRemoveAttributeGroup,
}) {
  // Track open attribute cards (seeded with existing variant attribute names)
  const [openAttributes, setOpenAttributes] = useState([]);
  const [customAttrNameInput, setCustomAttrNameInput] = useState('');
  const [showCustomAttrForm, setShowCustomAttrForm] = useState(false);

  // Per-attribute inline inputs: { [attrName]: { value: '', price: '' } }
  const [inlineInputs, setInlineInputs] = useState({});

  // Inputs for custom tags and badges
  const [customTagInput, setCustomTagInput] = useState('');
  const [customBadgeInput, setCustomBadgeInput] = useState('');

  // Group variants by Attribute for structured display
  const groupedVariants = useMemo(() => {
    const groups = {};
    (formData.variants || []).forEach((v) => {
      const key = (v.name || 'Other').trim();
      if (!groups[key]) groups[key] = [];
      groups[key].push(v);
    });
    return groups;
  }, [formData.variants]);

  // All active attribute names (preserving order with newly added on top)
  const activeAttributeNames = useMemo(() => {
    const list = [...openAttributes];
    Object.keys(groupedVariants).forEach((name) => {
      if (!list.some((item) => item.toLowerCase() === name.toLowerCase())) {
        list.push(name);
      }
    });
    return list;
  }, [groupedVariants, openAttributes]);

  const totalVariantCount = (formData.variants || []).length;
  const totalAttributeCount = Object.keys(groupedVariants).length;

  // Available standard attributes that are not yet added
  const availablePresetAttributes = useMemo(() => {
    return PRESET_ATTRIBUTES.filter(
      (pa) =>
        !activeAttributeNames.some(
          (activeName) => activeName.toLowerCase() === pa.name.toLowerCase(),
        ),
    );
  }, [activeAttributeNames]);

  // Badges helper (handles string or array)
  const parsedBadges = useMemo(() => {
    if (Array.isArray(formData.badges)) return formData.badges;
    if (typeof formData.badges === 'string') {
      return formData.badges
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean);
    }
    return [];
  }, [formData.badges]);

  // Tags helper (handles string or array)
  const parsedTags = useMemo(() => {
    if (Array.isArray(formData.tags)) return formData.tags;
    if (typeof formData.tags === 'string') {
      return formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }
    return [];
  }, [formData.tags]);

  // ─── Actions for Variant Attributes & Options ───

  // Open an attribute card (places newly added at the top)
  const handleOpenAttribute = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setOpenAttributes((prev) => [
      trimmed,
      ...prev.filter((n) => n.toLowerCase() !== trimmed.toLowerCase()),
    ]);
    setShowCustomAttrForm(false);
    setCustomAttrNameInput('');
  };

  // Close/remove an attribute card (and remove all variants within it)
  const handleRemoveAttribute = (attrName) => {
    setOpenAttributes((prev) => prev.filter((n) => n.toLowerCase() !== attrName.toLowerCase()));
    if (handleRemoveAttributeGroup) {
      handleRemoveAttributeGroup(attrName);
    } else {
      setFormData((prev) => ({
        ...prev,
        variants: (prev.variants || []).filter(
          (v) => (v.name || '').trim().toLowerCase() !== attrName.trim().toLowerCase(),
        ),
      }));
    }
  };

  // Direct 1-click addition of an option (from preset or inline form)
  const handleAddOption = (attrName, optionVal, priceVal = 0) => {
    const trimmedName = (attrName || '').trim();
    const trimmedValue = (optionVal || '').trim();

    if (!trimmedName || !trimmedValue) {
      toast.error('Please enter an option value');
      return;
    }

    // Check duplicate
    const isDup = (formData.variants || []).some(
      (v) =>
        (v.name || '').trim().toLowerCase() === trimmedName.toLowerCase() &&
        (v.value || '').trim().toLowerCase() === trimmedValue.toLowerCase(),
    );

    if (isDup) {
      toast.error(`"${trimmedName}: ${trimmedValue}" is already added.`);
      return;
    }

    const priceNum = priceVal !== '' && !isNaN(Number(priceVal)) ? Number(priceVal) : 0;

    const newOption = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      name: trimmedName,
      value: trimmedValue,
      price: priceNum,
    };

    setFormData((prev) => ({
      ...prev,
      variants: [newOption, ...(prev.variants || [])],
    }));

    // Clear inline input for this attribute
    setInlineInputs((prev) => ({
      ...prev,
      [trimmedName]: { value: '', price: '' },
    }));

    toast.success(`Added ${trimmedName}: ${trimmedValue}`);
  };

  // Remove individual variant
  const handleRemoveChoice = (id) => {
    if (handleRemoveVariant) {
      handleRemoveVariant(id);
    } else {
      setFormData((prev) => ({
        ...prev,
        variants: (prev.variants || []).filter((v) => v.id !== id),
      }));
    }
  };

  // ─── Actions for Tags ───

  const handleAddTag = (tagText) => {
    const clean = (tagText || '').trim();
    if (!clean) return;
    const exists = parsedTags.some((t) => t.toLowerCase() === clean.toLowerCase());
    if (exists) {
      toast.error(`"${clean}" tag is already added`);
      return;
    }
    const next = [clean, ...parsedTags];
    setFormData((prev) => ({ ...prev, tags: next.join(', ') }));
    setCustomTagInput('');
  };

  const handleRemoveTag = (tagText) => {
    const next = parsedTags.filter((t) => t.toLowerCase() !== tagText.toLowerCase());
    setFormData((prev) => ({ ...prev, tags: next.join(', ') }));
  };

  // ─── Actions for Badges ───

  const handleAddBadge = (badgeText) => {
    const clean = (badgeText || '').trim();
    if (!clean) return;
    const exists = parsedBadges.some((b) => b.toLowerCase() === clean.toLowerCase());
    if (exists) {
      toast.error(`"${clean}" badge is already active`);
      return;
    }
    const next = [clean, ...parsedBadges];
    setFormData((prev) => ({ ...prev, badges: next.join(', ') }));
    setCustomBadgeInput('');
  };

  const handleRemoveBadge = (badgeText) => {
    const next = parsedBadges.filter((b) => b.toLowerCase() !== badgeText.toLowerCase());
    setFormData((prev) => ({ ...prev, badges: next.join(', ') }));
  };

  return (
    <div className="space-y-8">
      {/* ─── SECTION 1: PRODUCT OPTIONS & VARIATIONS ─── */}
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--admin-border-subtle)]">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h2 className="text-[13px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider whitespace-nowrap">
              Product Options
            </h2>
            {totalVariantCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] font-medium text-[11px] border border-[var(--admin-border)] whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)] shrink-0" />
                <span>
                  {totalVariantCount} {totalVariantCount === 1 ? 'choice' : 'choices'}
                </span>
                <span className="text-[var(--admin-border-strong)]">·</span>
                <span>
                  {totalAttributeCount} {totalAttributeCount === 1 ? 'attribute' : 'attributes'}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* ── Add Option Type (Attribute) Selector Bar ── */}
        <div className="p-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[6px] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider">
              Add Option Type:
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            {availablePresetAttributes.map((attr) => (
              <button
                key={attr.id}
                type="button"
                onClick={() => handleOpenAttribute(attr.name)}
                className="px-2.5 py-1 text-[11px] rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] hover:border-[var(--admin-accent)] hover:text-[var(--admin-accent)] hover:bg-[var(--admin-surface)] transition-all cursor-pointer font-medium shadow-2xs active:scale-95"
              >
                + {attr.name}
              </button>
            ))}

            {/* Custom Attribute Button or Inline Input */}
            {!showCustomAttrForm ? (
              <button
                type="button"
                onClick={() => setShowCustomAttrForm(true)}
                className="px-2.5 py-1 text-[11px] rounded-[4px] border border-dashed border-[var(--admin-border-strong)] text-[var(--admin-text-secondary)] hover:border-[var(--admin-accent)] hover:text-[var(--admin-accent)] transition-all cursor-pointer font-medium"
              >
                + Custom Attribute...
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleOpenAttribute(customAttrNameInput);
                }}
                className="inline-flex items-center gap-1.5 animate-fade-in"
              >
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Fragrance or Pattern"
                  value={customAttrNameInput}
                  onChange={(e) => setCustomAttrNameInput(e.target.value)}
                  className="h-7 px-2.5 text-[11px] rounded-[4px] border border-[var(--admin-accent)] outline-none bg-[var(--admin-surface)] w-44"
                />
                <button
                  type="submit"
                  disabled={!customAttrNameInput.trim()}
                  className="h-7 px-2 rounded-[4px] bg-[var(--admin-accent)] text-white text-[10.5px] font-bold uppercase cursor-pointer disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomAttrForm(false)}
                  className="h-7 px-1.5 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] text-[12px] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── Active Attribute Cards List ── */}
        {activeAttributeNames.length === 0 ? (
          /* Empty Guidance State */
          <div className="p-6 text-center rounded-[6px] border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface)] flex flex-col items-center justify-center space-y-1">
            <p className="text-[12px] font-bold text-[var(--admin-text-primary)]">
              No product variations added
            </p>
            <p className="text-[11px] text-[var(--admin-text-tertiary)]">
              Click an option type above (+ Size, + Color, + Material) if this product has
              variations.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeAttributeNames.map((attrName) => {
              const options = groupedVariants[attrName] || [];
              const presetDef = PRESET_ATTRIBUTES.find(
                (p) => p.name.toLowerCase() === attrName.toLowerCase(),
              );
              const inlineState = inlineInputs[attrName] || { value: '', price: '' };
              const isNoPriceAttr = ['color', 'size'].includes(attrName.trim().toLowerCase());

              // Filter unadded preset values for 1-click addition
              const unaddedPresets = (presetDef?.popularValues || []).filter(
                (val) =>
                  !options.some(
                    (opt) => (opt.value || '').trim().toLowerCase() === val.toLowerCase(),
                  ),
              );

              return (
                <div
                  key={attrName}
                  className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[6px] p-4 shadow-2xs space-y-3 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--admin-border-subtle)]">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                        {attrName}
                      </span>
                      <span className="text-[10px] text-white font-bold bg-[var(--admin-accent)] px-1.5 py-0.5 rounded-[3px] border border-[var(--admin-accent-hover,#664b28)] whitespace-nowrap shadow-2xs">
                        {options.length} {options.length === 1 ? 'choice' : 'choices'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveAttribute(attrName)}
                      className="text-[10.5px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title={`Remove all ${attrName} options`}
                    >
                      <span className="material-symbols-outlined text-[13px]">delete_sweep</span>
                      <span>Remove {attrName}</span>
                    </button>
                  </div>

                  {/* Configured Choices for this Attribute */}
                  <div>
                    {options.length === 0 ? (
                      <p className="text-[11px] text-[var(--admin-text-tertiary)] italic py-1">
                        No choices added yet. Click a popular preset below or type a custom value.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {options.map((v) => {
                          const priceNum =
                            v.price !== undefined && v.price !== '' && !isNaN(Number(v.price))
                              ? Number(v.price)
                              : 0;

                          return (
                            <div
                              key={v.id || `${v.name}-${v.value}`}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[var(--admin-accent)] border border-[var(--admin-accent-hover,#664b28)] hover:brightness-105 rounded-[3px] text-[11px] font-medium text-white shadow-2xs transition-all group leading-tight"
                            >
                              <span className="font-semibold text-white">{v.value}</span>

                              {/* Price badge (hidden for Color & Size, or if price delta is 0) */}
                              {!isNoPriceAttr && priceNum !== 0 && (
                                <span
                                  className={`px-1 py-0.2 rounded-[2px] text-[9.5px] font-bold ${
                                    priceNum > 0
                                      ? 'bg-black/25 text-emerald-200 border border-emerald-300/40'
                                      : 'bg-black/25 text-rose-200 border border-rose-300/40'
                                  }`}
                                >
                                  {priceNum > 0 ? `+₹${priceNum}` : `-₹${Math.abs(priceNum)}`}
                                </span>
                              )}

                              {/* Remove Option Button */}
                              <button
                                type="button"
                                onClick={() => handleRemoveChoice(v.id)}
                                className="text-white/70 hover:text-white p-0 rounded transition-colors cursor-pointer ml-0.5 flex items-center justify-center"
                                title="Remove this choice"
                              >
                                <span className="material-symbols-outlined text-[12px]">close</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 1-Click Popular Presets */}
                  {unaddedPresets.length > 0 && (
                    <div className="pt-2 border-t border-[var(--admin-border-subtle)] space-y-1.5">
                      <span className="font-semibold text-[var(--admin-text-tertiary)] uppercase tracking-wider text-[10px] block">
                        Popular {attrName}s:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {unaddedPresets.map((presetVal) => (
                          <button
                            key={presetVal}
                            type="button"
                            onClick={() => handleAddOption(attrName, presetVal, 0)}
                            className="px-2 py-0.5 rounded-[4px] text-[10.5px] font-medium border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-text-primary)] hover:border-[var(--admin-accent)] hover:text-[var(--admin-accent)] hover:bg-[var(--admin-surface-hover)] transition-all cursor-pointer shadow-2xs active:scale-95"
                          >
                            + {presetVal}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inline Custom Value Adder */}
                  <div className="pt-2 border-t border-[var(--admin-border-subtle)]">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddOption(
                          attrName,
                          inlineState.value,
                          isNoPriceAttr ? 0 : inlineState.price,
                        );
                      }}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input
                        type="text"
                        placeholder={presetDef ? presetDef.placeholder : `Custom ${attrName} value`}
                        value={inlineState.value || ''}
                        onChange={(e) =>
                          setInlineInputs((prev) => ({
                            ...prev,
                            [attrName]: { ...inlineState, value: e.target.value },
                          }))
                        }
                        className="h-8 px-2.5 text-[11.5px] rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface)] outline-none focus:border-[var(--admin-accent)] flex-1 min-w-[140px] font-medium"
                      />

                      {!isNoPriceAttr && (
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[var(--admin-text-tertiary)] font-bold pointer-events-none">
                            ₹
                          </span>
                          <input
                            type="number"
                            placeholder="+/- 0"
                            value={inlineState.price !== undefined ? inlineState.price : ''}
                            onChange={(e) =>
                              setInlineInputs((prev) => ({
                                ...prev,
                                [attrName]: { ...inlineState, price: e.target.value },
                              }))
                            }
                            className="h-8 pl-6 pr-2 text-[11.5px] rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface)] outline-none focus:border-[var(--admin-accent)] w-full font-medium"
                          />
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={!inlineState.value?.trim()}
                        className="h-8 px-3 rounded-[4px] bg-[var(--admin-accent)] text-white font-bold text-[11px] uppercase cursor-pointer hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        <span>Add Option</span>
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── SECTION 2: MERCHANDISING BADGES & DISCOVERY TAGS ─── */}
      <div className="space-y-3 pt-4 border-t border-[var(--admin-border)]">
        <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] tracking-tight">
          Badges & Discovery Tags
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ── Storefront Badges Card ── */}
          <div className="p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[6px] space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider">
                Storefront Badges
              </label>
              <span className="text-[10px] text-[var(--admin-text-secondary)] font-medium bg-[var(--admin-surface-muted)] px-1.5 py-0.5 rounded-[3px] border border-[var(--admin-border)] whitespace-nowrap">
                {parsedBadges.length} active
              </span>
            </div>

            {/* Active Badges Chips */}
            <div className="min-h-7">
              {parsedBadges.length === 0 ? (
                <span className="text-[11px] text-[var(--admin-text-tertiary)] italic">
                  No active badges
                </span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {parsedBadges.map((badge) => (
                    <span
                      key={badge}
                      className="px-2 py-0.5 text-[10.5px] rounded-[3px] border border-[var(--admin-accent-hover,#664b28)] bg-[var(--admin-accent)] text-white font-medium shadow-2xs flex items-center gap-1 leading-tight"
                    >
                      <span className="material-symbols-outlined text-[11px] text-white/90">
                        check
                      </span>
                      <span>{badge}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBadge(badge)}
                        className="text-white/70 hover:text-white cursor-pointer flex items-center justify-center p-0 ml-0.5"
                        title="Remove badge"
                      >
                        <span className="material-symbols-outlined text-[11px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Suggested Popular Badges */}
            <div className="pt-2 border-t border-[var(--admin-border-subtle)] space-y-1.5">
              <span className="text-[10px] font-semibold text-[var(--admin-text-tertiary)] uppercase tracking-wider block">
                Popular Badges:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_BADGES.filter(
                  (b) => !parsedBadges.some((pb) => pb.toLowerCase() === b.toLowerCase()),
                ).map((badge) => (
                  <button
                    key={badge}
                    type="button"
                    onClick={() => handleAddBadge(badge)}
                    className="px-2.5 py-1 text-[11px] rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] hover:border-amber-400 hover:text-amber-900 hover:bg-amber-50/40 cursor-pointer font-medium flex items-center gap-1 transition-all"
                  >
                    <span className="material-symbols-outlined text-[12px] text-amber-600">
                      add
                    </span>
                    <span>{badge}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Add Custom Badge Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddBadge(customBadgeInput);
              }}
              className="flex items-center gap-1.5 pt-2 border-t border-[var(--admin-border-subtle)]"
            >
              <input
                type="text"
                placeholder="Custom badge (e.g. Festive Special)"
                value={customBadgeInput}
                onChange={(e) => setCustomBadgeInput(e.target.value)}
                className="w-full bg-[var(--admin-surface)] rounded-[4px] px-3 h-8 text-[11.5px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-all placeholder:text-[var(--admin-text-tertiary)]"
              />
              <button
                type="submit"
                disabled={!customBadgeInput.trim()}
                className="h-8 px-3 rounded-[4px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-accent)] hover:text-white font-bold text-[11px] uppercase cursor-pointer border border-[var(--admin-border)] transition-all disabled:opacity-50 shrink-0"
              >
                Add
              </button>
            </form>
          </div>

          {/* ── Tags / Collections Card ── */}
          <div className="p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[6px] space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider">
                Tags / Occasions
              </label>
              <span className="text-[10px] text-[var(--admin-text-secondary)] font-medium bg-[var(--admin-surface-muted)] px-1.5 py-0.5 rounded-[3px] border border-[var(--admin-border)] whitespace-nowrap">
                {parsedTags.length} {parsedTags.length === 1 ? 'tag' : 'tags'}
              </span>
            </div>

            {/* Active Tags Chips */}
            <div className="min-h-7">
              {parsedTags.length === 0 ? (
                <span className="text-[11px] text-[var(--admin-text-tertiary)] italic">
                  No active tags
                </span>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {parsedTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-[10.5px] rounded-[3px] border border-[var(--admin-accent-hover,#664b28)] bg-[var(--admin-accent)] text-white font-medium shadow-2xs flex items-center gap-1 leading-tight"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-white/70 hover:text-white cursor-pointer flex items-center justify-center p-0 ml-0.5"
                        title="Remove tag"
                      >
                        <span className="material-symbols-outlined text-[11px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Suggested Popular Tags */}
            <div className="pt-2 border-t border-[var(--admin-border-subtle)] space-y-1.5">
              <span className="text-[10px] font-semibold text-[var(--admin-text-tertiary)] uppercase tracking-wider block">
                Popular Occasions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TAGS.filter(
                  (t) => !parsedTags.some((pt) => pt.toLowerCase() === t.toLowerCase()),
                ).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddTag(tag)}
                    className="px-2.5 py-1 text-[11px] rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] hover:border-[var(--admin-accent)] hover:text-[var(--admin-accent)] hover:bg-[var(--admin-surface-hover)] cursor-pointer font-medium flex items-center gap-1 transition-all"
                  >
                    <span className="material-symbols-outlined text-[12px] text-[var(--admin-accent)]">
                      add
                    </span>
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Add Custom Tag Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddTag(customTagInput);
              }}
              className="flex items-center gap-1.5 pt-2 border-t border-[var(--admin-border-subtle)]"
            >
              <input
                type="text"
                placeholder="Add custom tag (e.g. Return Gift, Brass Pooja)"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                className={`w-full bg-[var(--admin-surface)] rounded-[4px] px-3 h-8 text-[11.5px] outline-none transition-all placeholder:text-[var(--admin-text-tertiary)] ${
                  focusedField === 'tags'
                    ? 'border border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/50'
                    : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)]'
                }`}
              />
              <button
                type="submit"
                disabled={!customTagInput.trim()}
                className="h-8 px-3 rounded-[4px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-accent)] hover:text-white font-bold text-[11px] uppercase cursor-pointer border border-[var(--admin-border)] transition-all disabled:opacity-50 shrink-0"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
