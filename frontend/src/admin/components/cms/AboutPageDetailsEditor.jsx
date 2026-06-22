const DEFAULT_FEATURES = [];
import React, { useState, useEffect } from 'react';
import { SectionHeader, AdminField, AdminInput, AdminTextarea } from '../AdminUIKit';
import { ImageUpload } from '../ImageUpload';
import toast from 'react-hot-toast';
import { DEFAULT_SPECIALIZATIONS } from '../../../constants/placeholderImages';

const cleanSignatureImg = (imgUrl, founderName) => {
  if (
    !imgUrl ||
    imgUrl.includes('unsplash.com') ||
    imgUrl === '' ||
    imgUrl.includes('images.unsplash.com')
  ) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="80" viewBox="0 0 250 80"><defs><style>@import url('https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap');.sig { font-family: 'Alex Brush', cursive; font-size: 42px; fill: %231a1a1a; }</style></defs><text x="25" y="52" class="sig">${founderName}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
  return imgUrl;
};
import { AISparkButton } from './AISparkButton';

export function AboutPageDetailsEditor({ content, onUpdate }) {
  const ab = content || {};

  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="info"
        title="About Page Content"
        description="Configure the story, mission, and founder details"
      />

      <div className="space-y-6">
        {/* Cinematic Hero */}
        <div className="admin-card-inset p-5 space-y-4">
          <h4 className="text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">view_day</span>
            Hero Section
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
            <AdminField label="Cinematic Title Headline">
              <AdminInput
                value={ab.heroTitle || ''}
                onChange={(e) => onUpdate('aboutPage', { heroTitle: e.target.value })}
                className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
              />
            </AdminField>
            <AdminField label="Cinematic Subtitle">
              <AdminInput
                value={ab.heroSubtitle || ''}
                onChange={(e) => onUpdate('aboutPage', { heroSubtitle: e.target.value })}
                className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
              />
            </AdminField>
          </div>
          <ImageUpload
            label="Cinematic Backdrop Graphic"
            value={ab.heroImage || ''}
            onChange={(val) => onUpdate('aboutPage', { heroImage: val })}
            folder="cms"
          />
        </div>

        {/* Mission & Narrative */}
        <div className="admin-card p-5 space-y-4">
          <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block border-b border-[var(--admin-border-subtle)] pb-2">
            2. Narrative & Mission Statement
          </span>
          <AdminField
            label="Brand Mission Block"
            description="Core statement emphasizing the Telugu craftsmanship legacy"
          >
            <div className="relative flex items-start w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
              <AdminTextarea
                value={ab.missionStatement || ''}
                onChange={(e) => onUpdate('aboutPage', { missionStatement: e.target.value })}
                rows={3}
                className="!pr-12 !py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
              />
              <div className="absolute right-2.5 top-2.5">
                <AISparkButton
                  text={ab.missionStatement}
                  onApply={(val) => onUpdate('aboutPage', { missionStatement: val })}
                />
              </div>
            </div>
          </AdminField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
            <ImageUpload
              label="Narrative Side Illustration Image"
              value={ab.storyImage || ''}
              onChange={(val) => onUpdate('aboutPage', { storyImage: val })}
              folder="cms"
            />
            <div className="space-y-3.5">
              <AdminField
                label="Primary Founder Name"
                description="Name showing inside leadership frames"
              >
                <AdminInput
                  value={ab.founderName || 'Sirisha Atmakuri'}
                  onChange={(e) => onUpdate('aboutPage', { founderName: e.target.value })}
                  className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
                />
              </AdminField>
              <AdminField label="Leadership Role Title">
                <AdminInput
                  value={ab.founderRole || 'Founder & Creative Head'}
                  onChange={(e) => onUpdate('aboutPage', { founderRole: e.target.value })}
                  className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
                />
              </AdminField>
            </div>
          </div>
        </div>

        {/* Dual Leadership */}
        {ab.founders && (
          <div className="admin-card p-5 space-y-4">
            <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block border-b border-[var(--admin-border-subtle)] pb-2 font-sans">
              3. Studio Founders & Directors
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
              {ab.founders.map((founder, idx) => (
                <div
                  key={idx}
                  className="bg-[var(--admin-surface)] p-4.5 rounded-xl border border-[var(--admin-border)] space-y-3.5 shadow-[var(--admin-shadow-xs)]"
                >
                  <span className="text-[11px] font-semibold text-[var(--admin-text-tertiary)] uppercase tracking-widest block font-sans">
                    Founder {idx + 1}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <AdminField label="Full Name">
                      <AdminInput
                        value={founder.name || ''}
                        onChange={(e) => {
                          const copy = [...ab.founders];
                          copy[idx] = { ...copy[idx], name: e.target.value };
                          onUpdate('aboutPage', { founders: copy });
                        }}
                        className="!py-2 !text-[11px] sm:text-[11px]"
                      />
                    </AdminField>
                    <AdminField label="Executive Role">
                      <AdminInput
                        value={founder.role || ''}
                        onChange={(e) => {
                          const copy = [...ab.founders];
                          copy[idx] = { ...copy[idx], role: e.target.value };
                          onUpdate('aboutPage', { founders: copy });
                        }}
                        className="!py-2 !text-[11px] sm:text-[11px]"
                      />
                    </AdminField>
                  </div>
                  <AdminField label="Intro Subtitle Text">
                    <AdminInput
                      value={founder.subtitle || ''}
                      onChange={(e) => {
                        const copy = [...ab.founders];
                        copy[idx] = { ...copy[idx], subtitle: e.target.value };
                        onUpdate('aboutPage', { founders: copy });
                      }}
                      className="!py-2 !text-[11px] sm:text-[11px]"
                    />
                  </AdminField>
                  <AdminField label="Artistic Bio Quote">
                    <AdminTextarea
                      value={founder.quote || ''}
                      onChange={(e) => {
                        const copy = [...ab.founders];
                        copy[idx] = { ...copy[idx], quote: e.target.value };
                        onUpdate('aboutPage', { founders: copy });
                      }}
                      className="!py-1.5 !text-[11px] sm:text-[11px]"
                      rows={3}
                    />
                  </AdminField>
                  <ImageUpload
                    label="Autograph Signature Graphic"
                    value={cleanSignatureImg(founder.signatureImg, founder.name)}
                    onChange={(val) => {
                      const copy = [...ab.founders];
                      copy[idx] = { ...copy[idx], signatureImg: val };
                      onUpdate('aboutPage', { founders: copy });
                    }}
                    folder="cms"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature Specializations */}
        <div className="admin-card p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-2">
            <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block font-sans">
              4. Signature Specializations
            </span>
            <button
              type="button"
              onClick={() => {
                const copy = [...(ab.specializations || DEFAULT_SPECIALIZATIONS)];
                copy.push({ title: 'New Specialization', img: '' });
                onUpdate('aboutPage', { specializations: copy });
                toast.success('New Specialization Added!');
              }}
              className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-accent)] hover:text-[var(--admin-accent)] border border-[var(--admin-accent)]/30 hover:border-[var(--admin-accent)] px-3.5 py-1.5 rounded-full bg-[var(--admin-surface)] transition-all cursor-pointer shadow-[var(--admin-shadow-xs)] hover:shadow-xs"
            >
              + Add Specialization
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4.5">
            {(ab.specializations || DEFAULT_SPECIALIZATIONS).map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-[var(--admin-surface)]/85 backdrop-blur-md rounded-2xl border border-[var(--admin-border)] flex flex-col md:flex-row items-stretch md:items-center gap-4.5 shadow-[var(--admin-shadow-xs)] hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-sm)] transition-all duration-300"
              >
                <div className="flex-1 space-y-1.5">
                  <span className="text-[11px] text-[var(--admin-text-tertiary)] font-semibold uppercase tracking-wider block font-sans">
                    Specialization Title
                  </span>
                  <AdminInput
                    value={item.title || ''}
                    onChange={(e) => {
                      const copy = [...(ab.specializations || DEFAULT_SPECIALIZATIONS)];
                      copy[idx] = { ...copy[idx], title: e.target.value };
                      onUpdate('aboutPage', { specializations: copy });
                    }}
                    className="!py-2 !text-[11px] sm:text-[11px] bg-[var(--admin-surface)] border-[var(--admin-border)]"
                  />
                </div>
                <div className="shrink-0">
                  <ImageUpload
                    label=""
                    value={item.img || ''}
                    onChange={(val) => {
                      const copy = [...(ab.specializations || DEFAULT_SPECIALIZATIONS)];
                      copy[idx] = { ...copy[idx], img: val };
                      onUpdate('aboutPage', { specializations: copy });
                    }}
                    folder="cms"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const copy = (ab.specializations || DEFAULT_SPECIALIZATIONS).filter(
                      (_, i) => i !== idx,
                    );
                    onUpdate('aboutPage', { specializations: copy });
                    toast.success('Specialization Deleted');
                  }}
                  className="text-[var(--admin-error)] opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center p-1.5 hover:bg-[var(--admin-error-light)] rounded-lg shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px] font-bold">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Why Families Choose Us */}
        <div className="admin-card p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-2">
            <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block font-sans">
              5. Why Families Choose Us
            </span>
            <button
              type="button"
              onClick={() => {
                const copy = [...(ab.features || DEFAULT_FEATURES)];
                copy.push({ icon: 'star', title: 'New Feature', desc: 'Feature description.' });
                onUpdate('aboutPage', { features: copy });
                toast.success('New Feature Added!');
              }}
              className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-accent)] hover:text-[var(--admin-accent)] border border-[var(--admin-accent)]/30 hover:border-[var(--admin-accent)] px-3.5 py-1.5 rounded-full bg-[var(--admin-surface)] transition-all cursor-pointer shadow-[var(--admin-shadow-xs)] hover:shadow-xs"
            >
              + Add Feature
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4.5">
            {(ab.features || DEFAULT_FEATURES).map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-[var(--admin-surface)]/85 backdrop-blur-md rounded-2xl border border-[var(--admin-border)] space-y-3.5 shadow-[var(--admin-shadow-xs)] hover:border-[var(--admin-accent)]/35 transition-all duration-300"
              >
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-b border-[var(--admin-accent)]/5 pb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-[11px] text-[var(--admin-text-tertiary)] font-semibold uppercase tracking-wider shrink-0 font-sans">
                      Feature Title
                    </span>
                    <AdminInput
                      value={item.title || ''}
                      onChange={(e) => {
                        const copy = [...(ab.features || DEFAULT_FEATURES)];
                        copy[idx] = { ...copy[idx], title: e.target.value };
                        onUpdate('aboutPage', { features: copy });
                      }}
                      className="!py-1.5 font-bold !text-[11px] sm:text-[11px] w-full sm:!w-48 bg-[var(--admin-surface)] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = (ab.features || DEFAULT_FEATURES).filter((_, i) => i !== idx);
                      onUpdate('aboutPage', { features: copy });
                      toast.success('Feature Deleted');
                    }}
                    className="text-[var(--admin-error)] opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center p-2 hover:bg-[var(--admin-error-light)] rounded-lg self-end sm:self-center shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px] font-bold">delete</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AdminField
                    label="Material Symbol Icon Name"
                    description="From Google Material Symbols, e.g. diamond, handyman, star"
                  >
                    <AdminInput
                      value={item.icon || ''}
                      onChange={(e) => {
                        const copy = [...(ab.features || DEFAULT_FEATURES)];
                        copy[idx] = { ...copy[idx], icon: e.target.value };
                        onUpdate('about', { features: copy });
                      }}
                      className="!py-2 !text-[11px] sm:text-[11px] bg-[var(--admin-surface)] border-[var(--admin-border)]"
                    />
                  </AdminField>

                  <AdminField label="Feature Description">
                    <AdminTextarea
                      value={item.desc || ''}
                      onChange={(e) => {
                        const copy = [...(ab.features || DEFAULT_FEATURES)];
                        copy[idx] = { ...copy[idx], desc: e.target.value };
                        onUpdate('about', { features: copy });
                      }}
                      className="!py-1.5 !text-[11px] sm:text-[11px] bg-[var(--admin-surface)] border-[var(--admin-border)]"
                      rows={2}
                    />
                  </AdminField>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
