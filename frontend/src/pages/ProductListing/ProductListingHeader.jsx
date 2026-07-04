import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PromoBanner } from '../../components/ui';
import { CloudinaryImage } from '../../components/ui/CloudinaryImage';
import { MandalaArtDecor } from '../../components/ui/MandalaArtDecor';

export const CountdownPromo = React.memo(
  ({ promoCoupon, shopContent, isMobile, searchParam, handleClaimOffer }) => {
    const [countdown, setCountdown] = useState({ D: '00', H: '00', M: '00', S: '00' });
    const navigate = useNavigate();

    useEffect(() => {
      const targetDate = promoCoupon
        ? new Date(promoCoupon.expiryDate)
        : (() => {
            const tomorrow = new Date();
            tomorrow.setHours(23, 59, 59, 999);
            return tomorrow;
          })();

      const interval = setInterval(() => {
        const now = new Date();
        const diff = targetDate - now;

        if (diff <= 0) {
          setCountdown({ D: '00', H: '00', M: '00', S: '00' });
          clearInterval(interval);
        } else {
          const d = Math.floor(diff / (1000 * 60 * 60 * 24));
          const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diff % (1000 * 60)) / 1000);

          setCountdown({
            D: String(d).padStart(2, '0'),
            H: String(h).padStart(2, '0'),
            M: String(m).padStart(2, '0'),
            S: String(s).padStart(2, '0'),
          });
        }
      }, 1000);

      return () => clearInterval(interval);
    }, [promoCoupon]);

    if (shopContent?.promo?.isActive === false) return null;

    return (
      <PromoBanner
        backgroundImage={shopContent?.promo?.backgroundImage}
        badgeText={
          promoCoupon ? `Active Promo: ${promoCoupon.code}` : shopContent?.promo?.badgeText
        }
        statusText={shopContent?.promo?.statusText}
        title={shopContent?.promo?.title}
        highlightText={
          promoCoupon
            ? promoCoupon.discountType === 'percentage'
              ? `${promoCoupon.discountValue}% Off`
              : `₹${promoCoupon.discountValue} Off`
            : shopContent?.promo?.highlightText
        }
        description={
          promoCoupon
            ? `Use code ${promoCoupon.code} at checkout to save.`
            : shopContent?.promo?.description
        }
        ctaText={shopContent?.promo?.ctaText}
        onCtaClick={() => {
          if (promoCoupon) {
            handleClaimOffer();
          } else {
            const link = shopContent?.promo?.ctaLink;
            if (link && link.startsWith('/')) {
              navigate(link);
            } else if (link && !link.includes(' ')) {
              const el = document.getElementById(link);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
              else navigate('/coupons');
            } else {
              const el = document.getElementById('artisan-collection');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }}
        timer={
          promoCoupon
            ? [
                { l: 'D', v: countdown.D },
                { l: 'H', v: countdown.H },
                { l: 'M', v: countdown.M },
                { l: 'S', v: countdown.S },
              ]
            : null
        }
      />
    );
  },
);

export const ProductListingHeader = ({ isMobile, searchParam, shopContent }) => {
  return (
    <section className="relative min-h-[320px] lg:h-[45vh] lg:h-[70vh] flex items-center overflow-hidden bg-on-surface-variant">
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.6 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0"
      >
        <CloudinaryImage
          src={shopContent.hero.backgroundImage}
          alt="Hero Background"
          className="w-full h-full object-cover"
          containerClassName="w-full h-full"
          loading="eager"
          eager={true}
          fetchPriority="high"
          width={1600}
          height={800}
          sizes="100vw"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-surface" />

      <MandalaArtDecor
        variant={2}
        size={500}
        className="-top-20 -right-20 hidden lg:block"
        opacity={0.12}
        spinDuration={240}
      />
      <MandalaArtDecor
        variant={2}
        size={250}
        className="-top-10 -right-10 lg:hidden"
        opacity={0.15}
        spinDuration={240}
      />

      <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop w-full relative z-10 text-center">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-label-sm text-surface tracking-[0.4em] uppercase mb-6 block"
        >
          {shopContent.hero.subtitle}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-headline-xl text-[32px] sm:text-[42px] lg:text-[56px] lg:text-[72px] text-surface mb-4 lg:mb-8 text-gold leading-tight"
        >
          {shopContent.hero.title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="font-body-lg text-[13px] lg:text-[16px] lg:text-[18px] text-surface/80 max-w-xl mx-auto font-light leading-relaxed px-4"
        >
          {shopContent.hero.description}
        </motion.p>
      </div>
    </section>
  );
};
