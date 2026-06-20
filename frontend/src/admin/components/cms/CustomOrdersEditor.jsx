import React, { useState, useEffect } from 'react';
import { SectionHeader, AdminField, AdminInput, AdminTextarea } from '../AdminUIKit';
import { AISparkButton } from './AISparkButton';

export function CustomOrdersEditor({ content, onUpdate }) {
  const co = content.customOrdersPage || {};
  const hero = co.hero || {};

  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="design_services"
        title="Custom Orders Settings"
        description="Configure titles and messages for the bespoke intake flow"
      />
      <div className="space-y-6">
        <div className="admin-card p-5 space-y-4">
          <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block border-b border-[var(--admin-border-subtle)] pb-2">
            Hero Section Banner
          </span>

          <AdminField
            label="Hero Title"
            description="The primary main headline of the custom orders page"
          >
            <div className="relative flex items-center w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
              <AdminInput
                value={hero.title || ''}
                onChange={(e) =>
                  onUpdate('customOrdersPage', { hero: { ...hero, title: e.target.value } })
                }
                className="!pr-12 !py-3 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
              <div className="absolute right-2.5">
                <AISparkButton
                  text={hero.title}
                  onApply={(val) => onUpdate('customOrdersPage', { hero: { ...hero, title: val } })}
                />
              </div>
            </div>
          </AdminField>

          <AdminField label="Hero Subtitle" description="A short tagline or category group text">
            <div className="relative flex items-center w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
              <AdminInput
                value={hero.subtitle || ''}
                onChange={(e) =>
                  onUpdate('customOrdersPage', { hero: { ...hero, subtitle: e.target.value } })
                }
                className="!pr-12 !py-3 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
              <div className="absolute right-2.5">
                <AISparkButton
                  text={hero.subtitle}
                  onApply={(val) =>
                    onUpdate('customOrdersPage', { hero: { ...hero, subtitle: val } })
                  }
                />
              </div>
            </div>
          </AdminField>

          <AdminField
            label="Hero Description"
            description="Immersive description paragraph detailing the intake flow"
          >
            <div className="relative flex items-start w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
              <AdminTextarea
                value={hero.description || ''}
                onChange={(e) =>
                  onUpdate('customOrdersPage', { hero: { ...hero, description: e.target.value } })
                }
                rows={3}
                className="!pr-12 !py-3 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
              <div className="absolute right-2.5 top-2.5">
                <AISparkButton
                  text={hero.description}
                  onApply={(val) =>
                    onUpdate('customOrdersPage', { hero: { ...hero, description: val } })
                  }
                />
              </div>
            </div>
          </AdminField>
        </div>
      </div>
    </div>
  );
}
