import React from "react";
import { Link } from "react-router-dom";
import { MandalaElement } from "../ui/MandalaElement";
import { useWebsiteContent } from "../../hooks/useWebsiteContent";

export function Footer() {
  const { contact, footer, navigation } = useWebsiteContent();
  const logoText = navigation?.logo?.text || "SIRI ARTS & CRAFTS";
  const logoWords = logoText.split(" ");
  const firstWord = logoWords[0] || "SIRI";
  const restWords = logoWords.slice(1).join(" ") || "ARTS & CRAFTS";
  const currentYear = new Date().getFullYear();
  const phone = contact?.phone || "9866006648";
  const email = contact?.email || "Sirisha.atmakuri@gmail.com";
  const instagramLink = footer?.socialLinks?.instagram || "https://instagram.com/siriarts";
  const pinterestLink = footer?.socialLinks?.pinterest || "https://pinterest.com/siriarts";

  return (
    <footer className="w-full relative bg-gradient-to-b from-surface to-secondary-container/10 border-t border-black/5 overflow-hidden">
      {/* Background Depth & Glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 opacity-[0.02] pointer-events-none">
        <MandalaElement size={400} duration={180} variant={2} skipFade={true} />
      </div>

      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop pt-6 pb-32 md:pb-10 relative z-10">
        {/* Brand Soul - Left Aligned */}
        <div className="flex flex-col items-start text-left mb-5.5 md:mb-7">
          <Link to="/" className="group flex items-center gap-3 mb-4">
            {navigation?.logo?.image ? (
              <img
                src={navigation.logo.image}
                alt={logoText}
                className="w-8 h-8 rounded-full object-cover shadow-sm transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-on-surface flex items-center justify-center shadow-lg border border-white/5 transition-transform group-hover:scale-105 duration-300">
                <span className="font-display font-bold text-[12px] text-white">
                  {firstWord[0]}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="font-display text-[18px] md:text-[20px] text-on-surface font-bold tracking-[0.05em]">
                {firstWord}
              </span>
              <span className="font-display text-[18px] md:text-[20px] text-primary font-bold tracking-[0.05em]">
                {restWords ? ` ${restWords}` : ""}
              </span>
              <div className="w-1 h-1 rounded-full bg-primary-container animate-pulse" />
            </div>
          </Link>
          <p className="font-body text-black/40 max-w-sm leading-relaxed font-light text-[11px] md:px-0">
            {footer?.description || "Ancient craftsmanship meets modern elegance."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6 md:gap-gutter">
          {/* Navigation Matrix - 3 Columns on Mobile */}
          <div className="col-span-1 md:col-span-6 lg:col-span-8 grid grid-cols-3 gap-x-2 gap-y-6 md:gap-x-4">
            <div className="flex flex-col space-y-2.5">
              <h4 className="font-label-sm text-primary uppercase tracking-[0.1em] font-bold text-[10px]">
                Explore
              </h4>
              <nav className="flex flex-col space-y-2">
                <Link
                  className="text-[10px] md:text-[11px] text-black/50 hover:text-primary transition-colors"
                  to="/collections"
                >
                  Collections
                </Link>
                <Link
                  className="text-[10px] md:text-[11px] text-black/50 hover:text-primary transition-colors"
                  to="/events"
                >
                  Events
                </Link>
                <Link
                  className="text-[10px] md:text-[11px] text-black/50 hover:text-primary transition-colors"
                  to="/gallery"
                >
                  Gallery
                </Link>
              </nav>
            </div>
            <div className="flex flex-col space-y-2.5">
              <h4 className="font-label-sm text-primary uppercase tracking-[0.1em] font-bold text-[10px]">
                Studio
              </h4>
              <nav className="flex flex-col space-y-2">
                <Link
                  className="text-[10px] md:text-[11px] text-black/50 hover:text-primary transition-colors"
                  to="/about"
                >
                  Our Story
                </Link>
                <Link
                  className="text-[10px] md:text-[11px] text-black/50 hover:text-primary transition-colors"
                  to="/custom-orders"
                >
                  Bespoke
                </Link>
                <Link
                  className="text-[10px] md:text-[11px] text-black/50 hover:text-primary transition-colors"
                  to="/contact"
                >
                  Contact
                </Link>
              </nav>
            </div>
            <div className="flex flex-col space-y-2.5 col-span-1">
              <h4 className="font-label-sm text-primary uppercase tracking-[0.1em] font-bold text-[10px]">
                Support
              </h4>
              <div className="flex flex-col space-y-2 text-[10px] text-black/40 leading-relaxed font-medium">
                <div className="flex flex-col">
                  <a
                    href={`tel:${phone}`}
                    className="hover:text-primary transition-colors whitespace-nowrap"
                  >
                    +91 {phone.replace("+91", "").trim()}
                  </a>
                </div>
                <a
                  href={`mailto:${email}`}
                  className="hover:text-primary transition-colors break-words"
                >
                  {email}
                </a>
              </div>
            </div>
          </div>

          {/* Social Presence */}
          <div className="col-span-1 md:col-span-6 lg:col-span-4 flex flex-col gap-3.5 md:items-start lg:items-end">
            <div className="flex items-center gap-2 md:gap-3.5">
              <a
                aria-label="Instagram"
                className="text-black/30 hover:text-primary transition-all flex items-center justify-center gap-1.5 min-w-[40px] min-h-[40px]"
                href={instagramLink}
                target="_blank"
                rel="noreferrer"
              >
                <span className="material-symbols-outlined font-light text-[16px]">
                  photo_camera
                </span>
                <span className="font-label-sm text-[10px] uppercase tracking-widest font-bold">
                  Insta
                </span>
              </a>
              <a
                aria-label="Pinterest"
                className="text-black/30 hover:text-primary transition-all flex items-center justify-center gap-1.5 min-w-[40px] min-h-[40px]"
                href={pinterestLink}
                target="_blank"
                rel="noreferrer"
              >
                <span className="material-symbols-outlined font-light text-[16px]">
                  push_pin
                </span>
                <span className="font-label-sm text-[10px] uppercase tracking-widest font-bold">
                  Pin
                </span>
              </a>
              <a
                aria-label="Email"
                className="text-black/30 hover:text-primary transition-all flex items-center justify-center gap-1.5 min-w-[40px] min-h-[40px]"
                href={`mailto:${email}`}
              >
                <span className="material-symbols-outlined font-light text-[16px]">
                  mail
                </span>
                <span className="font-label-sm text-[10px] uppercase tracking-widest font-bold">
                  Email
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Editorial Bar */}
        <div className="mt-6 pt-4 border-t border-black/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-left">
          <p className="font-label-sm text-black/20 tracking-[0.1em] text-[11px] uppercase font-bold">
            © {currentYear} Siri Arts & Crafts.
          </p>
          <div className="flex items-center gap-4">
            <Link
              to="/privacy"
              className="font-label-sm text-black/20 text-[11px] uppercase tracking-widest hover:text-black"
            >
              Privacy
            </Link>
            <Link
              to="/returns"
              className="font-label-sm text-black/20 text-[11px] uppercase tracking-widest hover:text-black"
            >
              Returns
            </Link>
            <Link
              to="/shipping"
              className="font-label-sm text-black/20 text-[11px] uppercase tracking-widest hover:text-black"
            >
              Shipping
            </Link>
            <Link
              to="/terms"
              className="font-label-sm text-black/20 text-[11px] uppercase tracking-widest hover:text-black"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
