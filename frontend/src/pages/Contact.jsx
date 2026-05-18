import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MandalaElement } from "../components/ui/MandalaElement";
import { SEO } from "../components/seo/SEO";
import { Link } from "react-router-dom";
import { useWebsiteContent } from "../hooks/useWebsiteContent";
import { inquiryService } from "../services/domainServices";

export function Contact() {
  const { contact } = useWebsiteContent();
  const [formState, setFormState] = useState("idle"); // idle, sending, success
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "General Inquiry",
    message: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormState("sending");

    try {
      const response = await inquiryService.create(formData);
      if (response.success) {
        setFormState("success");
        setFormData({
          name: "",
          email: "",
          phone: "",
          subject: "General Inquiry",
          message: "",
        });
      } else {
        setFormState("idle");
        alert("Failed to send inquiry. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setFormState("idle");
      alert("An error occurred. Please try again.");
    }
  };

  const contactMethods = contact?.contactMethods || [];
  const studioHours = contact?.studioHours || [];

  return (
    <div className="bg-[#fcfbf9] min-h-screen pt-24 md:pt-32 pb-20 relative overflow-hidden selection:bg-primary/20">
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-label-sm text-[12px] text-primary uppercase tracking-[0.4em] font-bold block"
              >
                Connect with our Studio
              </motion.span>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-4xl md:text-6xl text-on-surface leading-[1.1]"
              >
                Let's Curate Your <br />
                <span className="italic">Masterpiece.</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-body text-on-surface-variant/70 text-lg leading-relaxed max-w-lg"
              >
                Whether you're planning a grand royal wedding or a sacred
                intimate pooja, our studio is dedicated to weaving your vision
                into a heritage reality.
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
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  className="group block space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-[20px] group-hover:scale-110 transition-transform">
                      {method.icon}
                    </span>
                    <span className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant/40 font-bold">
                      {method.title}
                    </span>
                  </div>
                  <p className="font-display text-xl text-on-surface group-hover:text-primary transition-colors">
                    {method.value}
                  </p>
                </motion.a>
              ))}
            </div>

            {/* Studio Hours */}
            <div className="p-8 bg-surface-container-low rounded-[2rem] border border-outline-variant/30">
              <span className="font-label-sm text-[10px] uppercase tracking-widest text-primary font-bold block mb-4">
                Studio Availability
              </span>
              <div className="space-y-2">
                {studioHours.map((hour, idx) => (
                  <div key={idx} className="flex justify-between font-body text-[14px]">
                    <span className="text-on-surface-variant">
                      {hour.days}
                    </span>
                    <span className="text-on-surface font-medium">
                      {hour.hours}
                    </span>
                  </div>
                ))}
                <div className="pt-2 text-[12px] text-on-surface-variant/50 italic">
                  *Sunday by prior appointment only.
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Contact Form Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-luxury border border-outline-variant/20 relative overflow-hidden"
          >
            {/* Success Overlay */}
            <AnimatePresence>
              {formState === "success" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center text-center p-8"
                >
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-primary text-4xl">
                      check_circle
                    </span>
                  </div>
                  <h2 className="font-display text-3xl text-on-surface mb-4">
                    Message Received.
                  </h2>
                  <p className="font-body text-on-surface-variant/70 mb-8 max-w-xs">
                    Our design concierge will review your inquiry and respond
                    within 24 business hours.
                  </p>
                  <button
                    onClick={() => setFormState("idle")}
                    className="btn-minimal"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold ml-4">
                    Your Name
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Full Name"
                    className="w-full bg-[#f8f7f4] border-none rounded-2xl px-6 py-4 font-body text-[15px] focus:ring-2 focus:ring-primary/20 transition-all"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold ml-4">
                    Digital Mail
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="email@example.com"
                    className="w-full bg-[#f8f7f4] border-none rounded-2xl px-6 py-4 font-body text-[15px] focus:ring-2 focus:ring-primary/20 transition-all"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold ml-4">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+91"
                    className="w-full bg-[#f8f7f4] border-none rounded-2xl px-6 py-4 font-body text-[15px] focus:ring-2 focus:ring-primary/20 transition-all"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold ml-4">
                    Inquiry Nature
                  </label>
                  <select
                    className="w-full bg-[#f8f7f4] border-none rounded-2xl px-6 py-4 font-body text-[15px] focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                  >
                    <option>General Inquiry</option>
                    <option>Wedding Decoration</option>
                    <option>Pooja Setup</option>
                    <option>Custom Product Order</option>
                    <option>Collaboration</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold ml-4">
                  Your Vision
                </label>
                <textarea
                  required
                  rows="4"
                  placeholder="Tell us about your event or project..."
                  className="w-full bg-[#f8f7f4] border-none rounded-2xl px-6 py-4 font-body text-[15px] focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={formState === "sending"}
                className="w-full bg-on-surface-variant text-surface py-5 rounded-2xl font-label text-[12px] uppercase tracking-[0.3em] shadow-luxury hover:bg-primary transition-all flex items-center justify-center gap-3 disabled:opacity-50 group"
              >
                {formState === "sending" ? (
                  <>
                    <span className="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin"></span>
                    Transmitting...
                  </>
                ) : (
                  <>
                    Submit Inquiry
                    <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                      trending_flat
                    </span>
                  </>
                )}
              </button>
              <p className="text-center font-body text-[11px] text-on-surface-variant/40 italic">
                By submitting, you agree to our privacy policy and boutique
                terms.
              </p>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
