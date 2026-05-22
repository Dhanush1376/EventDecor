import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/domainServices';
import { toast } from 'react-hot-toast';

export const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('credentials');
  const [pendingUserId, setPendingUserId] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [setupUri, setSetupUri] = useState('');
  const { adminLogin, completeAdminLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/admin';

  const finishLogin = async (response) => {
    await completeAdminLogin(response.data);
    toast.success('Admin authenticated successfully.');
    navigate(from, { replace: true });
  };

  const handleCredentials = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const result = await adminLogin(email, password);
      if (result?.requires2FA) {
        setPendingUserId(result.userId);
        setStep('2fa');
        return;
      }
      if (result?.requires2FASetup) {
        setPendingUserId(result.userId);
        const setup = await authService.adminSetup2FA(result.userId);
        setSetupUri(setup.data?.otpauthUrl || '');
        setStep('setup');
        toast('Enroll two-factor authentication to access the admin panel.', { icon: '🔐' });
        return;
      }
      if (result === true) {
        toast.success('Admin authenticated successfully.');
        navigate(from, { replace: true });
      }
    } catch (err) {
      toast.error(err.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    if (!totpCode || totpCode.length < 6) {
      toast.error('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    try {
      const response = await authService.adminVerify2FA(pendingUserId, totpCode);
      await finishLogin(response);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Invalid authenticator code');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async (e) => {
    e.preventDefault();
    if (!totpCode || totpCode.length < 6) {
      toast.error('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    try {
      const response = await authService.adminEnable2FA(pendingUserId, totpCode);
      await finishLogin(response);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not enable 2FA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-stone-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-display font-light text-stone-900 tracking-tight">
            Siri Arts <span className="font-semibold text-primary">Studio</span>
          </h2>
          <p className="mt-2 text-center text-sm text-stone-600 tracking-widest uppercase">
            Secure Admin Portal
          </p>
        </div>

        {step === 'credentials' && (
          <form className="mt-8 space-y-6" onSubmit={handleCredentials}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 uppercase tracking-wider mb-1">Admin Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-3 border border-stone-300 placeholder-stone-400 text-stone-900 rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="admin@siriartsandcrafts.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 uppercase tracking-wider mb-1">Master Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-3 border border-stone-300 placeholder-stone-400 text-stone-900 rounded-lg focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In Securely'}
            </button>
          </form>
        )}

        {step === '2fa' && (
          <form className="mt-8 space-y-6" onSubmit={handleVerify2FA}>
            <p className="text-sm text-stone-600 text-center">Enter the code from your authenticator app.</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-3 border border-stone-300 rounded-lg text-center tracking-widest text-lg"
              placeholder="000000"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
          </form>
        )}

        {step === 'setup' && (
          <form className="mt-8 space-y-6" onSubmit={handleEnable2FA}>
            <p className="text-sm text-stone-600 text-center">
              Two-factor authentication is required for all admin accounts. Add this key to your authenticator app, then enter the 6-digit code.
            </p>
            {setupUri && (
              <p className="text-xs break-all bg-stone-50 p-3 rounded border border-stone-200 text-stone-700">
                {setupUri}
              </p>
            )}
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-3 border border-stone-300 rounded-lg text-center tracking-widest text-lg"
              placeholder="000000"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Enabling...' : 'Enable 2FA & Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
