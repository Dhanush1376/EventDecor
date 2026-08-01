import { Camera, X, CloudUpload, AlertCircle, RefreshCw, SearchX, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../shared/ProductCard';
import { MandalaArtDecor } from '../ui/MandalaArtDecor';
import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useDragControls, useScroll, useTransform, AnimatePresence, motion } from 'framer-motion';
import '../../styles/visual-search.css';
import logger from '../../utils/core/logger';

/**
 * VisualSearchOverlay — Premium Google Lens-style visual search experience.
 * Handles image upload, camera capture, AI scanning animations, and result display.
 */
export function VisualSearchOverlay({
  isOpen,
  phase,
  previewUrl,
  results,
  error,
  scanProgress,
  _scanStatus,
  _config,
  onClose,
  onImageSelect,
  onRetry,
  onReset,
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [_sheetState, _setSheetState] = useState('half'); // 'expanded', 'half', 'collapsed'
  const [isSheetHidden, setIsSheetHidden] = useState(false);
  const videoRef = useRef(null);
  const _dragControls = useDragControls();
  const scrollContainerRef = useRef(null);

  const { scrollY } = useScroll({
    container: scrollContainerRef,
  });

  const backgroundScale = useTransform(scrollY, [0, 400], [1, 1.15]);
  const backgroundOpacity = useTransform(scrollY, [0, 400], [1, 0.4]);

  // Combine all results into a single list
  const unifiedResults = useMemo(() => {
    if (!results) return [];
    const items = [];
    const seen = new Set();

    if (results.bestMatch) {
      items.push({ ...results.bestMatch, _isExactMatch: true });
      seen.add(results.bestMatch.id || results.bestMatch._id);
    }

    if (results.similarProducts) {
      results.similarProducts.forEach((p) => {
        const id = p.id || p._id;
        if (!seen.has(id)) {
          items.push(p);
          seen.add(id);
        }
      });
    }

    if (results.relatedProducts) {
      results.relatedProducts.forEach((p) => {
        const id = p.id || p._id;
        if (!seen.has(id)) {
          items.push(p);
          seen.add(id);
        }
      });
    }
    return items;
  }, [results]);

  // Cleanup camera on close
  useEffect(() => {
    if (!isOpen && cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
      setShowCamera(false);
    }
  }, [isOpen, cameraStream]);

  // Prevent background scrolling when overlay is open
  useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isOpen]);

  // Handle file input
  const handleFileSelect = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) onImageSelect(file, 'upload');
    },
    [onImageSelect],
  );

  // Handle drag events
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
        onImageSelect(file, 'drag_drop');
      }
    },
    [onImageSelect],
  );

  const startCamera = useCallback(async () => {
    // Check synchronously to avoid popup blockers on mobile (especially iOS/Safari)
    const isMobile =
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

    // Force native camera popup on mobile devices OR if media API is missing
    if (isMobile || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1024 }, height: { ideal: 1024 } },
      });
      setCameraStream(stream);
      setShowCamera(true);
      // Attach stream to video element after render
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch (err) {
      logger.warn('Camera access failed or denied:', err);
      // Fallback if getUserMedia fails (e.g. permission denied)
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
          // Stop camera
          if (cameraStream) {
            cameraStream.getTracks().forEach((t) => t.stop());
            setCameraStream(null);
          }
          setShowCamera(false);
          onImageSelect(file, 'camera');
        }
      },
      'image/jpeg',
      0.9,
    );
  }, [cameraStream, onImageSelect]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  }, [cameraStream]);

  // Handle mobile camera capture input
  const handleCameraCapture = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) onImageSelect(file, 'camera');
    },
    [onImageSelect],
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="vs-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* ═══ Main Modal Popup (Hidden during results) ═══ */}
          {phase !== 'results' && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              className="bg-surface-bright rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden flex flex-col w-full lg:w-[calc(100%-40px)] max-w-[420px] mx-auto z-10 border-t lg:border border-outline-variant/20 mt-auto lg:mb-8"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-outline-variant/10 bg-surface-container-lowest">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="text-[16px] text-primary" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-on-surface font-display font-bold text-[17px]">
                    Visual Search
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 min-h-0 rounded-full hover:bg-surface-container-low flex items-center justify-center transition-all cursor-pointer text-on-surface-variant/70"
                  aria-label="Close visual search"
                >
                  <X className="text-[20px]" strokeWidth={1.5} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 flex flex-col items-center w-full">
                {/* ═══ PHASE: Idle (Upload/Camera Select) ═══ */}
                {phase === 'idle' && (
                  <div className="w-full flex flex-col gap-5">
                    {/* Hidden Inputs */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                    <input
                      type="file"
                      ref={cameraInputRef}
                      onChange={handleCameraCapture}
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                    />

                    {/* Camera view finder if showCamera is active */}
                    {showCamera ? (
                      <div className="vs-camera-viewfinder w-full aspect-square relative bg-black flex flex-col justify-end">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-6 z-10">
                          <button
                            onClick={stopCamera}
                            className="w-12 h-12 min-h-0 rounded-full bg-black/60 flex items-center justify-center text-white border border-white/20 active:scale-90 transition-transform cursor-pointer"
                          >
                            <X className="" strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={capturePhoto}
                            className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-primary border-4 border-primary/20 active:scale-90 transition-transform cursor-pointer"
                          >
                            <Camera className="text-[32px]" strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Drag and Drop Zone */}
                        <div
                          ref={dropZoneRef}
                          onDragEnter={handleDragEnter}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`vs-upload-zone ${isDragging ? 'dragging' : ''}`}
                        >
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                              <CloudUpload className="text-[32px]" strokeWidth={1.5} />
                            </div>
                            <div>
                              <p className="text-on-surface font-semibold text-[15px]">
                                Upload an image
                              </p>
                              <p className="text-on-surface-variant/60 text-[12px] mt-1">
                                Drag and drop or click to browse
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Camera Action Row */}
                        <div className="flex gap-3">
                          <button
                            onClick={startCamera}
                            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-outline-variant/30 hover:bg-surface-container-low transition-colors text-on-surface-variant font-bold text-[13px] uppercase tracking-wider cursor-pointer"
                          >
                            <Camera className="text-[18px]" strokeWidth={1.5} />
                            Use Camera
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ═══ PHASE: Preview + Scanning ═══ */}
                {(phase === 'preview' || phase === 'scanning') && previewUrl && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full flex flex-col items-center"
                  >
                    {/* Image with Cinematic Gradient Scanning Effects */}
                    <div
                      className={`vs-image-scanner w-full aspect-square${phase === 'scanning' ? ' scanning' : ''}`}
                    >
                      <img
                        src={previewUrl}
                        alt="Uploaded for visual search"
                        className="w-full h-full object-cover rounded-2xl"
                        style={{ position: 'relative', zIndex: 1 }}
                      />
                      {phase === 'scanning' && (
                        <>
                          {/* Fluid Multi-Color Mesh Overlay */}
                          <div className="vs-mesh-overlay">
                            <div className="vs-blob-1" />
                            <div className="vs-blob-2" />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {phase === 'scanning' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full mt-8 space-y-3"
                      >
                        <div className="flex items-center justify-between px-1">
                          <p className="text-on-surface-variant/80 text-[12px] font-bold tracking-[0.1em] uppercase">
                            {/* UX Improvement: Dynamic Progress Text */}
                            {scanProgress < 35
                              ? 'Extracting features...'
                              : scanProgress < 75
                                ? 'Identifying object...'
                                : 'Finding closest matches...'}
                          </p>
                          <span className="text-primary text-[12px] font-bold">
                            {Math.round(scanProgress)}%
                          </span>
                        </div>
                        <div className="w-full h-[3px] bg-outline-variant/30 rounded-full overflow-hidden">
                          <div className="vs-progress-bar" style={{ width: `${scanProgress}%` }} />
                        </div>
                        {/* UX Improvement: Cancel Scan Button */}
                        <div className="pt-4 flex justify-center">
                          <button
                            onClick={onReset}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-outline-variant/30 hover:bg-surface-container-low transition-colors text-on-surface-variant/70 text-[10px] uppercase font-bold tracking-[0.15em]"
                          >
                            <X className="text-[14px]" strokeWidth={1.5} />
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* ═══ PHASE: Error ═══ */}
                {phase === 'error' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full text-center"
                  >
                    <div className="py-4">
                      <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-5 border border-error/20">
                        <AlertCircle className="text-[32px] text-error" strokeWidth={1.5} />
                      </div>
                      <h3 className="text-on-surface-variant font-display text-[22px] font-bold mb-2">
                        Search Failed
                      </h3>
                      <p className="text-on-surface-variant/60 text-[13px] leading-relaxed mb-8">
                        {error || 'Something went wrong. Please try again.'}
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={onRetry}
                          className="btn-outline bg-white hover:bg-surface-container-lowest"
                        >
                          Retry
                        </button>
                        <button onClick={onClose} className="btn-primary">
                          Close
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ PHASE: Results ═══ */}
          {phase === 'results' && results && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="fixed inset-0 z-[10000] flex flex-col lg:pt-[80px] overflow-hidden bg-surface lg:bg-transparent"
            >
              {/* --- DESKTOP BACKDROP --- */}
              <div className="hidden lg:block absolute inset-0 bg-[#faf9f6]/95 backdrop-blur-xl -z-10" />

              {/* --- MOBILE BACKGROUND IMAGE (FIXED) --- */}
              <div className="absolute inset-0 lg:hidden z-0 bg-black overflow-hidden">
                {previewUrl && (
                  <motion.img
                    src={previewUrl}
                    alt="Scanned item"
                    className="w-full h-full object-cover"
                    style={{
                      scale: backgroundScale,
                      opacity: backgroundOpacity,
                      transformOrigin: 'center 30%',
                    }}
                  />
                )}
                <div
                  className={`absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/30 pointer-events-none transition-opacity duration-300 ${isSheetHidden ? 'opacity-20' : 'opacity-100'}`}
                />
              </div>

              {/* --- MOBILE HEADER BUTTONS (FIXED ON TOP) --- */}
              <div className="fixed top-5 left-5 right-5 flex justify-between items-center z-40 lg:hidden pointer-events-none">
                <button
                  onClick={onClose}
                  className="w-10 h-10 min-h-0 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-md active:scale-95 transition-transform pointer-events-auto cursor-pointer"
                >
                  <X className="text-[20px]" strokeWidth={1.5} />
                </button>
                <button
                  onClick={onReset}
                  className="px-4 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center gap-2 text-white border border-white/20 shadow-md active:scale-95 transition-transform pointer-events-auto cursor-pointer"
                >
                  <RefreshCw className="text-[18px]" strokeWidth={1.5} />
                  <span className="font-label-sm text-[10px] uppercase tracking-widest font-bold">
                    New Search
                  </span>
                </button>
              </div>

              {/* --- RESULTS CONTAINER (NATIVELY SCROLLABLE) --- */}
              <div
                ref={scrollContainerRef}
                className={`absolute bottom-0 left-0 right-0 top-[76px] lg:inset-0 z-20 w-full vs-results-scroll rounded-t-[40px] lg:rounded-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isSheetHidden ? 'overflow-hidden pointer-events-auto cursor-pointer' : 'overflow-y-auto'}`}
                onClick={(e) => {
                  // Only trigger if clicking exactly on the transparent background area
                  if (e.target === e.currentTarget) {
                    setIsSheetHidden((prev) => !prev);
                  }
                }}
              >
                <motion.div
                  initial={{ y: 200, opacity: 0 }}
                  animate={{ y: isSheetHidden ? 'calc(50dvh - 196px)' : 0, opacity: 1 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                  className={`relative bg-white lg:bg-transparent rounded-t-[40px] lg:rounded-none z-20 flex flex-col lg:shadow-none min-h-[80vh] lg:min-h-full w-full border-t border-outline-variant/10 mt-[50vh] lg:mt-0 transition-shadow duration-300 ${isSheetHidden ? 'pointer-events-none shadow-none' : 'shadow-[0_-10px_40px_rgba(0,0,0,0.15)]'}`}
                >
                  {/* Mobile Handlebar */}
                  <div className="w-full flex items-center justify-center pt-5 pb-1 lg:hidden shrink-0 bg-white rounded-t-[40px]">
                    <div className="w-12 h-1.5 bg-black/10 rounded-full shrink-0"></div>
                  </div>

                  {/* AI Analysis Summary Header */}
                  <div className="px-6 lg:px-10 py-3 lg:py-5 flex-shrink-0 border-b border-outline-variant/10 lg:border-outline-variant/20 bg-white lg:bg-white/60 lg:backdrop-blur-md sticky top-0 z-30 rounded-t-[40px] lg:rounded-none">
                    <div className="flex items-center justify-between gap-4 w-full">
                      <div className="flex items-center gap-4 lg:gap-5 flex-1 min-w-0">
                        {/* Desktop Thumbnail */}
                        {previewUrl && (
                          <div className="hidden lg:block relative shrink-0">
                            <img
                              src={previewUrl}
                              alt="Search image"
                              className="w-20 h-20 rounded-2xl object-cover shadow-sm border border-outline-variant/30"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-primary w-7 h-7 rounded-full flex items-center justify-center border-[2.5px] border-white shadow-sm">
                              <span className="material-symbols-outlined text-white text-[14px]">
                                image_search
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex-1 min-w-0 py-1">
                          <h3 className="text-on-surface-variant text-[22px] lg:text-[28px] font-bold leading-tight truncate">
                            {results.aiAnalysis?.category || 'Product Category'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 lg:mt-2">
                            <span className="text-primary font-label-sm text-[10px] uppercase tracking-[0.15em] font-bold bg-primary/10 px-2 py-0.5 rounded-md">
                              {unifiedResults.length} Matches
                            </span>
                            <span className="text-on-surface-variant/30 text-[10px]">•</span>
                            <span className="text-on-surface-variant/60 font-label-sm text-[10px] uppercase tracking-[0.1em] font-bold">
                              {results.aiAnalysis?.confidence >= 0.85
                                ? 'Excellent Match Quality'
                                : results.aiAnalysis?.confidence >= 0.5
                                  ? 'Good Match Quality'
                                  : 'Similar Styles Found'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Desktop New Search Button */}
                      <button
                        onClick={onReset}
                        className="hidden lg:flex shrink-0 px-6 py-3 rounded-full border border-outline-variant/30 bg-white hover:bg-surface-container-low shadow-xs transition-all items-center justify-center gap-2 cursor-pointer text-on-surface-variant group"
                        title="New Search"
                      >
                        <RefreshCw
                          className="text-[18px] group-hover:-rotate-90 transition-transform duration-300"
                          strokeWidth={1.5}
                        />
                        <span className="font-label-sm text-[11px] uppercase tracking-widest font-bold">
                          New Search
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Results Area */}
                  <div className="flex-1 px-5 lg:px-10 py-6 lg:py-8 bg-surface-container-lowest lg:bg-transparent relative overflow-hidden">
                    {/* Ambient Mandala Background Aesthetics using existing brand components */}
                    <MandalaArtDecor
                      variant={1}
                      size={280}
                      opacity={0.08}
                      spin={true}
                      spinDuration={120}
                      className="-top-20 -left-20"
                    />
                    <MandalaArtDecor
                      variant={2}
                      size={360}
                      opacity={0.08}
                      spin={true}
                      spinDuration={180}
                      className="-bottom-24 -right-24"
                    />

                    <div className="max-w-screen-xl mx-auto w-full relative z-10">
                      {/* No Results */}
                      {unifiedResults.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-outline-variant/20 shadow-sm">
                          <SearchX
                            className="text-[64px] text-on-surface-variant/20 mb-5"
                            strokeWidth={1.5}
                          />
                          <p className="text-on-surface-variant font-display text-[24px] font-bold mb-2">
                            No Exact Matches Found
                          </p>
                          <p className="text-on-surface-variant/50 text-[14px] max-w-md text-center mb-8">
                            We couldn't find an exact visual match for your image. For best results,
                            try a clearer image with good lighting, or explore our curated
                            collections to find similar styles.
                          </p>
                          <div className="flex gap-4">
                            <button onClick={onReset} className="btn-outline px-6">
                              Try Another Image
                            </button>
                            {/* UX Improvement: Empty State Continuation */}
                            <Link to="/collections" onClick={onClose} className="btn-gold px-6">
                              Explore Collections
                            </Link>
                          </div>
                        </div>
                      )}

                      {/* Results Grid */}
                      {unifiedResults.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          <h3 className="text-on-surface-variant text-base font-normal mb-5 lg:mb-6 pl-1 flex items-center gap-2">
                            <Wand2 className="text-[16px] text-primary" strokeWidth={1.5} />
                            Visual Matches ({unifiedResults.length})
                          </h3>

                          <div
                            className="grid grid-cols-2 lg:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-6 lg:gap-8 pb-10"
                            onClickCapture={(e) => {
                              // Close modal if a link or role=link is clicked inside the product card
                              if (e.target.closest('a') || e.target.closest('[role="link"]')) {
                                // Delay the closing slightly to let the click and navigation handlers execute first
                                setTimeout(() => {
                                  onClose();
                                }, 100);
                              }
                            }}
                          >
                            {unifiedResults.map((product) => {
                              const isExactMatch = product._isExactMatch;
                              const score = product.similarityScore;
                              const badgeText = isExactMatch
                                ? 'EXACT MATCH'
                                : score
                                  ? `${Math.round(score)}% MATCH`
                                  : 'MATCH';

                              return (
                                <ProductCard
                                  key={product.id || product._id}
                                  {...product}
                                  badges={[badgeText]}
                                />
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default VisualSearchOverlay;
