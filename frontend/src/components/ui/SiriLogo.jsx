import React from 'react';

export function SiriLogo({ className = "", size = "36px", showSubtitle = false }) {
  // Parse the size to a number to scale it up
  const numericSize = typeof size === 'string' ? parseInt(size, 10) : size;
  // Make the logo significantly larger by default (2x the passed size height)
  const height = numericSize ? numericSize * 2 : 72;

  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`}
      style={{ 
        height: height + 'px',
        minHeight: height + 'px',
        // We let width be auto to support rectangular logos correctly
      }}
    >
      <img 
        src="/logo-nobg-clean.png" 
        alt="Siri Arts & Crafts Logo" 
        style={{ height: '100%', width: 'auto', objectFit: 'contain' }} 
      />
    </div>
  );
}
