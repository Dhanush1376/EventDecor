import { m as motion, AnimatePresence } from 'framer-motion';
import { MandalaElement } from '../components/ui/MandalaElement';
import { SEO } from '../components/seo/SEO';
import { ContactSkeleton } from '../components/ui/Skeleton';
import { useState, useEffect } from 'react';
import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { inquiryService } from '../services/domainServices';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import storeSettingsService from '../services/api/storeSettingsService';
import { MOTION_PRESETS, EASE, DURATION } from '../constants/design-tokens';
import { useCategories } from '../hooks/useProductQueries';
import { useAuth } from '../context/AuthContext';

import logger from '../utils/core/logger';

import GPSMap from './GPSMapLazy';

export function Contact() {
  const { contact, loading } = useWebsiteContent();
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['storeSettings', 'public'],
    queryFn: () => storeSettingsService.getPublicSettings(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: categories = [] } = useCategories();

  const { user } = useAuth();

  const [formState, setFormState] = useState('idle'); // idle, sending, success
  const [formData, setFormData] = useState({
    name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || '' : '',
    email: user?.email || '',
    phone: user?.phone || '',
    subject: 'General Inquiry',
    message: '',
  });
  const [otherSubject, setOtherSubject] = useState('');

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name:
          prev.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormState('sending');

    const finalSubject = formData.subject === 'Other' ? `Other: ${otherSubject}` : formData.subject;

    try {
      const response = await inquiryService.create({ ...formData, subject: finalSubject });
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
        setOtherSubject('');
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
      value: contact?.address || '#28-1-92, South Street, ONGOLE-523001',
      icon: 'location_on',
      link:
        contact?.mapEmbed ||
        'https://www.google.com/maps/place/Siri+Arts+%26+Crafts/@15.5024512,80.0450481,17z/data=!3m1!4b1!4m6!3m5!1s0x3a4b01495510d675:0xe98014cae349dbea!8m2!3d15.502446!4d80.047623!16s%2Fg%2F11scb6jg5_',
      target: '_blank',
    },
    {
      title: 'WhatsApp Us',
      value: contact?.phone || '+91 98660 06648',
      icon: 'forum',
      link: contact?.whatsapp || 'https://wa.me/919866006648',
      target: '_blank',
    },
    {
      title: 'Email Us',
      value: contact?.email || 'Sirisha.atmakuri@gmail.com',
      icon: 'mail',
      link: `mailto:${contact?.email || 'Sirisha.atmakuri@gmail.com'}`,
      target: '_self',
    },
    {
      title: 'Call Us',
      value: contact?.phone || '+91 98660 06648',
      icon: 'phone',
      link: `tel:${contact?.phone || '+91 98660 06648'}`,
      target: '_self',
    },
    {
      title: 'Support Hours',
      value: contact?.businessHours || 'Mon - Sat: 10 AM - 7 PM',
      icon: 'schedule',
      link: '#',
      target: '_self',
    },
  ];

  if (loading || settingsLoading) return <ContactSkeleton />;

  return (
    <div className="bg-[var(--color-surface-ivory)] min-h-screen pt-24 lg:pt-32 pb-20 relative overflow-hidden selection:bg-primary/20">
      <SEO
        title="Contact Us | Siri Arts"
        description="Connect with our design studio for bespoke heritage decor consultations and curated event masteries."
      />

      {/* Atmospheric Background Decor */}
      <MandalaElement
        className="absolute top-20 -right-40 opacity-[0.04] pointer-events-none"
        size={800}
        duration={150}
      />

      <main className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24 items-start pt-4">
          {/* Left Side: Modern Editorial Content & Leaflet Map */}
          <div className="flex flex-col justify-center md:sticky md:top-24 lg:top-32 lg:pb-32">
            <div className="space-y-4">
              <motion.h1
                {...MOTION_PRESETS.fadeInUp}
                className="font-display text-4xl lg:text-5xl text-on-surface leading-tight"
              >
                Let's Connect.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: DURATION.slow, ease: EASE.smooth }}
                className="font-body text-on-surface-variant/70 text-sm leading-relaxed max-w-sm mb-6"
              >
                Have a question or planning an event? Our team is ready to assist you.
              </motion.p>
            </div>

            {/* Contact Methods (Information Hub) */}
            <div className="flex flex-col gap-2 mb-8 w-full max-w-md">
              {contactMethods.map((method, idx) => (
                <motion.a
                  key={method.title}
                  href={method.link}
                  target={method.target}
                  rel={method.target === '_blank' ? 'noopener noreferrer' : undefined}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.2 + idx * 0.1,
                    duration: DURATION.slow,
                    ease: EASE.smooth,
                  }}
                  className="flex items-center gap-3 p-3 rounded-[16px] border border-outline-variant/10 bg-white/40"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--color-gold)]/10 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[16px] text-[var(--color-gold-dark)]">
                      {method.icon}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-label text-[9px] uppercase tracking-[0.2em] text-secondary font-bold">
                      {method.title}
                    </span>
                    <span className="font-body text-[12px] text-on-surface font-semibold leading-relaxed break-words">
                      {method.value}
                    </span>
                  </div>
                </motion.a>
              ))}
            </div>

            <motion.a
              href={
                contact?.mapEmbed ||
                'https://www.google.com/maps/place/Siri+Arts+%26+Crafts/@15.5024512,80.0450481,17z/data=!3m1!4b1!4m6!3m5!1s0x3a4b01495510d675:0xe98014cae349dbea!8m2!3d15.502446!4d80.047623!16s%2Fg%2F11scb6jg5_'
              }
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: DURATION.slow, ease: EASE.smooth }}
              className="h-48 md:h-60 lg:h-72 w-full max-w-md rounded-[24px] overflow-hidden shadow-sm border border-outline-variant/20 bg-white block relative group cursor-pointer"
            >
              {/* Invisible overlay to block map interactions and capture clicks */}
              <div className="absolute inset-0 z-[1000] bg-transparent" />

              <GPSMap address={{ latitude: '15.502446', longitude: '80.047623' }} />

              {/* Hover indicator */}
              <div className="absolute inset-0 z-[1010] bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                <div className="bg-white/95 backdrop-blur text-black px-5 py-2.5 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  <span>Open in Google Maps</span>
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </div>
              </div>
            </motion.a>
          </div>

          {/* Right Side: Redesigned Luxury Minimalistic Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: DURATION.slow, ease: EASE.smooth }}
            className="relative w-full h-full flex flex-col justify-center"
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
                    Our design studio will review your inquiry and respond within 24 business hours.
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

            <div className="flex items-center gap-2 mb-8 select-none border-b border-outline-variant/20 pb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="font-label text-xs uppercase tracking-[0.25em] text-secondary font-bold">
                Send a Message
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 text-black">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="relative group">
                  <label
                    htmlFor="contact-name"
                    className="form-label mb-1.5 text-[10px] font-semibold text-black"
                  >
                    Your Name <span className="text-error font-bold">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-field py-2.5 px-3 text-[12px] text-black bg-surface focus:ring-2 focus:ring-[var(--color-gold)] focus:border-transparent transition-all"
                  />
                </div>

                <div className="relative group">
                  <label
                    htmlFor="contact-email"
                    className="form-label mb-1.5 text-[10px] font-semibold text-black"
                  >
                    Email Address <span className="text-error font-bold">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-field py-2.5 px-3 text-[12px] text-black bg-surface focus:ring-2 focus:ring-[var(--color-gold)] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="relative group">
                  <label
                    htmlFor="contact-phone"
                    className="form-label mb-1.5 text-[10px] font-semibold text-black"
                    required
                  >
                    Phone
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="form-field py-2.5 px-3 text-[12px] text-black bg-surface focus:ring-2 focus:ring-[var(--color-gold)] focus:border-transparent transition-all"
                  />
                </div>

                <div className="relative group">
                  <label
                    htmlFor="contact-subject"
                    className="form-label mb-1.5 text-[10px] font-semibold text-black"
                  >
                    How can we help you? <span className="text-error font-bold">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="contact-subject"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="form-field cursor-pointer appearance-none !pr-8 py-2.5 px-3 text-[12px] text-black bg-surface focus:ring-2 focus:ring-[var(--color-gold)] focus:border-transparent transition-all"
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="Collaboration">Collaboration</option>
                      <option value="Other">Other</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-black text-[18px]">
                      unfold_more
                    </span>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {formData.subject === 'Other' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="relative group overflow-hidden"
                  >
                    <label
                      htmlFor="contact-other"
                      className="form-label mb-1.5 text-[10px] font-semibold text-black"
                    >
                      Please specify <span className="text-error font-bold">*</span>
                    </label>
                    <input
                      id="contact-other"
                      type="text"
                      required
                      placeholder="Briefly describe your inquiry..."
                      value={otherSubject}
                      onChange={(e) => setOtherSubject(e.target.value)}
                      className="form-field py-2.5 px-3 text-[12px] text-black bg-surface focus:ring-2 focus:ring-[var(--color-gold)] focus:border-transparent transition-all"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative group pt-1">
                <label
                  htmlFor="contact-message"
                  className="form-label mb-1.5 text-[10px] font-semibold text-black"
                >
                  Tell us about your event... <span className="text-error font-bold">*</span>
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={4}
                  placeholder="Share the details, vision, or any specific requests..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="form-field resize-y py-3 px-3 text-[12px] text-black bg-surface focus:ring-2 focus:ring-[var(--color-gold)] focus:border-transparent transition-all"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={formState === 'sending'}
                  className="btn-primary w-full lg:w-auto px-8 py-3 rounded-full font-bold uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 group cursor-pointer"
                >
                  {formState === 'sending' ? (
                    <>
                      <div className="skeleton-box inline-block w-3.5 h-3.5 rounded-md" />
                      Transmitting...
                    </>
                  ) : (
                    <>
                      Send Message
                      <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                        send
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
