import React, { useState } from 'react';
import toast from 'react-hot-toast';
import logger from '../../../utils/core/logger';
import { cmsService } from '../../../services/domainServices';

export function AISparkButton({ text, onApply }) {
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const prompts = [
    { label: '✨ South Indian Heritage', action: 'heritage' },
    { label: '👑 Luxury Rephrase', action: 'luxury' },
    { label: '🇮🇳 Telugu Vernacular', action: 'traditional' },
    { label: '🔍 Local SEO Optimization', action: 'seo' },
    { label: '🗣️ Translate to Telugu', action: 'translate' },
  ];

  const handleGenerate = async (style) => {
    if (!text || text.trim().length < 3) {
      toast.error('Please enter some text first for the AI to enhance.');
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    setShowDropdown(false);

    try {
      const res = await cmsService.aiGenerateContent(text, style);

      if (res.success && res.data?.text) {
        onApply(res.data.text);
        toast.success('AI Content Crafted!', {
          icon: '✨',
          style: {
            background: '#1C1917',
            border: '1px solid #000000',
            color: '#F1F5F9',
            fontSize: '11px',
          },
        });
      } else {
        toast.error('AI returned empty content. Try again.');
      }
    } catch (err) {
      logger.error('AI generation error:', err);
      const errorMsg = err?.response?.data?.message || 'AI service temporarily offline.';
      toast.error(errorMsg, { duration: 4000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block shrink-0">
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center justify-center transition-all text-[var(--admin-accent)]/80 hover:text-[var(--admin-accent)] cursor-pointer h-7 w-7 rounded-full hover:bg-[var(--admin-accent)]/10 bg-transparent border-none"
        style={{ minHeight: '0px' }}
        title="AI Copywriting Assistant"
        aria-label="Open AI Copywriting Assistant"
      >
        {loading ? (
          <div className="skeleton-box inline-block w-3 h-3 rounded-md" />
        ) : (
          <span className="material-symbols-outlined text-[13px] block font-bold text-[var(--admin-accent)]">
            psychology
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[var(--admin-surface)] border border-[var(--admin-accent)]/30 shadow-[var(--admin-shadow-sm)] py-2 z-50 overflow-hidden text-[11px] sm:text-[11px] animate-fade-in-up">
            <div className="px-3.5 py-1.5 font-semibold text-[var(--admin-text-secondary)] text-[11px] tracking-[0.18em] uppercase border-b border-[var(--admin-border-subtle)] pb-1.5 mb-1.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[11px] sm:text-[11px] text-[var(--admin-accent)] font-bold">
                auto_awesome
              </span>
              AI Copywriter
            </div>
            {prompts.map((p) => (
              <button
                key={p.action}
                type="button"
                onClick={() => handleGenerate(p.action)}
                disabled={loading}
                className="w-full text-left px-4 py-2 hover:bg-[var(--admin-accent)]/10 text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] transition-all flex items-center gap-2 cursor-pointer font-bold disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
