import { Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MandalaElement } from '../ui/MandalaElement';
import { SiriLogo } from '../ui/SiriLogo';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';
import { CONTACT_EMAIL, SOCIAL_INSTAGRAM, SOCIAL_PINTEREST } from '../../constants/brandEnv';
import { useQuery } from '@tanstack/react-query';
import storeSettingsService from '../../services/api/storeSettingsService';
import { policyService } from '../../services/domainServices';

export function Footer() {
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

  const logoText = navigation?.logo?.text || 'SIRI ARTS & CRAFTS';
  const logoWords = logoText.split(' ');
  const _firstWord = logoWords[0] || 'SIRI';
  const _restWords = logoWords.slice(1).join(' ') || 'ARTS & CRAFTS';
  const currentYear = new Date().getFullYear();

  const phone = settings?.general?.supportPhone || contact?.phone || footer?.phone || '';
  const email = settings?.general?.supportEmail || contact?.email || footer?.email || CONTACT_EMAIL;

  const instagramLink =
    settings?.social?.instagramUrl || footer?.socialLinks?.instagram || SOCIAL_INSTAGRAM;
  const pinterestLink =
    settings?.social?.pinterestUrl || footer?.socialLinks?.pinterest || SOCIAL_PINTEREST;

  const businessName = settings?.general?.storeName || 'Siri Arts & Crafts';

  // Dynamic CMS Link Mappings
  const exploreLinks =
    footer?.exploreLinks?.length > 0
      ? footer.exploreLinks
      : [
          { label: 'Collections', href: '/collections' },
          { label: 'Events', href: '/events' },
          { label: 'Gallery', href: '/gallery' },
        ];

  const studioLinks =
    footer?.studioLinks?.length > 0
      ? footer.studioLinks
      : [
          { label: 'Our Story', href: '/about' },
          { label: 'Custom Orders', href: '/custom-orders' },
          { label: 'Contact', href: '/contact' },
        ];

  const policyLinks =
    footer?.policyLinks?.length > 0
      ? footer.policyLinks
      : policies.map((p) => ({ label: p.title, href: `/policy/${p.slug}` }));

  const trustBadges =
    footer?.trustBadges?.length > 0
      ? footer.trustBadges
      : [
          { label: 'Secure Checkout', icon: 'lock' },
          { label: '100% Handcrafted', icon: 'draw' },
          { label: 'Fast Delivery', icon: 'local_shipping' },
          { label: 'Simple Returns', icon: 'refresh' },
        ];

  return (
    <footer className="w-full relative bg-gradient-to-b from-surface to-secondary-container/10 border-t border-black/5 overflow-hidden">
      {/* Background Depth & Glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 opacity-[0.02] pointer-events-none">
        <MandalaElement size={400} duration={180} variant={2} skipFade={true} />
      </div>

      <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop pt-6 pb-[calc(var(--bottom-nav-height)+24px)] lg:pb-10 relative z-10">
        {/* Brand Soul - Left Aligned */}
        <div className="flex flex-col items-start text-left mb-5.5 lg:mb-7">
          <Link to="/" className="group flex items-center mb-4">
            <SiriLogo size="32px" />
          </Link>
          <p className="font-body text-on-surface-variant/80 max-w-sm leading-relaxed font-light text-[11px] lg:px-0">
            {footer?.description || 'Ancient craftsmanship meets modern elegance.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-gutter">
          {/* Navigation Matrix - 3 Columns on Mobile */}
          <div className="col-span-1 lg:col-span-8 grid grid-cols-3 gap-x-2 gap-y-6 lg:gap-x-4">
            <div className="flex flex-col space-y-2.5">
              <h4 className="font-label-sm text-primary uppercase tracking-[0.1em] font-bold text-[10px]">
                Explore
              </h4>
              <nav className="flex flex-col space-y-2">
                {exploreLinks.map((link, idx) => (
                  <Link
                    key={idx}
                    className="text-[10px] lg:text-[11px] text-on-surface-variant/70 hover:text-primary transition-colors"
                    to={link.href || '#'}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex flex-col space-y-2.5">
              <h4 className="font-label-sm text-primary uppercase tracking-[0.1em] font-bold text-[10px]">
                Studio
              </h4>
              <nav className="flex flex-col space-y-2">
                {studioLinks.map((link, idx) => (
                  <Link
                    key={idx}
                    className="text-[10px] lg:text-[11px] text-on-surface-variant/70 hover:text-primary transition-colors"
                    to={link.href || '#'}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex flex-col space-y-2.5 col-span-1">
              <h4 className="font-label-sm text-primary uppercase tracking-[0.1em] font-bold text-[10px]">
                Support
              </h4>
              <div className="flex flex-col space-y-2 text-[10px] text-on-surface-variant/70 leading-relaxed font-medium">
                <div className="flex flex-col">
                  <a
                    href={`tel:${phone.startsWith('+') ? phone : '+91' + phone}`}
                    className="hover:text-primary transition-colors whitespace-nowrap"
                  >
                    {phone.startsWith('+91') ? phone : `+91 ${phone}`}
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
          <div className="col-span-1 lg:col-span-4 flex flex-col gap-3.5 lg:items-start lg:items-end">
            <div className="flex items-center gap-2 lg:gap-3.5">
              {instagramLink && (
                <a
                  aria-label="Instagram"
                  className="text-on-surface-variant/50 hover:text-primary transition-all flex items-center justify-center gap-1.5 min-w-[40px] min-h-[40px]"
                  href={instagramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Camera className="font-light text-[16px]" strokeWidth={1.5} />
                  <span className="font-label-sm text-[10px] uppercase tracking-widest font-bold">
                    Insta
                  </span>
                </a>
              )}
              {pinterestLink && (
                <a
                  aria-label="Pinterest"
                  className="text-on-surface-variant/50 hover:text-primary transition-all flex items-center justify-center gap-1.5 min-w-[40px] min-h-[40px]"
                  href={pinterestLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="material-symbols-outlined font-light text-[16px]">push_pin</span>
                  <span className="font-label-sm text-[10px] uppercase tracking-widest font-bold">
                    Pin
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Trust Signals Strip */}
        <div className="mt-8 pt-6 border-t border-black/5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {trustBadges.map((badge, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[12px] text-primary">
                    {badge.icon || badge.href || 'star'}
                  </span>
                </div>
                <span className="font-label-sm text-[10px] text-on-surface-variant/70 uppercase tracking-[0.15em] font-bold">
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Editorial Bar */}
        <div className="mt-6 pt-4 border-t border-black/5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 text-left">
          <div className="flex flex-col gap-1">
            <p className="font-label-sm text-on-surface-variant/50 tracking-[0.1em] text-[9px] uppercase font-bold">
              {footer?.copyright?.replace('{year}', currentYear.toString()) ||
                `© ${currentYear} ${businessName}.`}
            </p>
          </div>
          <div className="flex items-center flex-wrap gap-4">
            {policyLinks.map((link, idx) => (
              <Link
                key={idx}
                to={link.href || '#'}
                className="font-label-sm text-on-surface-variant/50 text-[9px] uppercase tracking-widest hover:text-on-surface"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
