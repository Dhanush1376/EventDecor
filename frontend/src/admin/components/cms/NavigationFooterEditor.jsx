import React, { useState, useEffect } from 'react';
import { SectionHeader, AdminField, AdminInput, AdminTextarea, AdminToggle } from '../AdminUIKit';

export function NavigationFooterEditor({ nav, footer, onUpdate }) {
  // Navigation arrays
  const mainLinks = nav.mainLinks || [];

  // Footer arrays
  const exploreLinks = footer.exploreLinks || [];
  const studioLinks = footer.studioLinks || [];

  const handleLinkUpdate = (category, idx, field, value) => {
    if (category === 'mainLinks') {
      const copy = [...mainLinks];
      copy[idx] = { ...copy[idx], [field]: value };
      onUpdate('navigation', { mainLinks: copy });
    } else {
      const copy = category === 'exploreLinks' ? [...exploreLinks] : [...studioLinks];
      copy[idx] = { ...copy[idx], [field]: value };
      onUpdate('footer', { [category]: copy });
    }
  };

  const handleAddLink = (category) => {
    if (category === 'mainLinks') {
      const copy = [...mainLinks];
      copy.push({ label: 'New Link', href: '/', isVisible: true });
      onUpdate('navigation', { mainLinks: copy });
    } else {
      const copy = category === 'exploreLinks' ? [...exploreLinks] : [...studioLinks];
      copy.push({ label: 'New Link', href: '/' });
      onUpdate('footer', { [category]: copy });
    }
  };

  const handleDeleteLink = (category, idx) => {
    if (category === 'mainLinks') {
      const copy = [...mainLinks];
      copy.splice(idx, 1);
      onUpdate('navigation', { mainLinks: copy });
    } else {
      const copy = category === 'exploreLinks' ? [...exploreLinks] : [...studioLinks];
      copy.splice(idx, 1);
      onUpdate('footer', { [category]: copy });
    }
  };

  const renderLinkEditor = (title, items, category) => (
    <div className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-xl)] border border-[var(--admin-border)] p-6 space-y-5 shadow-[var(--admin-shadow-xs)] relative overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[12px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em]">
          {title}
        </span>
        <button
          onClick={() => handleAddLink(category)}
          className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-accent)] hover:text-[var(--admin-accent)] border border-[var(--admin-accent)]/30 hover:border-[var(--admin-accent)] px-3.5 py-1.5 rounded-full bg-[var(--admin-surface)] transition-all cursor-pointer shadow-[var(--admin-shadow-xs)] hover:shadow-xs"
        >
          + Add Link
        </button>
      </div>
      <div className="space-y-4">
        {items.map((link, idx) => (
          <div
            key={idx}
            className="flex flex-col sm:flex-row gap-3 items-end p-4 bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-xl"
          >
            <div className="flex-1 w-full">
              <span className="text-[10px] uppercase font-bold text-[var(--admin-text-secondary)] mb-1 block">
                Label
              </span>
              <AdminInput
                value={link.label || ''}
                onChange={(e) => handleLinkUpdate(category, idx, 'label', e.target.value)}
                className="!py-2 !text-[11px] bg-[var(--admin-surface)]"
              />
            </div>
            <div className="flex-1 w-full">
              <span className="text-[10px] uppercase font-bold text-[var(--admin-text-secondary)] mb-1 block">
                URL Path
              </span>
              <AdminInput
                value={link.href || ''}
                onChange={(e) => handleLinkUpdate(category, idx, 'href', e.target.value)}
                className="!py-2 !text-[11px] bg-[var(--admin-surface)]"
              />
            </div>
            {category === 'mainLinks' && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase font-bold text-[var(--admin-text-secondary)]">
                  Visible
                </span>
                <AdminToggle
                  checked={link.isVisible !== false}
                  onChange={() => handleLinkUpdate(category, idx, 'isVisible', !link.isVisible)}
                />
              </div>
            )}
            <button
              onClick={() => handleDeleteLink(category, idx)}
              className="mb-1 w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all cursor-pointer shrink-0"
              title="Remove Link"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-xl)] border border-[var(--admin-border)] p-6 space-y-5 shadow-[var(--admin-shadow-xs)] relative overflow-hidden">
        <SectionHeader
          icon="menu"
          title="Navbar Logo Builder"
          description="Adjust boutique storefront name and sub-line credentials"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AdminField label="Navbar Brand Name">
            <AdminInput
              value={nav.logo?.text || ''}
              onChange={(e) =>
                onUpdate('navigation', { logo: { ...nav.logo, text: e.target.value } })
              }
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
          <AdminField label="Subtext Tagline">
            <AdminInput
              value={nav.logo?.tagline || ''}
              onChange={(e) =>
                onUpdate('navigation', { logo: { ...nav.logo, tagline: e.target.value } })
              }
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
        </div>
      </div>

      {renderLinkEditor('Main Navigation Links', mainLinks, 'mainLinks')}

      <div className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-xl)] border border-[var(--admin-border)] p-6 space-y-5 shadow-[var(--admin-shadow-xs)] relative overflow-hidden">
        <SectionHeader
          icon="bottom_navigation"
          title="Footer Credentials"
          description="Manage general description summary blocks rendered inside the page base layout"
        />
        <AdminField label="Footer Brand Biography">
          <AdminTextarea
            value={footer.description || ''}
            onChange={(e) => onUpdate('footer', { description: e.target.value })}
            rows={3}
            className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
          />
        </AdminField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AdminField label="Contact Phone">
            <AdminInput
              value={footer.phone || ''}
              onChange={(e) => onUpdate('footer', { phone: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
          <AdminField label="Contact Email">
            <AdminInput
              value={footer.email || ''}
              onChange={(e) => onUpdate('footer', { email: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
          <AdminField label="Copyright Notice">
            <AdminInput
              value={footer.copyright || ''}
              onChange={(e) => onUpdate('footer', { copyright: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
        </div>

        <div className="pt-4 border-t border-[var(--admin-border-subtle)]">
          <span className="text-[12px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] mb-4 block">
            Social Media Links
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <AdminField label="Instagram URL">
              <AdminInput
                value={footer.socialLinks?.instagram || ''}
                onChange={(e) =>
                  onUpdate('footer', {
                    socialLinks: { ...footer.socialLinks, instagram: e.target.value },
                  })
                }
                className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
            </AdminField>
            <AdminField label="Facebook URL">
              <AdminInput
                value={footer.socialLinks?.facebook || ''}
                onChange={(e) =>
                  onUpdate('footer', {
                    socialLinks: { ...footer.socialLinks, facebook: e.target.value },
                  })
                }
                className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
            </AdminField>
            <AdminField label="Pinterest URL">
              <AdminInput
                value={footer.socialLinks?.pinterest || ''}
                onChange={(e) =>
                  onUpdate('footer', {
                    socialLinks: { ...footer.socialLinks, pinterest: e.target.value },
                  })
                }
                className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
            </AdminField>
          </div>
        </div>
      </div>

      {renderLinkEditor('Footer Explore Links', exploreLinks, 'exploreLinks')}
      {renderLinkEditor('Footer Studio Links', studioLinks, 'studioLinks')}
    </div>
  );
}
