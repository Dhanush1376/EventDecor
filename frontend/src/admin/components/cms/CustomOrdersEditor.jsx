import React from 'react';
import { SectionHeader, AdminField, AdminInput, AdminTextarea } from '../AdminUIKit';

export function CustomOrdersEditor({ content, onUpdate }) {
  const co = content.customOrdersPage || {};
  const hero = co.hero || {};

  return (
    <div className="space-y-8">
      <SectionHeader
        icon="design_services"
        title="Custom Orders Settings"
        description="Configure titles and messages for the bespoke intake flow"
      />

      <div className="space-y-8">
        {/* Hero Section Banner */}
        <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
            <span className="material-symbols-outlined text-[150px]">design_services</span>
          </div>
          <div className="relative z-10 space-y-6">
            <span className="text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-[0.1em] block border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
              1. Hero Section Setup
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AdminField
                label="Hero Title"
                description="The primary main headline of the custom orders page"
              >
                <AdminInput
                  value={hero.title || 'Custom Order'}
                  onChange={(e) =>
                    onUpdate('customOrdersPage', { hero: { ...hero, title: e.target.value } })
                  }
                  className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                  placeholder="e.g. Custom Order"
                />
              </AdminField>

              <AdminField
                label="Hero Subtitle"
                description="A short tagline or category group text"
              >
                <AdminInput
                  value={hero.subtitle || 'Bespoke Event Curation'}
                  onChange={(e) =>
                    onUpdate('customOrdersPage', { hero: { ...hero, subtitle: e.target.value } })
                  }
                  className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                  placeholder="e.g. Bespoke Event Curation"
                />
              </AdminField>
            </div>

            <AdminField
              label="Hero Description"
              description="Immersive description paragraph detailing the intake flow"
            >
              <AdminTextarea
                value={
                  hero.description ||
                  'Design your custom decor, get price estimates, and track your orders.'
                }
                onChange={(e) =>
                  onUpdate('customOrdersPage', { hero: { ...hero, description: e.target.value } })
                }
                rows={3}
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                placeholder="Design your custom decor, get price estimates, and track your orders."
              />
            </AdminField>
          </div>
        </div>
      </div>
    </div>
  );
}
