import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import debounce from 'lodash.debounce';
import { saveDraft, getDraft, deleteDraft as deleteDraftDb } from '../services/draftService';

/**
 * Hook to manage form drafts with IndexedDB
 *
 * @param {Object} options
 * @param {string} options.draftKey - Unique identifier for this draft (e.g. 'admin:products:add')
 * @param {string} options.module - Module name (e.g. 'Products')
 * @param {string} options.pageTitle - Display title (e.g. 'Add Product')
 * @param {Object} options.initialData - Initial empty form data
 * @param {Object} options.initialPageState - Initial UI state (active tab, step)
 * @param {number} options.debounceMs - Auto-save debounce (ms)
 * @param {boolean} options.enabled - Whether drafting is active
 * @param {Function} options.onRestored - Callback when a draft is successfully restored
 */
export function useDraft({
  draftKey,
  module,
  pageTitle,
  initialData,
  initialPageState = {},
  debounceMs = 3000,
  enabled = true,
  onRestored,
}) {
  const location = useLocation();
  const _navigate = useNavigate();

  // State
  const [formData, setFormDataInternal] = useState(initialData);
  const [pageState, setPageStateInternal] = useState(initialPageState);
  const [draftStatus, setDraftStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'unsaved' | 'error'
  const [hasDraft, setHasDraft] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [draftInfo, setDraftInfo] = useState(null);

  // Refs to avoid dependency cycles in debounce
  const formDataRef = useRef(formData);
  const pageStateRef = useRef(pageState);
  const isFirstRender = useRef(true);
  const hasUnsavedChanges = useRef(false);

  const initialDataString = JSON.stringify(initialData);
  
  // Sync formData when initialData changes, assuming no unsaved changes are in progress
  useEffect(() => {
    if (!hasUnsavedChanges.current) {
      setFormDataInternal(initialData);
      formDataRef.current = initialData;
    }
  }, [initialDataString]);

  // Check for existing draft on mount
  useEffect(() => {
    if (!enabled) return;

    const checkDraft = async () => {
      const draft = await getDraft(draftKey);
      if (draft && draft.formData) {
        setHasDraft(true);
        setDraftInfo(draft);
        setShowRestoreModal(true);
      }
    };
    checkDraft();
  }, [draftKey, enabled]);



  // The debounced save function
  const debouncedSave = useMemo(
    () =>
      debounce(async (dataToSave, stateToSave) => {
        if (!enabled) return;

        try {
          setDraftStatus('saving');
          await saveDraft(draftKey, {
            module,
            pageTitle,
            pagePath: location.pathname,
            formData: dataToSave,
            pageState: stateToSave,
          });
          setDraftStatus('saved');
          setLastSavedAt(Date.now());
          hasUnsavedChanges.current = false;
        } catch (error) {
          import('../../utils/core/logger').then(({ default: logger }) => {
            logger.error('Failed to auto-save draft:', error);
          });
          setDraftStatus('error');
        }
      }, debounceMs),
    [draftKey, module, pageTitle, location.pathname, enabled, debounceMs],
  );

  // Clean up debounce on unmount and flush any pending saves
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges.current) {
        debouncedSave.flush();
      } else {
        debouncedSave.cancel();
      }
    };
  }, [debouncedSave]);

  // Protect against accidental refresh or close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges.current) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };

    if (enabled) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled]);

  // Setters that trigger auto-save
  const setFormData = useCallback(
    (newData) => {
      const updatedData = typeof newData === 'function' ? newData(formDataRef.current) : newData;
      formDataRef.current = updatedData;
      setFormDataInternal(updatedData);

      if (enabled && !isFirstRender.current) {
        setDraftStatus('unsaved');
        hasUnsavedChanges.current = true;
        debouncedSave(updatedData, pageStateRef.current);
      }
    },
    [enabled, debouncedSave],
  );

  const setPageState = useCallback(
    (newState) => {
      const updatedState =
        typeof newState === 'function' ? newState(pageStateRef.current) : newState;
      pageStateRef.current = updatedState;
      setPageStateInternal(updatedState);

      if (enabled && !isFirstRender.current) {
        setDraftStatus('unsaved');
        hasUnsavedChanges.current = true;
        debouncedSave(formDataRef.current, updatedState);
      }
    },
    [enabled, debouncedSave],
  );

  // Mark first render complete after initial effect setup
  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  // Actions
  const restoreDraft = useCallback(() => {
    if (draftInfo) {
      hasUnsavedChanges.current = true; // Protect restored draft from being overwritten
      formDataRef.current = draftInfo.formData;
      pageStateRef.current = draftInfo.pageState || initialPageState;

      setFormDataInternal(draftInfo.formData);
      setPageStateInternal(draftInfo.pageState || initialPageState);
      setLastSavedAt(draftInfo.updatedAt);
      setShowRestoreModal(false);

      if (onRestored) {
        onRestored(draftInfo);
      }
    }
  }, [draftInfo, initialPageState, onRestored]);

  const discardDraft = useCallback(async () => {
    setShowRestoreModal(false);
    setHasDraft(false);
    setDraftInfo(null);
    await deleteDraftDb(draftKey);
    setFormDataInternal(initialData);
    formDataRef.current = initialData;
  }, [draftKey, initialData]);

  const deleteDraft = useCallback(async () => {
    await deleteDraftDb(draftKey);
    debouncedSave.cancel();
    setDraftStatus('idle');
    hasUnsavedChanges.current = false;
  }, [draftKey, debouncedSave]);

  const resetData = useCallback((newData, newPageState) => {
    formDataRef.current = newData;
    setFormDataInternal(newData);
    if (newPageState !== undefined) {
      pageStateRef.current = newPageState;
      setPageStateInternal(newPageState);
    }
    hasUnsavedChanges.current = false;
    setDraftStatus('idle');
  }, []);

  // Browser navigation guard
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges.current) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
        return ''; // Required for some browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // React Router navigation guard
  // Note: useBlocker requires a Data Router (v6.4+) which this app doesn't use globally.
  // We provide a dummy blocker to avoid crashing, while relying on window.beforeunload.
  const blocker = { state: 'unblocked', proceed: () => {}, reset: () => {} };

  return {
    formData,
    setFormData,
    pageState,
    setPageState,
    draftStatus,
    hasDraft,
    showRestoreModal,
    setShowRestoreModal, // In case manual closing is needed without discard
    restoreDraft,
    discardDraft,
    deleteDraft,
    resetData,
    lastSavedAt,
    blocker,
  };
}
