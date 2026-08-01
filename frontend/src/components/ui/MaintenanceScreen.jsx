import { Wrench, Mail } from 'lucide-react';
import React from 'react';
import { m } from 'framer-motion';
import { Link } from 'react-router-dom';
import { SiriLogo } from './SiriLogo';
import { MandalaElement } from './MandalaElement';
import { useConfig } from '../../context/ConfigContext';

export function MaintenanceScreen() {
  const { storeSettings } = useConfig();

  const whatsappNumber = storeSettings?.contact?.whatsappNumber || '+91 98660 06648';
  const email = storeSettings?.contact?.email || 'Sirisha.atmakuri@gmail.com';
  const instagram = storeSettings?.contact?.instagram || 'https://instagram.com/siriarts';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.6, staggerChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', damping: 20, stiffness: 100 },
    },
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-5">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] aspect-square">
          <MandalaElement className="w-full h-full text-primary" />
        </div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] aspect-square">
          <MandalaElement className="w-full h-full text-primary" />
        </div>
      </div>

      <m.div
        className="w-full max-w-2xl mx-auto z-10 flex flex-col items-center text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <m.div variants={itemVariants} className="mb-12">
          <SiriLogo size="48px" />
        </m.div>

        <m.div variants={itemVariants} className="relative mb-8">
          <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center relative">
            <m.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30"
            />
            <Wrench className="text-[48px] text-primary" strokeWidth={1.5} />
          </div>
        </m.div>

        <m.h1
          variants={itemVariants}
          className="text-3xl lg:text-5xl font-display font-semibold text-on-surface mb-4"
        >
          We're polishing things up!
        </m.h1>

        <m.p
          variants={itemVariants}
          className="text-lg text-on-surface-variant max-w-lg mx-auto mb-12"
        >
          Our store is temporarily down for maintenance as we improve your shopping experience.
          We'll be back shortly. Thank you for your patience!
        </m.p>

        <m.div variants={itemVariants} className="flex flex-col items-center gap-6 w-full">
          <p className="text-sm font-medium text-on-surface-variant uppercase tracking-wider">
            Need to reach us?
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-surface-variant hover:bg-surface-variant-hover text-on-surface transition-colors duration-200"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                alt="WhatsApp"
                className="w-5 h-5"
              />
              <span>WhatsApp Us</span>
            </a>

            <a
              href={`mailto:${email}`}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-surface-variant hover:bg-surface-variant-hover text-on-surface transition-colors duration-200"
            >
              <Mail className="text-[20px] text-primary" strokeWidth={1.5} />
              <span>Email Us</span>
            </a>

            <a
              href={instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-surface-variant hover:bg-surface-variant-hover text-on-surface transition-colors duration-200"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg"
                alt="Instagram"
                className="w-5 h-5"
              />
              <span>Instagram</span>
            </a>
          </div>
        </m.div>

        {/* Hidden Admin backdoor for easy access if someone knows it */}
        <m.div
          variants={itemVariants}
          className="mt-16 opacity-0 hover:opacity-100 transition-opacity"
        >
          <Link
            to="/auth"
            className="text-xs text-on-surface-variant/50 hover:text-primary transition-colors"
          >
            Admin Access
          </Link>
        </m.div>
      </m.div>
    </div>
  );
}
