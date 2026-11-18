import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, ShieldCheck, Sparkles, Truck, RotateCcw, Clock } from 'lucide-react';
import { MandalaElement } from '../ui/MandalaElement';
import { SiriLogo } from '../ui/SiriLogo';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';
import {
  CONTACT_EMAIL,
  SOCIAL_INSTAGRAM,
  SOCIAL_PINTEREST,
  SOCIAL_FACEBOOK,
} from '../../constants/brandEnv';
import { useQuery } from '@tanstack/react-query';
import storeSettingsService from '../../services/api/storeSettingsService';
import { policyService } from '../../services/domainServices';
import { canonicalNavLabel } from '../../seo/seoConfig';
import { useConfig } from '../../context/ConfigContext';
import { BRAND, formatPhoneWithCountryCode, cleanPhoneDigits } from '../../config/brand';

function InstagramIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function PinterestIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.33 1.365-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-.997 2.352-1.492 3.146 1.124.346 2.317.535 3.554.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
  );
}

function WhatsAppIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

function TrustBadgeIcon({ icon }) {
  const iconKey = (icon || '').toLowerCase().trim();
  if (iconKey === 'lock' || iconKey.includes('secure') || iconKey.includes('shield')) {
    return <ShieldCheck className="w-3.5 h-3.5 text-primary" strokeWidth={2} />;
  }
  if (
    iconKey === 'draw' ||
    iconKey.includes('craft') ||
    iconKey.includes('hand') ||
    iconKey.includes('sparkle')
  ) {
    return <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={2} />;
  }
  if (
    iconKey === 'local_shipping' ||
    iconKey.includes('shipping') ||
    iconKey.includes('truck') ||
    iconKey.includes('delivery')
  ) {
    return <Truck className="w-3.5 h-3.5 text-primary" strokeWidth={2} />;
  }
  if (
    iconKey === 'refresh' ||
    iconKey.includes('return') ||
    iconKey.includes('exchange') ||
    iconKey.includes('undo')
  ) {
    return <RotateCcw className="w-3.5 h-3.5 text-primary" strokeWidth={2} />;
  }
  return (
    <span className="material-symbols-outlined text-[14px] text-primary">{icon || 'star'}</span>
  );
}

function SocialIconLink({ href, icon, label }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="w-7 h-7 rounded-full bg-white/80 dark:bg-surface-container-high/60 hover:bg-primary border border-[#b38235]/20 hover:border-primary text-[#735c00] hover:text-white flex items-center justify-center transition-all duration-300 shadow-xs hover:scale-105"
    >
      {icon}
    </a>
  );
}

export function Footer() {
  const {
    storeName,
    storeNameUpper,
    storeTagline,
    cin: configCin,
    supportEmail: configEmail,
    supportPhone: configPhone,
    alternatePhone: configAltPhone,
    storeSettings,
    hideGallerySection: _hideGallerySection,
  } = useConfig();
  const { contact, footer, navigation } = useWebsiteContent();

  const { data: settings } = useQuery({
    queryKey: ['storeSettings', 'public'],
    queryFn: () => storeSettingsService.getPublicSettings(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: policiesResponse } = useQuery({
    queryKey: ['public-policies'],
    queryFn: () => policyService.getPublicPolicies(),
    staleTime: 5 * 60 * 1000,
  });
  const policies = policiesResponse?.data || [];

  const currentYear = new Date().getFullYear();

  const primaryPhone =
    settings?.general?.phone ||
    settings?.contact?.phone ||
    configPhone ||
    contact?.phone ||
    footer?.phone ||
    BRAND.phone;

  const alternatePhone =
    settings?.general?.alternatePhone ||
    settings?.contact?.alternatePhone ||
    configAltPhone ||
    BRAND.alternatePhone;

  const email =
    settings?.general?.supportEmail ||
    settings?.contact?.email ||
    configEmail ||
    contact?.email ||
    footer?.email ||
    BRAND.email ||
    CONTACT_EMAIL;

  const instagramLink =
    settings?.social?.instagramUrl || footer?.socialLinks?.instagram || SOCIAL_INSTAGRAM;
  const pinterestLink =
    settings?.social?.pinterestUrl || footer?.socialLinks?.pinterest || SOCIAL_PINTEREST;
  const facebookLink =
    settings?.social?.facebookUrl || footer?.socialLinks?.facebook || SOCIAL_FACEBOOK;
  const whatsappUrl = BRAND.whatsappUrl;

  const businessName =
    settings?.legal?.legalCompanyName ||
    settings?.legal?.companyName ||
    settings?.general?.storeName ||
    storeName ||
    navigation?.logo?.text ||
    storeNameUpper ||
    'Siri Arts & Crafts';

  const cin = settings?.legal?.cin || configCin || BRAND.cin;

  // Dynamic CMS Link Mappings
  const isExcludedLink = (link) => {
    const href = (link?.href || link?.link || '').toLowerCase().trim();
    const label = (link?.label || '').toLowerCase().trim();
    return (
      href.includes('gallery') ||
      label.includes('gallery') ||
      href.includes('custom-order') ||
      label.includes('custom order') ||
      label === 'bespoke'
    );
  };

  // Footer labels are normalised to the canonical section names (Shop, Events, Our Story,
  // Contact Us) so they match the header, breadcrumbs and page titles.
  const normaliseLink = (link) => ({
    ...link,
    label: canonicalNavLabel(link.href || link.link, link.label),
  });

  const exploreLinks = (
    footer?.exploreLinks?.length > 0
      ? footer.exploreLinks
      : [
          { label: 'Shop', href: '/collections' },
          { label: 'Events', href: '/events' },
        ]
  )
    .filter((link) => !isExcludedLink(link))
    .map(normaliseLink);

  const studioLinks = (
    footer?.studioLinks?.length > 0
      ? footer.studioLinks
      : [
          { label: 'Our Story', href: '/about' },
          { label: 'Contact Us', href: '/contact' },
        ]
  )
    .filter((link) => !isExcludedLink(link))
    .map(normaliseLink);

  const defaultPolicyLinks = [
    { label: 'Shipping Policy', href: '/policy/shipping-policy' },
    { label: 'Terms and Conditions', href: '/policy/terms-and-conditions' },
    { label: 'Refund Policy', href: '/policy/refund-policy' },
    { label: 'Exchange Policy', href: '/policy/exchange-policy' },
    { label: 'Privacy Policy', href: '/policy/privacy-policy' },
    { label: 'Return Policy', href: '/policy/return-policy' },
  ];

  const policyLinks =
    footer?.policyLinks?.length > 0
      ? footer.policyLinks
      : policies.length > 0
        ? policies.map((p) => ({ label: p.title, href: `/policy/${p.slug}` }))
        : defaultPolicyLinks;

  const trustBadges =
    footer?.trustBadges?.length > 0
      ? footer.trustBadges
      : [
          { label: 'Secure Checkout', icon: 'lock' },
          { label: '100% Handcrafted', icon: 'draw' },
          { label: 'Fast Delivery', icon: 'local_shipping' },
          { label: 'Simple Returns', icon: 'refresh' },
        ];

  const hasSocials = Boolean(instagramLink || facebookLink || pinterestLink || whatsappUrl);

  const headingStyle = { fontFamily: 'var(--font-body, Inter, sans-serif)' };

  return (
    <footer className="w-full relative bg-gradient-to-b from-surface to-secondary-container/10 border-t border-[#b38235]/15 overflow-hidden">
      {/* Subtle Background Glow & Heritage Watermark */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 opacity-[0.025] pointer-events-none">
        <MandalaElement size={340} duration={180} variant={2} skipFade={true} />
      </div>

      <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop pt-4.5 sm:pt-6 pb-[calc(var(--bottom-nav-height,65px)+var(--safe-area-bottom,0px)+16px)] lg:pb-8 relative z-10">
        {/* Main Matrix: Single Responsive Grid (No container boxes) */}
        <div className="grid grid-cols-2 sm:grid-cols-12 gap-x-4 gap-y-4 sm:gap-6 lg:gap-8 items-start">
          {/* Brand Column (Full width on mobile/tablet, 4 cols on desktop) */}
          <div className="col-span-2 sm:col-span-12 lg:col-span-4 flex flex-col items-start">
            <div className="w-full flex items-center justify-between gap-3 mb-1 sm:mb-2">
              <Link to="/" className="group flex items-center" aria-label={`${businessName} Home`}>
                <SiriLogo size="30px" />
              </Link>

              {/* Mobile/Tablet Inline Social Badges */}
              {hasSocials && (
                <div className="flex items-center gap-1.5 lg:hidden">
                  <SocialIconLink
                    href={instagramLink}
                    icon={<InstagramIcon className="w-3.5 h-3.5" />}
                    label="Instagram"
                  />
                  <SocialIconLink
                    href={facebookLink}
                    icon={<FacebookIcon className="w-3.5 h-3.5" />}
                    label="Facebook"
                  />
                  <SocialIconLink
                    href={pinterestLink}
                    icon={<PinterestIcon className="w-3.5 h-3.5" />}
                    label="Pinterest"
                  />
                  {whatsappUrl && (
                    <SocialIconLink
                      href={whatsappUrl}
                      icon={<WhatsAppIcon className="w-3.5 h-3.5" />}
                      label="WhatsApp Concierge"
                    />
                  )}
                </div>
              )}
            </div>

            <p className="font-body text-on-surface-variant/75 max-w-sm leading-relaxed font-light text-[11px] lg:text-[11.5px]">
              {footer?.description ||
                storeTagline ||
                settings?.general?.tagline ||
                'Ancient craftsmanship meets modern elegance.'}
            </p>

            {/* Desktop Social Badges */}
            {hasSocials && (
              <div className="hidden lg:flex items-center gap-2 mt-3.5">
                <SocialIconLink
                  href={instagramLink}
                  icon={<InstagramIcon className="w-3.5 h-3.5" />}
                  label="Instagram"
                />
                <SocialIconLink
                  href={facebookLink}
                  icon={<FacebookIcon className="w-3.5 h-3.5" />}
                  label="Facebook"
                />
                <SocialIconLink
                  href={pinterestLink}
                  icon={<PinterestIcon className="w-3.5 h-3.5" />}
                  label="Pinterest"
                />
                {whatsappUrl && (
                  <SocialIconLink
                    href={whatsappUrl}
                    icon={<WhatsAppIcon className="w-3.5 h-3.5" />}
                    label="WhatsApp Concierge"
                  />
                )}
              </div>
            )}
          </div>

          {/* Quick Links: Explore */}
          <div className="col-span-1 sm:col-span-3 lg:col-span-2 flex flex-col space-y-2">
            <h4
              style={headingStyle}
              className="!font-sans text-primary uppercase tracking-[0.14em] font-bold text-[10.5px]"
            >
              Explore
            </h4>
            <nav className="flex flex-col space-y-1.5" aria-label="Explore Links">
              {exploreLinks.map((link, idx) => (
                <Link
                  key={idx}
                  className="text-[11px] font-medium text-on-surface-variant/75 hover:text-primary hover:translate-x-0.5 transition-all py-0.5"
                  to={link.href || '#'}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Quick Links: Studio */}
          <div className="col-span-1 sm:col-span-3 lg:col-span-2 flex flex-col space-y-2">
            <h4
              style={headingStyle}
              className="!font-sans text-primary uppercase tracking-[0.14em] font-bold text-[10.5px]"
            >
              Studio
            </h4>
            <nav className="flex flex-col space-y-1.5" aria-label="Studio Links">
              {studioLinks.map((link, idx) => (
                <Link
                  key={idx}
                  className="text-[11px] font-medium text-on-surface-variant/75 hover:text-primary hover:translate-x-0.5 transition-all py-0.5"
                  to={link.href || '#'}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Concierge & Support Column (No container, natural layout) */}
          <div className="col-span-2 sm:col-span-6 lg:col-span-4 flex flex-col space-y-2">
            <div className="flex items-center justify-between lg:justify-start gap-2">
              <h4
                style={headingStyle}
                className="!font-sans text-primary uppercase tracking-[0.14em] font-bold text-[10.5px] flex items-center gap-1.5"
              >
                <Phone className="w-3 h-3 text-primary shrink-0" />
                Support & Inquiries
              </h4>
              <span className="text-[9.5px] text-on-surface-variant/50 font-normal lg:hidden">
                {BRAND.supportHours || 'Mon - Sat, 10 AM to 6 PM'}
              </span>
            </div>

            <div className="flex flex-col space-y-1.5 text-[11px] text-on-surface-variant/80 font-medium">
              {/* Phone Numbers */}
              <div className="flex items-center gap-3 flex-wrap">
                {primaryPhone && (
                  <a
                    href={`tel:${cleanPhoneDigits(primaryPhone)}`}
                    className="hover:text-primary transition-colors whitespace-nowrap inline-flex items-center gap-1 text-[11px]"
                  >
                    {formatPhoneWithCountryCode(primaryPhone)}
                  </a>
                )}
                {alternatePhone &&
                  formatPhoneWithCountryCode(alternatePhone) !==
                    formatPhoneWithCountryCode(primaryPhone) && (
                    <a
                      href={`tel:${cleanPhoneDigits(alternatePhone)}`}
                      className="hover:text-primary transition-colors whitespace-nowrap text-on-surface-variant/65 inline-flex items-center gap-1 text-[10.5px]"
                      title="Alternate support number"
                    >
                      {formatPhoneWithCountryCode(alternatePhone)}
                    </a>
                  )}
              </div>

              {/* Email */}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="hover:text-primary transition-colors inline-flex items-center gap-1.5 truncate max-w-full text-[11px]"
                >
                  <Mail className="w-3 h-3 text-primary shrink-0" />
                  <span className="truncate">{email}</span>
                </a>
              )}

              {/* Desktop Support Hours */}
              <p className="hidden lg:flex items-center gap-1.5 text-[10px] text-on-surface-variant/50 pt-0.5">
                <Clock className="w-3 h-3 text-primary/60 shrink-0" />
                <span>{BRAND.supportHours || 'Mon - Sat, 10 AM to 6 PM'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Trust Badges Strip: 1 Single Line Scrolling (No container box) */}
        <div className="w-full my-3 sm:my-4 py-2 border-y border-black/5 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex items-center gap-5 sm:gap-7 min-w-max lg:min-w-0 lg:w-full lg:justify-between px-1">
            {trustBadges.map((badge, idx) => (
              <div key={idx} className="flex items-center gap-2 shrink-0 select-none">
                <div className="w-5.5 h-5.5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <TrustBadgeIcon icon={badge.icon || badge.href} />
                </div>
                <span
                  style={headingStyle}
                  className="!font-sans text-[9.5px] sm:text-[10px] text-on-surface-variant/85 uppercase tracking-[0.1em] font-bold whitespace-nowrap"
                >
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Editorial Bar */}
        <div className="pt-2.5 flex flex-col md:flex-row items-center justify-between gap-2.5 text-center md:text-left">
          {/* Copyright & CIN Notice */}
          <div className="flex items-center flex-wrap justify-center md:justify-start gap-x-2 gap-y-0.5 text-[9.5px] sm:text-[10px] text-on-surface-variant/60 font-medium">
            <span>
              {footer?.copyright?.replace('{year}', currentYear.toString()) ||
                `© ${currentYear} ${businessName}. All rights reserved.`}
            </span>
            {cin && (
              <span className="inline-flex items-center gap-1 text-on-surface-variant/45 whitespace-nowrap">
                <span className="text-[8px] select-none" aria-hidden="true">
                  •
                </span>
                <span>
                  CIN: <span className="font-mono text-on-surface-variant/60">{cin}</span>
                </span>
              </span>
            )}
          </div>

          {/* Legal Policy Links */}
          <nav
            aria-label="Legal & Policies"
            className="flex items-center flex-wrap justify-center md:justify-end gap-x-2.5 sm:gap-x-3.5 gap-y-1 text-[9.5px] sm:text-[10.5px]"
          >
            {policyLinks.map((link, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <span
                    className="text-on-surface-variant/30 text-[8px] select-none"
                    aria-hidden="true"
                  >
                    •
                  </span>
                )}
                <Link
                  to={link.href || '#'}
                  className="text-on-surface-variant/65 hover:text-primary transition-colors tracking-wide font-medium whitespace-nowrap"
                >
                  {link.label}
                </Link>
              </React.Fragment>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
