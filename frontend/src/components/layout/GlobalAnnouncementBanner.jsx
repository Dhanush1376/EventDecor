import React from 'react';
import { useConfig } from '../../context/ConfigContext';

export function GlobalAnnouncementBanner() {
  const { config } = useConfig();

  // Look for a public config variable named 'GLOBAL_ANNOUNCEMENT_BANNER'
  const announcementText = config?.GLOBAL_ANNOUNCEMENT_BANNER;

  if (!announcementText) return null;

  return (
    <div className="bg-[#8b0000] text-white text-[11px] lg:text-[12px] font-label font-bold uppercase tracking-widest text-center py-2.5 px-4 shadow-md relative z-50">
      <div className="flex items-center justify-center gap-2 animate-pulse">
        <span className="material-symbols-outlined text-[14px]">campaign</span>
        <span>{announcementText}</span>
      </div>
    </div>
  );
}
