import React from 'react';
import { m as motion } from 'framer-motion';
import { fadeUp } from '../../components/AdminUIKit';

export function VisualSearchTools({ config, isTagging, taggingStatus, handleGenerateTags }) {
  return (
    <motion.div variants={fadeUp} className="space-y-6">
      <div className="admin-card p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--admin-accent-muted)] flex items-center justify-center flex-shrink-0 text-[var(--admin-accent)]">
            <span className="material-symbols-outlined text-[24px]">label_important</span>
          </div>
          <div>
            <h3 className="text-[16px] font-bold">Bulk Generate AI Tags</h3>
            <p className="text-[13px] text-stone-500 mt-2 max-w-2xl leading-relaxed">
              Automatically process existing products through the AI vision engine to generate
              semantic search tags, categories, and attributes. This dramatically improves visual
              search accuracy without requiring users to upload images.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={handleGenerateTags}
                disabled={isTagging || !config.enabled}
                className="admin-btn admin-btn-primary w-full sm:w-auto"
              >
                {isTagging ? 'Processing Batch...' : 'Generate Tags (Batch of 5)'}
              </button>
              {!config.enabled && (
                <span className="text-[12px] text-red-500 font-bold">
                  Visual search must be enabled first.
                </span>
              )}
            </div>

            {taggingStatus && (
              <div className="mt-4 p-4 bg-stone-50 border border-stone-200 rounded-lg text-[12px]">
                <p>
                  <strong>Last Batch Result:</strong> Processed {taggingStatus.processed} products.
                  Failed: {taggingStatus.failed}. Total remaining:{' '}
                  {taggingStatus.total - taggingStatus.processed}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
