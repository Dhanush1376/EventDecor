import { m as motion } from 'framer-motion';
import { OptimizedImage } from '../../../components/ui/OptimizedImage';
import toast from 'react-hot-toast';
import { uploadService } from '../../../services/domainServices';
import { compressImage } from '../../../utils/media/imageCompressor';
import Check from 'lucide-react/dist/esm/icons/check';

export function CustomizerDrawer({
  selectedShowcase,
  setSelectedShowcase,
  customInclusions,
  setCustomInclusions,
  rentalDurationDays,
  setRentalDurationDays,
  selectedPaletteColor,
  setSelectedPaletteColor,
  placementPreference,
  setPlacementPreference,
  uploadedReferenceUrl,
  setUploadedReferenceUrl,
  customNote,
  setCustomNote,
  bookingDate,
  setBookingDate,
  aiSuggestions,
  calculateLivePrice,
  handleBookRental,
  handleOpenShowcase,
}) {
  if (!selectedShowcase) return null;

  const toggleInclusion = (name) => {
    setCustomInclusions((prev) =>
      prev.map((inc) => (inc.name === name ? { ...inc, selected: !inc.selected } : inc)),
    );
  };

  const updateInclusionQty = (name, delta) => {
    setCustomInclusions((prev) =>
      prev.map((inc) => (inc.name === name ? { ...inc, qty: Math.max(1, inc.qty + delta) } : inc)),
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setSelectedShowcase(null)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative w-full max-w-[620px] h-full bg-white shadow-2xl flex flex-col z-10 overflow-y-auto"
      >
        <div className="relative h-64 lg:h-72 w-full overflow-hidden shrink-0">
          <OptimizedImage
            src={selectedShowcase.image}
            className="w-full h-full object-cover"
            alt={selectedShowcase.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <button
            onClick={() => setSelectedShowcase(null)}
            className="absolute top-4 right-4 w-10 h-10 min-h-0 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
          <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
            <span className="font-label text-[8px] tracking-[0.2em] text-[#ffe088] uppercase block font-bold">
              RENTAL SHOWCASE THEME
            </span>
            <h2 className="font-display text-2xl font-light leading-tight">
              {selectedShowcase.title}
            </h2>
            <p className="font-body text-white/70 text-[11px] font-light italic truncate">
              {selectedShowcase.subtitle}
            </p>
          </div>
        </div>

        <div className="p-6 lg:p-8 space-y-8 flex-1">
          <div className="space-y-2">
            <h4 className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold">
              Artisan Composition & Story
            </h4>
            <p className="font-body text-xs text-black/60 leading-relaxed font-light">
              {selectedShowcase.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200/50">
            <div className="space-y-1">
              <label className="font-label text-[8px] uppercase tracking-widest text-black/50 font-bold block">
                Ceremony Date *
              </label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full min-w-0 overflow-hidden px-4 py-2.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="font-label text-[8px] uppercase tracking-widest text-black/50 font-bold block">
                Rental Days
              </label>
              <select
                value={rentalDurationDays}
                onChange={(e) => setRentalDurationDays(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium"
              >
                <option value={1}>1 Day Setup (Standard)</option>
                <option value={2}>2 Days Setup (Ceremony + Return)</option>
                <option value={3}>3 Days Setup (Extensive)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold">
                Configure Handcrafted Props
              </h4>
              <span className="font-body text-[10px] text-primary italic font-semibold">
                Mix & Match Items
              </span>
            </div>
            <div className="space-y-2">
              {customInclusions.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    item.selected
                      ? 'bg-[#fdfbf7] border-primary/20 shadow-2xs'
                      : 'bg-neutral-50/50 border-neutral-200/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleInclusion(item.name)}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-[#6a8738] ml-3 uppercase tracking-wider">
                      <Check className="w-3 h-3 mr-1 inline-block -mt-0.5" /> Validated
                    </span>
                  </div>
                  {item.selected && (
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => updateInclusionQty(item.name, -1)}
                        className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-xs hover:bg-stone-200 font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono text-xs font-bold text-black w-5 text-center">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateInclusionQty(item.name, 1)}
                        className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-xs hover:bg-stone-200 font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold block">
                Silk Thread / Accent Palette
              </label>
              <div className="flex gap-2">
                {selectedShowcase.colorPalette?.map((color, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedPaletteColor(color)}
                    className={`w-8 h-8 rounded-full border cursor-pointer transition-all flex items-center justify-center shadow-xs ${
                      selectedPaletteColor === color
                        ? 'ring-2 ring-primary ring-offset-2 scale-110'
                        : 'border-black/10 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold block">
                Placement Destination
              </label>
              <select
                value={placementPreference}
                onChange={(e) => setPlacementPreference(e.target.value)}
                className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium"
              >
                <option value="Side-Stage Showcase Corner">Side-Stage Showcase Corner</option>
                <option value="Entrance Presentation Desk">Entrance Presentation Desk</option>
                <option value="Traditional Mandap Flanks">Traditional Mandap Flanks</option>
                <option value="Groom/Bride Seating Podiums">Groom/Bride Seating Podiums</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold block">
              Upload placement visual blueprint (Optional)
            </label>
            <div className="border border-dashed border-black/10 rounded-2xl p-5 text-center bg-stone-50/50 hover:bg-stone-50 transition-colors relative cursor-pointer flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">
                cloud_upload
              </span>
              <span className="font-body text-xs text-black font-semibold">
                Upload Arrangement Reference
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const toastId = toast.loading('Uploading reference image...');
                  try {
                    const optimized = await compressImage(file);
                    const formData = new FormData();
                    formData.append('images', optimized);
                    const res = await uploadService.uploadImages(formData, 'showcases');
                    if (res.success && res.images.length > 0) {
                      setUploadedReferenceUrl(res.images[0]);
                      toast.success('Image uploaded successfully!', { id: toastId });
                    } else {
                      toast.error('Failed to upload image', { id: toastId });
                    }
                  } catch (_err) {
                    toast.error('Failed to upload image', { id: toastId });
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            {uploadedReferenceUrl && (
              <span className="font-mono text-[10px] text-[#8B0000] block font-semibold">
                <Check className="w-3.5 h-3.5 mr-1 inline-block -mt-0.5" /> Linked successfully!
              </span>
            )}
          </div>

          <div className="space-y-2">
            <label className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold block">
              Arrangement Instruction Notes
            </label>
            <textarea
              placeholder="Enter traditional naming preferences, gift tray custom wording, or placement dimensions..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full p-4 rounded-2xl border border-black/10 bg-stone-50/20 text-xs h-24 resize-none focus:border-primary outline-none font-medium"
            />
          </div>

          <div className="space-y-3 pt-6 border-t border-black/5">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">insights</span>
              <h4 className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">
                Artisan AI Recommended Pairings
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aiSuggestions.map((sug) => (
                <div
                  key={sug._id || sug.id}
                  onClick={() => handleOpenShowcase(sug)}
                  className="flex items-center gap-3 p-2.5 bg-stone-50/80 border border-stone-200/60 rounded-2xl cursor-pointer hover:bg-stone-50 hover:shadow-xs transition-all"
                >
                  <OptimizedImage
                    src={sug.image}
                    className="w-14 h-14 object-cover rounded-xl shadow-2xs"
                    alt={sug.title}
                  />
                  <div className="min-w-0">
                    <h5 className="font-body text-xs text-black font-bold truncate">{sug.title}</h5>
                    <span className="font-body text-[10px] text-black/50 block font-semibold">
                      Add to Setup (+₹{(sug.rentalPrice || 15000).toLocaleString('en-IN')})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8 border-t border-black/5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shrink-0">
            <div className="space-y-0.5">
              <span className="font-label text-[9px] uppercase tracking-widest text-black/40 block font-bold">
                Live Rental Valuation
              </span>
              <span className="font-body text-3xl font-bold text-black shrink-0">
                ₹{calculateLivePrice().toLocaleString('en-IN')}*
              </span>
              <span className="font-body text-[10px] text-black/40 block font-light">
                *Includes stage-hand logistics clearance
              </span>
            </div>

            <button
              type="button"
              onClick={handleBookRental}
              className="flex-1 lg:flex-none bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-dark)] hover:opacity-95 text-white px-8 py-4 rounded-full font-label uppercase text-xs tracking-widest font-bold shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Rent & Dispatch Showcase
              <span className="material-symbols-outlined text-[18px]">featured_play_list</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
