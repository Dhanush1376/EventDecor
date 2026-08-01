import { Camera, X, CloudUpload, AlertCircle } from 'lucide-react';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

export const ProductListingVisualSearch = ({ visualSearch }) => {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleVisualFileSelect = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) visualSearch.handleImageSelect(file, 'upload');
    },
    [visualSearch],
  );

  const handleVisualCameraCapture = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) visualSearch.handleImageSelect(file, 'camera');
    },
    [visualSearch],
  );

  const handleVisualDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleVisualDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleVisualDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleVisualDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
        visualSearch.handleImageSelect(file, 'drag_drop');
      }
    },
    [visualSearch],
  );

  const startCamera = useCallback(async () => {
    const isMobileDevice =
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    if (isMobileDevice || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1024 }, height: { ideal: 1024 } },
      });
      setCameraStream(stream);
      setShowCamera(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch (_err) {
      cameraInputRef.current?.click();
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
          if (cameraStream) {
            cameraStream.getTracks().forEach((t) => t.stop());
            setCameraStream(null);
          }
          setShowCamera(false);
          visualSearch.handleImageSelect(file, 'camera');
        }
      },
      'image/jpeg',
      0.9,
    );
  }, [cameraStream, visualSearch]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  if (!visualSearch.isOpen || visualSearch.phase === 'results') return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-end bg-black/60 backdrop-blur-md overflow-hidden p-0 lg:p-4 animate-fade-in">
      {/* Backdrop Click close */}
      <div className="absolute inset-0 z-0" onClick={visualSearch.close} />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="relative z-10 bg-surface-bright rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden flex flex-col w-full lg:w-[calc(100%-40px)] max-w-[420px] mx-auto border-t lg:border border-outline-variant/20 p-6 mt-auto lg:mb-8"
      >
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="text-[16px] text-primary" strokeWidth={1.5} />
            </div>
            <h2 className="text-on-surface font-display font-bold text-[17px]">Visual Search</h2>
          </div>
          <button
            onClick={visualSearch.close}
            className="w-8 h-8 min-h-0 rounded-full hover:bg-surface-container-low flex items-center justify-center transition-all cursor-pointer text-on-surface-variant/70 animate-none outline-none focus:outline-none"
            aria-label="Close visual search"
          >
            <X className="text-[20px]" strokeWidth={1.5} />
          </button>
        </div>

        {/* ═══ PHASE: Idle (Upload/Camera Select) ═══ */}
        {visualSearch.phase === 'idle' && (
          <div className="w-full flex flex-col gap-5">
            {/* Hidden Inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleVisualFileSelect}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleVisualCameraCapture}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            {showCamera ? (
              <div className="vs-camera-viewfinder w-full aspect-square relative bg-black flex flex-col justify-end rounded-2xl overflow-hidden">
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
                  onDragEnter={handleVisualDragEnter}
                  onDragOver={handleVisualDragOver}
                  onDragLeave={handleVisualDragLeave}
                  onDrop={handleVisualDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`vs-upload-zone ${isDragging ? 'dragging' : ''}`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                      <CloudUpload className="text-[32px]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-on-surface font-semibold text-[15px]">Upload an image</p>
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
        {(visualSearch.phase === 'preview' || visualSearch.phase === 'scanning') &&
          visualSearch.previewUrl && (
            <div className="w-full flex flex-col items-center animate-fade-in">
              {/* Image with Cinematic Gradient Scanning Effects */}
              <div
                className={`vs-image-scanner w-full aspect-square${visualSearch.phase === 'scanning' ? ' scanning' : ''}`}
              >
                <img
                  src={visualSearch.previewUrl}
                  alt="Uploaded for visual search"
                  className="w-full h-full object-cover rounded-2xl"
                  style={{ position: 'relative', zIndex: 1 }}
                />
                {visualSearch.phase === 'scanning' && (
                  <div className="vs-mesh-overlay">
                    <div className="vs-blob-1" />
                    <div className="vs-blob-2" />
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {visualSearch.phase === 'scanning' && (
                <div className="w-full mt-6 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-on-surface-variant/80 text-[12px] font-bold tracking-[0.1em] uppercase">
                      {visualSearch.scanProgress < 35
                        ? 'Extracting features...'
                        : visualSearch.scanProgress < 75
                          ? 'Identifying object...'
                          : 'Finding closest matches...'}
                    </p>
                    <span className="text-primary text-[12px] font-bold">
                      {Math.round(visualSearch.scanProgress)}%
                    </span>
                  </div>
                  <div className="w-full h-[3px] bg-outline-variant/30 rounded-full overflow-hidden">
                    <div
                      className="vs-progress-bar"
                      style={{ width: `${visualSearch.scanProgress}%` }}
                    />
                  </div>
                  <div className="pt-4 flex justify-center">
                    <button
                      onClick={visualSearch.reset}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-outline-variant/30 hover:bg-surface-container-low transition-colors text-on-surface-variant/70 text-[10px] uppercase font-bold tracking-[0.15em]"
                    >
                      <X className="text-[14px]" strokeWidth={1.5} />
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        {/* ═══ PHASE: Error ═══ */}
        {visualSearch.phase === 'error' && (
          <div className="w-full text-center animate-fade-in">
            <div className="py-4">
              <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-5 border border-error/20">
                <AlertCircle className="text-[32px] text-error" strokeWidth={1.5} />
              </div>
              <h3 className="text-on-surface-variant font-display text-[22px] font-bold mb-2">
                Search Failed
              </h3>
              <p className="text-on-surface-variant/60 text-[13px] leading-relaxed mb-8">
                {visualSearch.error || 'Something went wrong. Please try again.'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={visualSearch.retry}
                  className="btn-outline bg-white hover:bg-surface-container-lowest"
                >
                  Retry
                </button>
                <button onClick={visualSearch.close} className="btn-primary">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
