import { useState, useMemo, useCallback } from 'react';

/**
 * useAdminFilters
 * Unified filter engine for all admin pages.
 *
 * @param {Array} items - Raw dataset array
 * @param {Object} config - Declarative filter configuration
 * @param {string} searchQuery - Search query string (optional)
 * @returns {Object} Filter state, helpers, normalized active chips, and filtered items
 */
export function useAdminFilters(items = [], config, searchQuery = '') {
  // Initialize state from config default values
  const [filterState, setFilterState] = useState(() => {
    const initial = {};
    if (config?.fields) {
      Object.keys(config.fields).forEach((key) => {
        initial[key] = config.fields[key].defaultValue;
      });
    }
    return initial;
  });

  // Set single filter key
  const setFilterValue = useCallback((key, value) => {
    setFilterState((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Reset a specific filter key to its default value
  const resetFilter = useCallback(
    (key) => {
      if (config?.fields && config.fields[key]) {
        setFilterState((prev) => ({
          ...prev,
          [key]: config.fields[key].defaultValue,
        }));
      }
    },
    [config],
  );

  // Reset all filters to their defaults
  const resetAllFilters = useCallback(() => {
    if (config?.fields) {
      const resetState = {};
      Object.keys(config.fields).forEach((key) => {
        resetState[key] = config.fields[key].defaultValue;
      });
      setFilterState(resetState);
    }
  }, [config]);

  // Evaluate predicates: ALL active filters are ANDed
  const filteredItems = useMemo(() => {
    if (!items || !items.length) return [];
    if (!config?.fields) return items;

    const fields = config.fields;
    const fieldKeys = Object.keys(fields);

    return items.filter((item) => {
      // 1. Text search predicate if defined in config
      if (searchQuery && config.searchPredicate) {
        if (!config.searchPredicate(item, searchQuery)) {
          return false;
        }
      }

      // 2. Evaluate all field predicates
      for (let i = 0; i < fieldKeys.length; i++) {
        const key = fieldKeys[i];
        const fieldConfig = fields[key];
        const currentValue = filterState[key];

        // Check if filter is active (not default)
        const isDefault = fieldConfig.isDefault
          ? fieldConfig.isDefault(currentValue)
          : currentValue === fieldConfig.defaultValue;

        if (!isDefault) {
          // If active, evaluate predicate
          if (fieldConfig.predicate) {
            const matches = fieldConfig.predicate(item, currentValue, filterState);
            if (!matches) {
              return false; // Strict AND: item failed this filter
            }
          }
        }
      }

      return true;
    });
  }, [items, config, filterState, searchQuery]);

  // Generate normalized active chips with human-readable labels
  const activeChips = useMemo(() => {
    if (!config?.fields) return [];

    const chips = [];
    const fields = config.fields;
    const fieldKeys = Object.keys(fields);

    fieldKeys.forEach((key) => {
      const fieldConfig = fields[key];
      const currentValue = filterState[key];

      const isDefault = fieldConfig.isDefault
        ? fieldConfig.isDefault(currentValue)
        : currentValue === fieldConfig.defaultValue;

      if (!isDefault) {
        // Human-readable chip label
        const chipLabel = fieldConfig.getChipLabel
          ? fieldConfig.getChipLabel(currentValue, filterState)
          : `${fieldConfig.label || key}: ${currentValue}`;

        if (chipLabel) {
          chips.push({
            id: key,
            fieldKey: key,
            label: chipLabel,
            onRemove: () => resetFilter(key),
          });
        }
      }
    });

    return chips;
  }, [config, filterState, resetFilter]);

  const totalCount = items ? items.length : 0;
  const matchCount = filteredItems ? filteredItems.length : 0;
  const activeCount = activeChips.length;

  return {
    filteredItems,
    filterState,
    setFilterValue,
    resetFilter,
    resetAllFilters,
    activeChips,
    activeCount,
    totalCount,
    matchCount,
    hasActiveFilters: activeCount > 0 || !!(searchQuery && searchQuery.trim()),
  };
}
