import { motion } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';

export function ProfileSection() {
  const { user, profileForm, setProfileForm, handleProfileSave, isUpdatingProfile } =
    useDashboard();

  return (
    <motion.div
      id="panel-profile"
      role="tabpanel"
      key="tab-profile"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 text-left"
    >
      <div className="bg-surface-bright border border-outline-variant/30 rounded-lg p-5 flex flex-col gap-1 shadow-2xs">
        <h2 className="font-semibold text-sm text-on-surface tracking-wide">Profile Settings</h2>
        <span className="text-[10px] text-on-surface/60 font-light">
          Update your account profiles, contact parameters, and identity settings.
        </span>
      </div>

      <div className="bg-surface-bright border border-outline-variant/30 rounded-lg p-5 shadow-2xs">
        <form onSubmit={handleProfileSave} className="space-y-4 max-w-2xl text-[11px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="dashboard-profile-name"
                className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
              >
                Full Account Name
              </label>
              <input
                id="dashboard-profile-name"
                type="text"
                required
                autoComplete="name"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold text-on-surface"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5">
                Registered Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none font-semibold text-secondary cursor-not-allowed opacity-75"
              />
              <span className="text-[9px] text-secondary/50 block mt-1">
                Security Note: Primary login email keys cannot be modified.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="dashboard-profile-phone"
                className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
              >
                Mobile Number
              </label>
              <input
                id="dashboard-profile-phone"
                type="tel"
                autoComplete="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold text-on-surface"
                placeholder="e.g. 9876543210"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5">
                Gender Option
              </label>
              <select
                value={profileForm.gender}
                onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold cursor-pointer text-on-surface"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other / Custom</option>
                <option value="prefer-not-to-say">Prefer Not To Disclose</option>
              </select>
            </div>

            <div className="min-w-0">
              <label
                htmlFor="dashboard-profile-dob"
                className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
              >
                Date Of Birth (DOB)
              </label>
              <input
                id="dashboard-profile-dob"
                type="date"
                autoComplete="bday"
                value={profileForm.dateOfBirth}
                onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                className="w-full min-w-0 max-w-full overflow-hidden bg-surface-container-low border border-outline-variant/30 rounded-lg px-2 md:px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold cursor-pointer text-on-surface"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isUpdatingProfile}
              type="submit"
              className="btn-primary px-6 py-2.5 rounded-full font-bold uppercase tracking-widest text-[9px] inline-flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              {isUpdatingProfile ? (
                <div className="skeleton-box inline-block w-3.5 h-3.5 rounded-md" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-[13px]">save</span>
                  <span>Commit Profile Updates</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
