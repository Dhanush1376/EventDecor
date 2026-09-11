import React, { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

export function AIVisionHUD({
  showAIHUD,
  setShowAIHUD,
  aiAnalysisResult,
  aiChatInput,
  setAiChatInput,
  handleAiChatSubmit,
  isAILearning,
  handleApplyAISpecs,
}) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (showAIHUD && aiAnalysisResult) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [showAIHUD, aiAnalysisResult]);

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

  return (
    <AnimatePresence>
      {showAIHUD && aiAnalysisResult && (
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
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto relative z-10 bg-[var(--admin-surface)] border-t sm:border border-[var(--admin-border)] w-full sm:max-w-xl rounded-t-[8px] sm:rounded-[4px] shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[86vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drawer Pull Indicator */}
            <div className="pt-2 pb-0.5 sm:hidden flex justify-center w-full shrink-0">
              <div className="w-8 h-1 rounded-full bg-stone-300 dark:bg-stone-700" />
            </div>

            {/* Header */}
            <div className="px-4 sm:px-5 py-3 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[4px] bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] flex items-center justify-center shrink-0 border border-[var(--admin-accent)]/20">
                  <span className="material-symbols-outlined text-[19px]">psychology</span>
                </div>
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13.5px] sm:text-[14px] font-bold text-[var(--admin-text-primary)] tracking-tight whitespace-nowrap leading-tight">
                      Groq Vision Analysis
                    </h3>
                    <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] border-[var(--admin-accent)]/30 shrink-0">
                      Showcase Curation
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--admin-text-secondary)] font-medium truncate mt-0.5">
                    Multimodal Vision Extraction & Specifications
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

            {/* Scrollable Dashboard Panel */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 custom-scrollbar text-left text-[var(--admin-text-primary)] flex-1">
              {/* Classification Banner: Concept + Match */}
              <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)]">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                    Detected Concept
                  </p>
                  <h4 className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] flex items-center gap-1.5 mt-0.5 truncate">
                    <span className="material-symbols-outlined text-[var(--admin-accent)] text-[18px]">
                      workspace_premium
                    </span>
                    <span className="truncate">
                      {aiAnalysisResult.title || 'Unidentified Design'}
                    </span>
                  </h4>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 font-bold text-[12px] shrink-0">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  <span>92% Match</span>
                </div>
              </div>

              {/* Subtitle Block */}
              {aiAnalysisResult.subtitle && (
                <div className="p-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block">
                    Subtitle / Concept Note
                  </span>
                  <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
                    {aiAnalysisResult.subtitle}
                  </p>
                </div>
              )}

              {/* Attribute Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Category Mapped */}
                <div className="col-span-2 sm:col-span-1 p-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block">
                    Category Mapped
                  </span>
                  <div className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--admin-text-primary)]">
                    <span className="material-symbols-outlined text-[15px] text-[var(--admin-accent)]">
                      category
                    </span>
                    <span>{aiAnalysisResult.category || 'Event Decor'}</span>
                  </div>
                </div>

                {/* Setup Time */}
                <div className="col-span-2 sm:col-span-1 p-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block">
                    Setup Time
                  </span>
                  <div className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--admin-text-primary)]">
                    <span className="material-symbols-outlined text-[15px] text-[var(--admin-accent)]">
                      timer
                    </span>
                    <span>{aiAnalysisResult.setupTimeHours || 2} Hours</span>
                  </div>
                </div>

                {/* Key Inclusions */}
                {aiAnalysisResult.inclusionsText && (
                  <div className="col-span-2 p-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block">
                      Key Inclusions
                    </span>
                    <p className="text-[12px] text-[var(--admin-text-primary)] font-medium leading-relaxed bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] p-2.5 rounded-[4px]">
                      {aiAnalysisResult.inclusionsText}
                    </p>
                  </div>
                )}

                {/* Suggested Props */}
                {aiAnalysisResult.suggestedProps && (
                  <div className="col-span-2 p-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block">
                      Suggested Props
                    </span>
                    <p className="text-[12px] text-[var(--admin-text-primary)] font-medium leading-relaxed bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] p-2.5 rounded-[4px]">
                      {aiAnalysisResult.suggestedProps}
                    </p>
                  </div>
                )}

                {/* Color Palette */}
                {aiAnalysisResult.colorPalette && (
                  <div className="col-span-2 p-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block">
                      Color Palette
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(aiAnalysisResult.colorPalette || '').split(',').map((c, idx) => (
                        <span
                          key={idx}
                          className="bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] px-2.5 py-0.5 rounded-[4px] text-[11px] font-mono border border-[var(--admin-border)]"
                        >
                          {c.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Narrative Description */}
                {aiAnalysisResult.description && (
                  <div className="col-span-2 p-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block">
                      Narrative Description
                    </span>
                    <p className="text-[12.5px] text-[var(--admin-text-primary)] leading-relaxed bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] p-2.5 rounded-[4px]">
                      {aiAnalysisResult.description}
                    </p>
                  </div>
                )}
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
                  placeholder="Ask AI to change title, category, props..."
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
            <div className="p-3 sm:p-4 bg-[var(--admin-surface-muted)] border-t border-[var(--admin-border-subtle)] flex items-center gap-2 sm:gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowAIHUD(false)}
                className="admin-btn admin-btn-outline flex-1 !h-9 sm:!h-10 !py-0 px-3 sm:px-4 !rounded-[4px] text-[12px] sm:text-[13px] font-bold shadow-xs min-w-max cursor-pointer inline-flex items-center justify-center gap-1.5 box-border"
              >
                Reject / Cancel
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
    </AnimatePresence>
  );
}
