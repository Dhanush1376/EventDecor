import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { handleImageError } from "../../utils/imageUtils";
import toast from "react-hot-toast";

export const QuickViewModal = ({ isOpen, onClose, product }) => {
  const modalRef = React.useRef(null);
  const triggerElementRef = React.useRef(null);
  const navigate = useNavigate();

  const { toggleItem, isWishlisted } = useWishlist();
  const { addItem } = useCart();
  const { runProtectedAction } = useAuth();

  const handleWishlist = () => {
    if (!product) return;
    runProtectedAction(() => {
      toggleItem(product);
    });
  };

  const handleAddToCart = () => {
    if (!product) return;
    runProtectedAction(() => {
      addItem({
        id: product._id || product.id,
        title: product.title,
        price: product.price,
        imageSrc: product.imageSrc,
        quantity: 1,
        variant: "Default",
      });
      onClose();
      toast.success("Added to Bag!");
    });
  };

  React.useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement;
      document.body.style.overflow = "hidden";
      document.body.classList.add("quickview-active");

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusableElements && focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      const handleKeyDown = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
        document.body.classList.remove("quickview-active");
        if (triggerElementRef.current) {
          triggerElementRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!product) return null;

  const productId = product._id || product.id;
  const wishlisted = isWishlisted(productId);

  const handleViewDetails = () => {
    onClose();
    navigate(`/product/${productId}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-on-surface-variant/40 backdrop-blur-xl"
          />

          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, y: "100%", scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: "100%", scale: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-6xl bg-surface rounded-t-[32px] md:rounded-[48px] overflow-hidden shadow-2xl flex flex-col md:flex-row h-auto max-h-[95vh] md:h-full md:max-h-[800px] border border-outline-variant/10"
          >
            {/* Close Button - Fixed in Modal Container */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 md:top-8 md:right-8 w-10 h-10 md:w-12 md:h-12 rounded-full border border-outline-variant/30 bg-surface/80 backdrop-blur-md flex items-center justify-center hover:bg-surface-container-low transition-colors cursor-pointer z-[60] shadow-sm"
              aria-label="Close product quick view"
            >
              <span className="material-symbols-outlined text-[20px] md:text-[24px]">
                close
              </span>
            </button>

            <div className="w-full md:w-1/2 relative bg-surface-container-low overflow-hidden aspect-[4/3] md:aspect-auto h-[300px] md:h-auto shrink-0">
              <img
                onError={handleImageError}
                src={product.imageSrc}
                className="w-full h-full object-cover"
                alt={product.title}
              />
              <div className="absolute top-6 left-6 md:top-8 md:left-8 flex flex-col gap-2">
                <span className="bg-primary-container text-on-primary-container px-3 py-1 md:px-4 md:py-1.5 rounded-full font-label text-[10px] md:text-[11px] uppercase tracking-widest shadow-lg font-bold">
                  Masterpiece
                </span>
              </div>
            </div>

            <div className="w-full md:w-1/2 p-6 md:p-16 flex flex-col overflow-y-auto no-scrollbar relative">
              <div className="flex items-center gap-2 mb-4 md:mb-6 text-primary-container">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className="material-symbols-outlined text-[14px] md:text-[16px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                ))}
                <span className="font-label text-[11px] md:text-[12px] text-on-surface-variant/40 ml-2 font-bold">
                  ({product.reviews || 0} Reviews)
                </span>
              </div>

              {(product.teluguTitle || product.nameTE || product.teluguName) && (
                <span className="block font-label text-[11px] md:text-[13px] text-on-surface/40 mb-1 tracking-wider uppercase font-bold leading-[1.8]">
                  {product.teluguTitle || product.nameTE || product.teluguName}
                </span>
              )}
              <h2 className="font-headline text-[24px] md:text-headline-lg text-on-surface mb-4 md:mb-6 font-bold leading-tight">
                {product.title}
              </h2>

              <div className="flex items-baseline gap-4 mb-6 md:mb-10">
                <span className="font-body font-bold text-[28px] md:text-[36px] text-on-surface">
                  ₹{product.price.toLocaleString("en-IN")}
                </span>
                {product.oldPrice && (
                  <span className="font-body text-on-surface-variant/30 line-through text-[18px] md:text-[20px]">
                    ₹{product.oldPrice.toLocaleString("en-IN")}
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-8 md:mb-10">
                <h3 className="font-label text-[10px] md:text-[11px] text-on-surface/40 uppercase tracking-[0.2em] font-bold">
                  The Essence
                </h3>
                <p className="font-body text-on-surface-variant/70 font-light leading-relaxed text-[15px] md:text-[17px]">
                  {product.description ||
                    "A masterfully handcrafted piece that seamlessly blends traditional Indian artistry with contemporary design."}
                </p>
              </div>

              <div className="mt-auto space-y-4 pb-8 md:pb-0">
                <button
                  onClick={handleAddToCart}
                  className="w-full btn-primary !py-4 md:!py-5 flex items-center justify-center gap-3 font-bold cursor-pointer shadow-lg hover:scale-[1.02] transition-transform"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    shopping_bag
                  </span>
                  Add to Collection
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleWishlist}
                    className="flex items-center justify-center gap-2 py-3 md:py-4 rounded-full border border-outline-variant/30 font-label text-[10px] md:text-[11px] uppercase tracking-widest font-bold hover:bg-surface-container-low transition-colors cursor-pointer group"
                  >
                    <motion.span
                      animate={{
                        scale: wishlisted ? [1, 1.3, 1] : 1,
                        color: wishlisted ? "#ff2d55" : "inherit",
                      }}
                      whileTap={{ scale: 0.8 }}
                      transition={{
                        duration: 0.3,
                        type: "spring",
                        stiffness: 300,
                      }}
                      className="material-symbols-outlined text-[18px] md:text-[20px] transition-transform group-hover:scale-110"
                      style={{
                        fontVariationSettings: wishlisted
                          ? "'FILL' 1"
                          : "'FILL' 0",
                      }}
                    >
                      favorite
                    </motion.span>
                    {wishlisted ? "Saved" : "Save"}
                  </button>
                  <button
                    onClick={handleViewDetails}
                    className="flex items-center justify-center gap-2 py-3 md:py-4 rounded-full border border-outline-variant/30 font-label text-[10px] md:text-[11px] uppercase tracking-widest font-bold hover:bg-surface-container-low transition-colors cursor-pointer group"
                  >
                    <span className="material-symbols-outlined text-[18px] md:text-[20px] group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                    Details
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
