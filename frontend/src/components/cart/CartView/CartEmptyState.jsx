import { ArrowRight } from 'lucide-react';
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Skeleton } from '../../ui/Skeleton';
const RecommendationSystem = React.lazy(() =>
  import('../../sections/RecommendationSystem').then((m) => ({
    default: m.RecommendationSystem,
  })),
);

export const CartEmptyState = ({ activeCartMode }) => {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl mx-auto pt-8 pb-3 lg:pt-12 lg:pb-4"
      >
        <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center mb-4 mx-auto relative">
          <div className="absolute inset-0 bg-primary/15 rounded-full blur-xl" />
          <span className="material-symbols-outlined text-primary text-[28px] relative z-10">
            {activeCartMode === 'rental' ? 'sell' : 'shopping_bag'}
          </span>
        </div>
        <h2 className="font-display text-[20px] lg:text-[22px] text-on-surface tracking-tight mb-1">
          {activeCartMode === 'rental' ? 'No Rental Items Yet' : 'Your bag is empty.'}
        </h2>
        <p className="font-body text-[12.5px] text-secondary/60 font-light max-w-[220px] mx-auto leading-relaxed mb-5">
          {activeCartMode === 'rental'
            ? 'Browse rental products and reserve them for your event.'
            : 'Explore our collections and add items to your bag.'}
        </p>
        <div className="flex justify-center">
          <Link
            to="/collections"
            className="group inline-flex items-center gap-2 text-on-surface hover:text-primary transition-colors py-1.5 font-label text-[10.5px] uppercase tracking-[0.2em] font-bold border-b-2 border-on-surface hover:border-primary"
          >
            <span>Explore Collections</span>
            <ArrowRight
              className="text-[14px] group-hover:translate-x-1 transition-transform"
              strokeWidth={1.5}
            />
          </Link>
        </div>
      </motion.div>

      <div className="mt-3 pt-3 border-t border-outline-variant/10">
        <React.Suspense fallback={<Skeleton className="h-52 w-full rounded-2xl" />}>
          <RecommendationSystem
            hideHeader={false}
            horizontalScroll={true}
            compact={true}
            rentalOnly={false}
            hideMandala={true}
          />
        </React.Suspense>
      </div>
    </>
  );
};
