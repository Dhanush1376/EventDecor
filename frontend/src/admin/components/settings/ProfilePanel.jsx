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
        <div className="space-y-2">
          <label className="admin-label">Your Full Name</label>
          <input
            type="text"
            required
            value={profileForm.name}
            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
            className="admin-input"
          />
        </div>
        <div className="space-y-2">
          <label className="admin-label">Staff Designation (Read Only)</label>
          <input
            type="text"
            disabled
            value={profileForm.role.toUpperCase()}
            className="admin-input bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)] cursor-not-allowed border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="admin-label">Verified Account Email Address</label>
          <input
            type="email"
            required
            value={profileForm.email}
            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            className="admin-input"
          />
        </div>
        <div className="space-y-2">
          <label className="admin-label">Contact Phone Number</label>
          <input
            type="tel"
            value={profileForm.phone}
            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            placeholder="e.g. +91 98765 43210"
            className="admin-input"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 mt-8 border-t border-[var(--admin-border-subtle)]">
        <button
          type="button"
          onClick={syncSettingsData}
          className="admin-btn admin-btn-outline h-10 border-transparent bg-transparent hover:bg-[var(--admin-surface-muted)]"
        >
          Discard
        </button>
        <button type="submit" disabled={saving} className="admin-btn h-10">
          {saving ? 'Saving...' : 'Save Profile Info'}
        </button>
      </div>
    </form>
  );
}
