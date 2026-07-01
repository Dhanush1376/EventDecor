import { Link } from 'react-router-dom';
import { MandalaElement } from '../components/ui/MandalaElement';
import { SEO } from '../components/seo/SEO';
export function NotFound() {
  return (
    <div className="min-h-[80vh] relative flex flex-col items-center justify-center px-4 overflow-hidden pt-24 lg:pt-32 pb-24 lg:pb-32">
      <SEO
        title="Page Not Found | Siri Arts & Crafts"
        description="The heritage masterpiece or custom ceremony styling selection you are looking for has either found a new home or is currently unavailable."
        robots="noindex, follow"
      />
      {/* Decorative background for 404 */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center opacity-[0.03]">
        <MandalaElement size={800} rotate={true} duration={200} />
      </div>

      <div className="relative z-10 text-center">
        <h2 className="font-display text-[120px] lg:text-[180px] leading-none text-primary/10 select-none">
          404
        </h2>
        <div className="mt-[-40px] lg:mt-[-60px]">
          <h2 className="font-display text-3xl lg:text-5xl mb-4 text-on-surface">Page Not Found</h2>
          <p className="text-on-surface-variant max-w-md mx-auto mb-10 font-body-md">
            The masterpiece you are looking for doesn't exist or has been moved to a different
            collection.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/" className="btn-primary min-w-[200px]">
              Return Home
            </Link>
            <Link to="/collections" className="btn-outline min-w-[200px]">
              Browse Collections
            </Link>
          </div>
        </div>
      </div>

      {/* Quick links for better UX */}
      <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 border-t border-outline-variant/20 pt-10">
        <div className="text-center">
          <h3 className="font-label-sm mb-3">Shop</h3>
          <Link
            to="/collections"
            className="text-on-surface-variant hover:text-primary transition-colors text-sm"
          >
            All Products
          </Link>
        </div>
        <div className="text-center">
          <h3 className="font-label-sm mb-3">Services</h3>
          <Link
            to="/custom-orders"
            className="text-on-surface-variant hover:text-primary transition-colors text-sm"
          >
            Custom Orders
          </Link>
        </div>
        <div className="text-center">
          <h3 className="font-label-sm mb-3">Events</h3>
          <Link
            to="/events"
            className="text-on-surface-variant hover:text-primary transition-colors text-sm"
          >
            Event Styling
          </Link>
        </div>
        <div className="text-center">
          <h3 className="font-label-sm mb-3">Support</h3>
          <Link
            to="/contact"
            className="text-on-surface-variant hover:text-primary transition-colors text-sm"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
