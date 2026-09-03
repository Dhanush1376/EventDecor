import { PlayCircle, ShoppingBag, Eye, Heart, Calendar, Compass, ArrowRight } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { CloudinaryImage } from '../../../components/ui/CloudinaryImage';
import { WhatsAppIcon } from '../../../components/ui/WhatsAppIcon';
import { ShareButton } from '../../../components/ui/ShareButton';
import { LinkedProductCard } from './LinkedProductCard';
import { ProductNoteCard } from '../../../components/ui/ProductNoteCard';
import { fadeUp, scaleIn } from './GalleryAnimations';

export function GalleryDesktopLayout({
  item,
  pageUrl,
  linkedProducts,
  isLiked,
  formattedDate,
  imageHovered,
  setImageHovered,
  handleShopLook,
  handleWishlistLook,
  navigate,
  hideProducts,
}) {
  const [activeTab, setActiveTab] = useState('details');

  return (
    <div className="hidden md:grid lg:grid gallery-detail-grid">
      {/* ─── LEFT: Hero Image ─── */}
      <div className="gallery-detail-image z-0 md:self-start md:sticky md:top-[52px] lg:top-[60px]">
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          className="relative md:rounded-[24px] lg:rounded-[28px] overflow-hidden bg-[#f5f3ef] group"
          onMouseEnter={() => setImageHovered(true)}
          onMouseLeave={() => setImageHovered(false)}
        >
          {/* Image or Video */}
          {item.video ? (
            <video
              src={item.video}
              controls
              muted
              playsInline
              preload="none"
              className="w-full h-auto object-cover block"
              poster={item.image}
            />
          ) : (
            <CloudinaryImage
              src={item.image}
              alt={item.title}
              className={`w-full h-auto object-contain block transition-transform duration-[1.5s] ease-out ${
                imageHovered ? 'scale-[1.03]' : 'scale-100'
              }`}
              containerClassName="w-full h-auto block"
              aspectRatio="auto"
              loading="eager"
              eager={true}
              width={1200}
              height={900}
              sizes="(max-width: 1024px) 100vw, 65vw"
            />
          )}

          {/* Type Badge — top-left */}
          <div className="absolute top-4 left-4 z-10">
            <span
              className={`px-3 py-1.5 rounded-full text-[9px] uppercase tracking-[0.2em] font-extrabold shadow-lg backdrop-blur-md border ${
                item.type === 'real-event'
                  ? 'bg-[#826237]/90 text-white border-[#826237]/30'
                  : 'bg-stone-900/80 text-white border-white/15'
              }`}
            >
              {item.type === 'real-event' ? 'Real Event' : 'Inspiration'}
            </span>
            {item.video && (
              <span className="ml-2 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/20 bg-amber-600/90 text-white text-[8px] uppercase tracking-widest font-extrabold shadow-lg inline-flex items-center gap-1">
                <PlayCircle className="text-[10px]" strokeWidth={1.5} />
                Video
              </span>
            )}
          </div>

          {/* Floating Action Pill — bottom-right (Desktop) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-5 right-5 z-10 hidden md:block lg:block"
          >
            <div className="gallery-action-pill">
              {/* Favorite */}
              <button
                onClick={handleWishlistLook}
                className="gallery-action-btn"
                aria-label="Save to wishlist"
              >
                <motion.span
                  animate={{
                    scale: isLiked ? [1, 1.3, 1] : 1,
                    color: isLiked ? '#ff2d55' : '#1a1817',
                  }}
                  transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                  className="material-symbols-outlined text-[20px]"
                  style={{
                    fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  favorite
                </motion.span>
              </button>

              {/* Divider */}
              <div className="w-px h-5 bg-black/10" />

              {/* Share */}
              <ShareButton
                url={pageUrl}
                title={`${item.title} - Siri Arts & Crafts Gallery`}
                description={item.description}
                variant="custom"
                size="custom"
                iconOnly={true}
                className="gallery-action-btn"
              />

              {/* Divider */}
              {!hideProducts && <div className="w-px h-5 bg-black/10" />}

              {/* Shop Look */}
              {!hideProducts && (
                <button
                  onClick={handleShopLook}
                  className="gallery-action-btn"
                  aria-label="Shop this look"
                >
                  <ShoppingBag className="text-[20px]" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ─── RIGHT: Detail Panel ─── */}
      <div className="px-5 lg:px-0 py-6 lg:py-0 flex flex-col h-full">
        {/* Title */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
          {/* Breadcrumbs inside the details panel */}
          <nav
            className="flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.25em] mb-4 text-black/40"
            aria-label="Breadcrumb"
          >
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span className="opacity-30">/</span>
            <Link to="/gallery" className="hover:text-primary transition-colors">
              Gallery
            </Link>
            <span className="opacity-30">/</span>
            <span className="text-black font-bold truncate max-w-[200px]">{item.title}</span>
          </nav>

          <h1 className="font-display text-[26px] lg:text-[34px] text-black leading-[1.15] font-bold tracking-tight">
            {item.title}
          </h1>
          {item.teluguTitle && (
            <p className="font-body text-[15px] text-black/35 mt-1.5 font-medium">
              {item.teluguTitle}
            </p>
          )}
          <div className="mt-4">
            <ProductNoteCard
              customerNote={item.customerNote}
              complimentaryGift={item.complimentaryGift}
            />
          </div>
        </motion.div>

        {/* Tab Headers */}
        <div className="flex border-b border-black/10 mt-8 mb-6">
          {[
            { id: 'details', label: 'Details', icon: 'info' },
            { id: 'shop', label: 'Shop Look', icon: 'shopping_bag', count: linkedProducts?.length },
            { id: 'customize', label: 'Customize', icon: 'design_services' },
          ]
            .filter((tab) => !hideProducts || tab.id !== 'shop')
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 px-4 font-label text-[10px] uppercase tracking-wider font-bold transition-all relative border-none bg-transparent cursor-pointer ${
                  activeTab === tab.id ? 'text-primary' : 'text-black/40 hover:text-black/70'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[8px] bg-primary/10 text-primary rounded-full">
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
        </div>

        {/* Tab Contents */}
        <div className="flex-grow">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {activeTab === 'details' && (
                <>
                  {/* Description */}
                  {item.description && (
                    <div className="relative pl-5 border-l-[3px] border-primary/25">
                      <p className="font-body text-[15px] lg:text-[16px] text-black/70 leading-relaxed font-medium">
                        {item.description}
                      </p>
                    </div>
                  )}
                  {item.story && (
                    <p className="font-body text-[13px] text-black/40 leading-relaxed font-medium">
                      {item.story}
                    </p>
                  )}

                  {/* Color Palette */}
                  {item.colorPalette && item.colorPalette.length > 0 && (
                    <div>
                      <span className="font-label text-[9px] uppercase tracking-[0.3em] text-black/30 font-bold block mb-3">
                        Color Palette
                      </span>
                      <div className="flex items-center gap-2">
                        {item.colorPalette.map((color, i) => (
                          <div
                            key={i}
                            className="color-swatch"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-[#f5f3ef] text-black/40 text-[10px] font-semibold tracking-wide"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Divider */}
                  <div className="h-px bg-black/6" />

                  {/* Metadata Row */}
                  <div className="flex items-center gap-5 text-black/25">
                    {typeof item.views === 'number' && (
                      <span className="flex items-center gap-1.5 text-[11px] font-medium">
                        <Eye className="text-[14px]" strokeWidth={1.5} />
                        {item.views.toLocaleString()} views
                      </span>
                    )}
                    {typeof item.likes === 'number' && item.likes > 0 && (
                      <span className="flex items-center gap-1.5 text-[11px] font-medium">
                        <Heart className="text-[14px]" strokeWidth={1.5} />
                        {item.likes.toLocaleString()} likes
                      </span>
                    )}
                    {formattedDate && (
                      <span className="flex items-center gap-1.5 text-[11px] font-medium">
                        <Calendar className="text-[14px]" strokeWidth={1.5} />
                        {formattedDate}
                      </span>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'shop' && (
                <div className="space-y-4">
                  {linkedProducts.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-label text-[10px] uppercase tracking-[0.3em] text-black font-bold flex items-center gap-2">
                          <ShoppingBag className="text-primary text-[16px]" strokeWidth={1.5} />
                          Shop This Look
                        </span>
                        <span className="text-[10px] text-black/30 font-medium">
                          {linkedProducts.length} {linkedProducts.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <div className="linked-products-scroll">
                        {linkedProducts.map((prod) => (
                          <LinkedProductCard key={prod._id || prod.id} product={prod} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Link
                      to="/collections"
                      className="flex items-center gap-3 p-4 rounded-2xl bg-[#f5f3ef] border border-black/5 hover:border-primary/20 transition-all group"
                    >
                      <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Compass className="text-[18px]" strokeWidth={1.5} />
                      </span>
                      <div>
                        <span className="font-body text-[13px] text-black font-semibold block">
                          Explore Our Collection
                        </span>
                        <span className="font-body text-[11px] text-black/40">
                          Discover similar handcrafted items
                        </span>
                      </div>
                      <ArrowRight
                        className="text-black/20 ml-auto group-hover:text-primary transition-colors text-[18px]"
                        strokeWidth={1.5}
                      />
                    </Link>
                  )}
                </div>
              )}

              {activeTab === 'customize' && (
                <div className="p-6 rounded-3xl bg-[#2A2825] text-white relative overflow-hidden shadow-lg border border-white/5">
                  <div className="relative z-10 flex flex-col items-center text-center gap-5">
                    <div>
                      <h4 className="font-headline-sm mb-1 text-[#826237] font-normal tracking-wide">
                        Need a Custom Theme?
                      </h4>
                      <p className="font-body-sm text-white/90 font-medium">
                        Personalize this setup to perfectly match your vision.
                      </p>
                    </div>
                    <div className="flex flex-row gap-2 w-full">
                      <button
                        onClick={() => navigate(`/custom-orders?gallery=${item._id || item.id}`)}
                        className="bg-white text-black flex-1 px-2 py-2.5 rounded-full font-label-sm text-[10px] uppercase tracking-[0.15em] hover:bg-stone-200 transition-all whitespace-nowrap font-bold shadow-sm flex items-center justify-center border-none cursor-pointer"
                      >
                        Customize
                      </button>
                      <button
                        onClick={() => {
                          if (!item) return;
                          const num = '919866006648';
                          const link = `${window.location.origin}/gallery/${item._id || item.id}`;
                          const msg = encodeURIComponent(
                            `Hello, I'm interested in this gallery setup and would like to chat about it.\n\nLink: ${link}`,
                          );
                          window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
                        }}
                        className="bg-transparent border border-white/30 flex-1 text-white px-2 py-2.5 rounded-full font-label-sm text-[10px] uppercase tracking-[0.15em] hover:bg-white/10 transition-all whitespace-nowrap font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <WhatsAppIcon className="w-[14px] h-[14px]" />
                        WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
