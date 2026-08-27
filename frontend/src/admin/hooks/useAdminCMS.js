import { useState, useCallback, useRef, useEffect } from 'react';
import { cmsService } from '../../services/domainServices';
import storeSettingsService from '../../services/api/storeSettingsService';
import toast from 'react-hot-toast';
import logger from '../../utils/core/logger';
import { refreshWebsiteContent } from '../../hooks/useWebsiteContent';
import { initialWebsiteContent } from '../data/websiteContentData';

const initialCustomCategories = {
  products: [],
  events: [],
};

export function useAdminCMS({
  activeRole,
  safetyLock,
  logAdminAction,
  autoPublish,
  setSafetyLock,
  setMaintenanceMode,
  setIdleTimeoutMinutes,
  setAutoPublish,
  setGlobalActionLoading,
  setGlobalActionMessage,
  setGlobalActionSuccess,
}) {
  const [customCategories, setCustomCategories] = useState(initialCustomCategories);
  const [websiteContent, setWebsiteContent] = useState(initialWebsiteContent);
  const websiteContentRef = useRef(websiteContent);

  useEffect(() => {
    websiteContentRef.current = websiteContent;
  }, [websiteContent]);

  const [contentHistory, setContentHistory] = useState([]);
  const [hasUnsavedContent, setHasUnsavedContent] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [publishToast, setPublishToast] = useState(null);
  const autoSaveTimers = useRef({});

  const addCustomCategory = useCallback(
    (type, data) => {
      if (activeRole === 'viewer') {
        toast.error('Viewer Role: Write operations are restricted!');
        return;
      }
      if (safetyLock) {
        toast.error('Safety Lock Active: Write operations are globally blocked!');
        return;
      }
      setCustomCategories((prev) => {
        const next = { ...prev };
        const list = next[type] || [];
        const newCat = {
          id: `${type[0]}-${Date.now()}`,
          name: data.name,
          count: data.count || 0,
          image: data.image || '',
          active: data.active !== undefined ? data.active : true,
          description: data.description || '',
        };
        next[type] = [newCat, ...list];
        cmsService
          .updateSection('custom_categories', next)
          .catch((e) => logger.error('Failed to save category:', e));
        logAdminAction('ADD_CATEGORY', `Added new category/theme '${data.name}' to ${type}`);
        toast.success(`${type === 'products' ? 'Category' : 'Theme'} added`);
        return next;
      });
    },
    [activeRole, safetyLock, logAdminAction],
  );

  const updateCustomCategory = useCallback(
    (type, id, data) => {
      if (activeRole === 'viewer') {
        toast.error('Viewer Role: Write operations are restricted!');
        return;
      }
      if (safetyLock) {
        toast.error('Safety Lock Active: Write operations are globally blocked!');
        return;
      }
      setCustomCategories((prev) => {
        const next = { ...prev };
        const list = next[type] || [];
        next[type] = list.map((item) => (item.id === id ? { ...item, ...data } : item));
        cmsService
          .updateSection('custom_categories', next)
          .catch((e) => logger.error('Failed to save categories:', e));
        logAdminAction('UPDATE_CATEGORY', `Updated category/theme ID ${id}`);
        toast.success(`${type === 'products' ? 'Product Category' : 'Event Theme'} updated!`);
        return next;
      });
    },
    [activeRole, safetyLock, logAdminAction],
  );

  const deleteCustomCategory = useCallback(
    (type, id) => {
      if (activeRole === 'viewer') {
        toast.error('Viewer Role: Write operations are restricted!');
        return;
      }
      if (safetyLock) {
        toast.error('Safety Lock Active: Write operations are globally blocked!');
        return;
      }
      setCustomCategories((prev) => {
        const next = { ...prev };
        const list = next[type] || [];
        next[type] = list.filter((item) => item.id !== id);
        cmsService
          .updateSection('custom_categories', next)
          .catch((e) => logger.error('Failed to save categories:', e));
        logAdminAction('DELETE_CATEGORY', `Removed category/theme ID ${id}`);
        toast.success(`${type === 'products' ? 'Product Category' : 'Event Theme'} removed.`);
        return next;
      });
    },
    [activeRole, safetyLock, logAdminAction],
  );

  const publishContent = useCallback(
    async (section, customData = null) => {
      try {
        if (setGlobalActionLoading) {
          setGlobalActionMessage(`Publishing ${section}...`);
          setGlobalActionLoading(true);
        }
        const sectionData = customData || websiteContent[section];
        await cmsService.updateSection(section, sectionData);

        setWebsiteContent((prev) => {
          let updatedSection;
          const currentVal = customData || prev[section];
          if (Array.isArray(currentVal)) {
            updatedSection = [...currentVal];
            updatedSection.status = 'published';
          } else {
            updatedSection = { ...currentVal, status: 'published' };
          }
          const next = {
            ...prev,
            [section]: updatedSection,
          };
          return next;
        });
        setLastSaved(new Date());

        await refreshWebsiteContent();

        setPublishToast(`${section} published!`);
        toast.success(`${section} published! (Changes may take 1-2 mins to reflect)`);
        setTimeout(() => setPublishToast(null), 3000);
      } catch (_err) {
        toast.error(`Failed to publish ${section}`);
      } finally {
        if (setGlobalActionLoading) {
          setGlobalActionLoading(false);
          setGlobalActionMessage('');
        }
      }
    },
    [websiteContent, setGlobalActionLoading, setGlobalActionMessage],
  );

  const updateContent = useCallback(
    (section, data, disableAutoPublish = false) => {
      setWebsiteContent((prev) => {
        let updatedSection;
        if (Array.isArray(data)) {
          updatedSection = [...data];
          updatedSection.status = 'modified';
        } else if (Array.isArray(prev[section])) {
          updatedSection = [...prev[section]];
          Object.assign(updatedSection, data);
          updatedSection.status = 'modified';
        } else {
          updatedSection = { ...prev[section], ...data, status: 'modified' };
        }
        const newContent = {
          ...prev,
          [section]: updatedSection,
        };
        setContentHistory((h) => [
          ...h.slice(-19),
          { timestamp: new Date(), section, change: data },
        ]);
        setHasUnsavedContent(true);
        return newContent;
      });

      if (autoPublish && !disableAutoPublish) {
        if (autoSaveTimers.current[section]) {
          clearTimeout(autoSaveTimers.current[section]);
        }

        autoSaveTimers.current[section] = setTimeout(() => {
          const latestData = websiteContentRef.current[section];
          if (latestData) {
            const publishData = { ...latestData, status: 'published' };
            publishContent(section, publishData);
          }
        }, 3000);
      }
    },
    [autoPublish, publishContent],
  );

  const updateNestedContent = useCallback(
    (section, path, value, disableAutoPublish = false) => {
      setWebsiteContent((prev) => {
        const newContent = structuredClone(prev);
        const keys = path.split('.');
        let current = newContent[section];
        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i];
          if (!current[key]) current[key] = {};

          if (Array.isArray(current[key])) {
            current[key] = [...current[key]];
          } else {
            current[key] = { ...current[key] };
          }
          current = current[key];
        }
        current[keys[keys.length - 1]] = value;
        newContent[section].status = 'modified';
        setHasUnsavedContent(true);
        return newContent;
      });

      if (autoPublish && !disableAutoPublish) {
        if (autoSaveTimers.current[section]) {
          clearTimeout(autoSaveTimers.current[section]);
        }

        autoSaveTimers.current[section] = setTimeout(() => {
          const latestData = websiteContentRef.current[section];
          if (latestData) {
            const publishData = structuredClone(latestData);
            publishData.status = 'published';
            publishContent(section, publishData);
          }
        }, 3000);
      }
    },
    [autoPublish, publishContent],
  );

  const publishAllContent = useCallback(async () => {
    try {
      if (setGlobalActionLoading) {
        setGlobalActionMessage('Publishing all changes...');
        setGlobalActionLoading(true);
      }

      const sectionsToPublish = Object.entries(websiteContent).filter(
        ([, val]) => val?.status === 'modified',
      );

      const { PendingUploadRegistry } = await import('../components/ImageUpload');
      const { uploadService } = await import('../../services/domainServices');

      let contentString = JSON.stringify(sectionsToPublish);
      const activeBlobUrls = Array.from(PendingUploadRegistry.keys()).filter((url) =>
        contentString.includes(url),
      );

      if (activeBlobUrls.length > 0) {
        toast.loading('Uploading pending CMS images...', { id: 'cms-upload' });
        for (const url of activeBlobUrls) {
          const pending = PendingUploadRegistry.get(url);
          if (pending && pending.file) {
            const fd = new FormData();
            fd.append('file', pending.file);
            const res = await uploadService.uploadCMS(fd);
            if (res && res.success && res.data && res.data.url) {
              contentString = contentString.replaceAll(url, res.data.url);
              PendingUploadRegistry.delete(url);
            }
          }
        }
        toast.dismiss('cms-upload');
      }

      const updatedSectionsToPublish = JSON.parse(contentString);

      const results = await Promise.allSettled(
        updatedSectionsToPublish.map(([key, data]) => cmsService.updateSection(key, data)),
      );

      const failedSections = [];
      results.forEach((result, idx) => {
        if (result.status === 'rejected') {
          failedSections.push(sectionsToPublish[idx][0]);
        }
      });

      await cmsService.publishAll();

      setWebsiteContent((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          if (updated[key]?.status && !failedSections.includes(key)) {
            if (Array.isArray(updated[key])) {
              const copy = [...updated[key]];
              copy.status = 'published';
              updated[key] = copy;
            } else {
              updated[key] = { ...updated[key], status: 'published' };
            }
          }
        });
        return updated;
      });
      setLastSaved(new Date());
      setHasUnsavedContent(false);

      await refreshWebsiteContent();

      if (failedSections.length > 0) {
        toast.error(`Failed to publish: ${failedSections.join(',')}`);
        if (setGlobalActionLoading) {
          setGlobalActionLoading(false);
          setGlobalActionMessage('');
        }
      } else {
        setPublishToast('All content published!');
        if (setGlobalActionLoading && typeof setGlobalActionSuccess === 'function') {
          setGlobalActionSuccess(true);
          setGlobalActionMessage('Published successfully!');
          setTimeout(() => {
            setGlobalActionSuccess(false);
            setGlobalActionLoading(false);
            setGlobalActionMessage('');
          }, 1500);
        } else if (setGlobalActionLoading) {
          setGlobalActionLoading(false);
          setGlobalActionMessage('');
        }
      }
      setTimeout(() => setPublishToast(null), 3000);
    } catch (_err) {
      toast.error('Failed to publish all content');
      if (setGlobalActionLoading) {
        setGlobalActionLoading(false);
        setGlobalActionMessage('');
      }
    }
  }, [websiteContent, setGlobalActionLoading, setGlobalActionMessage, setGlobalActionSuccess]);

  const resetContent = useCallback((section) => {
    setWebsiteContent((prev) => ({
      ...prev,
      [section]: initialWebsiteContent[section],
    }));
    setHasUnsavedContent(true);
  }, []);

  const resetAllContent = useCallback(() => {
    setWebsiteContent(initialWebsiteContent);
    setLastSaved(null);
    setHasUnsavedContent(false);
  }, []);

  const bulkUpdateContent = useCallback((newContent) => {
    setWebsiteContent(newContent);
    setHasUnsavedContent(true);
  }, []);

  const reorderHomepageSections = useCallback((fromIndex, toIndex) => {
    setWebsiteContent((prev) => {
      const sections = [...prev.homepageSections];
      const [moved] = sections.splice(fromIndex, 1);
      sections.splice(toIndex, 0, moved);
      sections.status = 'modified';
      setHasUnsavedContent(true);
      return { ...prev, homepageSections: sections };
    });
  }, []);

  const toggleHomepageSection = useCallback((sectionId) => {
    setWebsiteContent((prev) => {
      const sections = prev.homepageSections.map((s) =>
        s.id === sectionId ? { ...s, isVisible: !s.isVisible } : s,
      );
      sections.status = 'modified';
      setHasUnsavedContent(true);
      return {
        ...prev,
        homepageSections: sections,
      };
    });
  }, []);

  // Fetch initial CMS state
  const loadCMSData = useCallback(async () => {
    try {
      const response = await cmsService.getPublished();
      if (response.success && response.data && Object.keys(response.data).length > 0) {
        setWebsiteContent((prev) => {
          const merged = { ...initialWebsiteContent, ...response.data };
          if (response.data.eventsPage) {
            merged.eventsPage = {
              ...initialWebsiteContent.eventsPage,
              ...response.data.eventsPage,
              hero: {
                ...initialWebsiteContent.eventsPage.hero,
                ...(response.data.eventsPage.hero || {}),
              },
              promo: {
                ...initialWebsiteContent.eventsPage.promo,
                ...(response.data.eventsPage.promo || {}),
              },
            };
          }
          Object.keys(prev).forEach((key) => {
            if (prev[key]?.status === 'modified') {
              merged[key] = prev[key];
            }
          });
          return merged;
        });
      }

      const safetyLockRes = await cmsService.getSection('admin_safety_lock');
      if (safetyLockRes && safetyLockRes.success && safetyLockRes.data) {
        setSafetyLock(safetyLockRes.data.data?.safetyLock === true);
      }

      const maintenanceRes = await storeSettingsService.getPublicSettings();
      if (maintenanceRes && maintenanceRes.general) {
        setMaintenanceMode(maintenanceRes.general.maintenanceMode === true);
      }

      const idleRes = await cmsService.getSection('admin_idle_timeout');
      if (idleRes && idleRes.success && idleRes.data) {
        const val = idleRes.data.data?.idleTimeout;
        if (val) setIdleTimeoutMinutes(parseInt(val));
      }

      const autoPublishRes = await cmsService.getSection('admin_auto_publish');
      if (autoPublishRes && autoPublishRes.success && autoPublishRes.data) {
        setAutoPublish(autoPublishRes.data.data?.autoPublish === true);
      }

      const categoriesRes = await cmsService.getSection('custom_categories');
      if (categoriesRes && categoriesRes.success && categoriesRes.data) {
        const val = categoriesRes.data.data;
        if (val && (val.products || val.events)) {
          setCustomCategories(val);
        }
      }
    } catch (err) {
      logger.warn('CMS API unavailable', err);
    }
  }, [setSafetyLock, setMaintenanceMode, setIdleTimeoutMinutes, setAutoPublish]);

  useEffect(() => {
    if (hasUnsavedContent) {
      const timer = setTimeout(() => {
        setLastSaved(new Date());
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [hasUnsavedContent]);

  return {
    customCategories,
    addCustomCategory,
    updateCustomCategory,
    deleteCustomCategory,
    websiteContent,
    updateContent,
    updateNestedContent,
    bulkUpdateContent,
    publishContent,
    publishAllContent,
    resetContent,
    resetAllContent,
    hasUnsavedContent,
    lastSaved,
    publishToast,
    contentHistory,
    reorderHomepageSections,
    toggleHomepageSection,
    loadCMSData,
  };
}
