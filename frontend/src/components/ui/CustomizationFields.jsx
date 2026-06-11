import React, { useState, useRef } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { uploadService } from '../../services/domainServices';
import { OptimizedImage } from './OptimizedImage';
import toast from 'react-hot-toast';

// ─── Constants ───
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const getFileType = (mimeType) => {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'voice';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
  return 'other';
};

const isImageUrl = (url) => {
  if (!url) return false;
  return url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || url.includes('cloudinary.com');
};

// ═══════════════════════════════════════
// ─── COLOR PICKER FIELD ───
// ═══════════════════════════════════════
export function ColorPickerField({ colors, onChange, label }) {
  const [showPicker, setShowPicker] = useState(false);
  const presetColors = [
    '#d4af37',
    '#A6192E',
    '#2E8B57',
    '#1a1c1a',
    '#ffffff',
    '#FFD700',
    '#FF4500',
    '#4169E1',
    '#8B4513',
    '#800080',
    '#FF69B4',
    '#00CED1',
  ];

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[10px] font-bold uppercase text-[var(--color-gold)] tracking-wider block">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {(colors || []).map((color, i) => (
          <div key={i} className="relative group">
            <div
              className="w-8 h-8 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform"
              style={{ background: color }}
            />
            <button
              type="button"
              onClick={() => onChange(colors.filter((_, idx) => idx !== i))}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="w-8 h-8 rounded-full border-2 border-dashed border-black/20 flex items-center justify-center hover:border-[var(--color-gold)] transition-colors"
        >
          <span className="material-symbols-outlined text-[14px] text-black/40">add</span>
        </button>
      </div>
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap gap-2 p-3 bg-white rounded-xl border border-black/10 shadow-lg"
          >
            {presetColors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onChange([...(colors || []), c]);
                  setShowPicker(false);
                }}
                className="w-7 h-7 rounded-full border border-black/10 hover:scale-125 transition-transform shadow-sm"
                style={{ background: c }}
              />
            ))}
            <div className="flex items-center gap-1 mt-1 w-full">
              <input
                type="color"
                className="w-7 h-7 rounded-lg border-none cursor-pointer"
                onChange={(e) => {
                  onChange([...(colors || []), e.target.value]);
                  setShowPicker(false);
                }}
              />
              <span className="text-[10px] text-black/40 font-medium">Custom color</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════
// ─── FILE UPLOAD ZONE ───
// ═══════════════════════════════════════
export function FileUploadZone({
  label,
  accept,
  onUpload,
  files,
  onRemove,
  multiple = true,
  helperText,
  uploadFolder = 'custom-orders',
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);

  const handleFiles = async (fileList) => {
    const fileArr = Array.from(fileList);
    if (fileArr.length === 0) return;

    const oversized = fileArr.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      toast.error(`File "${oversized.name}" exceeds 50MB limit`);
      return;
    }

    setUploading(true);
    setProgress(10);
    const interval = setInterval(() => setProgress((p) => (p < 90 ? p + 10 : p)), 200);

    try {
      const uploadPromises = fileArr.map(async (file) => {
        const formData = new FormData();
        formData.append('images', file);
        const res = await uploadService.uploadImages(formData, uploadFolder);
        if (res.success && res.images?.[0]) {
          return {
            url: res.images[0],
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            fileType: getFileType(file.type),
            uploadedAt: new Date().toISOString(),
          };
        }
        return null;
      });

      const results = await Promise.all(uploadPromises);
      const uploaded = results.filter(Boolean);
      if (uploaded.length > 0) {
        onUpload(uploaded);
        toast.success(`${uploaded.length} file${uploaded.length > 1 ? 's' : ''} uploaded`);
      }
    } catch (err) {
      toast.error('Upload failed. Please try again.');
    } finally {
      clearInterval(interval);
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[10px] font-bold uppercase text-[var(--color-gold)] tracking-wider block">
          {label}
        </label>
      )}
      {helperText && <p className="text-[11px] text-black/40 font-light -mt-1">{helperText}</p>}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 ${
          uploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
        } ${
          isDragOver
            ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/5 scale-[1.01]'
            : 'border-black/10 hover:border-[var(--color-gold)]/50 bg-[var(--color-surface-ivory)]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        {uploading ? (
          <div className="space-y-2">
            <span className="material-symbols-outlined text-[24px] text-[var(--color-gold)] animate-pulse">
              cloud_upload
            </span>
            <p className="text-[11px] font-bold text-[var(--color-gold)]">Uploading...</p>
            <div className="w-full bg-black/5 h-1.5 rounded-full overflow-hidden max-w-[200px] mx-auto">
              <div
                className="bg-[var(--color-gold)] h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(212,175,55,0.4)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <span className="material-symbols-outlined text-[28px] text-black/20 mb-1 block">
              cloud_upload
            </span>
            <p className="text-[12px] font-bold text-black/60">
              Drop files here or <span className="text-[var(--color-gold)] underline">browse</span>
            </p>
            <p className="text-[10px] text-black/30 mt-1">Max 50MB per file</p>
          </>
        )}
      </div>

      {/* Uploaded Files List */}
      {files && files.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {files.map((file, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-black/5 shadow-xs group"
            >
              {file.fileType === 'image' && isImageUrl(file.url) ? (
                <img
                  src={file.url}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover border border-black/5"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-ivory)] border border-black/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px] text-black/30">
                    {file.fileType === 'document'
                      ? 'description'
                      : file.fileType === 'video'
                        ? 'videocam'
                        : 'attach_file'}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-black/70 truncate">
                  {file.originalName || 'File'}
                </p>
                <p className="text-[9px] text-black/30 uppercase tracking-wider">
                  {file.fileType} • {(file.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(i);
                }}
                className="w-6 h-6 rounded-full bg-red-50 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 shrink-0"
              >
                <span className="material-symbols-outlined text-[12px]">close</span>
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// ─── PRODUCT SUMMARY CARD ───
// ═══════════════════════════════════════
export function ProductSummaryCard({ product, onClear }) {
  if (!product) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-[var(--color-gold)]/20 shadow-sm p-4 flex gap-4 items-center relative overflow-hidden"
    >
      {/* Decorative accent */}
      <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-gold)]" />

      {/* Product Image */}
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border border-black/5 shrink-0 bg-[var(--color-surface-ivory)]">
        {product.imageSrc ? (
          <OptimizedImage
            src={product.imageSrc}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px] text-black/20">image</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[8px] font-extrabold uppercase tracking-[0.2em] text-[var(--color-gold)] bg-[var(--color-gold)]/10 px-2 py-0.5 rounded-full">
            Customizing
          </span>
        </div>
        <h4 className="text-[14px] md:text-[16px] font-bold text-[var(--color-on-surface)] truncate leading-tight">
          {product.title}
        </h4>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
          <span className="text-[10px] text-[#685C57] font-medium uppercase tracking-wider">
            {product.category || 'Artisanal'}
          </span>
          <span className="text-[10px] text-black/20">•</span>
          <span className="text-[10px] font-mono text-[#685C57]">
            SKU: SIRI-{(product._id || product.id || '').slice(-6).toUpperCase()}
          </span>
          {product.price > 0 && (
            <>
              <span className="text-[10px] text-black/20">•</span>
              <span className="text-[11px] font-bold text-[var(--color-on-surface)]">
                ₹{product.price?.toLocaleString('en-IN')}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Clear Button */}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="w-8 h-8 rounded-full bg-black/5 hover:bg-red-50 text-black/40 hover:text-red-500 flex items-center justify-center transition-all shrink-0"
          title="Remove linked product"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════
// ─── CUSTOMIZATION SECTION ───
// Grouped customization fields rendered
// as collapsible accordion blocks
// ═══════════════════════════════════════

function AccordionBlock({ title, icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-black/5 rounded-2xl overflow-hidden bg-white shadow-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--color-surface-ivory)]/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[18px] text-[var(--color-gold)]">
            {icon}
          </span>
          <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-on-surface)]">
            {title}
          </span>
        </div>
        <span
          className={`material-symbols-outlined text-[18px] text-black/30 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-4 border-t border-black/5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const MATERIAL_OPTIONS = [
  'Real Flowers (Fresh)',
  'Artificial Silk Flowers',
  'Brass & Copper',
  'Silver Plated',
  'Gold Plated',
  'Teak Wood',
  'Rosewood',
  'Velvet Fabric',
  'Silk Fabric',
  'Mixed Materials',
  'Other (specify in notes)',
];

const ADDON_OPTIONS = [
  { id: 'led', label: 'LED Lighting', icon: 'lightbulb' },
  { id: 'mirrors', label: 'Mirror Accents', icon: 'filter_frames' },
  { id: 'nameplate', label: 'Custom Nameplate', icon: 'badge' },
  { id: 'garlands', label: 'Floral Garlands', icon: 'local_florist' },
  { id: 'bells', label: 'Brass Bells', icon: 'notifications' },
  { id: 'rangoli', label: 'Rangoli Base', icon: 'palette' },
];

export function ProductCustomizationSection({ customization, onChange, product }) {
  const update = (field, value) => {
    onChange({ ...customization, [field]: value });
  };

  return (
    <div className="space-y-3">
      {/* Custom Text */}
      <AccordionBlock title="Custom Text & Engraving" icon="text_fields" defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase text-[#685C57] tracking-wider block mb-1.5">
              Engraving / Printed Text
            </label>
            <input
              type="text"
              value={customization.engravingText || ''}
              onChange={(e) => update('engravingText', e.target.value)}
              placeholder="E.g., Ram & Sita — 25.12.2026"
              maxLength={100}
              className="w-full bg-[var(--color-surface-ivory)] border border-black/10 rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-[var(--color-gold)] text-[var(--color-on-surface)] transition-all"
            />
            <span className="text-[9px] text-black/30 mt-0.5 block text-right">
              {(customization.engravingText || '').length}/100
            </span>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-[#685C57] tracking-wider block mb-1.5">
              Monogram / Initials
            </label>
            <input
              type="text"
              value={customization.monogram || ''}
              onChange={(e) => update('monogram', e.target.value)}
              placeholder="E.g., R & S"
              maxLength={20}
              className="w-full bg-[var(--color-surface-ivory)] border border-black/10 rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-[var(--color-gold)] text-[var(--color-on-surface)] transition-all"
            />
          </div>
        </div>
      </AccordionBlock>

      {/* Dimensions */}
      <AccordionBlock title="Custom Dimensions" icon="straighten" defaultOpen={false}>
        <div className="grid grid-cols-3 gap-3">
          {['width', 'height', 'depth'].map((dim) => (
            <div key={dim}>
              <label className="text-[10px] font-bold uppercase text-[#685C57] tracking-wider block mb-1.5 capitalize">
                {dim} (cm)
              </label>
              <input
                type="number"
                min="0"
                max="500"
                value={customization[dim] || ''}
                onChange={(e) => update(dim, e.target.value)}
                placeholder="—"
                className="w-full bg-[var(--color-surface-ivory)] border border-black/10 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[var(--color-gold)] text-[var(--color-on-surface)] transition-all text-center font-mono"
              />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-black/30 italic">
          Leave empty to use the product's standard dimensions.
        </p>
      </AccordionBlock>

      {/* Color Selection */}
      <AccordionBlock title="Color Preferences" icon="palette" defaultOpen={false}>
        <ColorPickerField
          label="Select your preferred colors"
          colors={customization.colors || []}
          onChange={(colors) => update('colors', colors)}
        />
        <p className="text-[10px] text-black/30 italic">
          Pick colors that match your wedding theme or outfit palette.
        </p>
      </AccordionBlock>

      {/* Material Selection */}
      <AccordionBlock title="Material Selection" icon="texture" defaultOpen={false}>
        <div>
          <label className="text-[10px] font-bold uppercase text-[#685C57] tracking-wider block mb-1.5">
            Preferred Material
          </label>
          <select
            value={customization.material || ''}
            onChange={(e) => update('material', e.target.value)}
            className="w-full bg-[var(--color-surface-ivory)] border border-black/10 rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-[var(--color-gold)] text-[var(--color-on-surface)] transition-all appearance-none cursor-pointer"
          >
            <option value="">Select a material...</option>
            {MATERIAL_OPTIONS.map((mat) => (
              <option key={mat} value={mat}>
                {mat}
              </option>
            ))}
          </select>
        </div>
      </AccordionBlock>

      {/* Add-on Features */}
      <AccordionBlock title="Add-on Features" icon="add_circle" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2.5">
          {ADDON_OPTIONS.map((addon) => {
            const selected = (customization.addons || []).includes(addon.id);
            return (
              <button
                key={addon.id}
                type="button"
                onClick={() => {
                  const current = customization.addons || [];
                  const next = selected
                    ? current.filter((a) => a !== addon.id)
                    : [...current, addon.id];
                  update('addons', next);
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all duration-200 ${
                  selected
                    ? 'bg-[var(--color-gold)]/10 border-[var(--color-gold)]/40 shadow-sm'
                    : 'bg-[var(--color-surface-ivory)] border-black/5 hover:border-black/15'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${selected ? 'text-[var(--color-gold)]' : 'text-black/30'}`}
                >
                  {addon.icon}
                </span>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${selected ? 'text-[var(--color-on-surface)]' : 'text-black/50'}`}
                >
                  {addon.label}
                </span>
                {selected && (
                  <span className="material-symbols-outlined text-[14px] text-[var(--color-gold)] ml-auto">
                    check_circle
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </AccordionBlock>

      {/* Additional Instructions */}
      <AccordionBlock title="Additional Instructions" icon="edit_note" defaultOpen={true}>
        <div>
          <label className="text-[10px] font-bold uppercase text-[#685C57] tracking-wider block mb-1.5">
            Describe any specific requirements
          </label>
          <textarea
            value={customization.additionalNotes || ''}
            onChange={(e) => update('additionalNotes', e.target.value)}
            rows={4}
            placeholder="E.g., match the silk colour with my lehenga (photo attached in next step). I want traditional Telugu temple motifs on the border..."
            className="w-full bg-[var(--color-surface-ivory)] border border-black/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[var(--color-gold)] text-[var(--color-on-surface)] resize-none transition-all leading-relaxed"
          />
        </div>
      </AccordionBlock>
    </div>
  );
}
