import React, { useState, useEffect } from 'react';
import { SectionHeader, AdminField, AdminInput } from '../AdminUIKit';

export function ContactInfoEditor({ content, onUpdate }) {
  const c = content || {};

  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="contact_page"
        title="Contact Info & Helpline Channels"
        description="Manage direct calling helplines, WhatsApp live endpoints, maps, studio location and hours"
      />

      <div className="space-y-5">
        {/* Core Helpline Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4.5">
          <AdminField label="Primary Consultation Helpline" description="Direct voice call link">
            <AdminInput
              value={c.phone || ''}
              onChange={(e) => onUpdate('contact', { phone: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
            />
          </AdminField>
          <AdminField label="WhatsApp Instant Link" description="Direct messaging URL">
            <AdminInput
              value={c.whatsapp || ''}
              onChange={(e) => onUpdate('contact', { whatsapp: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
            />
          </AdminField>
          <AdminField label="Official Support Email" description="Digital studio inbox">
            <AdminInput
              value={c.email || ''}
              onChange={(e) => onUpdate('contact', { email: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
            />
          </AdminField>
        </div>

        {/* Address and Maps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5 pt-4 border-t border-[var(--admin-border-subtle)]">
          <AdminField
            label="Studio Physical Address"
            description="Location rendered on footer & contact pages"
          >
            <AdminInput
              value={c.address || ''}
              onChange={(e) => onUpdate('contact', { address: e.target.value })}
              className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
            />
          </AdminField>
          <AdminField
            label="Google Maps Direction Link"
            description="Anchor link routing users to navigate"
          >
            <AdminInput
              value={c.mapEmbed || ''}
              onChange={(e) => onUpdate('contact', { mapEmbed: e.target.value })}
              placeholder="e.g. https://maps.google.com/?q=..."
              className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
            />
          </AdminField>
        </div>

        {/* Timings */}
        <div className="bg-[var(--admin-surface)] p-4.5 rounded-2xl border border-[var(--admin-border)] space-y-3 mt-4 shadow-[var(--admin-shadow-xs)]">
          <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.15em] block font-sans">
            Studio Business Hours
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
            <AdminField label="Weekdays opening schedule">
              <AdminInput
                value={c.businessHours || 'Mon - Sat: 10 AM - 7 PM'}
                onChange={(e) => onUpdate('contact', { businessHours: e.target.value })}
                className="!py-2 !text-[11px] sm:text-[11px] bg-[var(--admin-surface)] border-[var(--admin-border)]"
              />
            </AdminField>
            <div className="p-3 bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border-subtle)] flex items-center justify-center text-center">
              <span className="text-[11px] text-[var(--admin-text-tertiary)] font-light leading-normal">
                Rendered across the responsive helpline and custom booking panels.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
