import React from 'react';

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
  return (
    <>
      {/* SaaS AI Curation HUD Overlay Modal */}
      {showAIHUD && aiAnalysisResult && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[var(--admin-bg-subtle)] border border-[var(--admin-accent)]/40 max-w-xl w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] relative">
            {/* Luxury Header */}
            <div className="bg-[var(--admin-text-primary)] p-5 text-white flex justify-between items-center border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white animate-pulse">
                  auto_awesome
                </span>
                <div className="text-left">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-white">
                    Groq Vision Analysis
                  </h3>
                  <p className="text-[11px] sm:text-[11px] text-[var(--admin-text-tertiary)]">
                    Multimodal Showcase Curation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAIHUD(false)}
                className="text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Scrollable Dashboard Panel */}
            <div className="p-6 overflow-y-auto space-y-5 text-left text-[var(--admin-text-primary)]">
              {/* Top Classification Row: Concept + Match */}
              <div className="flex items-center justify-between bg-[var(--admin-surface)] p-4 rounded-2xl border border-[var(--admin-border)] shadow-sm">
                <div>
                  <p className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">
                    Detected Concept
                  </p>
                  <h4 className="text-[17px] font-bold text-[var(--admin-text-primary)] flex items-center gap-1.5 mt-0.5">
                    <span className="material-symbols-outlined text-[var(--admin-accent)] text-[18px]">
                      workspace_premium
                    </span>
                    {aiAnalysisResult.title || 'Unidentified Design'}
                  </h4>
                </div>

                {/* Confidence circular indicator */}
                <div className="flex flex-col items-center">
                  <div className="relative w-14 h-14 flex items-center justify-center rounded-full bg-amber-50 border-2 border-amber-500/30 shadow-inner">
                    <span className="text-[13px] font-extrabold text-amber-600">92%</span>
                  </div>
                  <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mt-1">
                    Match
                  </p>
                </div>
              </div>

              {/* Subtitle Block */}
              <div className="space-y-3">
                <div className="p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl space-y-1 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Subtitle / Concept Note
                  </span>
                  <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
                    {aiAnalysisResult.subtitle || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Attribute Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Category & Setup Time */}
                <div className="col-span-2 sm:col-span-1 p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-2">
                  <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Category Mapped
                  </span>
                  <div className="inline-flex items-center gap-1.5 bg-[var(--admin-surface)] text-[var(--admin-text-primary)] px-2.5 py-1 rounded-lg text-[12px] font-bold border border-[var(--admin-border)]">
                    <span className="material-symbols-outlined text-[14px] text-[var(--admin-accent)]">
                      category
                    </span>
                    {aiAnalysisResult.category || 'Event Decor'}
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-2">
                  <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Setup Time
                  </span>
                  <div className="inline-flex items-center gap-1.5 bg-[var(--admin-surface)] text-[var(--admin-text-primary)] px-2.5 py-1 rounded-lg text-[12px] font-bold border border-[var(--admin-border)]">
                    <span className="material-symbols-outlined text-[14px] text-[var(--admin-accent)]">
                      timer
                    </span>
                    {aiAnalysisResult.setupTimeHours || 2} Hours
                  </div>
                </div>

                {/* Inclusions */}
                <div className="col-span-2 p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-3">
                  <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Key Inclusions
                  </span>
                  <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-3">
                    <p className="text-[12.5px] text-[var(--admin-text-primary)] font-medium leading-relaxed">
                      {aiAnalysisResult.inclusionsText}
                    </p>
                  </div>
                </div>

                {/* Props */}
                <div className="col-span-2 p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-3">
                  <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Suggested Props
                  </span>
                  <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-3">
                    <p className="text-[12.5px] text-[var(--admin-text-primary)] font-medium leading-relaxed">
                      {aiAnalysisResult.suggestedProps}
                    </p>
                  </div>
                </div>

                {/* Palette */}
                <div className="col-span-2 p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-3">
                  <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Color Palette
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(aiAnalysisResult.colorPalette || '').split(',').map((c, idx) => (
                      <span
                        key={idx}
                        className="bg-[var(--admin-surface)] text-[var(--admin-text-primary)] px-3 py-1 rounded-full text-[12px] font-medium border border-[var(--admin-border)] shadow-sm"
                      >
                        {c.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="col-span-2 p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-4">
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                      Narrative Description
                    </span>
                    <p className="text-[13px] text-[var(--admin-text-primary)] leading-relaxed bg-[var(--admin-surface)] border border-[var(--admin-border)] p-3 rounded-xl">
                      {aiAnalysisResult.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Box for AI Refinement */}
            <div className="px-6 pb-4 pt-2">
              <form
                onSubmit={handleAiChatSubmit}
                className="flex items-center gap-2 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-xl p-1.5 focus-within:border-[var(--admin-accent)] focus-within:ring-2 focus-within:ring-[var(--admin-accent)]/20 transition-all shadow-sm"
              >
                <input
                  type="text"
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  placeholder="Ask AI to change title, category, props..."
                  className="flex-1 bg-transparent border-0 !border-none outline-none !outline-none focus:ring-0 focus:!ring-0 shadow-none text-[12.5px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] px-3 py-2"
                  disabled={isAILearning}
                />
                <button
                  type="submit"
                  disabled={!aiChatInput.trim() || isAILearning}
                  className="bg-[var(--admin-accent)] text-white px-3 py-2 rounded-lg flex items-center justify-center disabled:opacity-50 cursor-pointer hover:brightness-110 transition-all shadow-sm"
                >
                  {isAILearning ? (
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      refresh
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px] pr-0.5">send</span>
                  )}
                </button>
              </form>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-[var(--admin-bg-subtle)] border-t border-[var(--admin-border)] flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setShowAIHUD(false)}
                className="w-full sm:flex-1 border border-[var(--admin-border)] text-[var(--admin-text-secondary)] py-2.5 rounded-xl text-[11px] sm:text-[11px] font-bold hover:bg-white transition-colors cursor-pointer"
              >
                Manual Correction / Reject
              </button>

              <button
                type="button"
                onClick={handleApplyAISpecs}
                className="w-full sm:flex-1 bg-[var(--admin-accent)] text-white py-2.5 rounded-xl text-[11px] sm:text-[11px] font-bold shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[15px] animate-bounce">
                  published_with_changes
                </span>
                Apply AI Curation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
