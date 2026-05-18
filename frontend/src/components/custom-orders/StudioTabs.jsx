import React from "react";
import { motion } from "framer-motion";
import { useWebsiteContent } from "../../hooks/useWebsiteContent";

export function StudioTabs({ activeTab, setActiveTab, isSticky }) {
  const { digitalStudio } = useWebsiteContent();
  const tabs = digitalStudio?.tabs || [];

  return (
    <nav
      className={`z-[100] transition-all duration-500 ${isSticky ? "fixed top-0 left-0 w-full bg-white/95 backdrop-blur-2xl py-2.5 shadow-xl" : "relative -mt-8 md:-mt-12 mb-12"}`}
    >
      <div
        className={`max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop ${isSticky ? "" : "bg-white rounded-full border border-black/10 p-2 md:p-3 shadow-2xl shadow-black/5 mx-4 md:mx-auto"}`}
      >
        <div className="flex items-center justify-center gap-2 md:gap-4 overflow-x-auto no-scrollbar py-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 md:px-6 py-2 md:py-2.5 rounded-full font-label-sm text-[9px] md:text-[11px] uppercase tracking-widest whitespace-nowrap transition-all font-bold cursor-pointer flex-shrink-0 ${
                activeTab === tab.id
                  ? "bg-black text-white"
                  : "bg-transparent hover:bg-gray-50 text-black/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
