import { useState, useEffect } from 'react';
import { couponService } from '../services/domainServices';
import { fadeUp, staggerContainer } from '../animations/variants';
import toast from 'react-hot-toast';
import logger from '../utils/logger';

export function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const res = await couponService.getCoupons();
        if (res?.data) {
          const activeCoupons = res.data.filter(
            (c) => c.isActive && new Date(c.expiryDate) > new Date(),
          );
          setCoupons(activeCoupons);
        }
      } catch (error) {
        logger.error('Failed to fetch coupons', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCoupons();
  }, []);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Coupon code copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] pt-32 pb-20 px-6">
      <Helmet>
        <title>Active Offers & Coupons | Event Decor</title>
        <meta name="description" content="Discover our latest offers and discount coupons." />
      </Helmet>

      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif text-[var(--color-text-primary)] mb-4">
            Exclusive Offers
          </h1>
          <p className="text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            Explore our latest active coupons and apply them at checkout for special discounts on
            your event orders.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[200px] bg-neutral-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-neutral-100 shadow-sm">
            <span className="material-symbols-outlined text-5xl text-neutral-300 mb-4 block">
              local_offer
            </span>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
              No active offers right now
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              Please check back later for new promotions and discounts.
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {coupons.map((coupon) => (
              <motion.div
                key={coupon._id || coupon.id}
                variants={fadeUp}
                className="bg-white rounded-2xl p-6 border border-[var(--color-gold-light)] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-[var(--color-gold-light)]/20 rounded-full blur-2xl group-hover:bg-[var(--color-gold)]/20 transition-colors" />

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <span className="inline-block px-3 py-1 bg-[var(--color-gold-dark)]/10 text-[var(--color-gold-dark)] font-bold text-[11px] uppercase tracking-wider rounded-full">
                      {coupon.discountType === 'percentage'
                        ? `${coupon.discountValue}% OFF`
                        : `₹${coupon.discountValue} OFF`}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-secondary)] font-medium bg-neutral-100 px-2 py-1 rounded-md">
                      Expires: {new Date(coupon.expiryDate).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2 uppercase tracking-wide font-mono">
                    {coupon.code}
                  </h3>

                  {coupon.minOrderValue > 0 && (
                    <p className="text-[13px] text-[var(--color-text-secondary)] mb-6">
                      Valid on minimum order of ₹{coupon.minOrderValue}
                    </p>
                  )}

                  <button
                    onClick={() => handleCopy(coupon.code)}
                    className="w-full py-3 bg-[var(--color-gold-dark)] text-white font-bold text-[12px] uppercase tracking-[0.15em] rounded-xl hover:bg-[var(--color-gold)] transition-colors active:scale-[0.98]"
                  >
                    Copy Code
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default Coupons;
