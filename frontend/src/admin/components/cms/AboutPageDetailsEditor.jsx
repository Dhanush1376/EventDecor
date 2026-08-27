const DEFAULT_FEATURES = [];
import React, { useState, useEffect } from 'react';
import { SectionHeader, AdminField, AdminInput, AdminTextarea } from '../AdminUIKit';
import { ImageUpload } from '../ImageUpload';
import toast from 'react-hot-toast';
import api from '../../../services/api';

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
export function AboutPageDetailsEditor({ content, onUpdate }) {
  const ab = content || {};
  const [availablePolicies, setAvailablePolicies] = useState([]);

  useEffect(() => {
    let mounted = true;
    api
      .get('/policies/public/list')
      .then((res) => {
        if (mounted && res.data?.data) {
          setAvailablePolicies(res.data.data);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch policies', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
          <AdminField label="Mission Statement">
            <AdminTextarea
              value={ab.missionStatement || ''}
              onChange={(e) => onUpdate('aboutPage', { missionStatement: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] mb-4"
              rows={3}
            />
          </AdminField>
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
        </div>

        {/* Who We Are Section */}
        <div className="admin-card-inset p-5 space-y-4">
          <h4 className="text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">groups</span>
            Who We Are Section
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
            <AdminField label="Title (Normal Text)">
              <AdminInput
                value={ab.aboutTitle1 || ''}
                placeholder="A Legacy of"
                onChange={(e) => onUpdate('aboutPage', { aboutTitle1: e.target.value })}
                className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
              />
            </AdminField>
            <AdminField label="Title (Italic/Outline Text)">
              <AdminInput
                value={ab.aboutTitle2 || ''}
                placeholder="Elegance"
                onChange={(e) => onUpdate('aboutPage', { aboutTitle2: e.target.value })}
                className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
              />
            </AdminField>
          </div>

          <AdminField label="Primary Paragraph">
            <AdminTextarea
              value={ab.aboutText || ''}
              onChange={(e) => onUpdate('aboutPage', { aboutText: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
              rows={4}
            />
          </AdminField>

          <AdminField label="Secondary Paragraph">
            <AdminTextarea
              value={ab.aboutTextSecondary || ''}
              onChange={(e) => onUpdate('aboutPage', { aboutTextSecondary: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
              rows={4}
            />
          </AdminField>

          <div className="mt-4">
            <ImageUpload
              label="Section Image"
              value={ab.aboutImage || ''}
              onChange={(val) => onUpdate('aboutPage', { aboutImage: val })}
              folder="cms"
            />
          </div>
        </div>

        {/* Dual Leadership */}
        {ab.founders && (
          <div className="admin-card p-5 space-y-4">
            <span className="text-[11px] sm:text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-[0.1em] block border-b border-[var(--admin-border-subtle)] pb-2 font-sans">
              3. Studio Founders & Directors
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
              {ab.founders.map((founder, idx) => (
                <div
                  key={idx}
                  className="bg-[var(--admin-surface)] p-4.5 rounded-md border border-[var(--admin-border)] space-y-3.5 shadow-[var(--admin-shadow-xs)]"
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
                      value={founder.bio || ''}
                      onChange={(e) => {
                        const copy = [...ab.founders];
                        copy[idx] = { ...copy[idx], bio: e.target.value };
                        onUpdate('aboutPage', { founders: copy });
                      }}
                      className="!py-1.5 !text-[11px] sm:text-[11px]"
                      rows={3}
                    />
                  </AdminField>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ImageUpload
                      label="Founder Portrait Image"
                      value={founder.image || ''}
                      onChange={(val) => {
                        const copy = [...ab.founders];
                        copy[idx] = { ...copy[idx], image: val };
                        onUpdate('aboutPage', { founders: copy });
                      }}
                      folder="cms"
                    />
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Frequently Asked Questions */}
        <div className="admin-card p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-2">
            <span className="text-[11px] sm:text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-[0.1em] block font-sans">
              Frequently Asked Questions
            </span>
            <button
              type="button"
              onClick={() => {
                const copy = [...(ab.faqs || [])];
                copy.push({ question: 'New Question?', answer: 'New Answer' });
                onUpdate('aboutPage', { faqs: copy });
                toast.success('New FAQ Added!');
              }}
              className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-accent)] hover:text-[var(--admin-accent)] border border-[var(--admin-accent)]/30 hover:border-[var(--admin-accent)] px-3.5 py-1.5 rounded-full bg-[var(--admin-surface)] transition-all cursor-pointer shadow-[var(--admin-shadow-xs)] hover:shadow-xs"
            >
              + Add FAQ
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4.5">
            {(ab.faqs || []).map((faq, idx) => (
              <div
                key={idx}
                className="p-4 bg-[var(--admin-surface)]/85 backdrop-blur-md rounded-md border border-[var(--admin-border)] space-y-3.5 shadow-[var(--admin-shadow-xs)] transition-all duration-300"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 space-y-3">
                    <AdminField label="Question">
                      <AdminInput
                        value={faq.question || ''}
                        onChange={(e) => {
                          const copy = [...(ab.faqs || [])];
                          copy[idx] = { ...copy[idx], question: e.target.value };
                          onUpdate('aboutPage', { faqs: copy });
                        }}
                        className="!py-2 !text-[11px] sm:text-[11px]"
                      />
                    </AdminField>
                    <AdminField label="Answer">
                      <AdminTextarea
                        value={faq.answer || ''}
                        onChange={(e) => {
                          const copy = [...(ab.faqs || [])];
                          copy[idx] = { ...copy[idx], answer: e.target.value };
                          onUpdate('aboutPage', { faqs: copy });
                        }}
                        className="!py-1.5 !text-[11px] sm:text-[11px]"
                        rows={3}
                      />
                    </AdminField>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = (ab.faqs || []).filter((_, i) => i !== idx);
                      onUpdate('aboutPage', { faqs: copy });
                      toast.success('FAQ Deleted');
                    }}
                    className="text-[var(--admin-error)] opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center p-2 hover:bg-[var(--admin-error-light)] rounded-lg shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px] font-bold">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Policy Links */}
        <div className="admin-card p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-2">
            <span className="text-[11px] sm:text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-[0.1em] block font-sans">
              Policy Links (Marquee)
            </span>
            <button
              type="button"
              onClick={() => {
                const copy = [...(ab.policies || [])];
                copy.push({ title: 'New Policy', icon: 'policy', path: '/policy/new-policy' });
                onUpdate('aboutPage', { policies: copy });
                toast.success('New Policy Added!');
              }}
              className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-accent)] hover:text-[var(--admin-accent)] border border-[var(--admin-accent)]/30 hover:border-[var(--admin-accent)] px-3.5 py-1.5 rounded-full bg-[var(--admin-surface)] transition-all cursor-pointer shadow-[var(--admin-shadow-xs)] hover:shadow-xs"
            >
              + Add Policy
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4.5">
            {(ab.policies || []).map((policy, idx) => (
              <div
                key={idx}
                className="p-4 bg-[var(--admin-surface)]/85 backdrop-blur-md rounded-md border border-[var(--admin-border)] flex flex-col md:flex-row items-stretch md:items-center gap-4.5 shadow-[var(--admin-shadow-xs)] transition-all duration-300"
              >
                <div className="flex-1 space-y-1.5">
                  <select
                    className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] rounded-md px-3 py-2 text-[11px] outline-none focus:border-[var(--admin-accent)] transition-colors text-slate-700"
                    value={policy.path ? policy.path.replace('/policy/', '') : ''}
                    onChange={(e) => {
                      const selectedPolicy = availablePolicies.find(
                        (p) => p.slug === e.target.value,
                      );
                      if (selectedPolicy) {
                        const copy = [...(ab.policies || [])];
                        copy[idx] = {
                          ...copy[idx],
                          title: selectedPolicy.title,
                          path: `/policy/${selectedPolicy.slug}`,
                        };
                        onUpdate('aboutPage', { policies: copy });
                      }
                    }}
                  >
                    <option value="" disabled>
                      Select Policy...
                    </option>
                    {availablePolicies.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <AdminInput
                    placeholder="Icon (Material)"
                    value={policy.icon || ''}
                    onChange={(e) => {
                      const copy = [...(ab.policies || [])];
                      copy[idx] = { ...copy[idx], icon: e.target.value };
                      onUpdate('aboutPage', { policies: copy });
                    }}
                    className="!py-2 !text-[11px]"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <AdminInput
                    placeholder="Custom Display Title"
                    value={policy.title || ''}
                    onChange={(e) => {
                      const copy = [...(ab.policies || [])];
                      copy[idx] = { ...copy[idx], title: e.target.value };
                      onUpdate('aboutPage', { policies: copy });
                    }}
                    className="!py-2 !text-[11px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const copy = (ab.policies || []).filter((_, i) => i !== idx);
                    onUpdate('aboutPage', { policies: copy });
                    toast.success('Policy Deleted');
                  }}
                  className="text-[var(--admin-error)] opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center p-1.5 hover:bg-[var(--admin-error-light)] rounded-lg shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px] font-bold">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
