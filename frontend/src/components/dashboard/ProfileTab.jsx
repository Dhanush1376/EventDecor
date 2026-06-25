import { m as motion } from 'framer-motion';
export default function ProfileTab({
  profileForm,
  setProfileForm,
  handleProfileSave,
  user,
  isUpdatingProfile,
}) {
  return (
    <div className="py-5">
      <div className="pb-5 mb-5 border-b border-outline-variant/20">
        <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[12px]">person</span>
          Profile Settings
        </h2>
      </div>

      <form onSubmit={handleProfileSave} className="space-y-5 max-w-2xl text-[11px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="dashboard-profile-name" className="form-label mb-1.5">
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
            <label className="form-label mb-1.5">Registered Email Address</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="form-field opacity-60 cursor-not-allowed"
            />
            <span className="text-[9px] text-secondary/50 block mt-1">
              Security Note: Primary login email keys cannot be modified.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label htmlFor="dashboard-profile-phone" className="form-label mb-1.5">
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
            <label className="form-label mb-1.5">Gender Option</label>
            <select
              value={profileForm.gender}
              onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
              className="form-field cursor-pointer"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other / Custom</option>
              <option value="prefer-not-to-say">Prefer Not To Disclose</option>
            </select>
          </div>

          <div className="min-w-0">
            <label htmlFor="dashboard-profile-dob" className="form-label mb-1.5">
              Date Of Birth (DOB)
            </label>
            <input
              id="dashboard-profile-dob"
              type="date"
              autoComplete="bday"
              value={profileForm.dateOfBirth}
              onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
              className="form-field cursor-pointer"
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
