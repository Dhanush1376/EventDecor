import React from 'react';

export function ProfilePanel({
  profileForm,
  setProfileForm,
  handleProfileSave,
  syncSettingsData,
  saving,
}) {
  return (
    <form onSubmit={handleProfileSave} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-[var(--admin-text-primary)] block leading-tight">
            Your Full Name
          </label>
          <input
            type="text"
            required
            value={profileForm.name || ''}
            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
            className="admin-input h-9 !min-h-[36px] rounded-[4px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] text-[13px]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-[var(--admin-text-primary)] block leading-tight">
            Staff Designation (Read Only)
          </label>
          <input
            type="text"
            disabled
            value={(profileForm.role || 'admin').toUpperCase()}
            className="admin-input h-9 !min-h-[36px] rounded-[4px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] font-bold cursor-not-allowed border-[var(--admin-border-subtle)] text-[12px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-[var(--admin-text-primary)] block leading-tight">
            Verified Account Email Address
          </label>
          <input
            type="email"
            required
            value={profileForm.email || ''}
            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            className="admin-input h-9 !min-h-[36px] rounded-[4px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] text-[13px]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-[var(--admin-text-primary)] block leading-tight">
            Phone Number
          </label>
          <input
            type="tel"
            value={profileForm.phone || ''}
            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            placeholder="e.g. +91 98765 43210"
            className="admin-input h-9 !min-h-[36px] rounded-[4px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] text-[13px]"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2.5 pt-4 mt-6 border-t border-[var(--admin-border-subtle)]">
        <button
          type="button"
          onClick={syncSettingsData}
          className="h-9 px-4 rounded-[4px] border border-[var(--admin-border)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] font-bold text-[12px] transition-colors cursor-pointer"
        >
          Discard
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-9 px-5 rounded-[4px] bg-[var(--admin-accent)] hover:opacity-95 text-white font-bold text-[12.5px] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[16px]">save</span>
          <span>{saving ? 'Saving...' : 'Save Profile Info'}</span>
        </button>
      </div>
    </form>
  );
}
