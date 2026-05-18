import React from "react";
import { motion } from "framer-motion";
import {
  galleryCategories,
  galleryEvents,
  galleryStyles,
} from "../../data/galleryData";

export function GalleryFilters({
  activeCategory,
  setActiveCategory,
  activeEvent,
  setActiveEvent,
  activeStyle,
  setActiveStyle,
  searchQuery,
  setSearchQuery,
}) {
  return (
    <div className="space-y-12 mb-16">
      {/* Search & Top Level Filter */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="w-full md:w-96 relative">
          <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search inspirations, colors, themes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white pl-14 pr-6 py-4 rounded-full border border-outline-variant/20 font-body text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
          {galleryCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-8 py-3 rounded-full border font-label text-[10px] uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap font-bold ${
                activeCategory === cat
                  ? "bg-on-surface text-surface border-on-surface shadow-xl"
                  : "bg-white text-secondary border-outline-variant/30 hover:border-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filter Matrix */}
      <div className="bg-[#fcfbf9] rounded-[40px] p-8 border border-outline-variant/10 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Event Types */}
          <div className="space-y-4">
            <span className="font-label text-[9px] uppercase tracking-[0.4em] text-primary font-bold block mb-4">
              Discovery by Occasion
            </span>
            <div className="flex flex-wrap gap-2">
              {galleryEvents.map((evt) => (
                <button
                  key={evt}
                  onClick={() => setActiveEvent(evt)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-body transition-all border ${
                    activeEvent === evt
                      ? "bg-primary/10 border-primary/30 text-primary font-bold"
                      : "bg-white border-outline-variant/10 text-on-surface-variant/70 hover:border-primary/20"
                  }`}
                >
                  {evt}
                </button>
              ))}
            </div>
          </div>

          {/* Aesthetic Styles */}
          <div className="space-y-4">
            <span className="font-label text-[9px] uppercase tracking-[0.4em] text-primary font-bold block mb-4">
              Discovery by Aesthetic
            </span>
            <div className="flex flex-wrap gap-2">
              {galleryStyles.map((stl) => (
                <button
                  key={stl}
                  onClick={() => setActiveStyle(stl)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-body transition-all border ${
                    activeStyle === stl
                      ? "bg-on-surface text-surface border-on-surface font-bold"
                      : "bg-white border-outline-variant/10 text-on-surface-variant/70 hover:border-primary/20"
                  }`}
                >
                  {stl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active Filter Indicators */}
      {(activeCategory !== "All" ||
        activeEvent !== "All" ||
        activeStyle !== "All" ||
        searchQuery) && (
        <div className="flex flex-wrap items-center gap-4 pt-4">
          <span className="text-[11px] font-body text-on-surface-variant/60 font-medium">
            Filtering results for:
          </span>
          {activeCategory !== "All" && (
            <FilterChip
              label={activeCategory}
              onClear={() => setActiveCategory("All")}
            />
          )}
          {activeEvent !== "All" && (
            <FilterChip
              label={activeEvent}
              onClear={() => setActiveEvent("All")}
            />
          )}
          {activeStyle !== "All" && (
            <FilterChip
              label={activeStyle}
              onClear={() => setActiveStyle("All")}
            />
          )}
          {searchQuery && (
            <FilterChip
              label={`"${searchQuery}"`}
              onClear={() => setSearchQuery("")}
            />
          )}

          <button
            onClick={() => {
              setActiveCategory("All");
              setActiveEvent("All");
              setActiveStyle("All");
              setSearchQuery("");
            }}
            className="text-[10px] font-label uppercase tracking-widest text-primary font-bold hover:underline"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onClear }) {
  return (
    <div className="flex items-center gap-2 bg-white border border-outline-variant/20 px-4 py-1.5 rounded-full shadow-sm">
      <span className="text-[11px] font-body text-on-surface font-medium">
        {label}
      </span>
      <button
        onClick={onClear}
        className="material-symbols-outlined text-[14px] text-on-surface/40 hover:text-red-500"
      >
        close
      </button>
    </div>
  );
}
