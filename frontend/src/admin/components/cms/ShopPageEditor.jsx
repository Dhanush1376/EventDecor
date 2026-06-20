import React, { useState, useEffect } from 'react';
import { SectionHeader, AdminField, AdminInput, AdminTextarea, AdminToggle } from '../AdminUIKit';
import { ImageUpload } from '../ImageUpload';
import { AISparkButton } from './AISparkButton';

export function ShopPageEditor({ content, onUpdate }) {
  const sp = content || {};
  const hero = sp.hero || {};
  const promo = sp.promo || {};

  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="storefront"
        title="Shop Page Customizer"
        description="Configure banner headline, description, hero background image, and promo banner."
      />
      <div className="space-y-6">
        {/* Hero Section Banner */}
        <div className="admin-card p-5 space-y-4">
          <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block border-b border-[var(--admin-border-subtle)] pb-2">
            1. Hero Section Banner
          </span>

          <AdminField label="Hero Title" description="The primary main headline of the shop page">
            <div className="relative flex items-center w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
              <AdminInput
                value={hero.title || ''}
                onChange={(e) => onUpdate('shopPage', { hero: { ...hero, title: e.target.value } })}
                className="!pr-12 !py-3 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
              <div className="absolute right-2.5">
                <AISparkButton
                  text={hero.title}
                  onApply={(val) => onUpdate('shopPage', { hero: { ...hero, title: val } })}
                />
              </div>
            </div>
          </AdminField>

          <AdminField label="Hero Subtitle" description="A short tagline or category group text">
            <div className="relative flex items-center w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
              <AdminInput
                value={hero.subtitle || ''}
                onChange={(e) =>
                  onUpdate('shopPage', { hero: { ...hero, subtitle: e.target.value } })
                }
                className="!pr-12 !py-3 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
              <div className="absolute right-2.5">
                <AISparkButton
                  text={hero.subtitle}
                  onApply={(val) => onUpdate('shopPage', { hero: { ...hero, subtitle: val } })}
                />
              </div>
            </div>
          </AdminField>

          <AdminField
            label="Hero Description"
            description="Immersive description paragraph detailing the shop collections"
          >
            <div className="relative flex items-start w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
              <AdminTextarea
                value={hero.description || ''}
                onChange={(e) =>
                  onUpdate('shopPage', { hero: { ...hero, description: e.target.value } })
                }
                rows={3}
                className="!pr-12 !py-3 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
              <div className="absolute right-2.5 top-2.5">
                <AISparkButton
                  text={hero.description}
                  onApply={(val) => onUpdate('shopPage', { hero: { ...hero, description: val } })}
                />
              </div>
            </div>
          </AdminField>

          <ImageUpload
            label="Hero Background Image"
            value={hero.backgroundImage || ''}
            onChange={(val) => onUpdate('shopPage', { hero: { ...hero, backgroundImage: val } })}
            folder="cms"
          />
        </div>
        <div className="admin-card p-5 space-y-4">
          <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block border-b border-[var(--admin-border-subtle)] pb-2">
            2. Promo Banner Settings
          </span>
          <div className="flex items-center justify-between border border-[var(--admin-border)] px-4.5 py-3 rounded-2xl bg-[var(--admin-surface)] mt-5 h-[46px] shadow-[var(--admin-shadow-xs)]">
            <span className="text-[11px] font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider">
              Enable Promo Banner
            </span>
            <AdminToggle
              checked={promo.isActive !== false}
              onChange={() =>
                onUpdate('shopPage', {
                  promo: { ...promo, isActive: promo.isActive === false ? true : false },
                })
              }
            />
          </div>
          <AdminField label="Title">
            <AdminInput
              value={promo.title || ''}
              onChange={(e) => onUpdate('shopPage', { promo: { ...promo, title: e.target.value } })}
            />
          </AdminField>
          <AdminField label="Highlight Text">
            <AdminInput
              value={promo.highlightText || ''}
              onChange={(e) =>
                onUpdate('shopPage', { promo: { ...promo, highlightText: e.target.value } })
              }
            />
          </AdminField>
          <AdminField label="Description">
            <AdminTextarea
              value={promo.description || ''}
              onChange={(e) =>
                onUpdate('shopPage', { promo: { ...promo, description: e.target.value } })
              }
              rows={3}
            />
          </AdminField>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="Badge Text">
              <AdminInput
                value={promo.badgeText || ''}
                onChange={(e) =>
                  onUpdate('shopPage', { promo: { ...promo, badgeText: e.target.value } })
                }
              />
            </AdminField>
            <AdminField label="Status Text">
              <AdminInput
                value={promo.statusText || ''}
                onChange={(e) =>
                  onUpdate('shopPage', { promo: { ...promo, statusText: e.target.value } })
                }
              />
            </AdminField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="CTA Text">
              <AdminInput
                value={promo.ctaText || ''}
                onChange={(e) =>
                  onUpdate('shopPage', { promo: { ...promo, ctaText: e.target.value } })
                }
              />
            </AdminField>
            <AdminField label="CTA Link">
              <AdminInput
                value={promo.ctaLink || ''}
                onChange={(e) =>
                  onUpdate('shopPage', { promo: { ...promo, ctaLink: e.target.value } })
                }
              />
            </AdminField>
          </div>
          <ImageUpload
            label="Promo Section Background Image"
            value={promo.backgroundImage || ''}
            onChange={(val) => onUpdate('shopPage', { promo: { ...promo, backgroundImage: val } })}
            folder="cms"
          />
        </div>
      </div>
    </div>
  );
}
