import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { galleryInspirations } from "../../data/galleryData";
import { useWishlist } from "../../context/WishlistContext";
import { handleImageError } from "../../utils/imageUtils";

// Mock product data for shop integration - in a real app this would come from a context or API
const allProducts = [
  {
    id: 1,
    title: "Royal Mandap Arch",
    category: "Wedding Decor",
    price: 45000,
    oldPrice: 58000,
    rating: 5,
    reviews: 42,
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBZBEDcwKob0pNIA9hznZFXRijWsUylcaexjcyYHU3uJ0G6FJsCl8PUmwvoqng7V7FcYfXHAKVXvTQslP1jvT8zs20B1g3wPof07Mlyd2AZv8gm6wtooHrXzTBK4pnESxISwoLM3prUNpSp-k9uBH3KyBN8T5jcQ_x_nUeGAbF77roym8CBSDLlg4Td3OzkkXbuG66SpvhETJaOKYjPxDbhxtuOK3v2b85m87Yzsbz3ik2leo2G609lS8sokN-GIlYkesf59GTAGsk",
  },
  {
    id: 2,
    title: "Heritage Cascade Set",
    category: "Artisanal Art",
    price: 18500,
    oldPrice: 22000,
    rating: 4.9,
    reviews: 88,
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBIpNH8br15Ge3ShywA13R5RATlBWLY6FATegrXBoB6N_W8bLSs7SDxfez5uU4I5GDIqC_9musVh61_WQuU9ykCwxmz6Uu1Ql1HBc82UGgwrfrhSv6WBikwpnx9oCtW1aJKo9nmboD4qT2Ddd_Q5jL4gsy49L_UHCNRJ2ABrBTZe-rJj-RjlnlRx-wNse0EzMDN2y4dPR1M1ZjsGS4v7Vz6p1yLbI_z1Soss4kd8In6LUqvCKavjYPNlQrbAa-tKQ1WJs7ukRUsuPA",
  },
  {
    id: 3,
    title: "Kundan Favor Box",
    category: "Engagement Trays",
    price: 6200,
    oldPrice: 8500,
    rating: 4.8,
    reviews: 156,
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA7F3ck_1VBGtclja4rFpblASLZWmGyrrSeXc-D7PYlO1RJFSwwrZdHFE80h72hY1_kcwRRwjHuqfhG4Zlouur0m6jrXSLrhifw9vDKzna2lQ-ju5fdSEXiP7YRFTwnqlKsqohXveyKFObF5Wlx3w4eHE_H8k0Y1_l5DTr3WtpRbeEK40rGPLPe9CzEazxPBk_dKXe0G4hYrk0NZhhWEsdpFvGFb0pGyqjB5La45C5zfJ87FPCec_D1_Au1Z-IJca6gythEhj_rF4g",
  },
  {
    id: 4,
    title: "Heritage Brass Diya",
    category: "Pooja Essentials",
    price: 3500,
    oldPrice: 4200,
    rating: 5,
    reviews: 210,
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBsQCa-kmW4cetaI5gJVRriIZNGZYHmU8E8am3cFeZUDKCilYWXQlzjOUcNC-7Y4X0QJ2pMwgKSpIYdQFq2_Ay_f7SiqSInMa0U5TCRu-S9oj-mVqYRw6hgjkSbDXB7oCY4ohJnWlNM9fs3HETumRdaSq9tc2uoOw5j3yAtroOIPxRui4ppd0CZwJFbmZQbtiTuQxdBtPqh581LUvCxkr2wfFHHmDS6rvY21b8hNpq25j6h71ID7Xq7g1y1_z9GbgcjSzZHaGgl54M",
  },
  {
    id: 5,
    title: "Zardozi Table Runner",
    category: "Wedding Decor",
    price: 12000,
    oldPrice: 15000,
    rating: 4.7,
    reviews: 34,
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuArmLX9xra0m1GxmrjS8xH0pXUpTrKa18fhO9gW8NY160WAZ5MfXc157OoFlIivj6H_WT6aMZVWNjLvqixrhrBG2ryiAU15p_ZC42em1Dzj1w8ukwUFzndsHouARkcvS5wRRDyDVaOaIHwbiV5vUgkbNfc6zFl8XAYOQBERj5JYLZZOPpjaoiUd4B_6zT7iQQYhbyHU5Q5geiCAvvn2hga0_UsahQbwxSy3eLhHFEKPHc897yWc_fLyCPjkZ0wcfIcXDcMrPumI35w",
  },
  {
    id: 6,
    title: "Golden Relief Aarti Plate",
    category: "Pooja Essentials",
    price: 8500,
    oldPrice: 11000,
    rating: 4.9,
    reviews: 92,
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDe83Lsd47lZqynVJ0kMtX8bQXTRecbu7H0C1BlkLxOasxemcqQEuKnNyGxKot0fwPK8XK3B7KlKM6L4TPRVgoVdJqq9XbM6x-UQ1iVr-aTMjYA2PVJ-t5AklU0knTE2gCEJQlcCrgbfKRxQQCm0QcC2jFkShh9Zl7gMAmORpzgwWgZwoyWnB5OVEcj4hALz_cOJBfuUW6PkCCrjivtHrJZ46oFXRq2xHqpkcUUppREtOkav1hREotXGozlrWwmRfDfzcmP54tYsm8",
  },
];

export function GalleryDetailModal({ isOpen, onClose, item }) {
  if (!item) return null;

  const { toggleItem, isWishlisted } = useWishlist();

  const linkedProducts =
    item.linkedProducts
      ?.map((id) => allProducts.find((p) => p.id === id))
      .filter(Boolean) || [];
  const similarInspirations =
    item.similarInspirations
      ?.map((id) => galleryInspirations.find((gi) => gi.id === id))
      .filter(Boolean) || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center overflow-hidden p-0 md:p-6 lg:p-12">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full h-full max-w-7xl bg-white md:rounded-[48px] overflow-hidden flex flex-col lg:flex-row shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 z-50 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-on-surface transition-all"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {/* Left: Cinematic Image Viewport */}
            <div className="w-full lg:w-[60%] h-[40vh] lg:h-full bg-black relative group">
              <img
                onError={handleImageError}
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover select-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

              {/* Image Footer Info */}
              <div className="absolute bottom-8 left-8 right-8 text-white z-10 pointer-events-none">
                <span className="text-primary italic font-display text-lg md:text-xl block mb-2">
                  {item.style}
                </span>
                <h2 className="font-display text-[32px] md:text-[56px] leading-[1.1] mb-4 italic">
                  {item.title}
                </h2>
                <div className="flex gap-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-label uppercase tracking-widest border border-white/30 px-3 py-1 rounded-full backdrop-blur-md"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Immersive Discovery Sidebar */}
            <div className="flex-1 h-full overflow-y-auto bg-white custom-scrollbar flex flex-col">
              <div className="p-8 md:p-12 space-y-12">
                {/* Section 1: Story & Narrative */}
                <section className="space-y-6">
                  <span className="font-label text-[10px] uppercase tracking-[0.4em] text-primary font-bold">
                    The Creative Vision
                  </span>
                  <div className="space-y-4">
                    <p className="font-display text-[28px] text-on-surface leading-tight italic font-light">
                      "{item.description}"
                    </p>
                    <p className="font-body text-on-surface-variant leading-relaxed font-light text-base">
                      {item.story}
                    </p>
                  </div>

                  {/* Color Palette Display */}
                  <div className="flex items-center gap-4 pt-4 border-t border-outline-variant/10">
                    <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">
                      Color Palette
                    </span>
                    <div className="flex gap-2">
                      {item.colorPalette.map((clr, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full border border-outline-variant/20 shadow-sm"
                          style={{ backgroundColor: clr }}
                          title={clr}
                        />
                      ))}
                    </div>
                  </div>
                </section>

                {/* Section 2: Shop This Look Integration */}
                {linkedProducts.length > 0 && (
                  <section className="space-y-8">
                    <div className="flex items-center justify-between">
                      <span className="font-label text-[10px] uppercase tracking-[0.4em] text-primary font-bold">
                        Shop This Look
                      </span>
                      <Link
                        to="/collections"
                        className="text-[10px] font-label uppercase tracking-widest text-on-surface underline"
                      >
                        View Complete Registry
                      </Link>
                    </div>

                    <div className="flex flex-row md:flex-col gap-4 overflow-x-auto md:overflow-x-visible no-scrollbar snap-x snap-mandatory -mx-8 px-8 md:mx-0 md:px-0">
                      {linkedProducts.map((prod) => (
                        <div
                          key={prod.id}
                          className="group flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 p-4 md:p-4 rounded-3xl bg-[#fcfbf9] border border-outline-variant/10 hover:border-primary transition-all duration-500 min-w-[280px] md:min-w-0 snap-start"
                        >
                          <div className="w-full md:w-24 aspect-square md:h-24 rounded-2xl overflow-hidden shadow-md shrink-0">
                            <img
                              onError={handleImageError}
                              src={prod.imageSrc}
                              className="w-full h-full object-cover transition-transform group-hover:scale-110"
                              alt={prod.title}
                            />
                          </div>
                          <div className="flex-1 space-y-1 w-full">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-label text-[8px] uppercase tracking-widest text-primary font-bold">
                                  {prod.category}
                                </span>
                                <h4 className="font-display text-lg text-on-surface font-normal line-clamp-1">
                                  {prod.title}
                                </h4>
                              </div>
                              <button
                                onClick={() =>
                                  toggleItem({ ...prod, image: prod.imageSrc })
                                }
                                className="w-8 h-8 rounded-full border border-outline-variant/20 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors shrink-0 active:scale-90"
                              >
                                <motion.span
                                  animate={{
                                    scale: isWishlisted(prod.id)
                                      ? [1, 1.3, 1]
                                      : 1,
                                    color: isWishlisted(prod.id)
                                      ? "#ff2d55"
                                      : "inherit",
                                  }}
                                  transition={{
                                    duration: 0.3,
                                    type: "spring",
                                    stiffness: 300,
                                  }}
                                  className="material-symbols-outlined text-[18px]"
                                  style={{
                                    fontVariationSettings: isWishlisted(prod.id)
                                      ? "'FILL' 1"
                                      : "'FILL' 0",
                                  }}
                                >
                                  favorite
                                </motion.span>
                              </button>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <span className="font-display text-xl text-on-surface font-bold whitespace-nowrap">
                                Rs. {prod.price.toLocaleString()}
                              </span>
                              <Link
                                to={`/product/${prod.id}`}
                                className="bg-on-surface text-surface px-5 py-2 rounded-full font-label text-[8px] uppercase tracking-widest font-bold hover:bg-primary transition-colors whitespace-nowrap"
                              >
                                Shop Now
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Section 3: Similar Inspirations */}
                <section className="space-y-8">
                  <span className="font-label text-[10px] uppercase tracking-[0.4em] text-primary font-bold">
                    Similar Inspirations
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    {similarInspirations.map((sim) => (
                      <div
                        key={sim.id}
                        className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer"
                        onClick={() => {
                          /* Handle Switch Item */
                        }}
                      >
                        <img
                          onError={handleImageError}
                          src={sim.image}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          alt={sim.title}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4 text-center">
                          <span className="text-white font-display italic text-sm">
                            {sim.title}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Actions Footer */}
                <section className="pt-12 border-t border-outline-variant/10 flex flex-col gap-4">
                  <button className="w-full bg-on-surface text-surface py-5 rounded-full font-label text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-primary transition-colors shadow-xl">
                    Save Inspiration to Moodboard
                  </button>
                  <div className="flex gap-4">
                    <button className="flex-1 border border-outline-variant/30 py-4 rounded-full font-label text-[10px] uppercase tracking-widest font-bold hover:bg-surface-container transition-colors flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">
                        share
                      </span>
                      Share Concept
                    </button>
                    <button className="flex-1 border border-outline-variant/30 py-4 rounded-full font-label text-[10px] uppercase tracking-widest font-bold hover:bg-surface-container transition-colors flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">
                        download
                      </span>
                      Download Visual
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
