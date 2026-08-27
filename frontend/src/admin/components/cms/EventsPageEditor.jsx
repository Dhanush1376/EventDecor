import React from 'react';
import { SectionHeader, AdminField, AdminInput, AdminTextarea } from '../AdminUIKit';
import { ImageUpload } from '../ImageUpload';

export function EventsPageEditor({ content, onUpdate }) {
  const ep = content || {};
  const hero = ep.hero || {};

  return (
    <div className="space-y-8">
      <SectionHeader
        icon="celebration"
        title="Events Page Customizer"
        description="Configure banner headline, description, and hero background image."
      />

      <div className="space-y-8">
        {/* Hero Section Banner */}
        <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
            <span className="material-symbols-outlined text-[150px]">celebration</span>
          </div>
          <div className="relative z-10 space-y-6">
            <span className="text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-[0.1em] block border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
              1. Hero Section Setup
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AdminField
                label="Hero Title"
                description="The primary main headline of the events page"
              >
                <AdminInput
                  value={hero.title || ''}
                  onChange={(e) =>
                    onUpdate('eventsPage', { hero: { ...hero, title: e.target.value } })
                  }
                  className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                  placeholder="e.g. Luxury Event Scapes"
                />
              </AdminField>

              <AdminField
                label="Hero Subtitle"
                description="A short tagline or category group text"
              >
                <AdminInput
                  value={hero.subtitle || ''}
                  onChange={(e) =>
                    onUpdate('eventsPage', { hero: { ...hero, subtitle: e.target.value } })
                  }
                  className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                  placeholder="e.g. Cinematic Environments"
                />
              </AdminField>
            </div>

            <AdminField
              label="Hero Description"
              description="Immersive description paragraph detailing our event services"
            >
              <AdminTextarea
                value={hero.description || ''}
                onChange={(e) =>
                  onUpdate('eventsPage', { hero: { ...hero, description: e.target.value } })
                }
                rows={3}
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                placeholder="Describe your event services here..."
              />
            </AdminField>

            <div className="pt-2">
              <div className="bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] p-4 rounded-md shadow-[var(--admin-shadow-xs)]">
                <ImageUpload
                  label="Hero Background Image"
                  value={hero.backgroundImage || ''}
                  onChange={(val) =>
                    onUpdate('eventsPage', { hero: { ...hero, backgroundImage: val } })
                  }
                  folder="cms"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
