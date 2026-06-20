import React, { useState, useEffect } from 'react';
import { SectionHeader, AdminField, AdminInput, AdminTextarea } from '../AdminUIKit';

export function FAQEditor({ content, onUpdate }) {
  const faqs = content.faqs || {};
  const homepageFaqs = faqs.homepage || [];
  const productsFaqs = faqs.products || [];

  const handleUpdate = (category, idx, field, value) => {
    const copy = category === 'homepage' ? [...homepageFaqs] : [...productsFaqs];
    copy[idx] = { ...copy[idx], [field]: value };
    onUpdate('faqs', { [category]: copy });
  };

  const handleAdd = (category) => {
    const copy = category === 'homepage' ? [...homepageFaqs] : [...productsFaqs];
    copy.push({ question: 'New Question', answer: 'Answer here' });
    onUpdate('faqs', { [category]: copy });
  };

  const handleDelete = (category, idx) => {
    const copy = category === 'homepage' ? [...homepageFaqs] : [...productsFaqs];
    copy.splice(idx, 1);
    onUpdate('faqs', { [category]: copy });
  };

  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="help_center"
        title="Frequently Asked Questions"
        description="Manage the FAQs displayed on the Homepage and Product pages"
      />

      <div className="space-y-6">
        {/* Homepage FAQs */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-[12px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em]">
              Homepage FAQs
            </span>
            <button
              onClick={() => handleAdd('homepage')}
              className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-accent)] hover:text-[var(--admin-accent)] border border-[var(--admin-accent)]/30 hover:border-[var(--admin-accent)] px-3.5 py-1.5 rounded-full bg-[var(--admin-surface)] transition-all cursor-pointer shadow-[var(--admin-shadow-xs)] hover:shadow-xs"
            >
              + Add FAQ
            </button>
          </div>
          <div className="space-y-4">
            {homepageFaqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-4 bg-[var(--admin-surface)] rounded-2xl border border-[var(--admin-border)] space-y-3.5 shadow-[var(--admin-shadow-xs)]"
              >
                <div className="flex justify-between items-center border-b border-[var(--admin-accent)]/5 pb-2">
                  <AdminField label={`Question ${idx + 1}`} className="w-full">
                    <AdminInput
                      value={faq.question}
                      onChange={(e) => handleUpdate('homepage', idx, 'question', e.target.value)}
                      className="!py-1.5 font-bold !text-[11px] bg-[var(--admin-surface)] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
                    />
                  </AdminField>
                  <button
                    onClick={() => handleDelete('homepage', idx)}
                    className="text-[var(--admin-error)] opacity-60 hover:opacity-100 p-2.5 ml-2 hover:bg-[var(--admin-error-light)] rounded-lg cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
                <AdminField label="Answer">
                  <AdminTextarea
                    value={faq.answer}
                    onChange={(e) => handleUpdate('homepage', idx, 'answer', e.target.value)}
                    rows={2}
                    className="!py-2 !text-[11px] bg-[var(--admin-surface)] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
                  />
                </AdminField>
              </div>
            ))}
          </div>
        </div>

        {/* Product FAQs */}
        <div className="pt-6 border-t border-[var(--admin-border-subtle)]">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[12px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em]">
              Products FAQs
            </span>
            <button
              onClick={() => handleAdd('products')}
              className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-accent)] hover:text-[var(--admin-accent)] border border-[var(--admin-accent)]/30 hover:border-[var(--admin-accent)] px-3.5 py-1.5 rounded-full bg-[var(--admin-surface)] transition-all cursor-pointer shadow-[var(--admin-shadow-xs)] hover:shadow-xs"
            >
              + Add FAQ
            </button>
          </div>
          <div className="space-y-4">
            {productsFaqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-4 bg-[var(--admin-surface)] rounded-2xl border border-[var(--admin-border)] space-y-3.5 shadow-[var(--admin-shadow-xs)]"
              >
                <div className="flex justify-between items-center border-b border-[var(--admin-accent)]/5 pb-2">
                  <AdminField label={`Question ${idx + 1}`} className="w-full">
                    <AdminInput
                      value={faq.question}
                      onChange={(e) => handleUpdate('products', idx, 'question', e.target.value)}
                      className="!py-1.5 font-bold !text-[11px] bg-[var(--admin-surface)] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
                    />
                  </AdminField>
                  <button
                    onClick={() => handleDelete('products', idx)}
                    className="text-[var(--admin-error)] opacity-60 hover:opacity-100 p-2.5 ml-2 hover:bg-[var(--admin-error-light)] rounded-lg cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
                <AdminField label="Answer">
                  <AdminTextarea
                    value={faq.answer}
                    onChange={(e) => handleUpdate('products', idx, 'answer', e.target.value)}
                    rows={2}
                    className="!py-2 !text-[11px] bg-[var(--admin-surface)] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
                  />
                </AdminField>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
