import { m as motion, AnimatePresence } from 'framer-motion';
import { MandalaElement } from '../components/ui/MandalaElement';
import { SEO } from '../components/seo/SEO';
import { Link } from 'react-router-dom';
import { ContactSkeleton } from '../components/ui/Skeleton';
import { useState } from 'react';
import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { inquiryService } from '../services/domainServices';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import storeSettingsService from '../services/api/storeSettingsService';
import { MOTION_PRESETS, EASE, DURATION } from '../constants/design-tokens';

import logger from '../utils/core/logger';

export function Contact() {
  const { contact, loading } = useWebsiteContent();
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['storeSettings', 'public'],
    queryFn: () => storeSettingsService.getPublicSettings(),
    staleTime: 10 * 60 * 1000,
  });

  const [formState, setFormState] = useState('idle'); // idle, sending, success
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormState('sending');

    try {
      const response = await inquiryService.create(formData);
      if (response.success) {
        setFormState('success');
        toast.success('Inquiry sent successfully!');
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: 'General Inquiry',
          message: '',
        });
      } else {
        setFormState('idle');
        toast.error('Failed to send inquiry. Please try again.');
      }
    } catch (err) {
      logger.error(err);
      setFormState('idle');
      toast.error('An error occurred. Please try again.');
    }
  };

  const contactMethods = [
    {
      title: 'Studio Address',
      value:
        settings?.contact?.address || contact?.address || '#28-1-92, South Street, ONGOLE-523001',
      icon: 'location_on',
      link: settings?.contact?.googleMapsUrl || '#',
    },
    {
      title: 'Email Us',
      value: settings?.contact?.email || contact?.email || 'support@siriartsandcrafts.com',
      icon: 'mail',
      link: `mailto:${settings?.contact?.email || contact?.email || 'support@siriartsandcrafts.com'}`,
    },
    {
      title: 'Call Us',
      value: settings?.contact?.phone || contact?.phone || '+91 9999999999',
      icon: 'phone',
      link: `tel:${settings?.contact?.phone || contact?.phone || '+91 9999999999'}`,
    },
    {
      title: 'Support Hours',
      value: settings?.contact?.supportHours || 'Mon - Sat, 10 AM to 6 PM',
      icon: 'schedule',
      link: '#',
    },
  ];

  if (loading || settingsLoading) return <ContactSkeleton />;

  return (
    <div className="bg-[var(--color-surface-ivory)] min-h-screen pt-24 md:pt-32 pb-20 relative overflow-hidden selection:bg-primary/20">
      <SEO
        title="Concierge | Siri Arts"
        description="Connect with our design studio for bespoke heritage decor consultations and curated event masteries."
      />

      {/* Atmospheric Background Decor */}
      <MandalaElement
        className="absolute top-20 -right-40 opacity-[0.04] pointer-events-none"
        size={800}
        duration={150}
      />
      <MandalaElement
        className="absolute bottom-20 -left-40 opacity-[0.03] pointer-events-none"
        size={1000}
        variant={2}
        duration={200}
      />

      <main className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop relative z-10">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-3 font-label text-[10px] md:text-[12px] uppercase tracking-[0.3em] text-on-surface-variant/40 font-bold mb-12">
          <Link to="/" className="hover:text-primary transition-colors">
            Studio
          </Link>
          <span className="opacity-30">/</span>
          <span className="text-on-surface font-bold">Concierge</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          {/* Left Side: Editorial Content */}
          <div className="space-y-12">
            <div className="space-y-6">
              <motion.span
                {...MOTION_PRESETS.fadeIn}
                className="font-label-sm text-[12px] text-primary uppercase tracking-[0.4em] font-bold block"
              >
                Connect with our Studio
              </motion.span>
              <motion.h1
                {...MOTION_PRESETS.fadeInUp}
                className="font-display text-4xl md:text-6xl text-on-surface leading-[1.1]"
              >
                Let's Curate Your <br />
                <span>Masterpiece.</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: DURATION.slow, ease: EASE.smooth }}
                className="font-body text-on-surface-variant/70 text-lg leading-relaxed max-w-lg"
              >
                Whether you're planning a grand royal wedding or a sacred intimate pooja, our studio
                is dedicated to weaving your vision into a heritage reality.
              </motion.p>
            </div>

            {/* Contact Methods Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-outline-variant/30">
              {contactMethods.map((method, idx) => (
                <motion.a
                  key={method.title}
                  href={method.link}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.2 + idx * 0.1,
                    duration: DURATION.slow,
                    ease: EASE.smooth,
                  }}
                  className="group block space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-[20px] group-hover:scale-110 transition-transform">
                      {method.icon}
                    </span>
                    <span className="form-label !mb-0 !ml-0">{method.title}</span>
                  </div>
                  <p className="font-display text-xl text-on-surface group-hover:text-primary transition-colors">
                    {method.value}
                  </p>
                </motion.a>
              ))}
            </div>
          </div>

          {/* Right Side: Redesigned Luxury Minimalistic Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: DURATION.slow, ease: EASE.smooth }}
            className="relative w-full"
          >
            {/* Success Overlay */}
            <AnimatePresence>
              {formState === 'success' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-white/95 backdrop-blur-md z-50 flex flex-col items-center justify-center text-center p-8 rounded-[32px]"
                >
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-primary text-3xl">
                      check_circle
                    </span>
                  </div>
                  <h2 className="font-display text-2xl text-on-surface mb-3 tracking-tight">
                    Message Received
                  </h2>
                  <p className="font-body text-on-surface-variant/70 text-xs mb-8 max-w-[260px] leading-relaxed">
                    Our design concierge will review your inquiry and respond within 24 business
                    hours.
                  </p>
                  <button
                    onClick={() => setFormState('idle')}
                    className="btn-minimal text-[10px] tracking-widest uppercase font-bold"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 mb-8 select-none">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="font-label text-[9px] uppercase tracking-[0.25em] text-primary font-bold">
                Studio Concierge
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative group">
                  <label htmlFor="contact-name" className="form-label mb-1.5">
                    Your Name <span className="text-error font-normal">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-field"
                  />
                </div>

                <div className="relative group">
                  <label htmlFor="contact-email" className="form-label mb-1.5">
                    Email Address <span className="text-error font-normal">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative group">
                  <label htmlFor="contact-phone" className="form-label mb-1.5">
                    Phone (Optional)
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="form-field"
                  />
                </div>

                <div className="relative group">
                  <label htmlFor="contact-subject" className="form-label mb-1.5">
                    Inquiry Nature
                  </label>
                  <div className="relative">
                    <select
                      id="contact-subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="form-field cursor-pointer appearance-none !pr-8"
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Wedding Decoration">Wedding Decoration</option>
                      <option value="Pooja Setup">Pooja Setup</option>
                      <option value="Custom Product Order">Custom Product Order</option>
                      <option value="Collaboration">Collaboration</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-secondary text-[14px]">
                      unfold_more
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative group">
                <label htmlFor="contact-message" className="form-label mb-1.5">
                  Your Vision <span className="text-error font-normal">*</span>
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={4}
                  placeholder="Tell us about your event or project..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="form-field resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={formState === 'sending'}
                className="btn-primary w-full py-3 rounded-full font-bold uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 group cursor-pointer mt-4"
              >
                {formState === 'sending' ? (
                  <>
                    <div className="skeleton-box inline-block w-3.5 h-3.5 rounded-md" />
                    Transmitting...
                  </>
                ) : (
                  <>
                    Submit Inquiry
                    <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                      trending_flat
                    </span>
                  </>
                )}
              </button>
              <p className="text-center font-body text-[10px] text-on-surface-variant/40 italic">
                By submitting, you agree to our privacy policy and boutique terms.
              </p>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
