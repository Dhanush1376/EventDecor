import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useProduct } from '../hooks/useProductQueries';
import { useAuth } from '../context/AuthContext';
import { customOrderService, uploadService } from '../services/domainServices';
import { SEO } from '../components/seo/SEO';
import { MandalaElement } from '../components/ui/MandalaElement';
import { Skeleton } from '../components/ui/Skeleton';
import toast from 'react-hot-toast';
import logger from '../utils/logger';
import { CloudinaryImage } from '../components/ui/CloudinaryImage';

// ─── Animation Presets ───
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};
const slideRight = {
  hidden: { opacity: 0, x: 30 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35 } },
};

// ─── File type helpers ───
const ACCEPTED_FILE_TYPES = '.png,.jpg,.jpeg,.svg,.pdf,.zip';
const ACCEPTED_IMAGE_TYPES = '.png,.jpg,.jpeg,.webp';
const ACCEPTED_VOICE_TYPES = '.mp3,.wav,.m4a,.ogg,.aac';
const ACCEPTED_VIDEO_TYPES = '.mp4,.mov,.webm,.avi';
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

// ─── Color Picker Component ───
function ColorPickerField({ colors, onChange, label }) {
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
      <label className="text-[10px] font-bold uppercase text-[var(--color-gold)] tracking-wider block">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {(colors || []).map((color, i) => (
          <div key={i} className="relative group">
            <div
              className="w-8 h-8 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform"
              style={{ background: color }}
            />
            <button
              onClick={() => onChange(colors.filter((_, idx) => idx !== i))}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}
        <button
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

// ─── File Upload Zone Component ───
function FileUploadZone({ label, accept, onUpload, files, onRemove, multiple = true, helperText }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);

  const handleFiles = async (fileList) => {
    const fileArr = Array.from(fileList);
    if (fileArr.length === 0) return;

    // Validate file sizes
    const oversized = fileArr.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      toast.error(`File "${oversized.name}" exceeds 50MB limit`);
      return;
    }

    setUploading(true);
    setProgress(10);
    const interval = setInterval(() => setProgress((p) => (p < 90 ? p + 10 : p)), 200);

    try {
      // BUG-06: Use Promise.all for concurrent safe uploads
      const uploadPromises = fileArr.map(async (file) => {
        const formData = new FormData();
        formData.append('images', file);
        const res = await uploadService.uploadImages(formData, 'custom-orders');
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
      logger.error('File upload error:', err);
    } finally {
      clearInterval(interval);
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase text-[var(--color-gold)] tracking-wider block">
        {label}
      </label>
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
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
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
                <CloudinaryImage
                  src={file.url}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover border border-black/5"
                  sizes="40px"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-ivory)] border border-black/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px] text-black/30">
                    {file.fileType === 'voice'
                      ? 'mic'
                      : file.fileType === 'video'
                        ? 'videocam'
                        : file.fileType === 'document'
                          ? 'description'
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

// ─── Drawing Canvas Component ───
function AnnotationCanvas({ imageUrl, onSave }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#FF0000');
  const [lineWidth, setLineWidth] = useState(3);

  useEffect(() => {
    if (!canvasRef.current || !imageUrl) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const containerWidth = containerRef.current?.offsetWidth || 400;
      const scale = containerWidth / img.width;
      canvas.width = containerWidth;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    const pos = getPos(e);
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = tool === 'highlight' ? lineWidth * 3 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (tool === 'highlight') ctx.globalAlpha = 0.3;
    else ctx.globalAlpha = 1;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current.getContext('2d');
    ctx.globalAlpha = 1;
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSave({ imageUrl, data: dataUrl, createdAt: new Date().toISOString() });
    toast.success('Annotation saved!');
  };

  const handleClear = () => {
    if (!canvasRef.current || !imageUrl) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageUrl;
  };

  if (!imageUrl) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: 'pen', icon: 'edit', label: 'Draw' },
          { id: 'highlight', icon: 'highlight', label: 'Highlight' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              tool === t.id
                ? 'bg-black text-white shadow-md'
                : 'bg-black/5 text-black/50 hover:bg-black/10'
            }`}
          >
            <span className="material-symbols-outlined text-[13px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          {['#FF0000', '#00FF00', '#0000FF', '#FFD700', '#000000'].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-black' : 'border-white shadow-sm'}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className="rounded-xl overflow-hidden border border-black/10 shadow-sm"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          className="w-full cursor-crosshair touch-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleClear}
          className="px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-500 hover:bg-red-100 transition-all"
        >
          Clear
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-gold)] text-white hover:bg-[var(--color-gold-dark)] transition-all shadow-md"
        >
          Save Annotation
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ─── MAIN CUSTOMIZATION STUDIO COMPONENT ───
// ═══════════════════════════════════════════════════

export function CustomizationStudio() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user, runProtectedAction } = useAuth();
  const { data: product, isLoading: productLoading, error: productError } = useProduct(productId);

  // ─── Customization State ───
  const [customizationData, setCustomizationData] = useState([]);
  const [customRequirements, setCustomRequirements] = useState('');
  const [selectedColors, setSelectedColors] = useState([]);
  const [files, setFiles] = useState([]);
  const [referenceImages, setReferenceImages] = useState([]);
  const [voiceNotes, setVoiceNotes] = useState([]);
  const [videoReferences, setVideoReferences] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [eventDate, setEventDate] = useState('');
  const [city, setCity] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // ─── UI State ───
  const [activeTab, setActiveTab] = useState('customize');
  const [previewMode, setPreviewMode] = useState('after');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState(null);
  const [showAnnotationTool, setShowAnnotationTool] = useState(false);
  const [annotationImageUrl, setAnnotationImageUrl] = useState('');
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);

  // WF-04: Submission Deduplication Lock
  const isSubmittingRef = useRef(false);

  // Prefill user info
  useEffect(() => {
    if (user) {
      setCustomerPhone(user.phone || '');
    }
  }, [user]);

  // WF-02: Draft Recovery Prompt on Mount
  useEffect(() => {
    if (user && product) {
      customOrderService.getMyDrafts().then((res) => {
        if (res.success && res.data) {
          const draft = res.data.find(
            (d) => (d.productId === product._id || d.productId === product.id) && !d.isSubmitted,
          );
          if (
            draft &&
            window.confirm(
              'You have an unsaved draft for this product. Would you like to restore it?',
            )
          ) {
            setCustomizationData(draft.customizationData || []);
            setCustomRequirements(draft.customRequirements || '');
            setFiles(draft.files || []);
            setReferenceImages(draft.referenceImages || []);
            setDraftId(draft._id);
            if (draft.selectedColors) setSelectedColors(draft.selectedColors);
          }
        }
      });
    }
  }, [user, product]);

  // BUG-04: Prevent accidental data loss
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (customizationData.length > 0 || customRequirements || files.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [customizationData, customRequirements, files]);

  // BUG-05: Periodic Autosave
  useEffect(() => {
    if (!user) return;
    const hasData =
      customizationData.length > 0 ||
      customRequirements ||
      files.length > 0 ||
      selectedColors.length > 0 ||
      annotations.length > 0;
    if (!hasData) return;

    const timeoutId = setTimeout(() => {
      if (!submitting && !savingDraft) {
        handleSaveDraft(true);
      }
    }, 60000); // 60 seconds after last change

    return () => clearTimeout(timeoutId);
  }, [customizationData, customRequirements, files, selectedColors, annotations, user]);

  // ─── Gallery Images ───
  const galleryImages = useMemo(() => {
    if (!product) return [];
    return Array.from(new Set([product.imageSrc, ...(product.images || [])].filter(Boolean)));
  }, [product]);

  // ─── Cost Estimation ───
  const costEstimation = useMemo(() => {
    if (!product)
      return {
        basePrice: 0,
        customizationCharges: 0,
        additionalFeatures: 0,
        designCost: 0,
        materialCost: 0,
        productionCost: 0,
        deliveryCost: 0,
        total: 0,
      };
    const basePrice = (product.price || 0) * quantity;
    const customizationCharges = customizationData.length * 200 + selectedColors.length * 100;
    const additionalFeatures = files.length * 50 + (annotations.length > 0 ? 500 : 0);
    const total = basePrice + customizationCharges + additionalFeatures;
    return {
      basePrice,
      customizationCharges,
      additionalFeatures,
      designCost: 0,
      materialCost: 0,
      productionCost: 0,
      deliveryCost: 0,
      total,
    };
  }, [product, quantity, customizationData, selectedColors, files, annotations]);

  // ─── Dynamic Customization Fields ───
  const updateField = useCallback((fieldName, fieldType, value) => {
    setCustomizationData((prev) => {
      const existing = prev.findIndex((f) => f.fieldName === fieldName);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { fieldName, fieldType, value };
        return updated;
      }
      return [...prev, { fieldName, fieldType, value }];
    });
  }, []);

  const getFieldValue = useCallback(
    (fieldName, defaultValue = '') => {
      const field = customizationData.find((f) => f.fieldName === fieldName);
      return field ? field.value : defaultValue;
    },
    [customizationData],
  );

  // ─── Submit Handler ───
  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;
    if (!user) {
      toast.error('Please sign in to submit your customization');
      return;
    }
    if (!product) return;

    isSubmittingRef.current = true;
    setSubmitting(true);
    try {
      const payload = {
        productId: product._id || product.id,
        customizationData: [
          ...customizationData,
          ...(selectedColors.length > 0
            ? [{ fieldName: 'Selected Colors', fieldType: 'color', value: selectedColors }]
            : []),
        ],
        customRequirements,
        files,
        referenceImages: referenceImages.map((f) => f.url || f),
        voiceNotes: voiceNotes.map((f) => f.url || f),
        videoReferences: videoReferences.map((f) => f.url || f),
        annotations,
        costEstimation,
        quantity,
        eventDate: eventDate || undefined,
        city: city || undefined,
        customerPhone,
      };

      const res = await customOrderService.submitProductCustomization(payload);
      if (res.success) {
        toast.success(`Custom order ${res.data?.orderId || ''} submitted successfully!`);
        // Delete the draft if it exists
        if (draftId) {
          await customOrderService.deleteDraft(draftId).catch(() => {});
        }
        navigate('/my-custom-orders');
      } else {
        toast.error(res.message || 'Failed to submit');
      }
    } catch (err) {
      toast.error('Failed to submit customization request');
      logger.error('Customization submit error:', err);
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  // ─── Save Draft Handler ───
  const handleSaveDraft = async (silent = false) => {
    if (!user) {
      if (!silent) toast.error('Please sign in to save your draft');
      return;
    }

    setSavingDraft(true);
    try {
      const payload = {
        productId: product?._id || product?.id || productId,
        customizationData: [
          ...customizationData,
          ...(selectedColors.length > 0
            ? [{ fieldName: 'Selected Colors', fieldType: 'color', value: selectedColors }]
            : []),
        ],
        customRequirements,
        files,
        referenceImages: referenceImages.map((f) => f.url || f),
        costEstimation,
        draftId: draftId || undefined,
      };

      const res = await customOrderService.saveDraft(payload);
      if (res.success) {
        setDraftId(res.data?._id);
        if (!silent) toast.success('Draft saved — you can continue later');
      }
    } catch (err) {
      if (!silent) toast.error('Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  // ─── Loading State ───
  if (productLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-ivory)] pt-24 pb-20">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-[500px] w-full rounded-3xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-2/3 rounded-xl" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
              <Skeleton className="h-[400px] w-full rounded-3xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error State ───
  if (productError || !product) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-ivory)] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <span className="material-symbols-outlined text-[48px] text-black/15 block mb-4">
            error_outline
          </span>
          <h2 className="text-[22px] font-display font-light mb-2">Product Not Found</h2>
          <p className="text-[13px] text-black/40 mb-6">
            The product you want to customize may have been moved or is unavailable.
          </p>
          <Link to="/collections" className="btn-primary">
            Return to Collections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-ivory)] relative">
      <SEO
        title={`Customize ${product.title} | Siri Arts & Crafts`}
        description={`Create your personalized version of ${product.title}. Upload references, choose colors, add specifications, and get a custom quote.`}
      />

      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <MandalaElement
          className="absolute top-20 -right-20 opacity-[0.02]"
          size={600}
          duration={120}
        />
        <MandalaElement
          className="absolute bottom-40 -left-20 opacity-[0.015]"
          size={700}
          duration={180}
          variant={2}
        />
      </div>

      {/* ─── Breadcrumb ─── */}
      <div className="pt-24 md:pt-32 pb-4 max-w-[1440px] mx-auto px-4 md:px-8 relative z-10">
        <nav className="flex items-center gap-2 font-label text-[11px] uppercase tracking-[0.2em] text-black/30 font-bold overflow-x-auto no-scrollbar whitespace-nowrap">
          <Link to="/" className="hover:text-[var(--color-gold)] transition-colors">
            Studio
          </Link>
          <span className="opacity-30">/</span>
          <Link to="/collections" className="hover:text-[var(--color-gold)] transition-colors">
            Collections
          </Link>
          <span className="opacity-30">/</span>
          <Link
            to={`/product/${productId}`}
            className="hover:text-[var(--color-gold)] transition-colors truncate max-w-[150px]"
          >
            {product.title}
          </Link>
          <span className="opacity-30">/</span>
          <span className="text-[var(--color-gold)]">Customize</span>
        </nav>
      </div>

      {/* ─── Header ─── */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 mb-6 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-black/5 pb-5">
          <div>
            <span className="text-[10px] font-bold uppercase text-[var(--color-gold)] tracking-[0.25em] block mb-1">
              Customization Studio
            </span>
            <h1 className="text-[24px] md:text-[32px] font-display font-light text-black leading-tight">
              Customize <span className="italic">{product.title}</span>
            </h1>
          </div>
          {/* Mobile Tab Toggle */}
          <div className="flex lg:hidden bg-black/5 p-1 rounded-full self-start">
            {[
              { id: 'preview', label: 'Preview', icon: 'visibility' },
              { id: 'customize', label: 'Customize', icon: 'palette' },
              { id: 'cost', label: 'Cost', icon: 'payments' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-black text-white shadow-md'
                    : 'text-black/40 hover:text-black/60'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── MAIN LAYOUT ─── */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 pb-32 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
          {/* ═══ LEFT: LIVE PREVIEW PANEL ═══ */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className={`${activeTab !== 'preview' && activeTab !== 'customize' ? 'hidden lg:block' : activeTab === 'customize' ? 'hidden lg:block' : ''} lg:sticky lg:top-28 space-y-4`}
          >
            <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
              {/* Preview Header */}
              <div className="flex items-center justify-between p-4 border-b border-black/5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30">
                  Live Preview
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex bg-black/5 p-0.5 rounded-full">
                    <button
                      onClick={() => setPreviewMode('before')}
                      className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all ${previewMode === 'before' ? 'bg-white shadow-sm text-black' : 'text-black/30'}`}
                    >
                      Before
                    </button>
                    <button
                      onClick={() => setPreviewMode('after')}
                      className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all ${previewMode === 'after' ? 'bg-white shadow-sm text-black' : 'text-black/30'}`}
                    >
                      After
                    </button>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                      className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">remove</span>
                    </button>
                    <span className="text-[10px] font-mono font-bold text-black/40 w-8 text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                      className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Image Gallery */}
              <div
                className="relative overflow-hidden bg-[var(--color-surface-ivory)]"
                style={{ minHeight: '350px' }}
              >
                <div className="overflow-auto" style={{ maxHeight: '500px' }}>
                  <CloudinaryImage
                    src={galleryImages[currentGalleryIndex] || product.imageSrc}
                    alt={product.title}
                    className="w-full object-contain transition-transform duration-500"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>

                {/* Color Overlay Preview */}
                {previewMode === 'after' && selectedColors.length > 0 && (
                  <div
                    className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-20"
                    style={{ background: `linear-gradient(135deg, ${selectedColors.join(', ')})` }}
                  />
                )}
              </div>

              {/* Thumbnail Strip */}
              {galleryImages.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar">
                  {galleryImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentGalleryIndex(i)}
                      className={`w-14 h-14 rounded-xl shrink-0 overflow-hidden border-2 transition-all ${
                        currentGalleryIndex === i
                          ? 'border-[var(--color-gold)] shadow-md'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <CloudinaryImage
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                        sizes="56px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info Card */}
            <div className="bg-white rounded-2xl border border-black/5 p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-gold)] mb-0.5">
                    {product.category}
                  </p>
                  <h3 className="text-[15px] font-bold text-black truncate">{product.title}</h3>
                  <p className="text-[13px] font-body text-black/50 mt-0.5">
                    Rs. {product.price?.toLocaleString()}
                  </p>
                </div>
                {product.material && (
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-black/5 text-black/40 px-2.5 py-1 rounded-full shrink-0">
                    {product.material}
                  </span>
                )}
              </div>
              {product.dimensions && (
                <p className="text-[11px] text-black/30 mt-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px]">straighten</span>
                  {product.dimensions}
                </p>
              )}
            </div>
          </motion.div>

          {/* ═══ RIGHT: CUSTOMIZATION PANEL ═══ */}
          <motion.div
            variants={slideRight}
            initial="hidden"
            animate="show"
            className={`${activeTab !== 'customize' && activeTab !== 'cost' ? 'hidden lg:block' : activeTab === 'cost' ? 'hidden lg:block' : ''} space-y-5`}
          >
            <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-5 md:p-8 space-y-7">
              {/* Section: Text Customizations */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[16px] text-[var(--color-gold)]">
                    text_fields
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                    Text Customizations
                  </span>
                </div>
                {[
                  {
                    name: 'Custom Name',
                    placeholder: 'Enter name for engraving / personalization',
                  },
                  { name: 'Company Name', placeholder: 'Business or brand name (if applicable)' },
                  {
                    name: 'Custom Message',
                    placeholder: 'Your personalized message or engraving text',
                  },
                  { name: 'Tagline', placeholder: 'Short tagline or motto' },
                ].map((field) => (
                  <div key={field.name} className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-black/40 tracking-wider block">
                      {field.name}
                    </label>
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={getFieldValue(field.name)}
                      onChange={(e) => updateField(field.name, 'text', e.target.value)}
                      className="form-field !py-3 !text-[13px]"
                    />
                  </div>
                ))}
              </div>

              <div className="border-t border-black/5" />

              {/* Section: Detailed Notes */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[16px] text-[var(--color-gold)]">
                    notes
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                    Design Brief & Instructions
                  </span>
                </div>
                {[
                  {
                    name: 'Design Instructions',
                    placeholder: 'Describe your design vision, layout preferences, themes...',
                  },
                  {
                    name: 'Special Notes',
                    placeholder: 'Any additional notes for the artisan team...',
                  },
                ].map((field) => (
                  <div key={field.name} className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-black/40 tracking-wider block">
                      {field.name}
                    </label>
                    <textarea
                      placeholder={field.placeholder}
                      rows={3}
                      value={getFieldValue(field.name)}
                      onChange={(e) => updateField(field.name, 'textarea', e.target.value)}
                      className="form-field !py-3 !text-[13px] resize-none"
                    />
                  </div>
                ))}
              </div>

              <div className="border-t border-black/5" />

              {/* Section: Dropdown Selections */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[16px] text-[var(--color-gold)]">
                    tune
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                    Specifications
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      name: 'Preferred Size',
                      options: ['Standard', 'Small', 'Medium', 'Large', 'Extra Large', 'Custom'],
                    },
                    {
                      name: 'Material Preference',
                      options: [
                        'Default',
                        'Teak Wood',
                        'Brass',
                        'Silver',
                        'Gold-Plated',
                        'Mixed Materials',
                      ],
                    },
                    {
                      name: 'Finish',
                      options: ['Default', 'Matte', 'Glossy', 'Antique', 'Hammered', 'Polished'],
                    },
                    {
                      name: 'Style',
                      options: ['Traditional', 'Contemporary', 'Fusion', 'Minimalist', 'Ornate'],
                    },
                  ].map((field) => (
                    <div key={field.name} className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-black/40 tracking-wider block">
                        {field.name}
                      </label>
                      <select
                        value={getFieldValue(field.name)}
                        onChange={(e) => updateField(field.name, 'dropdown', e.target.value)}
                        className="form-field !py-3 !text-[13px] cursor-pointer"
                      >
                        <option value="">Select...</option>
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-black/5" />

              {/* Section: Colors */}
              <ColorPickerField
                label="Choose Colors"
                colors={selectedColors}
                onChange={setSelectedColors}
              />

              <div className="border-t border-black/5" />

              {/* Section: File Uploads */}
              <FileUploadZone
                label="Upload Design Files"
                accept={ACCEPTED_FILE_TYPES}
                files={files}
                onUpload={(newFiles) => setFiles((prev) => [...prev, ...newFiles])}
                onRemove={(i) => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                helperText="PNG, JPG, SVG, PDF, AI, PSD, ZIP — Max 50MB each"
              />

              <div className="border-t border-black/5" />

              {/* Section: Reference Images */}
              <FileUploadZone
                label="Reference Design Images"
                accept={ACCEPTED_IMAGE_TYPES}
                files={referenceImages}
                onUpload={(newFiles) => setReferenceImages((prev) => [...prev, ...newFiles])}
                onRemove={(i) => setReferenceImages((prev) => prev.filter((_, idx) => idx !== i))}
                helperText="Upload images that inspire your design vision"
              />

              {/* Drawing/Annotation Tool */}
              {referenceImages.length > 0 && (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setAnnotationImageUrl(referenceImages[0]?.url || referenceImages[0]);
                      setShowAnnotationTool(!showAnnotationTool);
                    }}
                    className="flex items-center gap-2 text-[11px] font-bold text-[var(--color-gold)] uppercase tracking-wider hover:underline"
                  >
                    <span className="material-symbols-outlined text-[16px]">draw</span>
                    {showAnnotationTool ? 'Hide' : 'Open'} Annotation Tool
                  </button>
                  <AnimatePresence>
                    {showAnnotationTool && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <AnnotationCanvas
                          imageUrl={annotationImageUrl}
                          onSave={(annotation) => setAnnotations((prev) => [...prev, annotation])}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="border-t border-black/5" />

              {/* Section: Voice Notes */}
              <FileUploadZone
                label="Voice Notes"
                accept={ACCEPTED_VOICE_TYPES}
                files={voiceNotes}
                onUpload={(newFiles) => setVoiceNotes((prev) => [...prev, ...newFiles])}
                onRemove={(i) => setVoiceNotes((prev) => prev.filter((_, idx) => idx !== i))}
                helperText="Upload voice messages to explain complex requirements"
              />

              {/* Section: Video References */}
              <FileUploadZone
                label="Video References"
                accept={ACCEPTED_VIDEO_TYPES}
                files={videoReferences}
                onUpload={(newFiles) => setVideoReferences((prev) => [...prev, ...newFiles])}
                onRemove={(i) => setVideoReferences((prev) => prev.filter((_, idx) => idx !== i))}
                helperText="Upload reference videos for your custom design"
              />

              <div className="border-t border-black/5" />

              {/* Section: Custom Requirements */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[var(--color-gold)]">
                    description
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                    Describe Your Custom Requirement
                  </span>
                </div>
                <textarea
                  placeholder="Describe your complete custom requirement in detail. Include design elements, themes, specific measurements, materials, patterns, and any other specifications..."
                  rows={6}
                  maxLength={10000}
                  value={customRequirements}
                  onChange={(e) => setCustomRequirements(e.target.value)}
                  className="form-field !py-3 !text-[13px] resize-none"
                />
                <div className="flex justify-between">
                  <span className="text-[9px] text-black/20">
                    Supports detailed descriptions and bullet points
                  </span>
                  <span className="text-[9px] text-black/20 font-mono">
                    {customRequirements.length}/10,000
                  </span>
                </div>
              </div>

              <div className="border-t border-black/5" />

              {/* Section: Event Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[16px] text-[var(--color-gold)]">
                    calendar_today
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                    Event & Delivery Details
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-black/40 tracking-wider block">
                      Event Date
                    </label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="form-field !py-3 !text-[13px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-black/40 tracking-wider block">
                      City / Location
                    </label>
                    <input
                      type="text"
                      placeholder="Your city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="form-field !py-3 !text-[13px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-black/40 tracking-wider block">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="form-field !py-3 !text-[13px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-black/40 tracking-wider block">
                      Phone / WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="form-field !py-3 !text-[13px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══ STICKY COST ESTIMATION & ACTIONS BAR ═══ */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 ${activeTab === 'cost' ? '' : 'lg:block'}`}
      >
        <div className="bg-white/95 backdrop-blur-xl border-t border-black/10 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
          <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-3 md:py-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
              {/* Cost Breakdown */}
              <div className="flex items-center gap-4 md:gap-6 flex-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
                <div className="shrink-0">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-black/30 block">
                    Base Price
                  </span>
                  <span className="text-[13px] font-bold text-black font-mono">
                    ₹{costEstimation.basePrice.toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-black/15 shrink-0">+</span>
                <div className="shrink-0">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-black/30 block">
                    Customization
                  </span>
                  <span className="text-[13px] font-bold text-[var(--color-gold)] font-mono">
                    ₹{costEstimation.customizationCharges.toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-black/15 shrink-0">+</span>
                <div className="shrink-0">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-black/30 block">
                    Features
                  </span>
                  <span className="text-[13px] font-bold text-black/60 font-mono">
                    ₹{costEstimation.additionalFeatures.toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-black/15 shrink-0">=</span>
                <div className="shrink-0 pl-2 border-l-2 border-[var(--color-gold)]">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--color-gold)] block">
                    Estimated Total
                  </span>
                  <span className="text-[16px] md:text-[18px] font-bold text-black font-mono">
                    ₹{costEstimation.total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                {/* WF-03: Autosave Indicator */}
                <div className="hidden md:flex items-center gap-1.5 mr-2">
                  {savingDraft ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-gold)] animate-pulse flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">sync</span> Saving...
                    </span>
                  ) : draftId ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>{' '}
                      Draft Saved
                    </span>
                  ) : null}
                </div>
                <button
                  onClick={() => handleSaveDraft(false)}
                  disabled={savingDraft || submitting}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-full border border-black/10 text-[11px] font-bold uppercase tracking-wider bg-white hover:bg-black/5 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {savingDraft ? 'hourglass_empty' : 'save'}
                  </span>
                  <span className="md:hidden">{savingDraft ? 'Saving...' : 'Save Draft'}</span>
                  <span className="hidden md:inline">Save Draft</span>
                </button>
                <button
                  onClick={() => runProtectedAction(handleSubmit)}
                  disabled={submitting}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-full text-[11px] font-bold uppercase tracking-wider text-white transition-all flex items-center justify-center gap-1.5 shadow-xl hover:shadow-2xl hover:scale-[1.02] disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #735c00 0%, #d4af37 50%, #8c7335 100%)',
                  }}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {submitting ? 'hourglass_empty' : 'send'}
                  </span>
                  {submitting ? 'Submitting...' : 'Submit Custom Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
