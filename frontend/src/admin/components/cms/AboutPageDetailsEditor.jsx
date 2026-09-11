const DEFAULT_FEATURES = [];
import React, { useState, useEffect } from 'react';
import { AdminField, AdminInput, AdminTextarea } from '../AdminUIKit';
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
    <div className="space-y-8">
      {/* 1. Cinematic Hero Section */}
      <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <span className="material-symbols-outlined text-[150px]">view_day</span>
        </div>
        <div className="relative z-10 space-y-6">
          <span className="text-[14px] sm:text-[15px] font-semibold text-[var(--admin-text-primary)] tracking-tight block border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
            1. Hero Section Setup
          </span>

          <AdminField
            label="Mission Statement"
            description="Primary mission statement displayed prominently in the hero block"
          >
            <AdminTextarea
              value={ab.missionStatement || ''}
              onChange={(e) => onUpdate('aboutPage', { missionStatement: e.target.value })}
              className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
              rows={3}
              placeholder="Our mission is to bring bespoke elegance..."
            />
          </AdminField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <AdminField
              label="Cinematic Title Headline"
              description="Main headline title for the hero narrative"
            >
              <AdminInput
                value={ab.heroTitle || ''}
                onChange={(e) => onUpdate('aboutPage', { heroTitle: e.target.value })}
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                placeholder="e.g. Crafted with Soul"
              />
            </AdminField>
            <AdminField
              label="Cinematic Subtitle"
              description="Secondary tagline or descriptive emphasis"
            >
              <AdminInput
                value={ab.heroSubtitle || ''}
                onChange={(e) => onUpdate('aboutPage', { heroSubtitle: e.target.value })}
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                placeholder="e.g. A Symphony of Heritage & Design"
              />
            </AdminField>
          </div>
        </div>
      </div>

      {/* 2. Who We Are Section */}
      <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <span className="material-symbols-outlined text-[150px]">groups</span>
        </div>
        <div className="relative z-10 space-y-6">
          <span className="text-[14px] sm:text-[15px] font-semibold text-[var(--admin-text-primary)] tracking-tight block border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
            2. Who We Are Section
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <AdminField label="Title (Normal Text)" description="Prefix text of the headline">
              <AdminInput
                value={ab.aboutTitle1 || ''}
                placeholder="A Legacy of"
                onChange={(e) => onUpdate('aboutPage', { aboutTitle1: e.target.value })}
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
              />
            </AdminField>
            <AdminField label="Title (Italic/Outline Text)" description="Accent italic text">
              <AdminInput
                value={ab.aboutTitle2 || ''}
                placeholder="Elegance"
                onChange={(e) => onUpdate('aboutPage', { aboutTitle2: e.target.value })}
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors font-serif italic"
              />
            </AdminField>
          </div>

          <AdminField label="Primary Paragraph" description="Main brand origin story paragraph">
            <AdminTextarea
              value={ab.aboutText || ''}
              onChange={(e) => onUpdate('aboutPage', { aboutText: e.target.value })}
              className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
              rows={4}
              placeholder="Write the primary story paragraph..."
            />
          </AdminField>

          <AdminField label="Secondary Paragraph" description="Additional brand narrative context">
            <AdminTextarea
              value={ab.aboutTextSecondary || ''}
              onChange={(e) => onUpdate('aboutPage', { aboutTextSecondary: e.target.value })}
              className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
              rows={4}
              placeholder="Write the secondary story paragraph..."
            />
          </AdminField>

          <div className="bg-[var(--admin-surface-muted)] p-5 rounded-md border border-[var(--admin-border-subtle)] mt-2">
            <ImageUpload
              label="Section Showcase Image"
              value={ab.aboutImage || ''}
              onChange={(val) => onUpdate('aboutPage', { aboutImage: val })}
              folder="cms"
            />
          </div>
        </div>
      </div>

      {/* 3. Dual Leadership */}
      {ab.founders && (
        <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
            <span className="material-symbols-outlined text-[150px]">person</span>
          </div>
          <div className="relative z-10 space-y-6">
            <span className="text-[14px] sm:text-[15px] font-semibold text-[var(--admin-text-primary)] tracking-tight block border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
              3. Studio Founders & Directors
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ab.founders.map((founder, idx) => (
                <div
                  key={idx}
                  className="bg-[var(--admin-surface-muted)]/70 hover:bg-[var(--admin-surface-muted)] p-5 rounded-md border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border)] space-y-4 shadow-xs transition-all"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--admin-border-subtle)]">
                    <span className="text-[11px] font-bold text-[var(--admin-accent)] uppercase tracking-wider">
                      Founder {idx + 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AdminField label="Full Name">
                      <AdminInput
                        value={founder.name || ''}
                        onChange={(e) => {
                          const copy = [...ab.founders];
                          copy[idx] = { ...copy[idx], name: e.target.value };
                          onUpdate('aboutPage', { founders: copy });
                        }}
                        className="w-full !py-2.5 !text-[12px] bg-[var(--admin-surface)]"
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
                        className="w-full !py-2.5 !text-[12px] bg-[var(--admin-surface)]"
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
                      className="w-full !py-2.5 !text-[12px] bg-[var(--admin-surface)]"
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
                      className="w-full !py-2.5 !text-[12px] bg-[var(--admin-surface)]"
                      rows={3}
                    />
                  </AdminField>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="bg-[var(--admin-surface)] p-3.5 rounded-md border border-[var(--admin-border-subtle)]">
                      <ImageUpload
                        label="Founder Portrait"
                        value={founder.image || ''}
                        onChange={(val) => {
                          const copy = [...ab.founders];
                          copy[idx] = { ...copy[idx], image: val };
                          onUpdate('aboutPage', { founders: copy });
                        }}
                        folder="cms"
                      />
                    </div>
                    <div className="bg-[var(--admin-surface)] p-3.5 rounded-md border border-[var(--admin-border-subtle)]">
                      <ImageUpload
                        label="Autograph Signature"
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
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Frequently Asked Questions */}
      <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <span className="material-symbols-outlined text-[150px]">quiz</span>
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
            <span className="text-[14px] sm:text-[15px] font-semibold text-[var(--admin-text-primary)] tracking-tight block">
              4. Frequently Asked Questions
            </span>
            <button
              type="button"
              onClick={() => {
                const copy = [...(ab.faqs || [])];
                copy.push({ question: 'New Question?', answer: 'New Answer' });
                onUpdate('aboutPage', { faqs: copy });
                toast.success('New FAQ Added!');
              }}
              className="text-[12px] font-bold text-[var(--admin-accent)] hover:text-white border border-[var(--admin-accent)] hover:bg-[var(--admin-accent)] px-3.5 py-1.5 rounded-[4px] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add FAQ</span>
            </button>
          </div>

          <div className="space-y-4">
            {(ab.faqs || []).map((faq, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 bg-[var(--admin-surface-muted)]/70 hover:bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border)] rounded-md transition-all space-y-3.5 shadow-2xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[var(--admin-border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">
                    FAQ #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = (ab.faqs || []).filter((_, i) => i !== idx);
                      onUpdate('aboutPage', { faqs: copy });
                      toast.success('FAQ Deleted');
                    }}
                    className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all cursor-pointer shrink-0"
                    title="Delete FAQ"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
                <AdminField label="Question">
                  <AdminInput
                    value={faq.question || ''}
                    onChange={(e) => {
                      const copy = [...(ab.faqs || [])];
                      copy[idx] = { ...copy[idx], question: e.target.value };
                      onUpdate('aboutPage', { faqs: copy });
                    }}
                    className="w-full !py-2.5 sm:!py-3 !text-[13px] bg-[var(--admin-surface)] rounded-md border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                    placeholder="e.g. 1. What kind of products does Siri Arts & Crafts offer?"
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
                    rows={3}
                    className="w-full !py-2.5 sm:!py-3 !text-[13px] bg-[var(--admin-surface)] rounded-md border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                    placeholder="e.g. We offer handcrafted and thoughtfully designed products..."
                  />
                </AdminField>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Policy Links (Marquee) */}
      <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <span className="material-symbols-outlined text-[150px]">policy</span>
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
            <span className="text-[14px] sm:text-[15px] font-semibold text-[var(--admin-text-primary)] tracking-tight block">
              5. Policy Links (Marquee)
            </span>
            <button
              type="button"
              onClick={() => {
                const copy = [...(ab.policies || [])];
                copy.push({ title: 'New Policy', icon: 'policy', path: '/policy/new-policy' });
                onUpdate('aboutPage', { policies: copy });
                toast.success('New Policy Added!');
              }}
              className="text-[12px] font-bold text-[var(--admin-accent)] hover:text-white border border-[var(--admin-accent)] hover:bg-[var(--admin-accent)] px-3.5 py-1.5 rounded-[4px] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add Policy</span>
            </button>
          </div>

          <div className="space-y-4">
            {(ab.policies || []).map((policy, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 bg-[var(--admin-surface-muted)]/70 hover:bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border)] rounded-md transition-all flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-2xs"
              >
                <div className="flex-1 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-[var(--admin-text-secondary)] mb-1 block">
                    Select Policy
                  </span>
                  <select
                    className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md px-3 py-2.5 text-[12px] outline-none focus:border-[var(--admin-accent)] transition-colors text-[var(--admin-text-primary)]"
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
                <div className="w-full md:w-36 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-[var(--admin-text-secondary)] mb-1 block">
                    Icon (Material)
                  </span>
                  <AdminInput
                    placeholder="e.g. policy"
                    value={policy.icon || ''}
                    onChange={(e) => {
                      const copy = [...(ab.policies || [])];
                      copy[idx] = { ...copy[idx], icon: e.target.value };
                      onUpdate('aboutPage', { policies: copy });
                    }}
                    className="w-full !py-2.5 !text-[12px] bg-[var(--admin-surface)]"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-[var(--admin-text-secondary)] mb-1 block">
                    Custom Display Title
                  </span>
                  <AdminInput
                    placeholder="Display Title"
                    value={policy.title || ''}
                    onChange={(e) => {
                      const copy = [...(ab.policies || [])];
                      copy[idx] = { ...copy[idx], title: e.target.value };
                      onUpdate('aboutPage', { policies: copy });
                    }}
                    className="w-full !py-2.5 !text-[12px] bg-[var(--admin-surface)]"
                  />
                </div>
                <div className="flex items-center justify-end md:self-end md:mb-1">
                  <button
                    type="button"
                    onClick={() => {
                      const copy = (ab.policies || []).filter((_, i) => i !== idx);
                      onUpdate('aboutPage', { policies: copy });
                      toast.success('Policy Deleted');
                    }}
                    className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all cursor-pointer shrink-0"
                    title="Delete Policy"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
