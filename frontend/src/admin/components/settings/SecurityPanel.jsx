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
    <div className="space-y-6">
      {/* Operational Controls Card (Order Detail Card Architecture) */}
      <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
          <h3 className="text-[13.5px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
              settings_applications
            </span>
            Operational Safeguards & Timing
          </h3>
          <span className="text-[10px] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] px-2 py-0.5 rounded-[4px] font-bold uppercase tracking-wider border border-[var(--admin-border)] shadow-2xs">
            Security Controls
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between p-3.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] rounded-[4px] hover:border-[var(--admin-border)] transition-all">
            <div>
              <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                Global Safety Lock
              </h4>
              <p className="text-[11.5px] text-[var(--admin-text-secondary)] mt-0.5">
                Restricts all write operations (Add, Edit, Delete) across the database portal.
              </p>
            </div>
            <button
              onClick={toggleSafetyLock}
              className={`w-11 h-6 rounded-full transition-colors duration-200 relative focus:outline-none cursor-pointer min-h-0 p-0 shrink-0 ml-3 ${safetyLock ? 'bg-[var(--admin-accent)]' : 'bg-[var(--admin-border-strong)]'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-[var(--admin-surface)] rounded-full transition-transform duration-200 shadow-sm ${safetyLock ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] rounded-[4px] hover:border-[var(--admin-border)] transition-all">
            <div>
              <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                Storefront Maintenance Mode
              </h4>
              <p className="text-[11.5px] text-[var(--admin-text-secondary)] mt-0.5">
                Intercepts storefront traffic and displays a customizable maintenance mode screen.
              </p>
            </div>
            <button
              onClick={toggleMaintenanceMode}
              className={`w-11 h-6 rounded-full transition-colors duration-200 relative focus:outline-none cursor-pointer min-h-0 p-0 shrink-0 ml-3 ${maintenanceMode ? 'bg-[var(--admin-accent)]' : 'bg-[var(--admin-border-strong)]'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-[var(--admin-surface)] rounded-full transition-transform duration-200 shadow-sm ${maintenanceMode ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] rounded-[4px] hover:border-[var(--admin-border)] transition-all">
            <div>
              <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                Auto-Publish CMS Changes
              </h4>
              <p className="text-[11.5px] text-[var(--admin-text-secondary)] mt-0.5">
                Instantly saves and publishes layout changes to the live database without manual
                staging.
              </p>
            </div>
            <button
              onClick={toggleAutoPublish}
              className={`w-11 h-6 rounded-full transition-colors duration-200 relative focus:outline-none cursor-pointer min-h-0 p-0 shrink-0 ml-3 ${autoPublish ? 'bg-[var(--admin-accent)]' : 'bg-[var(--admin-border-strong)]'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-[var(--admin-surface)] rounded-full transition-transform duration-200 shadow-sm ${autoPublish ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] items-center gap-4 p-3.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] rounded-[4px]">
            <div>
              <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                Session Idle Timeout Heartbeat
              </h4>
              <p className="text-[11.5px] text-[var(--admin-text-secondary)] mt-0.5">
                Auto log out administrators after a period of inactive mouse/keyboard activity.
              </p>
            </div>
            <select
              value={idleTimeoutMinutes}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                changeIdleTimeout(val);
              }}
              className="admin-input h-9 !min-h-[36px] rounded-[4px] border-[var(--admin-border)] text-[12.5px] font-semibold"
            >
              <option value="5">5 Minutes</option>
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="60">60 Minutes</option>
              <option value="0">Never (No Auto-Logout)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Database Wiping Lockout Safeguard (Order Detail Danger Card) */}
      <div className="bg-[var(--admin-surface)] border border-rose-200 dark:border-rose-900/60 rounded-[4px] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-rose-100 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 flex items-center justify-between">
          <h3 className="text-[13.5px] font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-rose-600">warning</span>
            Danger Zone: Database Hard Reset Gate
          </h3>
          <span className="text-[10px] bg-rose-100/70 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-[4px] font-bold uppercase tracking-wider border border-rose-200 dark:border-rose-800">
            Irreversible
          </span>
        </div>

        <form onSubmit={handleHardReset} className="p-4 sm:p-5 space-y-4">
          <p className="text-[12px] text-rose-700 dark:text-rose-400 font-medium">
            Resets the entire store database configuration to default factory values.
          </p>

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
                className="mt-1 w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-200 cursor-pointer"
              />
              <span className="text-[12px] text-rose-800 dark:text-rose-300 font-bold">
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
                className="mt-1 w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-200 cursor-pointer"
              />
              <span className="text-[12px] text-rose-800 dark:text-rose-300 font-bold">
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
                className="mt-1 w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-200 cursor-pointer"
              />
              <span className="text-[12px] text-rose-800 dark:text-rose-300 font-bold">
                I confirm that my preview role credentials match Owner privileges.
              </span>
            </label>
          </div>

          <div className="space-y-1.5 pt-2">
            <label
              htmlFor="reset-passphrase-input"
              className="block text-[11px] uppercase tracking-wider text-rose-700 dark:text-rose-400 font-bold"
            >
              Enter phrase "CONFIRM HARD RESET" to unlock
            </label>
            <input
              id="reset-passphrase-input"
              type="text"
              placeholder="Type the passphrase exactly..."
              value={resetCodePhrase}
              onChange={(e) => setResetCodePhrase(e.target.value)}
              className="w-full bg-[var(--admin-surface)] border border-rose-200 dark:border-rose-900/60 focus:border-rose-500 rounded-[4px] px-3.5 py-2 text-[13px] outline-none transition-all font-mono font-bold text-center uppercase"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-rose-100 dark:border-rose-900/40">
            <button
              type="submit"
              disabled={
                resetExecuting ||
                resetCodePhrase !== 'CONFIRM HARD RESET' ||
                !resetCheck1 ||
                !resetCheck2 ||
                !resetCheck3
              }
              className="h-9 px-5 rounded-[4px] bg-rose-600 hover:bg-rose-700 text-white font-bold text-[12px] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
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
