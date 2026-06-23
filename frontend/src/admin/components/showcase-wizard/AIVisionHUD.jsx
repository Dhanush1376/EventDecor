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
  if (!showAIHUD || !aiAnalysisResult) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-md p-4 sm:p-6 animate-fade-in font-sans">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white/90 border border-white/40 shadow-[0_30px_60px_rgba(0,0,0,0.12)] rounded-[32px] overflow-hidden relative backdrop-blur-xl">
        {/* Elegant Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-200/50 relative">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[18px] text-[#007AFF]">
                auto_awesome
              </span>
              <h3 className="text-[14px] font-semibold tracking-tight text-gray-900">
                Groq Vision Analysis
              </h3>
            </div>
            <p className="text-[12px] font-medium text-gray-500 tracking-tight">
              Multimodal Showcase Curation
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAIHUD(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-8 overflow-y-auto space-y-6">
          {/* Concept & Confidence */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                Detected Concept
              </p>
              <h4 className="text-[22px] font-bold tracking-tight text-gray-900 leading-tight">
                {aiAnalysisResult.title || 'Unidentified Design'}
              </h4>
              <p className="text-[14px] font-medium text-gray-500 mt-1">
                {aiAnalysisResult.subtitle}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <div className="bg-[#E5F2FF] text-[#007AFF] px-4 py-2 rounded-2xl flex items-center gap-1.5 font-bold tracking-tight">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                92% Match
              </div>
            </div>
          </div>

          {/* Grid Data */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div className="p-5 bg-gray-50/50 border border-gray-100 rounded-[20px]">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Category Mapped
              </p>
              <div className="inline-flex items-center gap-1.5 text-gray-900 font-semibold text-[14px] tracking-tight">
                <span className="material-symbols-outlined text-[16px] text-[#007AFF]">
                  category
                </span>
                {aiAnalysisResult.category || 'Event Decor'}
              </div>
            </div>

            {/* Setup Time */}
            <div className="p-5 bg-gray-50/50 border border-gray-100 rounded-[20px]">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Setup Time
              </p>
              <div className="text-gray-900 font-semibold text-[14px] tracking-tight">
                {aiAnalysisResult.setupTimeHours || 2} Hours
              </div>
            </div>

            {/* Inclusions */}
            <div className="col-span-2 p-5 bg-gray-50/50 border border-gray-100 rounded-[20px]">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Key Inclusions
              </p>
              <p className="text-[13px] font-medium text-gray-700 leading-relaxed">
                {aiAnalysisResult.inclusionsText}
              </p>
            </div>

            {/* Props */}
            <div className="col-span-2 p-5 bg-gray-50/50 border border-gray-100 rounded-[20px]">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Suggested Props
              </p>
              <p className="text-[13px] font-medium text-gray-700 leading-relaxed">
                {aiAnalysisResult.suggestedProps}
              </p>
            </div>

            {/* Palette */}
            <div className="col-span-2 p-5 bg-gray-50/50 border border-gray-100 rounded-[20px]">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Color Palette
              </p>
              <div className="flex flex-wrap gap-2">
                {(aiAnalysisResult.colorPalette || '').split(',').map((c, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-gray-200 px-3 py-1.5 rounded-full text-[12px] font-semibold text-gray-700 shadow-sm tracking-tight"
                  >
                    {c.trim()}
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="col-span-2 p-5 bg-gray-50/50 border border-gray-100 rounded-[20px]">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Narrative Description
              </p>
              <p className="text-[13.5px] text-gray-600 leading-relaxed font-medium">
                {aiAnalysisResult.description}
              </p>
            </div>
          </div>
        </div>

        {/* Chat Input Area (Spotlight style) */}
        <div className="px-8 pb-4">
          <form
            onSubmit={handleAiChatSubmit}
            className="flex items-center gap-2 bg-gray-100/80 hover:bg-gray-100 transition-colors rounded-[18px] p-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#007AFF]/30 focus-within:shadow-sm"
          >
            <div className="pl-3">
              {isAILearning ? (
                <span className="material-symbols-outlined text-[20px] text-gray-400 animate-spin">
                  refresh
                </span>
              ) : (
                <span className="material-symbols-outlined text-[20px] text-gray-400">
                  chat_bubble
                </span>
              )}
            </div>
            <input
              type="text"
              value={aiChatInput}
              onChange={(e) => setAiChatInput(e.target.value)}
              placeholder="Ask AI to change title, category, props..."
              className="flex-1 bg-transparent border-none text-[14px] text-gray-900 placeholder-gray-400 font-medium px-2 py-2 focus:outline-none focus:ring-0"
              disabled={isAILearning}
            />
            <button
              type="submit"
              disabled={!aiChatInput.trim() || isAILearning}
              className="bg-[#007AFF] text-white w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-50 cursor-pointer hover:bg-[#0066D6] transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px] translate-x-px">
                arrow_upward
              </span>
            </button>
          </form>
        </div>

        {/* Footer Action */}
        <div className="px-8 py-5 border-t border-gray-200/50 flex items-center justify-between bg-gray-50/30">
          <span className="text-[12px] text-gray-500 font-medium flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            Rental price remains unchanged
          </span>
          <button
            type="button"
            onClick={handleApplyAISpecs}
            className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-full text-[13px] font-semibold tracking-wide flex items-center gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.15)] transition-all active:scale-95 cursor-pointer"
          >
            Apply AI Curation
          </button>
        </div>
      </div>
    </div>
  );
}
