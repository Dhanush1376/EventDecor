import React from 'react';
import { SectionHeader, AdminField, AdminInput, AdminTextarea, AdminToggle } from '../AdminUIKit';
import { ImageUpload } from '../ImageUpload';
import { AISparkButton } from './AISparkButton';

export function EventsPageEditor({ content, onUpdate }) {
  const ep = content || {};
  const hero = ep.hero || {};
  const promo = ep.promo || {};

  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="celebration"
        title="Events Page Customizer"
        description="Configure banner headline, description, hero background image, and promo background image."
      />
      <div className="space-y-6">
        {/* Hero Section Banner */}
        <div className="admin-card p-5 space-y-4">
          <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block border-b border-[var(--admin-border-subtle)] pb-2">
            1. Hero Section Banner
          </span>

          <AdminField label="Hero Title" description="The primary main headline of the events page">
            <div className="relative flex items-center w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
              <AdminInput
                value={hero.title || ''}
                onChange={(e) =>
                  onUpdate('eventsPage', { hero: { ...hero, title: e.target.value } })
                }
                className="!pr-12 !py-3 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
              <div className="absolute right-2.5">
                <AISparkButton
                  text={hero.title}
                  onApply={(val) => onUpdate('eventsPage', { hero: { ...hero, title: val } })}
                />
              </div>
            </div>
          </AdminField>

          <AdminField label="Hero Subtitle" description="A short tagline or category group text">
            <div className="relative flex items-center w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
              <AdminInput
                value={hero.subtitle || ''}
                onChange={(e) =>
                  onUpdate('eventsPage', { hero: { ...hero, subtitle: e.target.value } })
                }
                className="!pr-12 !py-3 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
              <div className="absolute right-2.5">
                <AISparkButton
                  text={hero.subtitle}
                  onApply={(val) => onUpdate('eventsPage', { hero: { ...hero, subtitle: val } })}
                />
              </div>
            </div>
          </AdminField>

          <AdminField
            label="Hero Description"
            description="Immersive description paragraph detailing our event services"
          >
            <div className="relative flex items-start w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
              <AdminTextarea
                value={hero.description || ''}
                onChange={(e) =>
                  onUpdate('eventsPage', { hero: { ...hero, description: e.target.value } })
                }
                rows={3}
                className="!pr-12 !py-3 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
              <div className="absolute right-2.5 top-2.5">
                <AISparkButton
                  text={hero.description}
                  onApply={(val) => onUpdate('eventsPage', { hero: { ...hero, description: val } })}
                />
              </div>
            </div>
          </AdminField>

          <ImageUpload
            label="Hero Background Image"
            value={hero.backgroundImage || ''}
            onChange={(val) => onUpdate('eventsPage', { hero: { ...hero, backgroundImage: val } })}
            folder="cms"
          />
        </div>

        {/* Promo Banner Settings */}
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
                onUpdate('eventsPage', {
                  promo: { ...promo, isActive: promo.isActive === false ? true : false },
                })
              }
            />
          </div>
          <AdminField label="Title">
            <AdminInput
              value={promo.title || ''}
              onChange={(e) =>
                onUpdate('eventsPage', { promo: { ...promo, title: e.target.value } })
              }
            />
          </AdminField>
          <AdminField label="Highlight Text">
            <AdminInput
              value={promo.highlightText || ''}
              onChange={(e) =>
                onUpdate('eventsPage', { promo: { ...promo, highlightText: e.target.value } })
              }
            />
          </AdminField>
          <AdminField label="Description">
            <AdminTextarea
              value={promo.description || ''}
              onChange={(e) =>
                onUpdate('eventsPage', { promo: { ...promo, description: e.target.value } })
              }
              rows={3}
            />
          </AdminField>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="Badge Text">
              <AdminInput
                value={promo.badgeText || ''}
                onChange={(e) =>
                  onUpdate('eventsPage', { promo: { ...promo, badgeText: e.target.value } })
                }
              />
            </AdminField>
            <AdminField label="Status Text">
              <AdminInput
                value={promo.statusText || ''}
                onChange={(e) =>
                  onUpdate('eventsPage', { promo: { ...promo, statusText: e.target.value } })
                }
              />
            </AdminField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="CTA Text">
              <AdminInput
                value={promo.ctaText || ''}
                onChange={(e) =>
                  onUpdate('eventsPage', { promo: { ...promo, ctaText: e.target.value } })
                }
              />
            </AdminField>
            <AdminField label="CTA Link">
              <AdminInput
                value={promo.ctaLink || ''}
                onChange={(e) =>
                  onUpdate('eventsPage', { promo: { ...promo, ctaLink: e.target.value } })
                }
              />
            </AdminField>
          </div>
          <ImageUpload
            label="Promo Section Background Image"
            value={promo.backgroundImage || ''}
            onChange={(val) =>
              onUpdate('eventsPage', { promo: { ...promo, backgroundImage: val } })
            }
            folder="cms"
          />
        </div>
      </div>
    </div>
  );
}
