import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { MandalaElement } from "../ui/MandalaElement";
import { CloudinaryImage } from "../ui/CloudinaryImage";
import { useWebsiteContent } from "../../hooks/useWebsiteContent";
import { NavigationHubSkeleton } from "../ui/Skeleton";

// Removed static fallback arrays

export function NavigationHub() {
  const containerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { featuredCollections, loading } = useWebsiteContent();
  
  const rawItems = featuredCollections?.items || [];
  const activeCmsItems = rawItems.filter(item => item.isVisible !== false);

  const displayCards = activeCmsItems.map((item, idx) => ({
    id: String(idx + 1).padStart(2, "0"),
    title: item.name,
    description: item.description || "Explore our handcrafted ceremonial decorations.",
    image: item.image,
    link: item.link || "/collections"
  }));

  const [deck, setDeck] = useState(() =>
    Array.from({ length: displayCards.length }, (_, i) => displayCards.length - 1 - i)
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDeck(Array.from({ length: displayCards.length }, (_, i) => displayCards.length - 1 - i));
    }, 0);
    return () => clearTimeout(timer);
  }, [displayCards.length]);

  const handleSwipe = () => {
    setDeck((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const topCard = copy.pop();
      copy.unshift(topCard);
      return copy;
    });
  };

  useEffect(() => {
    if (!isMobile) return;
    const interval = setInterval(() => {
      handleSwipe();
    }, 4000);
    return () => clearInterval(interval);
  }, [isMobile, deck]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const parallaxY = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.3, 0.8, 0.3]);

  if (loading) return <NavigationHubSkeleton />;
  if (activeCmsItems.length === 0) return null;

  const sectionTitle = featuredCollections?.sectionTitle || "Curated Collections";
  const sectionSubtitle = featuredCollections?.sectionSubtitle || "Explore our most sought-after ceremonial masterpieces, meticulously designed to elevate your celebrations.";

  return (
    <section
      ref={containerRef}
      className="pt-2 pb-10 md:py-36 bg-[#FDFBF7] relative overflow-hidden"
    >
      {/* Premium Cinematic Background Elements */}
      <motion.div 
        style={{ opacity: bgOpacity }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-[#D4AF37]/5 to-transparent rounded-full blur-[120px] -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[1000px] h-[1000px] bg-gradient-to-tr from-black/5 to-transparent rounded-full blur-[150px] -ml-64 -mb-64" />
      </motion.div>

      <MandalaElement
        className="absolute -bottom-32 -left-32 opacity-[0.02] pointer-events-none"
        size={800}
        duration={250}
        skipFade={true}
      />

      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16">
        {/* Large Centered Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-4xl mx-auto mb-8 md:mb-28 relative z-10"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="inline-flex items-center justify-center gap-3 px-5 py-2 rounded-full border border-[#D4AF37]/20 bg-white/50 backdrop-blur-md shadow-sm mb-4 md:mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
            <span className="font-label text-[10px] text-black/70 uppercase tracking-[0.3em] font-bold">
              Heritage Showcase
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
          </motion.div>
          
          <h2 className="font-headline text-[32px] sm:text-[48px] md:text-[72px] lg:text-[84px] text-black leading-[1.05] tracking-tight mb-4 md:mb-8 drop-shadow-sm">
            {sectionTitle.split(' ')[0]} <br className="md:hidden" />
            {sectionTitle.split(' ').slice(1).join(' ')}
          </h2>
          
          <p className="font-body text-black/60 text-[14px] md:text-xl font-light leading-relaxed max-w-2xl mx-auto tracking-wide">
            {sectionSubtitle}
          </p>
        </motion.div>

        {/* Spacious Layout: Shuffling Card Stack on Mobile, Elegant Grid on Desktop */}
        {isMobile ? (
          <div className="relative w-full flex flex-col items-center justify-center min-h-[490px] z-20 mt-2">
            <div className="relative w-[88vw] max-w-[340px] h-[440px] flex items-center justify-center">
              {deck.length > 0 && deck.map((id, index) => {
                const card = displayCards[id];
                if (!card) return null;
                const position = deck.length - 1 - index; // 0 = top, 1 = middle, 2 = bottom, etc.

                // We only show the top 3 cards in the deck stack to prevent visual clutter
                if (position > 2) return null;

                return (
                  <motion.div
                    key={card.id}
                    className="absolute w-[85vw] max-w-[330px] h-[430px] rounded-[32px] overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.12)] border border-black/5 bg-white origin-bottom cursor-pointer"
                    style={{
                      cursor: position === 0 ? "grab" : "default",
                      touchAction: "none"
                    }}
                    drag={position === 0 ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.6}
                    onDragEnd={(event, info) => {
                      if (position === 0) {
                        if (Math.abs(info.offset.x) > 100) {
                          handleSwipe();
                        }
                      }
                    }}
                    animate={{
                      scale: position === 0 ? 1 : position === 1 ? 0.93 : 0.86,
                      y: position === 0 ? 0 : position === 1 ? 14 : 28,
                      rotate: position === 0 ? 0 : position === 1 ? -4 : 4,
                      zIndex: deck.length - position,
                      opacity: position === 0 ? 1 : position === 1 ? 0.9 : 0.6,
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 26 }}
                  >
                    {/* Link wrapping contents of top card so it can be clicked */}
                    <Link to={card.link} className="w-full h-full block relative select-none">
                      <CloudinaryImage
                        src={card.image}
                        alt={card.title}
                        className="w-full h-full object-cover select-none pointer-events-none"
                        containerClassName="absolute inset-0"
                      />
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />
                      
                      {/* Hover Overlay Glow */}
                      <div className="absolute inset-0 bg-[#D4AF37]/15 mix-blend-overlay pointer-events-none" />

                      {/* Card Content */}
                      <div className="absolute inset-0 p-6 flex flex-col justify-between z-10 pointer-events-none">
                        {/* Top: Card ID & line divider */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-white/80 text-[12px] font-medium tracking-widest">
                            {card.id}
                          </span>
                          <div className="w-10 h-[1px] bg-[#D4AF37]/50" />
                        </div>

                        {/* Bottom: Title & CTA */}
                        <div className="flex flex-col text-left">
                          <h3 className="font-headline text-white text-[23px] sm:text-[25px] leading-tight mb-2.5 drop-shadow-md">
                            {card.title}
                          </h3>
                          <p className="font-body text-white/70 text-[12.5px] leading-snug font-light mb-3.5">
                            {card.description}
                          </p>

                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#D4AF37] flex items-center justify-center shadow-md">
                              <span className="material-symbols-outlined text-white text-[15px]">
                                arrow_forward
                              </span>
                            </div>
                            <span className="font-label text-white/90 text-[9px] uppercase tracking-[0.2em] font-bold">
                              Explore
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Swipe Hint Badge for Top Card */}
                      {position === 0 && (
                        <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center z-20">
                          <span className="material-symbols-outlined text-[13px] text-white">
                            swipe
                          </span>
                        </div>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-5 pb-8 scrollbar-none md:grid md:grid-cols-2 lg:grid-cols-4 lg:gap-8 xl:gap-10 relative z-20 px-margin-mobile md:px-0">
            {displayCards.map((card, index) => (
              <Link
                key={card.id}
                to={card.link}
                className="relative group cursor-pointer h-full block w-[82vw] sm:w-[310px] md:w-auto shrink-0 snap-center md:snap-align-none"
              >
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ 
                    duration: 1, 
                    delay: index * 0.15, 
                    ease: [0.16, 1, 0.3, 1] 
                  }}
                  className="relative group cursor-pointer h-full"
                >
                   {/* Floating Card Effect Wrapper */}
                  <motion.div 
                    style={{ y: isMobile ? 0 : parallaxY }}
                    className={`relative w-full h-full flex flex-col rounded-[32px] overflow-hidden bg-white border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:shadow-[0_20px_60px_rgb(0,0,0,0.12)] group-hover:-translate-y-2`}
                  >
                  {/* Large Cinematic Image with Zoom */}
                  <div className="relative w-full aspect-[4/5] overflow-hidden bg-stone-100">
                    <CloudinaryImage
                      src={card.image}
                      alt={card.title}
                      className="w-full h-full object-cover transition-transform duration-[2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
                      containerClassName="absolute inset-0"
                    />
                    {/* Subtle Depth Shadows & Premium Border Highlights */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5 opacity-80 group-hover:opacity-90 transition-opacity duration-700" />
                    <div className="absolute inset-0 border-[1.5px] border-white/10 rounded-[32px] pointer-events-none" />
                    
                    {/* Soft Hover Glow overlay */}
                    <div className="absolute inset-0 bg-[#D4AF37]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 mix-blend-overlay" />
  
                    {/* Inner Content - Layered Overlay Panel */}
                    <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between z-10">
                      {/* Top: Category Number & Decorative Divider */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-white/80 text-[12px] md:text-[14px] font-medium tracking-widest">
                          {card.id}
                        </span>
                        <div className="w-12 h-[1px] bg-[#D4AF37]/50 group-hover:w-24 group-hover:bg-[#D4AF37] transition-all duration-700" />
                      </div>
  
                      {/* Bottom: Title, Description, and CTA */}
                      <div className="flex flex-col transform transition-transform duration-700 ease-out group-hover:translate-y-[-8px]">
                        <h3 className="font-headline text-white text-[24px] md:text-[28px] leading-tight mb-3 drop-shadow-md">
                          {card.title}
                        </h3>
                        
                        <div className="overflow-hidden h-[45px] md:h-0 md:group-hover:h-[60px] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-700 ease-out">
                          <p className="font-body text-white/80 text-[12px] md:text-[13px] leading-snug md:leading-relaxed font-light">
                            {card.description}
                          </p>
                        </div>
  
                        {/* Floating Arrow CTA Button */}
                        <div className="mt-4 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#D4AF37] md:bg-white/10 backdrop-blur-md flex items-center justify-center border border-[#D4AF37] md:border-white/20 md:group-hover:bg-[#D4AF37] md:group-hover:border-[#D4AF37] transition-all duration-500 shadow-lg">
                            <span className="material-symbols-outlined text-white text-[18px] transform rotate-0 md:-rotate-45 md:group-hover:rotate-0 transition-transform duration-500">
                              arrow_forward
                            </span>
                          </div>
                          <span className="font-label text-white/90 text-[9px] uppercase tracking-[0.2em] font-bold opacity-100 md:opacity-0 md:group-hover:opacity-100 transform translate-x-0 md:-translate-x-4 md:group-hover:translate-x-0 transition-all duration-500 delay-100">
                            Explore
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
