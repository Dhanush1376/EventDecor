import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import { formatPrice, getStockLabel, formatDiscount } from './searchUtils';
import { m as motion, AnimatePresence } from 'framer-motion';

export function SearchProductPreview({ product, onClose }) {
  const navigate = useNavigate();

  if (!product) return null;

  const stockInfo = getStockLabel(product.stockStatus);
  const discountText = formatDiscount(product.discount);

  const handleNavigate = () => {
    navigate(`/product/${product.id}`);
    if (onClose) onClose();
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={product.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full h-full flex flex-col bg-stone-50 rounded-2xl overflow-hidden border border-stone-200/50 shadow-sm"
      >
        <div
          className="relative w-full aspect-square bg-stone-100 flex-shrink-0 cursor-pointer overflow-hidden group"
          onClick={handleNavigate}
        >
          {product.image ? (
            <CloudinaryImage
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              containerClassName="w-full h-full"
              width={400}
              height={400}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-300">
              <span className="material-symbols-outlined text-[48px]">image</span>
            </div>
          )}

          {discountText && (
            <div className="absolute top-3 right-3 bg-red-500 text-white text-[11px] font-bold px-2 py-1 rounded-md shadow-sm">
              {discountText}
            </div>
          )}

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 bg-white text-stone-900 px-4 py-2 rounded-full font-bold text-[12px] uppercase tracking-widest shadow-md transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              View Details
            </span>
          </div>
        </div>

        <div className="flex-1 p-5 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3
              className="text-[17px] font-display font-bold text-stone-900 leading-tight cursor-pointer hover:text-primary transition-colors"
              onClick={handleNavigate}
            >
              {product.title}
            </h3>
            <button className="text-stone-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50">
              <span className="material-symbols-outlined text-[20px]">favorite</span>
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-[15px] font-display font-semibold italic text-primary flex items-center">
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="line-through text-stone-400 text-[12px] mr-2 not-italic">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
              {formatPrice(product.price)}
            </span>

            {product.rating > 0 && (
              <div className="flex items-center gap-1 border-l border-stone-200 pl-3">
                <span
                  className="material-symbols-outlined text-[#f59e0b] text-[14px] fill-current"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
                <span className="text-[12px] font-bold text-stone-700">{product.rating}</span>
              </div>
            )}
          </div>

          {product.description && (
            <p className="text-[13px] text-stone-500 line-clamp-3 mb-4 flex-1">
              {product.description}
            </p>
          )}

          <div className="mt-auto space-y-3">
            {stockInfo && (
              <div
                className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest ${stockInfo.color}`}
              >
                <span className={`w-2 h-2 rounded-full ${stockInfo.dot}`}></span>
                {stockInfo.label}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleNavigate}
                className="flex-1 bg-stone-100 text-stone-800 py-2.5 rounded-xl font-bold text-[12px] uppercase tracking-widest hover:bg-stone-200 transition-colors"
              >
                View Details
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation(); /* Add to cart logic */
                }}
                className="flex-1 bg-primary text-white py-2.5 rounded-xl font-bold text-[12px] uppercase tracking-widest hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                Quick Add
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
