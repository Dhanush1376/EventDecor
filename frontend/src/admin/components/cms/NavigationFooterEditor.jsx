import React from 'react';
import { SectionHeader, AdminField, AdminInput, AdminTextarea, AdminToggle } from '../AdminUIKit';

export function NavigationFooterEditor({ nav = {}, footer = {}, onUpdate }) {
  // Navigation arrays
  const mainLinks = nav.mainLinks || [];

  // Footer arrays
  const exploreLinks =
    footer.exploreLinks?.length > 0
      ? footer.exploreLinks
      : [
          { label: 'Collections', href: '/collections' },
          { label: 'Events', href: '/events' },
          { label: 'Gallery', href: '/gallery' },
        ];

  const studioLinks =
    footer.studioLinks?.length > 0
      ? footer.studioLinks
      : [
          { label: 'Our Story', href: '/about' },
          { label: 'Custom Orders', href: '/custom-orders' },
          { label: 'Contact', href: '/contact' },
        ];

  const policyLinks =
    footer.policyLinks?.length > 0
      ? footer.policyLinks
      : [
          { label: 'Shipping Policy', href: '/policy/shipping-policy' },
          { label: 'Terms and Conditions', href: '/policy/terms-and-conditions' },
          { label: 'Cancellation Policy', href: '/policy/cancellation-policy' },
          { label: 'Refund Policy', href: '/policy/refund-policy' },
          { label: 'Exchange Policy', href: '/policy/exchange-policy' },
          { label: 'Privacy Policy', href: '/policy/privacy-policy' },
          { label: 'Return Policy', href: '/policy/return-policy' },
        ];

  const trustBadges =
    footer.trustBadges?.length > 0
      ? footer.trustBadges
      : [
          { label: 'Secure Checkout', href: 'lock' },
          { label: '100% Handcrafted', href: 'draw' },
          { label: 'Fast Delivery', href: 'local_shipping' },
          { label: 'Simple Returns', href: 'refresh' },
        ];

  const handleLinkUpdate = (category, idx, field, value) => {
    if (category === 'mainLinks') {
      const copy = [...mainLinks];
      copy[idx] = { ...copy[idx], [field]: value };
      onUpdate('navigation', { mainLinks: copy });
    } else {
      let copy = [];
      if (category === 'exploreLinks') copy = [...exploreLinks];
      else if (category === 'studioLinks') copy = [...studioLinks];
      else if (category === 'policyLinks') copy = [...policyLinks];
      else if (category === 'trustBadges') copy = [...trustBadges];

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
      let copy = [];
      let newItem = { label: 'New Link', href: '/' };

      if (category === 'exploreLinks') copy = [...exploreLinks];
      else if (category === 'studioLinks') copy = [...studioLinks];
      else if (category === 'policyLinks') copy = [...policyLinks];
      else if (category === 'trustBadges') {
        copy = [...trustBadges];
        newItem = { label: 'New Badge', icon: 'star' };
      }

      copy.push(newItem);
      onUpdate('footer', { [category]: copy });
    }
  };

  const handleDeleteLink = (category, idx) => {
    if (category === 'mainLinks') {
      const copy = [...mainLinks];
      copy.splice(idx, 1);
      onUpdate('navigation', { mainLinks: copy });
    } else {
      let copy = [];
      if (category === 'exploreLinks') copy = [...exploreLinks];
      else if (category === 'studioLinks') copy = [...studioLinks];
      else if (category === 'policyLinks') copy = [...policyLinks];
      else if (category === 'trustBadges') copy = [...trustBadges];

      copy.splice(idx, 1);
      onUpdate('footer', { [category]: copy });
    }
  };

  const renderLinkEditor = (title, items, category) => (
    <div className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-xl)] border border-[var(--admin-border)] p-6 space-y-5 shadow-[var(--admin-shadow-xs)] relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
        <span className="material-symbols-outlined text-[120px]">link</span>
      </div>
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-6 border-b border-[var(--admin-border-subtle)] pb-3">
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
              className="flex flex-col md:flex-row gap-4 items-center p-5 bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-2xl hover:border-[var(--admin-border)] transition-colors"
            >
              <div className="flex-1 w-full">
                <span className="text-[10px] uppercase font-bold text-[var(--admin-text-secondary)] mb-1.5 block">
                  Label
                </span>
                <AdminInput
                  value={link.label || ''}
                  onChange={(e) => handleLinkUpdate(category, idx, 'label', e.target.value)}
                  className="!py-2.5 !text-[12px] bg-[var(--admin-surface)]"
                />
              </div>
              <div className="flex-1 w-full">
                <span className="text-[10px] uppercase font-bold text-[var(--admin-text-secondary)] mb-1.5 block">
                  URL Path
                </span>
                <AdminInput
                  value={link.href || ''}
                  onChange={(e) => handleLinkUpdate(category, idx, 'href', e.target.value)}
                  className="!py-2.5 !text-[12px] bg-[var(--admin-surface)]"
                />
              </div>
              <div className="flex items-center gap-4 mt-2 md:mt-0">
                {category === 'mainLinks' && (
                  <div className="flex items-center gap-2">
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
                  className="w-9 h-9 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all cursor-pointer shrink-0"
                  title="Remove Link"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* NAVBAR EDITOR SECTION */}
      <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-3xl shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <span className="material-symbols-outlined text-[150px]">menu</span>
        </div>
        <div className="relative z-10 space-y-6">
          <SectionHeader
            icon="menu"
            title="Navbar Builder"
            description="Adjust boutique storefront name and main navigation links"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
            <AdminField label="Navbar Brand Name">
              <AdminInput
                value={nav.logo?.text || ''}
                onChange={(e) =>
                  onUpdate('navigation', { logo: { ...nav.logo, text: e.target.value } })
                }
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-xl shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
              />
            </AdminField>
            <AdminField label="Subtext Tagline">
              <AdminInput
                value={nav.logo?.tagline || ''}
                onChange={(e) =>
                  onUpdate('navigation', { logo: { ...nav.logo, tagline: e.target.value } })
                }
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-xl shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
              />
            </AdminField>
          </div>

          {renderLinkEditor('Main Navigation Links', mainLinks, 'mainLinks')}
        </div>
      </div>

      {/* FOOTER EDITOR SECTION */}
      <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-3xl shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <span className="material-symbols-outlined text-[150px]">bottom_navigation</span>
        </div>
        <div className="relative z-10 space-y-6">
          <SectionHeader
            icon="bottom_navigation"
            title="Footer Credentials"
            description="Manage general description summary blocks rendered inside the page base layout"
          />

          <div className="space-y-6 pb-6">
            <AdminField label="Footer Brand Biography">
              <AdminTextarea
                value={footer.description || ''}
                onChange={(e) => onUpdate('footer', { description: e.target.value })}
                rows={3}
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-xl shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
              />
            </AdminField>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AdminField label="Contact Phone">
                <AdminInput
                  value={footer.phone || ''}
                  onChange={(e) => onUpdate('footer', { phone: e.target.value })}
                  className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-xl shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                />
              </AdminField>
              <AdminField label="Contact Email">
                <AdminInput
                  value={footer.email || ''}
                  onChange={(e) => onUpdate('footer', { email: e.target.value })}
                  className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-xl shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                />
              </AdminField>
              <AdminField label="Copyright Notice">
                <AdminInput
                  value={footer.copyright || ''}
                  onChange={(e) => onUpdate('footer', { copyright: e.target.value })}
                  className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-xl shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                />
              </AdminField>
            </div>

            <div className="pt-6 border-t border-[var(--admin-border-subtle)]">
              <span className="text-[12px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] mb-4 block">
                Social Media Links
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <AdminField label="Instagram URL">
                  <AdminInput
                    value={footer.socialLinks?.instagram || ''}
                    onChange={(e) =>
                      onUpdate('footer', {
                        socialLinks: { ...footer.socialLinks, instagram: e.target.value },
                      })
                    }
                    className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-xl shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
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
                    className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-xl shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
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
                    className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-xl shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                  />
                </AdminField>
              </div>
            </div>
          </div>

          <div className="space-y-8 pt-6 border-t border-[var(--admin-border-subtle)]">
            {renderLinkEditor('Explore Links (Col 1)', exploreLinks, 'exploreLinks')}
            {renderLinkEditor('Studio Links (Col 2)', studioLinks, 'studioLinks')}
            {renderLinkEditor('Policy Links (Bottom)', policyLinks, 'policyLinks')}
          </div>

          <div className="pt-8 border-t border-[var(--admin-border-subtle)]">
            {renderLinkEditor('Trust Badges (Middle Banner)', trustBadges, 'trustBadges')}
            <div className="mt-3 ml-2 text-[10px] text-gray-500 italic">
              * For Trust Badges, use the "URL Path" field to enter the Google Material Icon name
              (e.g. "lock", "handshake").
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
