import React from "react";
import { motion } from "framer-motion";
import { useWebsiteContent } from "../../hooks/useWebsiteContent";

export function PackageBuilder({
  eventType,
  setEventType,
  selectedTheme,
  setSelectedTheme,
  selectedColor,
  setSelectedColor,
  selectedVenueSize,
  setSelectedVenueSize,
  selectedModules,
  handleModuleToggle,
  estimatedPackagePrice,
  currentThemeLook,
  handleImageError,
  setActiveTab,
  triggerToast,
}) {
  const { digitalStudio } = useWebsiteContent();

  const {
    eventTypes = [],
    visualThemes = [],
    colorPalettes = [],
    venueSizes = [],
    packageModules = [],
  } = digitalStudio || {};

  const windowVariants = {
    initial: { opacity: 0, x: 30 },
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      x: -30,
      transition: { duration: 0.25, ease: "easeIn" },
    },
  };

  return (
    <motion.div
      key="window-builder"
      variants={windowVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-16 relative z-10"
    >
      {/* Event Type Configuration */}
      <section className="space-y-6">
        <div className="max-w-3xl">
          <span className="font-label-sm text-[10px] text-primary uppercase tracking-[0.4em] block font-bold mb-1">
            WINDOW 02: CONFIGURATOR
          </span>
          <h2 className="font-headline-md text-black mb-2 font-normal">
            Choose Event Type
          </h2>
          <p className="font-body-md text-black/60 font-light">
            Select the primary festivity. Each parameter sets optimized
            structural framing recommendations for your lookbook.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {eventTypes.map((evt) => (
            <button
              key={evt.id}
              onClick={() => setEventType(evt.id)}
              className={`p-5 min-h-[100px] md:min-h-0 rounded-[24px] border text-left transition-all duration-300 cursor-pointer flex flex-col justify-between group ${
                eventType === evt.id
                  ? "bg-white border-primary shadow-lg ring-1 ring-primary"
                  : "bg-white/60 hover:bg-white border-black/5 hover:border-black/20"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[24px] mb-3 transition-colors ${
                  eventType === evt.id
                    ? "text-primary"
                    : "text-black/20 group-hover:text-primary"
                }`}
              >
                {evt.icon}
              </span>
              <div>
                <p className="font-display text-[16px] font-medium text-black mb-1">
                  {evt.label}
                </p>
                <span className="font-label-sm text-[10px] text-black/40 block font-normal leading-tight">
                  {evt.desc}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Style & Theme Swatches */}
      <section className="space-y-8 pt-6 border-t border-black/5">
        <div className="max-w-3xl">
          <h3 className="font-headline-sm text-black mb-2 font-normal">
            Choose Style & Theme
          </h3>
          <p className="font-body text-[13px] text-black/60 font-light">
            Explore custom curated design concepts and configure your actual
            venue footprint parameters.
          </p>
        </div>

        {/* Visual Theme Selector Cards */}
        <div>
          <span className="font-label-sm text-[11px] uppercase tracking-[0.2em] text-black/40 font-bold block mb-4">
            ✦ Aesthetic Decor Style Swatches
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {visualThemes.map((vthm) => (
              <div
                key={vthm.id}
                onClick={() => setSelectedTheme(vthm.id)}
                className={`rounded-[24px] min-h-[220px] border overflow-hidden cursor-pointer group transition-all duration-500 bg-white flex flex-col justify-between ${
                  selectedTheme === vthm.id
                    ? "border-primary ring-2 ring-primary shadow-xl"
                    : "border-black/5 hover:shadow-md hover:border-black/20"
                }`}
              >
                <div className="aspect-[4/3] w-full overflow-hidden relative bg-[#fcfbf9]">
                  <img
                    src={vthm.img}
                    alt={vthm.label}
                    onError={handleImageError}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {selectedTheme === vthm.id && (
                    <div className="absolute top-3 right-3 bg-primary text-black p-1 rounded-full shadow-md">
                      <span className="material-symbols-outlined text-[14px]">
                        done
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-display text-[16px] font-medium text-black mb-1.5">
                      {vthm.label}
                    </h4>
                    <p className="font-body text-[11px] text-black/50 font-light leading-relaxed line-clamp-2">
                      {vthm.desc}
                    </p>
                  </div>
                  <span className="font-label-sm text-[10px] text-primary block mt-3 font-bold uppercase tracking-widest">
                    {selectedTheme === vthm.id
                      ? "● Active Concept"
                      : "○ Apply Concept"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Color Palette Swatches row */}
        <div>
          <span className="font-label-sm text-[11px] uppercase tracking-[0.2em] text-black/40 font-bold block mb-3">
            ✦ Recommended Color Palette
          </span>
          <div className="flex flex-wrap gap-3">
            {colorPalettes.map((pal) => (
              <button
                key={pal.id}
                onClick={() => setSelectedColor(pal.id)}
                className={`px-4 py-2.5 rounded-full border transition-all cursor-pointer flex items-center gap-3 ${
                  selectedColor === pal.id
                    ? "bg-white border-primary ring-1 ring-primary shadow-xs font-bold"
                    : "bg-white/60 border-black/5 hover:border-black/20 text-black/40"
                }`}
              >
                <div className="flex -space-x-1">
                  {pal.hexes.map((hx, hi) => (
                    <span
                      key={hi}
                      className="w-3.5 h-3.5 rounded-full inline-block border border-black/10"
                      style={{ backgroundColor: hx }}
                    />
                  ))}
                </div>
                <span className="font-label-sm text-[11px] font-medium text-black">
                  {pal.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Venue Size Visualization Layouts */}
        <div className="pt-4">
          <span className="font-label-sm text-[11px] uppercase tracking-[0.2em] text-black/40 font-bold block mb-1">
            ✦ Venue Size Visualization
          </span>
          <p className="font-body text-[12px] text-black/60 font-light mb-4">
            Calibrates spatial parameters, stage frame breadth, and necessary
            aisle coverage elements.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {venueSizes.map((vsize) => (
              <div
                key={vsize.id}
                onClick={() => setSelectedVenueSize(vsize.id)}
                className={`p-5 min-h-[200px] rounded-[24px] border bg-white cursor-pointer transition-all duration-300 relative flex flex-col justify-between ${
                  selectedVenueSize === vsize.id
                    ? "border-black ring-1 ring-black shadow-md"
                    : "border-black/5 hover:border-black/20"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-label-sm text-[9px] uppercase tracking-widest text-primary block font-bold">
                      {vsize.capacity}
                    </span>
                    <h5 className="font-display text-[16px] text-black font-medium">
                      {vsize.label}
                    </h5>
                  </div>
                  <span
                    className={`material-symbols-outlined text-[20px] ${selectedVenueSize === vsize.id ? "text-primary" : "text-black/10"}`}
                  >
                    {selectedVenueSize === vsize.id
                      ? "check_circle"
                      : "radio_button_unchecked"}
                  </span>
                </div>

                <div className="aspect-[21/9] w-full rounded-xl overflow-hidden bg-[#fcfbf9] relative mb-3">
                  <img
                    onError={handleImageError}
                    src={vsize.previewImg}
                    alt={vsize.label}
                    className="w-full h-full object-cover filter brightness-[0.9]"
                  />
                </div>

                <p className="font-body text-[11px] text-black/50 leading-relaxed font-light">
                  {vsize.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Clean Live Preview Card block */}
        <div className="pt-2">
          <div className="bg-white rounded-[32px] p-6 border border-black/5 shadow-sm flex flex-col md:flex-row items-center gap-6">
            <div className="aspect-[4/3] w-full md:w-80 rounded-[20px] overflow-hidden bg-[#fcfbf9] shrink-0 relative">
              <img
                onError={handleImageError}
                src={currentThemeLook}
                className="w-full h-full object-cover"
                alt="Live Studio Setup Concept"
              />
              <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full font-label-sm text-[8px] uppercase tracking-widest font-bold text-primary">
                Live Preview
              </span>
            </div>
            <div className="space-y-3 flex-1 text-center md:text-left">
              <span className="font-label-sm text-[10px] uppercase tracking-[0.3em] text-primary font-bold block">
                Recommended Decor Concepts
              </span>
              <h4 className="font-display text-[22px] text-black font-normal">
                {selectedTheme} {eventType} Blueprint
              </h4>
              <p className="font-body text-[13px] text-black/50 font-light leading-relaxed">
                Bound cleanly to{" "}
                <strong className="font-medium text-black">
                  {selectedColor}
                </strong>{" "}
                swatches tailored for your{" "}
                <strong className="font-medium text-black">
                  {
                    venueSizes.find((s) => s.id === selectedVenueSize)
                      ?.label
                  }
                </strong>{" "}
                footprint. Highly structured staging components automatically
                scaled for maximum venue presence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Decor Modules Toggles Grid & Dynamic Quote Matrix */}
      <section className="pt-6 border-t border-black/5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Checklist Grid */}
          <div className="lg:col-span-8 space-y-6">
            <div>
              <h3 className="font-headline-sm text-black mb-2 font-normal">
                Select Decor Modules
              </h3>
              <p className="font-body text-[13px] text-black/60 font-light">
                Toggle targeted spatial setup structures below. Prominent
                options carry our recommended package seal.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {packageModules.map((mod) => {
                const isSelected = selectedModules.includes(mod.id);
                return (
                  <div
                    key={mod.id}
                    onClick={() => handleModuleToggle(mod.id)}
                    className={`p-6 min-h-[160px] rounded-[24px] border transition-all duration-300 cursor-pointer relative flex flex-col justify-between bg-white ${
                      isSelected
                        ? "border-primary ring-1 ring-primary shadow-sm"
                        : "border-black/5 hover:border-black/20 opacity-90"
                    }`}
                  >
                    {mod.isPopular && (
                      <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-[8px] uppercase tracking-wider font-bold">
                        Most Popular
                      </span>
                    )}

                    <div
                      className={`absolute top-4 right-4 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-black border-black text-white"
                          : "border-black/10 text-transparent"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        done
                      </span>
                    </div>

                    <div className="pt-4">
                      <h4 className="font-display text-[18px] font-medium text-black mb-1.5 pr-6">
                        {mod.label}
                      </h4>
                      <p className="font-body text-[12px] text-black/50 font-light leading-relaxed mb-4 line-clamp-2">
                        {mod.desc}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-black/5 flex items-center justify-between">
                      <span className="font-label-sm text-[10px] text-black/30 uppercase tracking-widest font-bold">
                        Base Rate
                      </span>
                      <span className="font-display italic text-[14px] text-primary font-medium">
                        ₹{mod.basePrice.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Package Summary Sidebar with Real-Time Quote */}
          <div className="lg:col-span-4 lg:sticky lg:top-32 space-y-6">
            <div className="bg-black text-white rounded-[32px] p-8 shadow-xl border border-white/5 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <span className="font-label-sm text-[10px] text-primary uppercase tracking-[0.4em] font-bold">
                  Live Quote Engine
                </span>
                <span className="text-[9px] bg-white/10 px-2.5 py-1 rounded-full font-bold text-white uppercase tracking-widest">
                  {selectedModules.length} Items
                </span>
              </div>

              <div>
                <p className="font-label-sm text-[10px] uppercase tracking-widest text-white/40 mb-1">
                  Estimated Package Price
                </p>
                <p className="font-display text-[34px] md:text-[40px] text-gold font-normal leading-tight">
                  ₹{estimatedPackagePrice.toLocaleString("en-IN")}
                </p>
                <p className="font-body text-[11px] text-white/30 font-light mt-1.5">
                  *Total scales based on venue footprint ({selectedVenueSize}).
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="font-label-sm text-[9px] uppercase tracking-[0.2em] text-white/40 block font-bold mb-2">
                  Included Package Items:
                </span>
                <ul className="space-y-1.5 font-body text-[12px] text-white/60 font-light">
                  {selectedModules.map((modId) => {
                    const mObj = packageModules.find((m) => m.id === modId);
                    return mObj ? (
                      <li
                        key={modId}
                        className="flex items-center justify-between"
                      >
                        <span className="truncate pr-2">✔ {mObj.label}</span>
                        <span className="font-mono text-[11px] opacity-50 shrink-0">
                          ₹{(mObj.basePrice / 1000).toFixed(0)}K
                        </span>
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>

              <div className="pt-4 space-y-3 border-t border-white/10">
                <button
                  onClick={() => {
                    setActiveTab("intake");
                    document
                      .getElementById("studio-workspace")
                      ?.scrollIntoView({ behavior: "smooth" });
                    triggerToast(
                      "Selected modules registered. Finalize your contact logistics to dispatch!",
                    );
                  }}
                  className="w-full bg-primary text-black py-4 rounded-full font-label-sm text-[11px] uppercase tracking-[0.3em] font-bold hover:shadow-xl transition-all cursor-pointer block text-center"
                >
                  Lock Blueprint
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Navigation Ribbon: Sliding Forward or Backward */}
      <div className="pt-8 mt-12 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            setActiveTab("intake");
            document
              .getElementById("studio-workspace")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
          className="px-6 py-2.5 rounded-full bg-white text-black/40 hover:text-black border border-black/5 font-label-sm text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[14px]">
            arrow_back
          </span>
          <span>Slide Back</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("showcase");
            document
              .getElementById("studio-workspace")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
          className="px-6 py-3 rounded-full bg-black text-white font-label-sm text-[11px] uppercase tracking-[0.2em] font-bold transition-all cursor-pointer flex items-center gap-2 shadow-md"
        >
          <span>Slide to Showcase</span>
          <span className="material-symbols-outlined text-[16px]">
            arrow_forward
          </span>
        </button>
      </div>

      {/* Mobile Sticky Price Bar */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-50 px-4 pb-4 bg-gradient-to-t from-surface-container-low via-surface-container-low/80 to-transparent pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="bg-black text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 border border-white/10">
            <div className="flex-1">
              <span className="font-label-sm text-[8px] uppercase tracking-widest text-white/40 block">
                Estimated Package
              </span>
              <span className="font-display text-lg text-gold font-bold">
                ₹{estimatedPackagePrice.toLocaleString("en-IN")}
              </span>
            </div>
            <button
              onClick={() => {
                setActiveTab("intake");
                document
                  .getElementById("studio-workspace")
                  ?.scrollIntoView({ behavior: "smooth" });
                triggerToast("Blueprint Locked!");
              }}
              className="bg-primary text-black px-6 py-2.5 rounded-xl font-label-sm text-[10px] uppercase tracking-widest font-bold shadow-lg"
            >
              Lock Blueprint
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
