import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { maintenanceService } from '../../services/api/maintenanceService';
import { useMaintenanceSession } from '../hooks/useMaintenanceSession';
import { useAuth } from '../../context/AuthContext';
import { SiriLogo } from '../../components/ui/SiriLogo';

export function MaintenanceGateway() {
  const [step, setStep] = useState(1); // 1: Credentials, 2: OTP
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { saveSession } = useMaintenanceSession();
  const auth = useAuth();
  const navigate = useNavigate();

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please enter email and password');

    setLoading(true);
    try {
      await maintenanceService.authenticate(email, password);
      toast.success('OTP sent to your email');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter 6-digit OTP');

    setLoading(true);
    try {
      const res = await maintenanceService.verifyOtp(email, otp);
      if (res.success && res.data) {
        saveSession(res.data.maintenanceToken, res.data.expiresAt);
        // Also log in standard auth
        if (res.data.token && res.data.user) {
          auth.login(res.data.user, res.data.token, res.data.refreshToken);
        }
        toast.success('Secure session established');
        navigate('/admin/maintenance-console');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-red-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#141414]/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl shadow-black/50"
        >
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4 opacity-80 grayscale invert">
              <SiriLogo size="40px" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest mb-4">
              <span className="material-symbols-outlined text-[14px]">gpp_maybe</span>
              System Maintenance
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 font-display">Secure Gateway</h1>
            <p className="text-white/50 text-sm">Authorized Super Admin access only</p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <m.form
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleCredentialsSubmit}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-1.5">
                    Super Admin Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors"
                    placeholder="admin@siriarts.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-black font-bold py-3 rounded-lg mt-6 hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                  ) : (
                    <>
                      Verify Identity
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </m.form>
            ) : (
              <m.form
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleOtpSubmit}
                className="space-y-4 text-center"
              >
                <p className="text-white/80 text-sm mb-6">
                  We sent a 6-digit verification code to
                  <br />
                  <strong className="text-white">{email}</strong>
                </p>
                <div>
                  <input
                    type="text"
                    maxLength="6"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-4 text-white text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-red-500/50 transition-colors font-mono"
                    placeholder="000000"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-red-600 text-white font-bold py-3 rounded-lg mt-6 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">lock_open</span>
                      Establish Session
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-white/40 hover:text-white mt-4 transition-colors"
                >
                  ← Back to login
                </button>
              </m.form>
            )}
          </AnimatePresence>
        </m.div>
      </div>
    </div>
  );
}
