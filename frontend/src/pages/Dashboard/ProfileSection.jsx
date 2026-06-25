import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { userService } from '../../services/domainServices';
import toast from 'react-hot-toast';

export function ProfileSection() {
  const { user, checkAuth } = useDashboard();

  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone || '',
        gender: user.gender || '',
        dateOfBirth: user.dateOfBirth || '',
      });
    }
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      toast.error('Full name cannot be blank');
      return;
    }
    setIsUpdatingProfile(true);
    try {
      const res = await userService.updateProfile(profileForm);
      if (res.success) {
        toast.success('Profile information updated successfully!');
        await checkAuth();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile details');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

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
      <div className="py-5">
        <div className="pb-5 mb-5 border-b border-outline-variant/20">
          <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[12px]">person</span>
            Profile Settings
          </h2>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4 max-w-2xl text-[11px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
