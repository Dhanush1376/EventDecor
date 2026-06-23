import { Link } from 'react-router-dom';
import { ProductCard } from '../../components/shared/ProductCard';

export function ComplementaryProducts({ matchingProducts, handleOpenQuickView }) {
  if (!matchingProducts || matchingProducts.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-surface border-t border-outline-variant/10 relative overflow-hidden">
      <div className="max-w-max-width mx-auto px-4 md:px-margin-desktop">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-12">
          <div className="space-y-1">
            <span className="font-label-sm text-[10px] text-primary uppercase tracking-[0.4em] font-bold block">
              COLLECTIVE HARMONY
            </span>
            <h2 className="font-display text-[32px] md:text-[42px] text-on-surface font-normal">
              Matching Decor
            </h2>
          </div>
          <Link
            to="/collections"
            className="text-[10px] md:text-xs text-primary font-bold uppercase tracking-widest underline decoration-primary/20"
          >
            Explore Inventory →
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {matchingProducts.map((prod) => (
            <ProductCard
              key={prod._id || prod.id}
              {...prod}
              id={prod._id || prod.id}
              onQuickView={handleOpenQuickView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
