import React from 'react';
import { m as motion } from 'framer-motion';

export function AiDesignStep({
  handleFileUploadSim,
  uploadedFileName,
  simulateAiAnalysis,
  isAiAnalyzing,
  aiAnalysisResult,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h3 className="font-display text-[20px] md:text-[28px] text-black font-semibold">
          Custom Decor Recommendations & Moodboards
        </h3>
        <p className="font-body text-black/45 text-[12px] md:text-[13px]">
          Upload your Pinterest moodboard, stage maps, or custom designs. Our AI model will
          automatically analyze details, map color palettes, and draft preliminary pricing ranges.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* File Upload zone */}
        <div className="lg:col-span-5 space-y-4">
          <div className="border-2 border-dashed border-black/10 rounded-[24px] p-8 text-center bg-[#fcfbf9] relative group hover:border-primary/30 transition-colors flex flex-col items-center justify-center min-h-[220px]">
            <input
              type="file"
              onChange={handleFileUploadSim}
              className="absolute inset-0 opacity-0 cursor-pointer"
              accept="image/*"
            />
            <div className="w-14 h-14 rounded-full bg-primary/5 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
            </div>
            <span className="font-body text-xs text-black font-bold block">
              Upload Pinterest Moodboard
            </span>
            <span className="font-body text-[10px] text-black/30 mt-1 block">
              Supports PNG, JPG, or PDF blueprint up to 10MB
            </span>
            {uploadedFileName && (
              <div className="mt-4 px-3 py-1.5 bg-stone-100 rounded-full font-mono text-[9px] text-stone-700 flex items-center gap-1.5 max-w-[200px] truncate">
                <span className="material-symbols-outlined text-[12px]">description</span>
                {uploadedFileName}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={simulateAiAnalysis}
            disabled={isAiAnalyzing}
            className="w-full bg-stone-900 text-white py-3 rounded-full font-label text-[10px] uppercase tracking-widest font-bold hover:bg-primary hover:text-black transition-colors"
          >
            {isAiAnalyzing ? 'Analyzing Blueprints...' : 'Simulate AI Analysis'}
          </button>
        </div>

        {/* AI Analysis Result Output */}
        <div className="lg:col-span-7">
          <div className="bg-[#FAF9F6] rounded-[24px] border border-black/5 p-6 min-h-[220px] flex flex-col justify-center relative overflow-hidden">
            {isAiAnalyzing ? (
              <div className="space-y-4 text-center py-6">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="skeleton-box inline-block w-8 h-8 rounded-md" />
                  <span className="material-symbols-outlined text-[20px] text-primary animate-pulse">
                    insights
                  </span>
                </div>
                <div className="space-y-1.5">
                  <span className="font-label text-[9px] uppercase tracking-[0.25em] text-primary font-bold block animate-pulse">
                    SIRI ARTS AI DESIGN ASSISTANT
                  </span>
                  <p className="font-body text-black/50 text-xs">
                    Analyzing spatial layers, garland structures, and color swatches...
                  </p>
                </div>
              </div>
            ) : aiAnalysisResult ? (
              <div className="space-y-5 animate-fade-in">
                <div className="flex justify-between items-center border-b border-black/5 pb-3">
                  <span className="font-label text-[9px] uppercase tracking-[0.3em] text-primary font-bold">
                    Custom Decor Recommendations
                  </span>
                  <span className="bg-[#8B0000]/10 text-[#8B0000] px-2 py-0.5 rounded-full font-mono text-[8px] uppercase tracking-widest font-bold">
                    Matches catalog patterns
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                  <div className="space-y-0.5">
                    <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
                      Detected Theme Style
                    </span>
                    <span className="font-body text-xs text-black font-bold">
                      {aiAnalysisResult.detectedOccasion}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
                      Atmospheric Mood
                    </span>
                    <span className="font-body text-xs text-black font-semibold truncate block">
                      {aiAnalysisResult.mood}
                    </span>
                  </div>
                  <div className="space-y-0.5 md:col-span-2">
                    <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
                      Theme Color Palette
                    </span>
                    <div className="flex gap-1.5 mt-1">
                      {aiAnalysisResult.palette.map((color, i) => (
                        <div key={color} className="flex items-center gap-1 group/color">
                          <div
                            className="w-4 h-4 rounded-full border border-black/10"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-mono text-[8px] text-black/45">
                            {aiAnalysisResult.paletteLabels[i]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-0.5 md:col-span-2">
                    <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
                      Estimated Rental Inclusions
                    </span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                      {aiAnalysisResult.suggestedProps.map((prop, _i) => (
                        <li
                          key={prop}
                          className="flex items-center gap-1 text-[10px] text-stone-700 font-medium"
                        >
                          <span className="w-1 h-1 rounded-full bg-primary" />
                          {prop}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
                      Artisan Logistics Estimate
                    </span>
                    <span className="font-body text-xs text-stone-700 font-medium">
                      {aiAnalysisResult.estimatedSetupTime}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
                      Estimated Budget Range
                    </span>
                    <span className="font-display text-sm text-primary font-bold italic">
                      {aiAnalysisResult.estimatedPriceRange}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-3">
                <span className="material-symbols-outlined text-[36px] text-black/10">
                  upload_file
                </span>
                <p className="font-body text-xs text-black/40 max-w-xs mx-auto">
                  Upload an inspiration visual above to launch the AI catalog comparator and
                  auto-populate customizations.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
