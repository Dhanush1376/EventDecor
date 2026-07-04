import React from 'react';

export function SecurityPanel({
  safetyLock,
  toggleSafetyLock,
  maintenanceMode,
  toggleMaintenanceMode,
  autoPublish,
  toggleAutoPublish,
  idleTimeoutMinutes,
  changeIdleTimeout,
  handleHardReset,
  resetCheck1,
  setResetCheck1,
  resetCheck2,
  setResetCheck2,
  resetCheck3,
  setResetCheck3,
  resetCodePhrase,
  setResetCodePhrase,
  resetExecuting,
}) {
  return (
    <div className="space-y-8">
      {/* Operational Controls Card */}
      <div className="bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-xl)] p-6">
        <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
            settings_applications
          </span>
          Operational Safeguards & Timing
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[var(--admin-radius-lg)]">
            <div>
              <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                Global Safety Lock
              </h4>
              <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                Restricts all write operations (Add, Edit, Delete) across the database portal.
              </p>
            </div>
            <button
              onClick={toggleSafetyLock}
              className={`w-11 h-6 rounded-full transition-colors duration-200 relative focus:outline-none cursor-pointer min-h-0 p-0 ${safetyLock ? 'bg-[var(--admin-accent)]' : 'bg-[var(--admin-border-strong)]'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-[var(--admin-surface)] rounded-full transition-transform duration-200 shadow-sm ${safetyLock ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[var(--admin-radius-lg)]">
            <div>
              <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                Storefront Maintenance Mode
              </h4>
              <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                Intercepts storefront traffic and displays a customizable maintenance mode screen.
              </p>
            </div>
            <button
              onClick={toggleMaintenanceMode}
              className={`w-11 h-6 rounded-full transition-colors duration-200 relative focus:outline-none cursor-pointer min-h-0 p-0 ${maintenanceMode ? 'bg-[var(--admin-accent)]' : 'bg-[var(--admin-border-strong)]'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-[var(--admin-surface)] rounded-full transition-transform duration-200 shadow-sm ${maintenanceMode ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[var(--admin-radius-lg)]">
            <div>
              <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                Auto-Publish CMS Changes
              </h4>
              <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                Instantly saves and publishes layout changes to the live database without manual
                staging.
              </p>
            </div>
            <button
              onClick={toggleAutoPublish}
              className={`w-11 h-6 rounded-full transition-colors duration-200 relative focus:outline-none cursor-pointer min-h-0 p-0 ${autoPublish ? 'bg-[var(--admin-accent)]' : 'bg-[var(--admin-border-strong)]'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-[var(--admin-surface)] rounded-full transition-transform duration-200 shadow-sm ${autoPublish ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] items-center gap-4 p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[var(--admin-radius-lg)]">
            <div>
              <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                Session Idle Timeout Heartbeat
              </h4>
              <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                Auto log out administrators after a period of inactive mouse/keyboard activity.
              </p>
            </div>
            <select
              value={idleTimeoutMinutes}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                changeIdleTimeout(val);
              }}
              className="admin-input h-10 py-0"
            >
              <option value="5">5 Minutes</option>
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="60">60 Minutes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Database Wiping Lockout Safeguard */}
      <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-[var(--admin-radius-xl)] p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-[var(--admin-radius-md)] bg-[#ffe4e6] flex items-center justify-center text-[#e11d48] shrink-0">
            <span className="material-symbols-outlined text-[20px]">warning</span>
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-[#9f1239] uppercase tracking-wider leading-tight mt-0.5">
              Danger Zone: Database Hard Reset Gate
            </h3>
            <p className="text-[12px] text-[#e11d48] mt-1.5 font-medium leading-relaxed">
              Resets the entire store to default settings.
            </p>
          </div>
        </div>

        <form onSubmit={handleHardReset} className="space-y-4">
          <div className="space-y-2.5">
            <label
              htmlFor="reset-check-1"
              className="flex items-start gap-3 cursor-pointer select-none"
            >
              <input
                id="reset-check-1"
                type="checkbox"
                checked={resetCheck1}
                onChange={(e) => setResetCheck1(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-[#fecdd3] text-[#e11d48] focus:ring-[#fecdd3] cursor-pointer"
              />
              <span className="text-[12px] text-[#9f1239] font-bold">
                I understand that hard resetting database data is completely irreversible.
              </span>
            </label>

            <label
              htmlFor="reset-check-2"
              className="flex items-start gap-3 cursor-pointer select-none"
            >
              <input
                id="reset-check-2"
                type="checkbox"
                checked={resetCheck2}
                onChange={(e) => setResetCheck2(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-[#fecdd3] text-[#e11d48] focus:ring-[#fecdd3] cursor-pointer"
              />
              <span className="text-[12px] text-[#9f1239] font-bold">
                I have downloaded a catalog backup configuration file to my local machine.
              </span>
            </label>

            <label
              htmlFor="reset-check-3"
              className="flex items-start gap-3 cursor-pointer select-none"
            >
              <input
                id="reset-check-3"
                type="checkbox"
                checked={resetCheck3}
                onChange={(e) => setResetCheck3(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-[#fecdd3] text-[#e11d48] focus:ring-[#fecdd3] cursor-pointer"
              />
              <span className="text-[12px] text-[#9f1239] font-bold">
                I confirm that my preview role credentials match Owner privileges.
              </span>
            </label>
          </div>

          <div className="space-y-2 pt-4">
            <label
              htmlFor="reset-passphrase-input"
              className="block text-[11px] uppercase tracking-wider text-[#e11d48] font-bold"
            >
              Enter phrase "CONFIRM HARD RESET" to unlock
            </label>
            <input
              id="reset-passphrase-input"
              type="text"
              placeholder="Type the passphrase exactly..."
              value={resetCodePhrase}
              onChange={(e) => setResetCodePhrase(e.target.value)}
              className="w-full bg-[var(--admin-surface)] border border-[#fecdd3] focus:border-[#e11d48] rounded-[var(--admin-radius-lg)] px-4 py-3 text-[13px] outline-none transition-all font-mono font-bold text-center uppercase"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={
                resetExecuting ||
                resetCodePhrase !== 'CONFIRM HARD RESET' ||
                !resetCheck1 ||
                !resetCheck2 ||
                !resetCheck3
              }
              className="admin-btn h-11 bg-[#e11d48] hover:bg-[#be123c] text-white border-none disabled:bg-[#ffe4e6] disabled:text-[#fda4af]"
            >
              {resetExecuting ? (
                'Executing Wipe...'
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                  Wipe Database & Restore Defaults
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
