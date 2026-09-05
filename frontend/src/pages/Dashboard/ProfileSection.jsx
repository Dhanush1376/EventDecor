import { User, Save, Mail, Smartphone, Loader2, ShieldCheck } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { userService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { useGoogleIdentity } from '../../hooks/useGoogleIdentity';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export function ProfileSection() {
  const { user: dashboardUser, checkAuth } = useDashboard();
  const { user, refreshUser } = useAuth();

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    gender: '',
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Security state
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [linkingProvider, setLinkingProvider] = useState(null);

  // Phone linking state
  const [phoneToLink, setPhoneToLink] = useState('');
  const [phoneChallenge, setPhoneChallenge] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [isLinkingPhone, setIsLinkingPhone] = useState(false);

  useEffect(() => {
    if (dashboardUser) {
      setProfileForm({
        name: dashboardUser.name || '',
        phone: dashboardUser.phone || '',
        gender: dashboardUser.gender || '',
      });
      if (dashboardUser.phone && !phoneToLink) {
        setPhoneToLink(dashboardUser.phone);
      }
    }
  }, [dashboardUser, phoneToLink]);

  const fetchProviders = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/auth/link/providers');
      if (res.data.success) {
        setProviders(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load linked accounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleGoogleSuccess = async (credential) => {
    try {
      setLinkingProvider('google');
      await api.post('/auth/link/google', { credential });
      toast.success('Google account linked successfully');
      fetchProviders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to link Google account');
    } finally {
      setLinkingProvider(null);
    }
  };

  const { isReady, triggerLogin, renderGoogleButton } = useGoogleIdentity(
    handleGoogleSuccess,
    () => {
      toast.error('Google sign-in failed');
      setLinkingProvider(null);
    },
  );

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

  const handleUnlink = async (providerName) => {
    try {
      if (providers.length <= 1) {
        toast.error('Cannot remove your only login method');
        return;
      }
      setLinkingProvider(providerName);
      await api.delete(`/auth/link/${providerName}`);
      toast.success(`${providerName} disconnected successfully`);
      fetchProviders();
      refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disconnect account');
    } finally {
      setLinkingProvider(null);
    }
  };

  const handlePhoneRequest = async (e) => {
    e.preventDefault();
    const targetPhone = phoneToLink || profileForm.phone;
    if (!targetPhone || targetPhone.length < 10) return;
    try {
      setLinkingProvider('phone-request');
      const res = await api.post('/auth/link/phone/request', { phone: targetPhone });
      setPhoneChallenge(res.data.data.challengeId);
      setIsLinkingPhone(true);
      toast.success('Verification code sent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send code');
    } finally {
      setLinkingProvider(null);
    }
  };

  const handlePhoneVerify = async (e) => {
    e.preventDefault();
    if (phoneOtp.length !== 6) return;
    try {
      setLinkingProvider('phone-verify');
      await api.post('/auth/link/phone/verify', { challengeId: phoneChallenge, otp: phoneOtp });
      toast.success('Phone number linked successfully');
      setIsLinkingPhone(false);
      setPhoneOtp('');
      fetchProviders();
      refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
    } finally {
      setLinkingProvider(null);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await api.post('/auth/logout-all');
      toast.success('Logged out from all devices');
      window.location.href = '/';
    } catch (err) {
      toast.error('Failed to logout from all devices');
    }
  };

  const googleLinked = providers.find((p) => p.provider === 'google');
  const phoneLinked = providers.find((p) => p.provider === 'phone');

  return (
    <motion.div
      id="panel-profile"
      role="tabpanel"
      key="tab-profile"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 text-left pb-10"
    >
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs font-body mb-4">
        <div className="pb-4 mb-5 border-b border-outline-variant/20">
          <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
            <User className="text-[14px]" strokeWidth={1.5} />
            Profile Settings
          </h2>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-6 max-w-2xl text-[11px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
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
                className="form-field w-full"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="form-label mb-0 flex items-center gap-2">
                  Registered Email Address
                  {googleLinked && (
                    <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase flex items-center gap-1">
                      <ShieldCheck size={10} /> Google Connected
                    </span>
                  )}
                </label>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    disabled
                    value={dashboardUser?.email || ''}
                    className="form-field opacity-60 cursor-not-allowed w-full pl-8"
                  />
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary w-4 h-4" />
                </div>

                {!isLoading &&
                  (googleLinked ? (
                    <button
                      type="button"
                      onClick={() => handleUnlink('google')}
                      disabled={linkingProvider !== null}
                      className="px-3 py-0 border border-error/30 text-error hover:bg-error/5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {linkingProvider === 'google' ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  ) : (
                    <div className="shrink-0 h-[42px] overflow-hidden rounded-lg">
                      <div className="scale-[0.85] origin-top-left -mt-[3px]">
                        <GoogleSignInButton
                          onClick={() => {
                            setLinkingProvider('google');
                            triggerLogin();
                          }}
                          isLoading={linkingProvider === 'google'}
                          disabled={!isReady || linkingProvider !== null}
                          renderGoogleButton={isReady ? renderGoogleButton : null}
                          label="Connect Google"
                        />
                      </div>
                    </div>
                  ))}
              </div>
              <span className="text-[9px] text-secondary/50 block mt-1">
                Security Note: Primary login email keys cannot be modified.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="dashboard-profile-phone"
                  className="form-label mb-0 flex items-center gap-2"
                >
                  Mobile Number
                  {phoneLinked && (
                    <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase flex items-center gap-1">
                      <ShieldCheck size={10} /> Verified
                    </span>
                  )}
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="dashboard-profile-phone"
                      type="tel"
                      autoComplete="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="form-field w-full pl-8"
                      placeholder="e.g. 9876543210"
                      disabled={!!phoneLinked}
                    />
                    <Smartphone className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary w-4 h-4" />
                  </div>

                  {!isLoading &&
                    (phoneLinked ? (
                      <button
                        type="button"
                        onClick={() => handleUnlink('phone')}
                        disabled={linkingProvider !== null}
                        className="px-3 py-0 border border-error/30 text-error hover:bg-error/5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        {linkingProvider === 'phone' ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    ) : (
                      !isLinkingPhone && (
                        <button
                          type="button"
                          onClick={handlePhoneRequest}
                          disabled={linkingProvider === 'phone-request' || !profileForm.phone}
                          className="px-3 py-0 border border-primary/30 text-primary hover:bg-primary/5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap shrink-0"
                        >
                          {linkingProvider === 'phone-request' ? 'Sending...' : 'Verify'}
                        </button>
                      )
                    ))}
                </div>

                {isLinkingPhone && (
                  <div className="flex gap-2 items-center bg-surface-container-low p-2 rounded border border-outline-variant/30">
                    <input
                      type="text"
                      placeholder="6-digit OTP"
                      maxLength={6}
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                      className="form-field !py-1.5 !px-2 w-full text-[10px]"
                    />
                    <button
                      type="button"
                      onClick={handlePhoneVerify}
                      disabled={linkingProvider === 'phone-verify' || phoneOtp.length !== 6}
                      className="bg-primary text-white px-3 py-1.5 text-[9px] font-bold uppercase rounded-md cursor-pointer hover:bg-primary-dark transition-colors shrink-0"
                    >
                      {linkingProvider === 'phone-verify' ? (
                        <Loader2 className="animate-spin inline-block" size={12} />
                      ) : (
                        'Verify OTP'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 pb-6 flex justify-end border-b border-outline-variant/20 mb-6">
            <button
              disabled={isUpdatingProfile}
              type="submit"
              className="bg-[#2A2927] hover:bg-black text-white px-6 py-3 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center gap-2 shadow-lg transition-all border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingProfile ? (
                <div className="skeleton-box inline-block w-4 h-4 rounded-md" />
              ) : (
                <>
                  <Save className="text-[16px]" strokeWidth={1.5} />
                  <span>COMMIT PROFILE UPDATES</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
