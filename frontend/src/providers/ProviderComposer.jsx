import React from 'react';

/**
 * Utility to compose multiple React providers into a single wrapper.
 * Helps prevent the "pyramid of doom" in App.jsx / AppProviders.jsx.
 */
export const ProviderComposer = ({ contexts, children }) => {
  return contexts.reduceRight(
    (kids, parent) =>
      React.cloneElement(parent, {
        children: kids,
      }),
    children,
  );
};
