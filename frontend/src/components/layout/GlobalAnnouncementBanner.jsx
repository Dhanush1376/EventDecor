import { Megaphone } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '../../context/ConfigContext';

export function GlobalAnnouncementBanner() {
  const { config, storeSettings } = useConfig();

  // Read dynamic store settings with fallback to static config
  const announcementText =
    storeSettings?.general?.announcementText || config?.GLOBAL_ANNOUNCEMENT_BANNER;
  const announcementLink = storeSettings?.general?.announcementLink?.trim();

  if (!announcementText || !announcementText.trim()) return null;

  const content = (
    <div className="flex items-center justify-center gap-2">
      <Megaphone className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
      <span>{announcementText}</span>
    </div>
  );

  return (
    <div className="bg-[#8b0000] text-white text-[11px] lg:text-[12px] font-label font-bold uppercase tracking-widest text-center py-2.5 px-4 shadow-md relative z-50">
      {announcementLink ? (
        announcementLink.startsWith('http://') || announcementLink.startsWith('https://') ? (
          <a
            href={announcementLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline flex items-center justify-center gap-2 transition-opacity hover:opacity-90 cursor-pointer"
          >
            {content}
          </a>
        ) : (
          <Link
            to={announcementLink}
            className="hover:underline flex items-center justify-center gap-2 transition-opacity hover:opacity-90 cursor-pointer"
          >
            {content}
          </Link>
        )
      ) : (
        content
      )}
    </div>
  );
}
