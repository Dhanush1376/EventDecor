import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { productService } from '../services/domainServices';
import toast from 'react-hot-toast';
import logger from '../utils/logger';

// Helper utilities matching ProductCard.jsx
const parseNumericPrice = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const clean = String(val)
    .replace(/[₹\s,]/g, '')
    .replace(/[Rr][Ss].?/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

const formatPrice = (val) => {
  if (val === undefined || val === null) return '0';
  if (typeof val === 'number') return val.toLocaleString('en-IN');
  const str = String(val).trim();
  const cleanStr = str.replace(/[₹\s,]/g, '').replace(/[Rr][Ss].?/g, '');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? str : num.toLocaleString('en-IN');
};

function CheckoutRecommendationCard({ product }) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { runProtectedAction } = useAuth();
  const [added, setAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const productId = product.id || product._id;
  const numericPrice = parseNumericPrice(product.price);
  const numericOldPrice = parseNumericPrice(product.oldPrice);
  const discount =
    numericOldPrice > numericPrice
      ? Math.round(((numericOldPrice - numericPrice) / numericOldPrice) * 100)
      : null;

  const handleCardClick = (e) => {
    if (e.target.closest('button')) return;
    navigate(`/product/${productId}`);
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    runProtectedAction(() => {
      setIsAdding(true);
      addItem({
        id: productId,
        _id: productId,
        title: product.title,
        price: product.price,
        oldPrice: product.oldPrice || product.price,
        imageSrc: product.imageSrc,
        category: product.category,
        quantity: 1,
        variant: 'Default',
      });
      setAdded(true);
      toast.success(`"${product.title}" added to Shopping bag!`, {
        icon: '✨',
        style: {
          borderRadius: '12px',
          background: '#1a1c1a',
          color: '#fff',
          fontSize: '12px',
          fontFamily: 'var(--font-body)',
          fontWeight: '600',
        },
      });
      setTimeout(() => {
        setAdded(false);
        setIsAdding(false);
      }, 2000);
    });
  };

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={handleCardClick}
      className="group w-full bg-white border border-[#d0c5af]/25 hover:border-[#8c7335]/35 rounded-xl p-2.5 flex flex-col relative select-none cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(140,115,53,0.05)] transition-all duration-300"
    >
      {/* Product Image and overlay utilities */}
      <div className="aspect-square w-full rounded-lg overflow-hidden bg-[#FAF9F6] border border-black/5 relative">
        <CloudinaryImage
          src={product.imageSrc}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          containerClassName="w-full h-full"
          loading="lazy"
          width={300}
          height={300}
          sizes="(max-width: 640px) 50vw, 20vw"
        />

        {/* Small discount indicator */}
        {discount > 0 && (
          <div className="absolute top-1.5 left-1.5 bg-[#8c7335] text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-sm z-10 select-none">
            {discount}% OFF
          </div>
        )}

        {/* Fast Action Quick Add button */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={added || isAdding}
          className={`absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center shadow-md border transition-all duration-300 z-10 ${
            added
              ? 'bg-green-600 border-transparent text-white scale-105'
              : 'bg-white hover:bg-black border-black/5 text-[#1a1c1a] hover:text-white hover:scale-110 active:scale-95'
          }`}
          title="Add to Shopping Bag"
        >
          <span className="material-symbols-outlined text-[13px] font-bold">
            {added ? 'check' : 'add'}
          </span>
        </button>
      </div>

      {/* Product Info Metadata */}
      <div className="pt-2 flex flex-col flex-1">
        <span className="text-[9px] uppercase tracking-wider text-[#685c57]/80 font-bold truncate">
          {product.category || 'Masterpiece'}
        </span>
        <h4 className="text-[11px] font-bold text-[#1a1c1a] truncate leading-tight mt-0.5 group-hover:text-[#8c7335] transition-colors">
          {product.title}
        </h4>

        <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[12px] font-extrabold text-[#8c7335]">
            ₹{formatPrice(product.price)}
          </span>
          {product.oldPrice && numericOldPrice > numericPrice && (
            <span className="text-[9px] text-[#685c57] line-through">
              ₹{formatPrice(product.oldPrice)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function CheckoutRecommendations({ containerClassName = 'mb-4' }) {
  const { items = [] } = useCart();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchRecommendations = async () => {
      try {
        setIsLoading(true);
        const res = await productService.getAll({ limit: 12 });
        if (isMounted && res.success) {
          const list = res.data?.data || res.data?.items || res.data || [];
          setProducts(list);
        }
      } catch (err) {
        logger.error('Failed to load checkout recommendations:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRecommendations();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div
        className={`bg-surface-bright border border-outline-variant/40 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-4 sm:p-5 ${containerClassName}`}
      >
        <RecommendationGridSkeleton cards={4} />
      </div>
    );
  }

  // Filter out any products already in the shopping bag
  const bagItemIds = new Set((items || []).map((item) => String(item?.id || item?._id)));
  const filteredRecommendations = Array.isArray(products)
    ? products
        .filter((product) => product && !bagItemIds.has(String(product.id || product._id)))
        .slice(0, 6)
    : [];

  if (filteredRecommendations.length === 0) {
    return null;
  }

  return (
    <div
      className={`bg-surface-bright border border-outline-variant/40 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-4 sm:p-5 ${containerClassName}`}
    >
      {/* 2-column grid layout (no horizontal scroll) */}
      <div className="grid grid-cols-2 gap-3.5 pb-2 pt-1">
        {filteredRecommendations.map((product) => (
          <CheckoutRecommendationCard key={product.id || product._id} product={product} />
        ))}
      </div>
    </div>
  );
}
