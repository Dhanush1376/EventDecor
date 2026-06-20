import React from 'react';

export function AiCurationOverlay({
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[var(--admin-bg-subtle)] border border-[var(--admin-accent)]/40 max-w-xl w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]  relative">
            {/* Luxury Header */}
            <div className="bg-[var(--admin-text-primary)] p-5 text-white flex justify-between items-center border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white animate-pulse">
                  auto_awesome
                </span>
                <div className="text-left">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-white">
                    Groq Llama 4 Curation Analysis
                  </h3>
                  <p className="text-[11px] sm:text-[11px] sm:text-[11px] text-[var(--admin-text-tertiary)]">
                    Rigorous 4-Stage Multimodal Craft Curation
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
              {/* Top Classification Row: Object + Confidence Score */}
              <div className="flex items-center justify-between bg-[var(--admin-surface)] p-4 rounded-2xl border border-[var(--admin-border)] shadow-sm">
                <div>
                  <p className="text-[11px] sm:text-[11px] sm:text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">
                    Detected Object Class
                  </p>
                  <h4 className="text-[17px] font-bold text-[var(--admin-text-primary)] flex items-center gap-1.5 mt-0.5">
                    <span className="material-symbols-outlined text-[var(--admin-accent)] text-[18px]">
                      workspace_premium
                    </span>
                    {aiAnalysisResult.detected_object || 'Unidentified Curation'}
                  </h4>
                </div>

                {/* Confidence circular indicator */}
                <div className="flex flex-col items-center">
                  <div className="relative w-14 h-14 flex items-center justify-center rounded-full bg-amber-50 border-2 border-amber-500/30 shadow-inner">
                    <span className="text-[13px] font-extrabold text-amber-600">
                      {aiAnalysisResult.confidence || 85}%
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mt-1">
                    Confidence
                  </p>
                </div>
              </div>

              {/* Titles Block */}
              <div className="space-y-3">
                <div className="p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl space-y-1 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Generated English Title
                  </span>
                  <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
                    {aiAnalysisResult.english_title}
                  </p>
                </div>
                <div className="p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl space-y-1 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Natural Telugu Curation
                  </span>
                  <p className="text-[13px] font-bold text-[var(--admin-text-primary)]  TeluguScript">
                    {aiAnalysisResult.telugu_title}
                  </p>
                </div>
              </div>

              {/* Attribute Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div className="p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl space-y-1.5 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Category Mapped
                  </span>
                  <div className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg text-[11px] sm:text-[11px] font-bold border border-purple-200">
                    <span className="material-symbols-outlined text-[11px] sm:text-[11px]">
                      category
                    </span>
                    {aiAnalysisResult.category || 'General Decor'}
                  </div>
                </div>

                {/* Occasion / Style */}
                <div className="p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl space-y-1.5 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Style & Theme
                  </span>
                  <p className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-text-primary)]">
                    {aiAnalysisResult.style || 'Traditional Indian'}
                  </p>
                </div>

                {/* Materials Chips */}
                <div className="col-span-2 p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl space-y-2 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Auto-Detected Craft Materials
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(aiAnalysisResult.materials || []).map((m, idx) => (
                      <span
                        key={idx}
                        className="bg-amber-50 text-[var(--admin-accent)] px-2.5 py-0.5 rounded-full text-[11px] sm:text-[11px] font-bold border border-[var(--admin-accent)]/20 flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)]" />
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Color Palette */}
                <div className="col-span-2 p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl space-y-2 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Color Palette Extracted
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {(aiAnalysisResult.colors || []).map((c, idx) => {
                      const colorMap = {
                        gold: '#FFD700',
                        green: '#1b4d3e',
                        red: '#c62828',
                        maroon: '#5d001e',
                        ivory: '#fbf6eb',
                        yellow: '#fbc02d',
                        pink: '#f06292',
                        brass: '#000000',
                        bronze: '#cd7f32',
                      };
                      const hex = colorMap[c.toLowerCase()] || '#64748B';
                      const isLight = c.toLowerCase() === 'ivory';
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] px-2.5 py-1 rounded-xl shadow-sm"
                        >
                          <span
                            className={`w-3 h-3 rounded-full shadow-inner border ${isLight ? 'border-[var(--admin-border-strong)]' : 'border-transparent'}`}
                            style={{ backgroundColor: hex }}
                          />
                          <span className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-text-primary)] capitalize">
                            {c}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Customization Note */}
                {aiAnalysisResult.isCustomizable && (
                  <div className="col-span-2 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold text-blue-800 uppercase tracking-wider block">
                        Auto-Detected Personalization
                      </span>
                      <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">check_circle</span>
                        Enabled
                      </span>
                    </div>
                    <p className="text-[12px] text-blue-900 font-medium">
                      Label:{' '}
                      <span className="font-bold italic">
                        "{aiAnalysisResult.customizationNote}"
                      </span>
                    </p>
                  </div>
                )}

                {/* Tags Generation */}
                <div className="col-span-2 p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl space-y-2 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    SEO Collections & Search Tags
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(aiAnalysisResult.tags || []).map((t, idx) => (
                      <span
                        key={idx}
                        className="bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] px-2 py-0.5 rounded-lg text-[11px] sm:text-[11px] sm:text-[11px] font-semibold border border-[var(--admin-border)]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="col-span-2 p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl space-y-1.5 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Premium Curation Description
                  </span>
                  <p className="text-[11px] sm:text-[11px] text-[#555] leading-relaxed italic">
                    "{aiAnalysisResult.description}"
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Box for AI Refinement */}
            <div className="px-6 pb-2">
              <form
                onSubmit={handleAiChatSubmit}
                className="flex items-center gap-2 bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] rounded-xl p-1.5 focus-within:border-[var(--admin-accent)]/50 transition-colors"
              >
                <input
                  type="text"
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  placeholder="Ask AI to change title, category, style, etc..."
                  className="flex-1 bg-transparent !border-none text-[12px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] px-3 py-1.5 focus:outline-none focus:!border-none focus:!outline-none focus:!ring-0"
                  disabled={isAILearning}
                />
                <button
                  type="submit"
                  disabled={!aiChatInput.trim() || isAILearning}
                  className="bg-[var(--admin-accent)] text-white p-1.5 rounded-lg flex items-center justify-center disabled:opacity-50 cursor-pointer hover:brightness-110 transition-all"
                >
                  {isAILearning ? (
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      refresh
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px] pr-0.5">send</span>
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
