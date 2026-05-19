import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CloudinaryImage } from "./CloudinaryImage";
import { handleImageError } from "../../utils/imageUtils";
import { useWishlist } from "../../context/WishlistContext";
import { ShareButton } from "./ShareButton";
import { motion } from "framer-motion";

export function ProductGallery({ images = [], product }) {
  const { toggleItem, isWishlisted } = useWishlist();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/collections");
    }
  };

  const handleThumbnailClick = (idx) => {
    setSelectedIdx(idx);
    if (scrollRef.current) {
      const width = scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({
        left: idx * width,
        behavior: "smooth",
      });
    }
  };

  const handleScroll = (e) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.clientWidth;
    if (!width) return;
    const currentSlide = Math.round(scrollLeft / width);
    if (
      currentSlide !== selectedIdx &&
      currentSlide >= 0 &&
      currentSlide < images.length
    ) {
      setSelectedIdx(currentSlide);
    }
  };

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-4 md:gap-6 items-start w-full select-none">
      {/* Thumbnail Strip */}
      <div
        className="w-full lg:w-20 flex lg:flex-col gap-2.5 sm:gap-3 overflow-x-auto lg:overflow-y-auto no-scrollbar py-1.5 px-0.5"
        style={{ scrollbarWidth: "none" }}
      >
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => handleThumbnailClick(idx)}
            className={`shrink-0 w-14 sm:w-16 md:w-20 lg:w-full aspect-square rounded-xl overflow-hidden border-2 transition-all duration-500 relative group cursor-pointer ${
              selectedIdx === idx
                ? "border-primary shadow-md shadow-primary/10 scale-105"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <CloudinaryImage
              src={img}
              alt={`Thumbnail ${idx + 1}`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 pointer-events-none"
              width={100}
              height={100}
            />
          </button>
        ))}
      </div>

      {/* Main Image Viewport - Native continuous horizontal scroll enabled */}
      <div className="flex-1 w-full relative aspect-square max-h-[520px] rounded-3xl md:rounded-[40px] overflow-hidden bg-surface-container-low group shadow-xl border border-outline-variant/10">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="w-full h-full flex overflow-x-auto snap-x snap-mandatory relative"
          style={{ scrollbarWidth: "none" }}
        >
          {images.map((img, idx) => (
            <div
              key={idx}
              className="w-full h-full shrink-0 snap-center relative overflow-hidden bg-white flex items-center justify-center"
            >
              <CloudinaryImage
                src={img}
                alt={`Product Primary View ${idx + 1}`}
                className="w-full h-full object-cover origin-center select-none transition-transform duration-500"
                containerClassName="w-full h-full"
                width={800}
                height={800}
              />
            </div>
          ))}
        </div>

        {/* Gallery Interaction Overlays */}
        
        {/* Mobile Back Arrow Overlay */}
        <button
          onClick={handleBack}
          className="flex md:hidden absolute top-4 left-4 z-20 items-center justify-center w-10 h-10 rounded-full bg-[#fbfbf8]/90 backdrop-blur-xs shadow-lg border border-black/5 active:scale-90 hover:scale-105 transition-all text-black hover:bg-white outline-none focus:outline-none"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined text-[20px] text-black">
            arrow_back
          </span>
        </button>

        {/* Floating Action Buttons (Wishlist & Share) */}
        {product && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => toggleItem({
                id: product._id || product.id,
                title: product.title,
                price: product.price,
                imageSrc: product.imageSrc || product.image,
              })}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-[#fbfbf8] shadow-lg border border-black/5 active:scale-90 hover:scale-105 transition-all text-black hover:bg-white"
            >
              <motion.span
                animate={{
                  scale: isWishlisted(product._id || product.id) ? [1, 1.3, 1] : 1,
                  color: isWishlisted(product._id || product.id) ? "#ff2d55" : "#1a1817",
                  fontVariationSettings: isWishlisted(product._id || product.id) ? "'FILL' 1" : "'FILL' 0",
                }}
                className="material-symbols-outlined text-[20px]"
              >
                favorite
              </motion.span>
            </button>
            <ShareButton 
              url={typeof window !== 'undefined' ? window.location.href : ''} 
              title={`${product.title} - Siri Arts & Crafts`}
              description={product.description}
              variant="custom"
              size="custom"
              iconOnly={true}
              className="w-10 h-10 rounded-full bg-[#fbfbf8] shadow-lg border border-black/5 flex items-center justify-center active:scale-90 hover:scale-105 transition-all text-black hover:bg-white"
            />
          </div>
        )}



        {/* Shimmer Effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      </div>
    </div>
  );
}
