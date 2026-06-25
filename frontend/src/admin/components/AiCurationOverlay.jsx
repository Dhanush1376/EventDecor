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
                {/* Category & Price */}
                <div className="col-span-2 sm:col-span-1 p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-2">
                  <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Category Mapped
                  </span>
                  <div className="inline-flex items-center gap-1.5 bg-[var(--admin-surface)] text-[var(--admin-text-primary)] px-2.5 py-1 rounded-lg text-[12px] font-bold border border-[var(--admin-border)]">
                    <span className="material-symbols-outlined text-[14px] text-[var(--admin-accent)]">
                      category
                    </span>
                    {aiAnalysisResult.category || 'General Decor'}
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-2">
                  <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Estimated Price
                  </span>
                  <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                    ₹{aiAnalysisResult.price || '0'}
                  </p>
                </div>

                {/* Badges & Quantity */}
                <div className="col-span-2 p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-3">
                  <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Storefront Highlights
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    {aiAnalysisResult.badges && aiAnalysisResult.badges.length > 0 && (
                      <div className="flex gap-2">
                        {aiAnalysisResult.badges.map((b, idx) => (
                          <span
                            key={idx}
                            className="bg-[var(--admin-surface)] text-[var(--admin-text-primary)] border border-[var(--admin-border)] px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                    {aiAnalysisResult.estimated_quantity &&
                      aiAnalysisResult.estimated_quantity > 1 && (
                        <div className="flex items-center gap-1 bg-[var(--admin-surface)] text-[var(--admin-text-primary)] border border-[var(--admin-border)] px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm">
                          <span className="material-symbols-outlined text-[13px] text-[var(--admin-accent)]">
                            inventory_2
                          </span>
                          ~{aiAnalysisResult.estimated_quantity}{' '}
                          {aiAnalysisResult.estimated_quantity_unit || 'Items'}
                        </div>
                      )}
                  </div>
                </div>

                {/* Materials Chips */}
                <div className="col-span-2 p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-3">
                  <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Auto-Detected Craft Materials
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(aiAnalysisResult.materials || []).map((m, idx) => (
                      <span
                        key={idx}
                        className="bg-[var(--admin-surface)] text-[var(--admin-text-primary)] px-3 py-1 rounded-full text-[12px] font-medium border border-[var(--admin-border)] flex items-center gap-1.5 shadow-sm"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)]" />
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Customer Note */}
                {aiAnalysisResult.customer_note && (
                  <div className="col-span-2 p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-3">
                    <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-[var(--admin-accent)]">
                        info
                      </span>
                      Generated Customer Note
                    </span>
                    <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-3">
                      <p className="text-[12.5px] text-[var(--admin-text-primary)] font-medium whitespace-pre-wrap leading-relaxed">
                        {aiAnalysisResult.customer_note.replace(/\\n/g, '\n')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Personalization Note */}
                {aiAnalysisResult.personalization_enabled && (
                  <div className="col-span-2 p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                        Auto-Detected Personalization
                      </span>
                      <span className="bg-[var(--admin-accent)] text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm">
                        <span className="material-symbols-outlined text-[11px]">check_circle</span>
                        Enabled
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-[var(--admin-text-secondary)] font-bold uppercase tracking-wider">
                          Label
                        </p>
                        <p className="text-[12.5px] text-[var(--admin-text-primary)] font-medium bg-[var(--admin-surface)] px-3 py-2 rounded-xl border border-[var(--admin-border)]">
                          {aiAnalysisResult.personalization_label}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-[var(--admin-text-secondary)] font-bold uppercase tracking-wider">
                          Instructions / Placeholder
                        </p>
                        <p className="text-[12px] text-[var(--admin-text-primary)] font-medium whitespace-pre-wrap bg-[var(--admin-surface)] px-3 py-2 rounded-xl border border-[var(--admin-border)] leading-relaxed">
                          {aiAnalysisResult.personalization_placeholder?.replace(/\\n/g, '\n')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tags Generation */}
                <div className="col-span-2 p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-3">
                  <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    SEO Collections & Search Tags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      ...(aiAnalysisResult.tags || []),
                      ...(aiAnalysisResult.telugu_keywords || []),
                      ...(aiAnalysisResult.search_aliases || []),
                    ].map((t, idx) => (
                      <span
                        key={idx}
                        className="bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] px-2.5 py-1 rounded-lg text-[11.5px] font-medium border border-[var(--admin-border)] shadow-sm"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Description & URL */}
                <div className="col-span-2 p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-4">
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                      Premium Curation Description
                    </span>
                    <p className="text-[13px] text-[var(--admin-text-primary)] leading-relaxed bg-[var(--admin-surface)] border border-[var(--admin-border)] p-3 rounded-xl">
                      {aiAnalysisResult.description}
                    </p>
                  </div>
                  <div className="space-y-2 pt-3 border-t border-[var(--admin-border)]/50">
                    <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                      Generated URL Slug
                    </span>
                    <p className="text-[12px] text-[var(--admin-text-tertiary)] font-mono bg-[var(--admin-surface)] border border-[var(--admin-border)] px-3 py-1.5 rounded-lg inline-block">
                      /{aiAnalysisResult.slug}
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
                  placeholder="Ask AI to change title, category, style, etc..."
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
