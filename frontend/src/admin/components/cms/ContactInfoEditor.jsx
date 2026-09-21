import React from 'react';
import { AdminField, AdminInput } from '../AdminUIKit';
import { BRAND } from '../../../config/brand';

export function ContactInfoEditor({ content, onUpdate }) {
  const c = content || {};

  return (
    <div className="space-y-8">
      {/* 1. Core Helpline Channels */}
      <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <span className="material-symbols-outlined text-[150px]">contact_phone</span>
        </div>
        <div className="relative z-10 space-y-6">
          <span className="text-[14px] sm:text-[15px] font-semibold text-[var(--admin-text-primary)] tracking-tight block border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
            1. Direct Helplines & Digital Endpoints
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <AdminField
              label="Primary Consultation Helpline"
              description="Direct voice call telephone number"
            >
              <AdminInput
                value={c.phone || BRAND.phone}
                onChange={(e) => onUpdate('contact', { phone: e.target.value })}
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
              />
            </AdminField>
            <AdminField
              label="WhatsApp Instant Link"
              description="Direct WhatsApp click-to-chat URL"
            >
              <AdminInput
                value={c.whatsapp || BRAND.whatsappUrl}
                onChange={(e) => onUpdate('contact', { whatsapp: e.target.value })}
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
              />
            </AdminField>
            <AdminField
              label="Official Support Email"
              description="Official customer enquiry inbox"
            >
              <AdminInput
                value={c.email || BRAND.email}
                onChange={(e) => onUpdate('contact', { email: e.target.value })}
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
              />
            </AdminField>
          </div>
        </div>
      </div>

      {/* 2. Studio Physical Address & Maps */}
      <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6">
          <span className="material-symbols-outlined text-[150px]">location_on</span>
        </div>
        <div className="relative z-10 space-y-6">
          <span className="text-[14px] sm:text-[15px] font-semibold text-[var(--admin-text-primary)] tracking-tight block border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
            2. Studio Physical Address & Maps Navigation
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <AdminField
              label="Studio Physical Address"
              description="Location rendered on footer & contact pages"
            >
              <AdminInput
                value={c.address || BRAND.address || ''}
                onChange={(e) => onUpdate('contact', { address: e.target.value })}
                placeholder="e.g. Studio Address, City, State"
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
              />
            </AdminField>
            <AdminField
              label="Google Maps Direction Link"
              description="Anchor link routing users directly to Google Maps"
            >
              <AdminInput
                value={
                  c.mapEmbed ||
                  'https://www.google.com/maps/place/Siri+Arts+%26+Crafts/@15.5024512,80.0450481,17z/data=!3m1!4b1!4m6!3m5!1s0x3a4b01495510d675:0xe98014cae349dbea!8m2!3d15.502446!4d80.047623!16s%2Fg%2F11scb6jg5_'
                }
                onChange={(e) => onUpdate('contact', { mapEmbed: e.target.value })}
                placeholder="e.g. https://maps.google.com/?q=..."
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
              />
            </AdminField>
          </div>
        </div>
      </div>

      {/* 3. Studio Business Hours */}
      <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <span className="material-symbols-outlined text-[150px]">schedule</span>
        </div>
        <div className="relative z-10 space-y-6">
          <span className="text-[14px] sm:text-[15px] font-semibold text-[var(--admin-text-primary)] tracking-tight block border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
            3. Studio Operating Schedule
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <AdminField
              label="Weekdays & Weekend Opening Hours"
              description="Opening hours displayed across storefront panels"
            >
              <AdminInput
                value={c.businessHours || 'Mon - Sat: 10 AM - 7 PM'}
                onChange={(e) => onUpdate('contact', { businessHours: e.target.value })}
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
              />
            </AdminField>
            <div className="p-4 bg-[var(--admin-surface-muted)] rounded-md border border-[var(--admin-border-subtle)] flex items-center justify-center text-center">
              <span className="text-[12px] text-[var(--admin-text-tertiary)] font-normal leading-relaxed">
                These hours are automatically synchronized across the responsive mobile helpline and
                bespoke consultation intake panels.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
