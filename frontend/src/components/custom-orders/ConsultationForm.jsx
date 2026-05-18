import React from "react";
import { motion } from "framer-motion";

export function ConsultationForm({
  formData,
  setFormData,
  formSubmitted,
  handleSubmit,
  handleReset,
  uploadedFiles,
  setUploadedFiles,
  handleFileUpload,
  pinterestLink,
  setPinterestLink,
  handleAddPinterest,
  bookingType,
  setBookingType,
  handleImageError,
}) {
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
      variants={windowVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-12 relative z-10"
    >
      <div className="max-w-3xl mb-10">
        <h2 className="font-headline-md text-black mb-3 font-normal">
          Start Your Studio Consultation
        </h2>
        <p className="font-body-md text-black/60 font-light leading-relaxed">
          Submit your master decor details and visual look references directly
          below. Our core design board will compile your custom package
          instantly.
        </p>
      </div>

      {!formSubmitted ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Upload Inspirations Sanctuary */}
          <div className="lg:col-span-5 bg-white rounded-[32px] p-6 sm:p-8 border border-black/5 shadow-sm space-y-6">
            <div>
              <span className="font-label-sm text-[11px] text-primary uppercase tracking-[0.3em] block font-bold mb-1">
                Upload Inspirations
              </span>
              <h4 className="font-display text-[20px] text-black font-normal">
                Share Your Creative Vision
              </h4>
              <p className="font-body text-[12px] text-black/50 font-light">
                Attach reference mood photos, layout floorplans, or saved
                Pinterest frames.
              </p>
            </div>

            <div
              onClick={handleFileUpload}
              className="border-2 border-dashed border-black/10 hover:border-primary rounded-2xl p-8 text-center bg-[#fcfbf9]/50 cursor-pointer transition-all duration-300 group flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[24px]">
                  add_photo_alternate
                </span>
              </div>
              <p className="font-display text-[14px] font-medium text-black mb-1">
                Click to simulate dragging inspiration documents
              </p>
              <p className="font-body text-[11px] text-black/40 italic">
                Accepts standard images, screenshots & PDF venue drafts up to
                25MB.
              </p>
            </div>

            <div className="space-y-2">
              <label className="font-label-sm text-[11px] uppercase tracking-wider text-black/60 block font-bold">
                Attach External Board Link
              </label>
              <div className="flex items-center bg-[#fcfbf9] rounded-xl border border-black/5 p-1 focus-within:border-primary transition-all">
                <span className="material-symbols-outlined text-black/20 text-[18px] pl-2">
                  link
                </span>
                <input
                  type="url"
                  placeholder="Paste Pinterest link or folder share URL..."
                  value={pinterestLink}
                  onChange={(e) => setPinterestLink(e.target.value)}
                  className="flex-1 bg-transparent px-2.5 py-2 text-[12px] outline-none focus:ring-0 border-none text-black placeholder:text-black/30"
                />
                <button
                  type="button"
                  onClick={handleAddPinterest}
                  className="bg-black text-white px-4 py-2 rounded-lg font-label-sm text-[9px] uppercase tracking-wider font-bold hover:bg-primary transition-colors shrink-0 cursor-pointer"
                >
                  Attach Link
                </button>
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="pt-4 border-t border-black/5 space-y-2.5">
                <span className="font-label-sm text-[11px] uppercase tracking-widest text-black/40 block font-bold">
                  Attached Files ({uploadedFiles.length}):
                </span>
                <div className="space-y-2">
                  {uploadedFiles.map((uf, ufi) => (
                    <div
                      key={ufi}
                      className="flex items-center justify-between bg-[#fcfbf9] px-3 py-2 rounded-xl border border-black/5 text-[11px]"
                    >
                      <div className="flex items-center gap-2 overflow-hidden pr-2">
                        <span className="material-symbols-outlined text-[16px] text-primary shrink-0">
                          {uf.type === "link"
                            ? "link"
                            : uf.type === "pdf"
                              ? "picture_as_pdf"
                              : "image"}
                        </span>
                        <span className="truncate font-medium text-black">
                          {uf.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setUploadedFiles(
                            uploadedFiles.filter((_, i) => i !== ufi),
                          )
                        }
                        className="text-black/20 hover:text-red-500 font-bold px-1 text-[13px] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Custom Order Details Input Matrix */}
          <div className="lg:col-span-7 bg-white rounded-[32px] p-6 sm:p-8 border border-black/5 shadow-sm space-y-6">
            <div>
              <span className="font-label-sm text-[10px] text-primary uppercase tracking-[0.3em] block font-bold mb-1">
                Custom Order Details
              </span>
              <h4 className="font-display text-[20px] text-black font-normal">
                Primary Contact Logistics
              </h4>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-label-sm text-[11px] uppercase tracking-wider text-black/40 flex items-center gap-1.5 font-bold mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Your Full Name *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Rohan & Family"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 font-body text-[13px] outline-none focus:ring-0 focus:border-primary text-black transition-all"
                  />
                </div>

                <div>
                  <label className="font-label-sm text-[10px] uppercase tracking-wider text-black/40 flex items-center gap-1.5 font-bold mb-1.5">
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    <span>WhatsApp Phone Number *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 font-body text-[13px] outline-none focus:ring-0 focus:border-primary text-black transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-label-sm text-[10px] uppercase tracking-wider text-black/40 flex items-center gap-1.5 font-bold mb-1.5">
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    <span>Target Celebration Date *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.eventDate}
                    onChange={(e) =>
                      setFormData({ ...formData, eventDate: e.target.value })
                    }
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 font-body text-[13px] outline-none focus:ring-0 focus:border-primary text-black cursor-pointer transition-all"
                  />
                </div>

                <div>
                  <label className="font-label-sm text-[10px] uppercase tracking-wider text-black/40 flex items-center gap-1.5 font-bold mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-black/10 inline-block" />
                    <span>Target Venue City / Location</span>
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., ITC Gardenia, Bangalore"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 font-body text-[13px] outline-none focus:ring-0 focus:border-primary text-black transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="font-label-sm text-[11px] uppercase tracking-wider text-black/40 flex items-center gap-1.5 font-bold mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Preferred Consultation Mode *</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    "Video Meet",
                    "Priority WhatsApp",
                    "Phone Call",
                    "On-site Studio",
                  ].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setBookingType(mode)}
                      className={`p-3 rounded-xl border text-[10px] font-bold text-center transition-all cursor-pointer uppercase tracking-widest ${
                        bookingType === mode
                          ? "bg-black text-white border-black shadow-md"
                          : "bg-white text-black/40 border-black/5 hover:border-black/20"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-label-sm text-[10px] uppercase tracking-wider text-black/40 flex items-center gap-1.5 font-bold mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-black/10 inline-block" />
                  <span>Artisanal Textures & Ambient Requests</span>
                </label>
                <input
                  type="text"
                  placeholder="E.g., Heritage silk drapes combined with traditional golden lanterns and scaper accents..."
                  value={formData.aestheticDirective}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      aestheticDirective: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 font-body text-[13px] outline-none focus:ring-0 focus:border-primary text-black transition-all"
                />
              </div>

              <div>
                <label className="font-label-sm text-[10px] uppercase tracking-wider text-black/40 flex items-center gap-1.5 font-bold mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-black/10 inline-block" />
                  <span>Additional Notes or Traditional Requests</span>
                </label>
                <textarea
                  placeholder="Share any special seating considerations, custom backings, specific colors, or guest arrangement needs..."
                  value={formData.customNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, customNotes: e.target.value })
                  }
                  className="w-full bg-white border border-black/10 rounded-xl p-4 font-body text-[13px] outline-none focus:ring-0 focus:border-primary min-h-[80px] text-black transition-all"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-black hover:bg-primary text-white py-4 rounded-full font-label-sm text-[11px] uppercase tracking-[0.3em] font-bold hover:shadow-xl transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <span>Dispatch Blueprint</span>
                  <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[32px] p-8 md:p-12 border border-black/5 shadow-xl text-center space-y-6 max-w-2xl mx-auto"
        >
          <span className="material-symbols-outlined text-[56px] text-primary animate-bounce block">
            check_circle
          </span>
          <div>
            <span className="font-label-sm text-[12px] uppercase tracking-[0.4em] text-primary block font-bold mb-1">
              INQUIRY RECEIVED
            </span>
            <h4 className="font-display text-[24px] text-black font-normal">
              Master Blueprint Dispatched
            </h4>
          </div>
          <p className="font-body text-[13px] text-black/50 font-light leading-relaxed">
            Thank you,{" "}
            <strong className="font-medium text-black">
              {formData.name || "Visionary"}
            </strong>
            . Your event logistics and{" "}
            <span className="underline">
              {uploadedFiles.length} inspiration frames
            </span>{" "}
            have synced instantly with our core decorators. We will communicate
            via{" "}
            <strong className="font-medium text-black">{bookingType}</strong>{" "}
            shortly.
          </p>

          <div className="pt-4 border-t border-black/5 flex justify-center">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-2.5 rounded-full font-label-sm text-[10px] uppercase tracking-widest font-bold cursor-pointer border border-black/10 text-black/40 hover:text-primary hover:border-primary transition-all"
            >
              Submit Another Project Brief
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
