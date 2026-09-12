import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useMobileDrawerEngine, DrawerDragHandle } from '../../components/ui/drawer';

export function AiCurationOverlay({
  showAIHUD,
  setShowAIHUD,
  aiAnalysisResult,
  setAiAnalysisResult,
  aiChatInput,
  setAiChatInput,
  handleAiChatSubmit,
  isAILearning,
  handleApplyAISpecs,
}) {
  const [tagInput, setTagInput] = useState('');
  const [materialInput, setMaterialInput] = useState('');
  const [badgeInput, setBadgeInput] = useState('');

  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen: showAIHUD && !!aiAnalysisResult,
    onClose: () => setShowAIHUD(false),
  });

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showAIHUD) {
        setShowAIHUD(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAIHUD, setShowAIHUD]);

  if (!aiAnalysisResult) return null;

  const updateField = (key, value) => {
    if (!setAiAnalysisResult) return;
    setAiAnalysisResult((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [key]: value };
      if (key === 'category') updated.primary_category = value;
      if (key === 'primary_category') updated.category = value;
      return updated;
    });
  };

  const removeArrayItem = (key, index) => {
    if (!setAiAnalysisResult) return;
    setAiAnalysisResult((prev) => {
      if (!prev) return prev;
      const arr = Array.isArray(prev[key]) ? [...prev[key]] : [];
      arr.splice(index, 1);
      return { ...prev, [key]: arr };
    });
  };

  const addArrayItem = (key, item) => {
    const trimmed = (item || '').trim();
    if (!trimmed || !setAiAnalysisResult) return;
    setAiAnalysisResult((prev) => {
      if (!prev) return prev;
      const arr = Array.isArray(prev[key]) ? [...prev[key]] : [];
      if (!arr.includes(trimmed)) {
        arr.push(trimmed);
      }
      return { ...prev, [key]: arr };
    });
  };

  const allTags = [
    ...(aiAnalysisResult.tags || []),
    ...(aiAnalysisResult.telugu_keywords || []),
    ...(aiAnalysisResult.search_aliases || []),
    ...(aiAnalysisResult.event_associations || []),
  ].filter((item, index, self) => self.indexOf(item) === index);

  if (!aiAnalysisResult || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {showAIHUD && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
          {/* Blurred Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowAIHUD(false)}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 pointer-events-auto cursor-pointer"
            style={{
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />

          {/* Modal Container: App Drawer on mobile, Centered Pop-up on laptop */}
          <motion.div
            initial={{
              opacity: 0,
              y: isMobile ? '100%' : 8,
              scale: isMobile ? 1 : 0.98,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: isMobile ? '100%' : 8,
              scale: isMobile ? 1 : 0.98,
            }}
            transition={sheetTransition}
            {...dragProps}
            className="pointer-events-auto relative z-10 bg-[var(--admin-surface)] border-t sm:border border-[var(--admin-border)] w-full sm:max-w-2xl rounded-t-2xl sm:rounded-[4px] shadow-2xl flex flex-col max-h-[90dvh] sm:max-h-[88vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {isMobile && <DrawerDragHandle onClick={() => setShowAIHUD(false)} />}

            {/* Header */}
            <div className="px-4 sm:px-5 py-3 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[4px] bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] flex items-center justify-center shrink-0 border border-[var(--admin-accent)]/20">
                  <span className="material-symbols-outlined text-[19px]">psychology</span>
                </div>
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13.5px] sm:text-[14px] font-bold text-[var(--admin-text-primary)] tracking-tight whitespace-nowrap leading-tight">
                      AI Curation Analysis
                    </h3>
                    <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] border-[var(--admin-accent)]/30 shrink-0">
                      Editable Curation
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--admin-text-secondary)] font-medium truncate mt-0.5">
                    Review and customize fields before applying to the product
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAIHUD(false)}
                className="w-8 h-8 rounded-[4px] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title="Close"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Change Notice Bar */}
            <div className="bg-[var(--admin-surface-muted)] px-4 sm:px-5 py-2 border-b border-[var(--admin-border-subtle)] flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] font-medium text-[var(--admin-text-secondary)] flex items-center gap-1.5 truncate">
                <span className="material-symbols-outlined text-[14px] text-[var(--admin-accent)] shrink-0">
                  edit_note
                </span>
                Click any field below to edit before applying
              </span>
              <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[3px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
                Auto-Curated
              </span>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain touch-pan-y space-y-3.5 custom-scrollbar text-left text-[var(--admin-text-primary)] flex-1">
              {/* Classification Banner: Detected Object + Confidence */}
              <div className="p-3 sm:p-3.5 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
                    Detected Object Class
                  </span>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 font-bold text-[11px] shrink-0">
                    <span className="material-symbols-outlined text-[13px]">verified</span>
                    <span>{aiAnalysisResult.confidence || 90}% Match</span>
                  </div>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-[var(--admin-accent)] pointer-events-none">
                    workspace_premium
                  </span>
                  <input
                    type="text"
                    value={aiAnalysisResult.detected_object || ''}
                    onChange={(e) => updateField('detected_object', e.target.value)}
                    placeholder="Detected object class (e.g. Coconut Decor)"
                    className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] pl-8 pr-2.5 py-1.5 text-[13px] font-bold text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Title Section (English & Telugu) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* English Title */}
                <div className="p-3 sm:p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-1.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                    English Title
                  </span>
                  <input
                    type="text"
                    value={aiAnalysisResult.english_title || ''}
                    onChange={(e) => updateField('english_title', e.target.value)}
                    placeholder="Product Title in English"
                    className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] px-3 py-1.5 text-[12.5px] font-bold text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] outline-none transition-all"
                  />
                </div>

                {/* Telugu Title */}
                <div className="p-3 sm:p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-1.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                    Telugu Title (తెలుగు)
                  </span>
                  <input
                    type="text"
                    value={aiAnalysisResult.telugu_title || ''}
                    onChange={(e) => updateField('telugu_title', e.target.value)}
                    placeholder="తెలుగు శీర్షిక"
                    className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] px-3 py-1.5 text-[12.5px] font-bold text-[var(--admin-text-primary)] TeluguScript focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Category & Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Primary Category */}
                <div className="p-3 sm:p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-1.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                    Category
                  </span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[14px] text-[var(--admin-accent)] pointer-events-none">
                      category
                    </span>
                    <input
                      type="text"
                      value={aiAnalysisResult.primary_category || aiAnalysisResult.category || ''}
                      onChange={(e) => updateField('category', e.target.value)}
                      placeholder="Category"
                      className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] pl-8 pr-2.5 py-1.5 text-[12px] font-bold text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Estimated Price */}
                <div className="p-3 sm:p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-1.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                    Estimated Price
                  </span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[var(--admin-accent)] pointer-events-none">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={aiAnalysisResult.price || ''}
                      onChange={(e) => updateField('price', e.target.value)}
                      placeholder="0"
                      className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] pl-6 pr-2.5 py-1.5 text-[13px] font-mono font-bold text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Pack / Quantity */}
                <div className="p-3 sm:p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-1.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                    Pack Quantity
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={aiAnalysisResult.estimated_quantity || 1}
                      onChange={(e) => updateField('estimated_quantity', Number(e.target.value))}
                      className="w-14 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] px-2 py-1.5 text-[12px] font-bold text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] outline-none text-center"
                    />
                    <input
                      type="text"
                      value={aiAnalysisResult.estimated_quantity_unit || 'Items'}
                      onChange={(e) => updateField('estimated_quantity_unit', e.target.value)}
                      placeholder="Units"
                      className="flex-1 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] px-2.5 py-1.5 text-[12px] font-medium text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Storefront Badges & Highlights */}
              <div className="p-3 sm:p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                  Storefront Badges & Highlights
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(aiAnalysisResult.badges || []).map((b, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border border-[var(--admin-border)] pl-2 pr-1 py-0.5 rounded-[4px] text-[10.5px] font-bold uppercase tracking-wider"
                    >
                      {b}
                      <button
                        type="button"
                        onClick={() => removeArrayItem('badges', idx)}
                        className="hover:text-red-500 transition-colors cursor-pointer p-0.5 flex items-center"
                        title="Remove"
                      >
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={badgeInput}
                      onChange={(e) => setBadgeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addArrayItem('badges', badgeInput);
                          setBadgeInput('');
                        }
                      }}
                      placeholder="+ Add badge"
                      className="w-24 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] px-2 py-0.5 text-[11px] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none"
                    />
                    {badgeInput.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          addArrayItem('badges', badgeInput);
                          setBadgeInput('');
                        }}
                        className="admin-btn-icon !w-6 !h-6 !rounded-[3px] text-[11px]"
                      >
                        <span className="material-symbols-outlined text-[13px]">add</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Craft Materials */}
              <div className="p-3 sm:p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                  Detected Craft Materials
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(aiAnalysisResult.materials || []).map((m, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] pl-2 pr-1 py-0.5 rounded-[4px] text-[11.5px] font-medium border border-[var(--admin-border)]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)]" />
                      {m}
                      <button
                        type="button"
                        onClick={() => removeArrayItem('materials', idx)}
                        className="hover:text-red-500 transition-colors cursor-pointer p-0.5 flex items-center"
                        title="Remove"
                      >
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={materialInput}
                      onChange={(e) => setMaterialInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addArrayItem('materials', materialInput);
                          setMaterialInput('');
                        }
                      }}
                      placeholder="+ Add material"
                      className="w-28 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] px-2 py-0.5 text-[11px] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none"
                    />
                    {materialInput.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          addArrayItem('materials', materialInput);
                          setMaterialInput('');
                        }}
                        className="admin-btn-icon !w-6 !h-6 !rounded-[3px] text-[11px]"
                      >
                        <span className="material-symbols-outlined text-[13px]">add</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Note */}
              <div className="p-3 sm:p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-2">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
                  <span className="material-symbols-outlined text-[15px] text-[var(--admin-accent)]">
                    info
                  </span>
                  Customer Note / Care Instructions
                </div>
                <textarea
                  rows={4}
                  value={aiAnalysisResult.customer_note || ''}
                  onChange={(e) => updateField('customer_note', e.target.value)}
                  placeholder="Customer note / care instructions..."
                  className="w-full min-h-[96px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] p-3 text-[12px] text-[var(--admin-text-primary)] leading-relaxed focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] outline-none transition-all resize-y custom-scrollbar"
                />
              </div>

              {/* Personalization Section */}
              <div className="p-3 sm:p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-[16px] text-[var(--admin-accent)] shrink-0">
                      tune
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)] truncate">
                      Customization / Personalization
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        'personalization_enabled',
                        !aiAnalysisResult.personalization_enabled,
                      )
                    }
                    className={`px-3 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all shrink-0 ${
                      aiAnalysisResult.personalization_enabled
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-stone-500/10 text-stone-500 border-stone-500/20'
                    }`}
                  >
                    {aiAnalysisResult.personalization_enabled ? '✓ Enabled' : 'Disabled'}
                  </button>
                </div>

                {aiAnalysisResult.personalization_enabled && (
                  <div className="space-y-2.5 pt-2.5 border-t border-[var(--admin-border-subtle)]">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--admin-text-secondary)] block mb-1">
                        Field Label
                      </span>
                      <input
                        type="text"
                        value={aiAnalysisResult.personalization_label || ''}
                        onChange={(e) => updateField('personalization_label', e.target.value)}
                        placeholder="e.g. Customization Details"
                        className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] px-3 py-1.5 text-[12px] font-medium text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--admin-text-secondary)] block mb-1">
                        Placeholder Instructions
                      </span>
                      <textarea
                        rows={3}
                        value={aiAnalysisResult.personalization_placeholder || ''}
                        onChange={(e) => updateField('personalization_placeholder', e.target.value)}
                        placeholder="Instructions for customer..."
                        className="w-full min-h-[64px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] p-2.5 text-[11.5px] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none resize-y leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SEO Collections & Search Tags */}
              <div className="p-3 sm:p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                  Search Tags & Keywords ({allTags.length})
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {allTags.map((t, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] pl-2 pr-1 py-0.5 rounded-[4px] border border-[var(--admin-border)]"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => removeArrayItem('tags', idx)}
                        className="hover:text-red-500 transition-colors cursor-pointer p-0.5 flex items-center"
                        title="Remove"
                      >
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addArrayItem('tags', tagInput);
                          setTagInput('');
                        }
                      }}
                      placeholder="+ Add search tag"
                      className="w-32 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] px-2 py-0.5 text-[11px] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none"
                    />
                    {tagInput.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          addArrayItem('tags', tagInput);
                          setTagInput('');
                        }}
                        className="admin-btn-icon !w-6 !h-6 !rounded-[3px] text-[11px]"
                      >
                        <span className="material-symbols-outlined text-[13px]">add</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SEO Meta Title & Meta Description */}
              <div className="p-3 sm:p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-2.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                  SEO Metadata (Google Search)
                </span>
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] block mb-1">
                      Meta Title
                    </span>
                    <input
                      type="text"
                      value={
                        aiAnalysisResult.seo_title ||
                        (aiAnalysisResult.english_title
                          ? `${aiAnalysisResult.english_title} | Siri Arts & Crafts`
                          : '')
                      }
                      onChange={(e) => updateField('seo_title', e.target.value)}
                      placeholder="SEO Meta Title"
                      className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] px-3 py-1.5 text-[12px] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] block mb-1">
                      Meta Description (Snippet)
                    </span>
                    <textarea
                      rows={2}
                      value={
                        aiAnalysisResult.seo_description ||
                        (aiAnalysisResult.description
                          ? aiAnalysisResult.description.substring(0, 155)
                          : '')
                      }
                      onChange={(e) => updateField('seo_description', e.target.value)}
                      placeholder="Search engine meta description..."
                      className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] p-2.5 text-[11.5px] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Curation Description & URL Slug */}
              <div className="p-3 sm:p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-2.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                  Product Description & URL Slug
                </span>
                <textarea
                  rows={4}
                  value={aiAnalysisResult.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Detailed product narrative description..."
                  className="w-full min-h-[85px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] p-3 text-[12px] text-[var(--admin-text-primary)] leading-relaxed focus:border-[var(--admin-accent)] outline-none transition-all resize-y custom-scrollbar"
                />
                <div className="pt-2 border-t border-[var(--admin-border-subtle)] flex items-center gap-2">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] shrink-0">
                    URL Slug:
                  </span>
                  <div className="flex-1 flex items-center bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] px-2.5 py-1">
                    <span className="text-[11px] font-mono text-[var(--admin-text-tertiary)]">
                      /
                    </span>
                    <input
                      type="text"
                      value={aiAnalysisResult.slug || ''}
                      onChange={(e) => updateField('slug', e.target.value)}
                      placeholder="product-slug"
                      className="flex-1 bg-transparent border-0 outline-none text-[11px] font-mono text-[var(--admin-accent)] px-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Box for AI Refinement */}
            <div className="px-4 sm:px-5 py-2.5 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] shrink-0">
              <form
                onSubmit={handleAiChatSubmit}
                className="flex items-center gap-2 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] p-1 focus-within:border-[var(--admin-accent)] focus-within:ring-1 focus-within:ring-[var(--admin-accent)]/20 transition-all"
              >
                <input
                  type="text"
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  placeholder="Ask AI to change title, category, style, etc..."
                  className="flex-1 bg-transparent border-0 !border-none outline-none !outline-none focus:ring-0 focus:!ring-0 shadow-none text-[12px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] px-2.5 py-1"
                  disabled={isAILearning}
                />
                <button
                  type="submit"
                  disabled={!aiChatInput.trim() || isAILearning}
                  className="admin-btn admin-btn-primary !rounded-[4px] !h-7 !py-0 px-2.5 flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-xs text-[12px] font-bold shrink-0"
                >
                  {isAILearning ? (
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      refresh
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  )}
                </button>
              </form>
            </div>

            {/* Footer Actions */}
            <div className="p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4 bg-[var(--admin-surface-muted)] border-t border-[var(--admin-border-subtle)] flex items-center gap-2 sm:gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowAIHUD(false)}
                className="admin-btn admin-btn-outline flex-1 !h-9 sm:!h-10 !py-0 px-3 sm:px-4 !rounded-[4px] text-[12px] sm:text-[13px] font-bold shadow-xs min-w-max cursor-pointer inline-flex items-center justify-center gap-1.5 box-border"
              >
                Manual Correction / Reject
              </button>

              <button
                type="button"
                onClick={handleApplyAISpecs}
                className="admin-btn admin-btn-primary flex-1 !h-9 sm:!h-10 !py-0 px-3 sm:px-4 !rounded-[4px] text-[12px] sm:text-[13px] font-bold shadow-xs min-w-max cursor-pointer inline-flex items-center justify-center gap-1.5 box-border"
              >
                <span className="material-symbols-outlined text-[17px] leading-none">
                  published_with_changes
                </span>
                <span>Apply AI Curation</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
