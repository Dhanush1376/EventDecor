import { m as motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      const timer = setTimeout(() => {
        setError('Invitation token is missing. Please verify your email link.');
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    const fetchInviteDetails = async () => {
      try {
        const res = await api.get(`/users/team/invite/details?token=${token}`);
        if (res.data?.success) {
          setInvite(res.data.data);
        } else {
          setError('Failed to load invitation details.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired invitation token.');
      } finally {
        setLoading(false);
      }
    };

    fetchInviteDetails();
  }, [token]);

  const handleRespond = async (status) => {
    setActionLoading(true);
    try {
      const res = await api.post('/users/team/invite/respond', { token, status });
      if (res.data?.success) {
        if (status === 'accepted') {
          setSuccessMessage(
            'Welcome aboard! You have successfully accepted the invitation. Your credentials have been authorized.',
          );
          toast.success('Welcome to the team!');
        } else {
          setSuccessMessage('Invitation declined successfully. We appreciate your consideration!');
          toast.success('Invitation declined');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to respond to invitation');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center py-20 px-4">
        <div className="skeleton-box inline-block w-12 h-12 rounded-md" />
        <p className="text-[13px] text-outline font-medium uppercase tracking-widest font-body">
          Authenticating invite key...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center py-20 px-4 font-body">
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        className="max-w-[540px] w-full bg-white rounded-[2.5rem] p-10 lg:p-12 border border-surface-container-highest/60 shadow-xl shadow-primary/5 text-center relative overflow-hidden"
      >
        {/* Decorative Heritage Frame Overlay */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary-container via-primary to-primary-container" />

        {/* Logo/Branding Header */}
        <motion.div variants={fadeUp} className="mb-8">
          <div className="text-[32px] text-primary mb-3 select-none">✦</div>
          <h2 className="text-[28px] font-bold text-on-surface font-display tracking-[0.2em] uppercase leading-none">
            Siri Arts
          </h2>
          <p className="text-[10px] text-outline-variant font-bold tracking-[0.3em] uppercase mt-2">
            Craft & Heritage Studio
          </p>
          <div className="w-12 h-[1px] bg-primary/20 mx-auto mt-4" />
        </motion.div>

        {error ? (
          <motion.div variants={fadeUp} className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-500">
              <span className="material-symbols-outlined text-[32px]">warning</span>
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-on-surface font-display mb-2">
                Invitation Invalid
              </h2>
              <p className="text-[13px] text-outline leading-relaxed">{error}</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="w-full py-4 bg-surface-container-low hover:bg-surface-container-high text-outline hover:text-primary font-bold rounded-2xl text-[12px] uppercase tracking-wider transition-all border border-surface-container-highest/40 cursor-pointer"
            >
              Return to Storefront
            </button>
          </motion.div>
        ) : successMessage ? (
          <motion.div variants={fadeUp} className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
              <span className="material-symbols-outlined text-[32px]">verified</span>
            </div>
            <div>
              <h2 className="text-[20px] font-bold text-on-surface font-display mb-3">
                Response Registered
              </h2>
              <p className="text-[13px] text-outline leading-relaxed">{successMessage}</p>
            </div>

            {successMessage.includes('Welcome aboard') ? (
              <button
                onClick={() => navigate('/admin')}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl text-[12px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-container transition-all cursor-pointer"
              >
                Sign In to Admin Portal
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="w-full py-4 bg-surface-container-low text-outline font-bold rounded-2xl text-[12px] uppercase tracking-wider transition-all cursor-pointer border border-surface-container-highest/40"
              >
                Go to Storefront
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-center mx-auto text-primary shadow-sm">
              <span className="material-symbols-outlined text-[32px]">person_add</span>
            </div>

            <div className="space-y-3">
              <span className="px-3.5 py-1 bg-primary/10 text-primary border border-primary/10 rounded-full text-[10px] font-bold uppercase tracking-wider">
                JOIN THE ATELIER
              </span>
              <h2 className="text-[20px] font-bold text-on-surface font-display leading-tight">
                Join our Creative Team
              </h2>
              <p className="text-[13px] text-outline leading-relaxed px-2">
                You have been invited to join Siri Arts & Crafts as a designated{' '}
                <strong className="text-primary uppercase tracking-wider font-semibold font-mono">
                  {invite?.role}
                </strong>{' '}
                with authorization permissions set to{' '}
                <span className="font-semibold text-on-surface">"{invite?.permissions}"</span>.
              </p>
            </div>

            {/* Email card lock */}
            <div className="bg-[#fcfbf9] border border-surface-container-highest/50 rounded-2xl p-4 text-[12px] font-semibold text-outline-variant font-mono">
              Authorized Email:{' '}
              <span className="text-on-surface font-bold font-sans">{invite?.email}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                disabled={actionLoading}
                onClick={() => handleRespond('declined')}
                className="flex-1 py-4 bg-surface text-outline border border-surface-container-highest hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 font-bold rounded-2xl text-[12px] uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                No, Decline
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleRespond('accepted')}
                className="flex-1 py-4 bg-primary text-white hover:bg-primary-container font-bold rounded-2xl text-[12px] uppercase tracking-wider shadow-lg shadow-primary/15 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading && (
                  <div className="skeleton-box inline-block w-3.5 h-3.5 rounded-md" />
                )}
                Yes, Accept Invite
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
