import { m as motion } from 'framer-motion';
export default function ProfileTab({
  profileForm,
  setProfileForm,
  handleProfileSave,
  user,
  isUpdatingProfile,
}) {
  return (
    <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-6 shadow-xs space-y-6">
      <div className="pb-4 border-b border-outline-variant/40">
        <h2 className="font-bold text-base text-on-surface uppercase tracking-wider">
          Profile Settings
        </h2>
        <span className="text-[11px] text-secondary font-light">
          Update your account profiles, contact parameters, and identity settings.
        </span>
      </div>

      <form onSubmit={handleProfileSave} className="space-y-5 max-w-2xl text-[11px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="dashboard-profile-name"
              className="block text-[10px] uppercase font-bold text-secondary tracking-widest mb-1.5"
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
              className="form-field"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-secondary tracking-widest mb-1.5">
              Registered Email Address
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none font-semibold text-secondary cursor-not-allowed"
            />
            <span className="text-[9px] text-secondary/50 block mt-1">
              Security Note: Primary login email keys cannot be modified.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label
              htmlFor="dashboard-profile-phone"
              className="block text-[10px] uppercase font-bold text-secondary tracking-widest mb-1.5"
            >
              Mobile Number
            </label>
            <input
              id="dashboard-profile-phone"
              type="tel"
              autoComplete="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              className="form-field"
              placeholder="e.g. 9876543210"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-secondary tracking-widest mb-1.5">
              Gender Option
            </label>
            <select
              value={profileForm.gender}
              onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
              className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold cursor-pointer"
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
              className="block text-[10px] uppercase font-bold text-secondary tracking-widest mb-1.5"
            >
              Date Of Birth (DOB)
            </label>
            <input
              id="dashboard-profile-dob"
              type="date"
              autoComplete="bday"
              value={profileForm.dateOfBirth}
              onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
              className="w-full min-w-0 max-w-full overflow-hidden bg-white border border-outline-variant/30 rounded-lg px-2 md:px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isUpdatingProfile}
            type="submit"
            className="btn-primary px-8 py-3 rounded-full font-bold uppercase tracking-widest text-[10px] inline-flex items-center gap-2 cursor-pointer shadow-md"
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
  );
}
