import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/seo/SEO';
import { MandalaArtDecor } from '../components/ui/MandalaArtDecor';

export function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 2000);
  };
  const resetForm = () => {
    setIsSuccess(false);
    setFormData({ name: '', email: '', phone: '', message: '' });
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }} className="min-h-screen bg-[#fcfbf9] text-[#2c2a29] selection:bg-primary/20">
      <SEO
        title="Concierge & Support | Siri Arts & Crafts"
        description="Connect with our master artisans for private consultations and bespoke event curations."
      />

      <section className="pt-24 md:pt-32 pb-32 relative overflow-hidden">
        <MandalaArtDecor 
          className="absolute top-20 -right-20 opacity-[0.03] pointer-events-none" 
          size={500} 
        />
        <MandalaArtDecor 
          className="absolute bottom-20 -left-20 opacity-[0.02] pointer-events-none" 
          size={600} 
        />

        <div className="max-w-[1100px] mx-auto px-6 md:px-12 relative z-10">

          <div className="mb-12">
            <span className="block text-[10px] uppercase tracking-[0.3em] text-primary font-bold mb-4">
              Concierge Desk
            </span>
            <h1
              className="text-[42px] md:text-[56px] leading-[1.05] font-normal text-black"
              style={{ fontFamily: "'EB Garamond', serif" }}
            >
              Let’s architect your <br />
              <em className="not-italic text-primary">celebration.</em>
            </h1>
          </div>

          {/* Two-panel grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[3px]">

            {/* LEFT — Channels */}
            <div className="bg-surface-bright border border-outline-variant/30 rounded-[20px] lg:rounded-r-none p-8 md:p-10 flex flex-col justify-between">
              <div>
                <span className="block text-[10px] uppercase tracking-[0.18em] text-on-surface/40 font-medium mb-6">
                  Direct channels
                </span>

                <div className="divide-y divide-outline-variant/20">
                  {/* WhatsApp */}
                  <div className="flex items-start gap-4 py-5 first:pt-0">
                    <div className="w-9 h-9 rounded-full border border-outline-variant/40 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface/50">
                        <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                        <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
                      </svg>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-[0.14em] text-on-surface/30 font-medium mb-1">
                        WhatsApp
                      </span>
                      <a
                        href="https://wa.me/919876543210"
                        className="block text-[20px] text-on-surface hover:text-on-surface/60 transition-colors"
                        style={{ fontFamily: "'EB Garamond', serif" }}
                      >
                        +91 98765 43210
                      </a>
                      <p className="text-[12px] text-on-surface/40 mt-0.5">Immediate artisan guidance</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-4 py-5">
                    <div className="w-9 h-9 rounded-full border border-outline-variant/40 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface/50">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-[0.14em] text-on-surface/30 font-medium mb-1">
                        Email
                      </span>
                      <a
                        href="mailto:studio@siriarts.com"
                        className="block text-[20px] text-on-surface hover:text-on-surface/60 transition-colors"
                        style={{ fontFamily: "'EB Garamond', serif" }}
                      >
                        studio@siriarts.com
                      </a>
                      <p className="text-[12px] text-on-surface/40 mt-0.5">Briefs & international inquiries</p>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-4 py-5 last:pb-0">
                    <div className="w-9 h-9 rounded-full border border-outline-variant/40 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface/50">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-[0.14em] text-on-surface/30 font-medium mb-1">
                        Studio
                      </span>
                      <p
                        className="text-[18px] text-on-surface/70 leading-[1.5]"
                        style={{ fontFamily: "'EB Garamond', serif" }}
                      >
                        Jubilee Hills, Road No. 45<br />
                        Hyderabad, TS 500033
                      </p>
                      <a
                        href="https://www.google.com/maps/search/?api=1&query=Jubilee+Hills+Road+No+45+Hyderabad+TS+500033"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 text-[10px] uppercase tracking-[0.14em] text-on-surface/40 hover:text-on-surface/70 transition-colors border-b border-outline-variant/30 pb-px"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        </svg>
                        Get directions
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hours badge */}
              <div className="mt-8">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 border border-outline-variant/30 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-[10px] uppercase tracking-[0.12em] text-on-surface/40">
                    Open 10 am — 8 pm
                  </span>
                </div>
              </div>
            </div>

            {/* LEFT — Channels */}
            <div className="bg-white border border-black/5 rounded-[32px] lg:rounded-r-none p-8 md:p-12 flex flex-col justify-between shadow-sm">
              <div>
                <span className="block text-[10px] uppercase tracking-[0.3em] text-primary font-bold mb-8">
                  Direct channels
                </span>

                <div className="divide-y divide-black/5">
                  {/* WhatsApp */}
                  <div className="flex items-start gap-5 py-6 first:pt-0">
                    <div className="w-10 h-10 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-primary text-[20px]">chat</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-[0.2em] text-black/30 font-bold mb-1">
                        Instant Briefing
                      </span>
                      <a
                        href="https://wa.me/919876543210"
                        className="block text-[22px] text-black hover:text-primary transition-colors leading-none"
                        style={{ fontFamily: "'EB Garamond', serif" }}
                      >
                        +91 98765 43210
                      </a>
                      <p className="text-[12px] text-black/40 mt-1.5 font-light">Immediate artisan guidance</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-5 py-6">
                    <div className="w-10 h-10 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-primary text-[20px]">mail</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-[0.2em] text-black/30 font-bold mb-1">
                        Formal Registry
                      </span>
                      <a
                        href="mailto:studio@siriarts.com"
                        className="block text-[22px] text-black hover:text-primary transition-colors leading-none"
                        style={{ fontFamily: "'EB Garamond', serif" }}
                      >
                        studio@siriarts.com
                      </a>
                      <p className="text-[12px] text-black/40 mt-1.5 font-light">Briefs & international inquiries</p>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-5 py-6 last:pb-0">
                    <div className="w-10 h-10 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase tracking-[0.2em] text-black/30 font-bold mb-1">
                        Studio Sanctuary
                      </span>
                      <p
                        className="text-[20px] text-black/80 leading-[1.4] mb-2"
                        style={{ fontFamily: "'EB Garamond', serif" }}
                      >
                        Jubilee Hills, Road No. 45<br />
                        Hyderabad, TS 500033
                      </p>
                      <a
                        href="https://www.google.com/maps/search/?api=1&query=Jubilee+Hills+Road+No+45+Hyderabad+TS+500033"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary font-bold hover:text-black transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">directions</span>
                        Get directions
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hours badge */}
              <div className="mt-10">
                <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-primary/5 rounded-full border border-primary/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-bold">
                    Studio Open — 10 am to 8 pm
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT — Form */}
            <div className="bg-white border border-black/5 rounded-[32px] lg:rounded-l-none p-8 md:p-12 shadow-sm relative overflow-hidden">
              <AnimatePresence mode="wait">
                {!isSuccess ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="block text-[10px] uppercase tracking-[0.3em] text-primary font-bold mb-8">
                      Inquiry brief
                    </span>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <FormField
                          label="Name"
                          type="text"
                          placeholder="Full name"
                          required
                          value={formData.name}
                          onChange={(v) => setFormData({ ...formData, name: v })}
                        />
                        <FormField
                          label="Email"
                          type="email"
                          placeholder="your@email.com"
                          required
                          value={formData.email}
                          onChange={(v) => setFormData({ ...formData, email: v })}
                        />
                      </div>

                      <FormField
                        label="Phone / WhatsApp"
                        type="tel"
                        placeholder="+91 00000 00000"
                        value={formData.phone}
                        onChange={(v) => setFormData({ ...formData, phone: v })}
                      />

                      <div>
                        <label className="block text-[10px] uppercase tracking-[0.2em] text-black/40 font-bold mb-3 ml-1">
                          Occasion & Vision
                        </label>
                        <textarea
                          required
                          placeholder="Describe the occasion, date, and your design aspirations…"
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          className="w-full bg-[#fcfbf9] border border-black/5 rounded-2xl px-6 py-5 text-black text-[13px] outline-none focus:border-primary/30 focus:bg-white transition-all resize-none min-h-[140px] placeholder:text-black/20 shadow-sm"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-5 bg-black hover:bg-primary text-white text-[11px] uppercase tracking-[0.4em] font-bold rounded-full transition-all disabled:opacity-40 shadow-md hover:shadow-xl flex items-center justify-center gap-3 group"
                      >
                        {isSubmitting ? 'Dispatching...' : (
                          <>
                            <span>Dispatch Inquiry</span>
                            <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center justify-center text-center py-16 space-y-5"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                      <span className="material-symbols-outlined text-primary text-[32px]">auto_awesome</span>
                    </div>
                    <div>
                      <h2
                        className="text-[36px] font-normal text-black mb-3"
                        style={{ fontFamily: "'EB Garamond', serif" }}
                      >
                        Brief received.
                      </h2>
                      <p className="text-[13px] text-black/50 leading-relaxed max-w-[320px] mx-auto font-light">
                        Our master curators are reviewing your vision and will reach out within 24 hours to schedule an artisanal session.
                      </p>
                    </div>
                    <button
                      onClick={resetForm}
                      className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold hover:text-black transition-colors border-b border-primary/20 hover:border-black pb-1 mt-6"
                    >
                      Send another inquiry
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}

function FormField({ label, type, placeholder, required, value, onChange }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.2em] text-black/40 font-bold mb-3 ml-1">
        {label}
      </label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#fcfbf9] border border-black/5 rounded-2xl px-6 py-4 text-black text-[13px] outline-none focus:border-primary/30 focus:bg-white transition-all placeholder:text-black/20 shadow-sm"
      />
    </div>
  );
}