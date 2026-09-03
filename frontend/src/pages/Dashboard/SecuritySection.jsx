import { useState, useEffect } from 'react';
import {
  Mail,
  Smartphone,
  Shield,
  LogOut,
  Loader2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { useGoogleIdentity } from '../../hooks/useGoogleIdentity';
import { useAuth } from '../../context/AuthContext';
import { Skeleton } from '../../components/ui';
import api from '../../services/api';
import toast from 'react-hot-toast';

export function SecuritySection() {
  const { user, refreshUser } = useAuth();
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [linkingProvider, setLinkingProvider] = useState(null);

  // Phone linking state
  const [phoneToLink, setPhoneToLink] = useState('');
  const [phoneChallenge, setPhoneChallenge] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [isLinkingPhone, setIsLinkingPhone] = useState(false);

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
    if (!phoneToLink || phoneToLink.length < 10) return;
    try {
      setLinkingProvider('phone-request');
      const res = await api.post('/auth/link/phone/request', { phone: phoneToLink });
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
      setPhoneToLink('');
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

  const getProviderIcon = (name) => {
    if (name === 'email') return <Mail className="text-secondary" size={20} />;
    if (name === 'phone') return <Smartphone className="text-secondary" size={20} />;
    if (name === 'google')
      return (
        <div className="w-5 h-5 bg-gray-100 flex items-center justify-center rounded-full text-[10px] font-bold text-gray-600">
          G
        </div>
      );
    return <Shield className="text-secondary" size={20} />;
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl lg:text-3xl text-on-surface mb-2 tracking-tight">
          Login & Security
        </h1>
        <p className="text-secondary text-[13px] lg:text-sm max-w-2xl">
          Manage your connected accounts, active sessions, and security preferences.
        </p>
      </div>

      {/* Connected Accounts */}
      <div className="bg-surface-bright border border-outline-variant/40 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-surface-container bg-surface-container-low/30">
          <h2 className="font-semibold text-on-surface text-[14px]">Connected Login Methods</h2>
        </div>

        <div className="p-5 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : (
            <div className="space-y-4">
              {['email', 'google', 'phone'].map((providerType) => {
                const linked = providers.find((p) => p.provider === providerType);

                return (
                  <div
                    key={providerType}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-outline-variant/30 rounded-xl hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1">{getProviderIcon(providerType)}</div>
                      <div>
                        <h3 className="font-bold text-sm text-on-surface capitalize">
                          {providerType}
                        </h3>
                        {linked ? (
                          <div className="text-[12px] text-secondary mt-1">
                            Connected as{' '}
                            <span className="font-semibold text-on-surface-variant">
                              {linked.identifier}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[12px] text-secondary mt-1">Not connected</div>
                        )}
                      </div>
                    </div>

                    <div>
                      {linked ? (
                        <button
                          onClick={() => handleUnlink(providerType)}
                          disabled={linkingProvider !== null}
                          className="px-4 py-2 border border-error/30 text-error hover:bg-error/5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                        >
                          {linkingProvider === providerType ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            'Disconnect'
                          )}
                        </button>
                      ) : providerType === 'google' ? (
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
                      ) : providerType === 'phone' ? (
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                          {!isLinkingPhone ? (
                            <form onSubmit={handlePhoneRequest} className="flex gap-2">
                              <input
                                type="tel"
                                placeholder="Phone number"
                                value={phoneToLink}
                                onChange={(e) => setPhoneToLink(e.target.value)}
                                className="px-3 py-2 border border-outline-variant/50 rounded-lg text-sm w-full sm:w-40"
                              />
                              <button
                                type="submit"
                                disabled={linkingProvider === 'phone-request' || !phoneToLink}
                                className="bg-primary text-white px-4 py-2 text-[11px] font-bold uppercase rounded-lg cursor-pointer hover:bg-primary-dark transition-colors shrink-0"
                              >
                                {linkingProvider === 'phone-request' ? (
                                  <Loader2 className="animate-spin" size={14} />
                                ) : (
                                  'Connect'
                                )}
                              </button>
                            </form>
                          ) : (
                            <form onSubmit={handlePhoneVerify} className="flex gap-2">
                              <input
                                type="text"
                                placeholder="6-digit OTP"
                                maxLength={6}
                                value={phoneOtp}
                                onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                                className="px-3 py-2 border border-outline-variant/50 rounded-lg text-sm w-full sm:w-32"
                              />
                              <button
                                type="submit"
                                disabled={
                                  linkingProvider === 'phone-verify' || phoneOtp.length !== 6
                                }
                                className="bg-primary text-white px-4 py-2 text-[11px] font-bold uppercase rounded-lg cursor-pointer hover:bg-primary-dark transition-colors shrink-0"
                              >
                                {linkingProvider === 'phone-verify' ? (
                                  <Loader2 className="animate-spin" size={14} />
                                ) : (
                                  'Verify'
                                )}
                              </button>
                            </form>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-surface-bright border border-outline-variant/40 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-surface-container bg-surface-container-low/30">
          <h2 className="font-semibold text-on-surface text-[14px]">Two-Factor Authentication</h2>
        </div>
        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex gap-4">
            <div
              className={`mt-1 p-2 rounded-full ${user?.twoFactorEnabled ? 'bg-green-100 text-green-600' : 'bg-surface-container text-secondary'}`}
            >
              {user?.twoFactorEnabled ? <ShieldCheck size={20} /> : <Shield size={20} />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-on-surface">Authenticator App</h3>
              <p className="text-[12px] text-secondary mt-1 max-w-sm">
                Add an extra layer of security to your account by requiring a code from your
                authenticator app when you log in.
              </p>
            </div>
          </div>
          <div className="shrink-0 pt-2 sm:pt-0">
            {/* Note: Full 2FA setup is usually a modal with QR code. Using a placeholder button here for UI completeness as requested */}
            {user?.twoFactorEnabled ? (
              <span className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 text-[11px] font-bold uppercase tracking-wider rounded-lg">
                Enabled
              </span>
            ) : (
              <button
                onClick={() =>
                  toast('Two-Factor Authentication setup will be available in the next update.', {
                    icon: '🚧',
                  })
                }
                className="px-4 py-2 border border-outline-variant/50 hover:border-primary text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                Set Up 2FA
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-surface-bright border border-outline-variant/40 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-surface-container bg-surface-container-low/30">
          <h2 className="font-semibold text-on-surface text-[14px]">Active Sessions</h2>
        </div>
        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex gap-4">
            <div className="mt-1 p-2 rounded-full bg-orange-100 text-orange-600">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-on-surface">Log out of all devices</h3>
              <p className="text-[12px] text-secondary mt-1 max-w-sm">
                If you suspect your account has been compromised, you can log out of all sessions
                across all devices immediately.
              </p>
            </div>
          </div>
          <div className="shrink-0 pt-2 sm:pt-0">
            <button
              onClick={handleLogoutAll}
              className="flex items-center gap-2 px-4 py-2 bg-error/10 text-error hover:bg-error/20 border border-error/20 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              Logout All Devices
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
