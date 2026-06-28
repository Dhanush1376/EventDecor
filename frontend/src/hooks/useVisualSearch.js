/* eslint-disable */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import visualSearchService from '../services/api/visualSearchService';

/**
 * useVisualSearch — manages the full visual search lifecycle:
 * config fetch, image capture/upload, compression, AI analysis, results.
 */
export function useVisualSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Search states: 'idle' | 'preview' | 'scanning' | 'results' | 'error'
  const [phase, setPhase] = useState('idle');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');

  const abortRef = useRef(null);
  const sessionId = useRef(crypto.randomUUID?.() || Date.now().toString());

  // Fetch public config on mount
  useEffect(() => {
    let active = true;
    visualSearchService
      .getConfig()
      .then((res) => {
        if (active && res?.data) {
          setConfig(res.data);
        }
        if (active) setConfigLoaded(true);
      })
      .catch(() => {
        if (active) setConfigLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const isEnabled = config?.enabled === true;

  // Open the visual search overlay
  const open = useCallback(() => {
    if (!isEnabled) return;
    setIsOpen(true);
    setPhase('idle');
    setPreviewUrl(null);
    setPreviewFile(null);
    setResults(null);
    setError(null);
    setScanProgress(0);
    setScanStatus('');
  }, [isEnabled]);

  // Close overlay and cleanup
  const close = useCallback(() => {
    setIsOpen(false);
    setPhase('idle');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
    setResults(null);
    setError(null);
    setScanProgress(0);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, [previewUrl]);

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  /**
   * Compress image client-side before upload.
   * Resizes to max 1024px and converts to JPEG.
   */
  const compressImage = useCallback(async (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        const maxDim = 1024;
        let { width, height } = img;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height / width) * maxDim);
            width = maxDim;
          } else {
            width = Math.round((width / height) * maxDim);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], 'visual-search.jpg', { type: 'image/jpeg' }));
            } else {
              resolve(file); // Fallback to original
            }
          },
          'image/jpeg',
          0.85,
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };

      img.src = url;
    });
  }, []);

  /**
   * Handle image selection (from file input, drag-drop, or camera).
   */
  const handleImageSelect = useCallback(
    async (file, source = 'upload') => {
      if (!file) return;

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a JPEG, PNG, or WebP image.');
        setPhase('error');
        setIsOpen(true);
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image is too large. Maximum size is 10MB.');
        setPhase('error');
        setIsOpen(true);
        return;
      }

      // Show preview
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setPhase('preview');
      setIsOpen(true);

      // Compress
      const compressed = await compressImage(file);
      setPreviewFile(compressed);

      // Auto-start scanning
      executeSearch(compressed, source);
    },
    [compressImage],
  );

  /**
   * Execute the visual search API call with animated progress.
   */
  const executeSearch = useCallback(async (file, source = 'upload') => {
    setPhase('scanning');
    setError(null);
    setScanProgress(0);

    // Animated progress simulation
    const statusMessages = [
      'Analyzing image...',
      'Detecting objects...',
      'Identifying product type...',
      'Searching catalog...',
      'Finding similar products...',
      'Ranking matches...',
    ];

    let progressInterval;
    let statusIndex = 0;
    setScanStatus(statusMessages[0]);

    progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        const next = Math.min(prev + Math.random() * 8 + 2, 90);
        const newIndex = Math.min(
          Math.floor((next / 90) * statusMessages.length),
          statusMessages.length - 1,
        );
        if (newIndex !== statusIndex) {
          statusIndex = newIndex;
          setScanStatus(statusMessages[newIndex]);
        }
        return next;
      });
    }, 300);

    try {
      abortRef.current = new AbortController();
      const response = await visualSearchService.analyzeImage(
        file,
        source,
        sessionId.current,
        abortRef.current.signal,
      );

      clearInterval(progressInterval);
      setScanProgress(100);
      setScanStatus('Search complete!');

      if (response?.success && response?.data) {
        setResults(response.data);
        // Brief pause to show 100% then transition
        setTimeout(() => setPhase('results'), 500);
      } else {
        setError(response?.message || 'No results found. Try a different image.');
        setPhase('error');
      }
    } catch (err) {
      clearInterval(progressInterval);

      // Ignore aborted requests
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return;
      }

      const msg =
        err?.response?.data?.message || err?.message || 'Visual search failed. Please try again.';
      setError(msg);
      setPhase('error');
    }
  }, []);

  /**
   * Retry with the current preview image.
   */
  const retry = useCallback(() => {
    if (previewFile) {
      executeSearch(previewFile, 'upload');
    } else {
      setPhase('idle');
    }
  }, [previewFile, executeSearch]);

  /**
   * Reset to idle state for a new search.
   */
  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
    setResults(null);
    setError(null);
    setPhase('idle');
    setScanProgress(0);
    setScanStatus('');
  }, [previewUrl]);

  return useMemo(
    () => ({
      isOpen,
      isEnabled,
      configLoaded,
      config,
      phase,
      previewUrl,
      results,
      error,
      scanProgress,
      scanStatus,
      open,
      close,
      handleImageSelect,
      retry,
      reset,
    }),
    [
      isOpen,
      isEnabled,
      configLoaded,
      config,
      phase,
      previewUrl,
      results,
      error,
      scanProgress,
      scanStatus,
      open,
      close,
      handleImageSelect,
      retry,
      reset,
    ],
  );
}

export default useVisualSearch;
