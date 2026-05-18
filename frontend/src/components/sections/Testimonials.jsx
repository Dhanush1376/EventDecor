import React from "react";
import { motion } from "framer-motion";
import { SectionWrapper } from "../layout/SectionWrapper";
import { MandalaElement } from "../ui/MandalaElement";
import { MandalaArtDecor } from "../ui/MandalaArtDecor";
import { handleImageError } from "../../utils/imageUtils";
import { useWebsiteContent } from "../../hooks/useWebsiteContent";

const reviews = [
  {
    name: "Ananya Sharma",
    role: "Bride",
    content:
      "The level of detail in the wedding decor was absolutely stunning. Every piece felt like a work of art. Siri Arts truly made our day magical.",
    avatar: "https://i.pravatar.cc/150?u=ananya",
  },
  {
    name: "Vikram Mehta",
    role: "Event Planner",
    content:
      "We've worked with many vendors, but the artisanal quality here is unparalleled. The custom engagement trays were the highlight of the event.",
    avatar: "https://i.pravatar.cc/150?u=vikram",
  },
  {
    name: "Priya Iyer",
    role: "Client",
    content:
      "Exquisite craftsmanship and professional service. The heritage brass pieces added such an elegant touch to our traditional ceremony.",
    avatar: "https://i.pravatar.cc/150?u=priya",
  },
  {
    name: "Aarti Patel",
    role: "Mother of the Bride",
    content:
      "They transformed our vision into reality. The floral mandap was breathtaking and the attention to cultural details was deeply appreciated.",
    avatar: "https://i.pravatar.cc/150?u=aarti",
  },
  {
    name: "Rohan Kapoor",
    role: "Groom",
    content:
      "Seamless execution and incredible design. The bespoke gift hampers they created for our guests were an absolute hit.",
    avatar: "https://i.pravatar.cc/150?u=rohan",
  },
];

export function Testimonials() {
  const { testimonials } = useWebsiteContent();

  if (!testimonials?.isVisible) return null;

  const activeReviews = testimonials.items.filter((item) => item.isVisible);
  // Duplicate reviews to create a seamless infinite scroll
  const duplicatedReviews = [...activeReviews, ...activeReviews];

  return (
    <SectionWrapper
      id="testimonials"
      variant="surface"
      className="!py-16 md:!py-29 relative overflow-hidden bg-surface-bright"
    >
      {/* Soft glowing backgrounds */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-primary-container/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[540px] h-[540px] bg-primary-container/10 rounded-full blur-[150px] pointer-events-none" />

      <MandalaElement
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] blur-[1px]"
        size={900}
        rotate={false}
        skipFade={true}
      />

      {/* Detailed mandala art accents */}
      <MandalaArtDecor
        variant={3}
        size={240}
        className="-top-24 -right-24 md:hidden"
        opacity={0.18}
        blendMode="darken"
        spinDuration={170}
      />
      <MandalaArtDecor
        variant={3}
        size={480}
        className="-top-48 -right-48 hidden md:block"
        opacity={0.12}
        blendMode="darken"
        spinDuration={170}
      />
      <MandalaArtDecor
        variant={4}
        size={220}
        className="-bottom-20 -left-20 md:hidden"
        opacity={0.15}
        blendMode="darken"
        spinDuration={200}
      />
      <MandalaArtDecor
        variant={4}
        size={440}
        className="-bottom-44 -left-44 hidden md:block"
        opacity={0.1}
        blendMode="darken"
        spinDuration={200}
      />

      <div className="text-center mb-14 md:mb-22 px-4 relative z-10">
        <span className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full border border-primary/20 bg-surface mb-5.5">
          <span className="font-label-sm text-[9px] text-primary uppercase tracking-[0.4em] font-bold">
            Client Stories
          </span>
        </span>
        <h2 className="font-headline text-[32px] sm:text-[42px] md:text-[58px] text-on-surface mb-5.5 tracking-tight">
          {testimonials.sectionTitle}
        </h2>
      </div>

      {/* Infinite Scrolling Marquee Container */}
      <div className="relative w-full overflow-hidden flex items-center py-10">
        {/* Gradient fades for edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 md:w-48 bg-gradient-to-r from-surface-bright to-transparent z-20 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 md:w-48 bg-gradient-to-l from-surface-bright to-transparent z-20 pointer-events-none" />

        <motion.div
          className="flex gap-5.5 md:gap-7 pr-5.5 md:pr-7 w-max"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            duration: 50,
            ease: "linear",
            repeat: Infinity,
          }}
        >
          {duplicatedReviews.map((review, idx) => (
            <div
              key={idx}
              className="w-[280px] md:w-[360px] flex-shrink-0 bg-[#FCFBF8] backdrop-blur-2xl p-8 md:p-11 rounded-[28px] md:rounded-[36px] border border-[#E8E2D5] shadow-[0_8px_32px_rgba(0,0,0,0.03)] flex flex-col hover:border-[#D4AF37]/40 hover:shadow-[0_16px_48px_rgba(212,175,55,0.12)] transition-all duration-500 group"
            >
              <div className="flex items-center gap-1.5 mb-7 text-[#8C7000] opacity-90 group-hover:opacity-100 transition-opacity font-serif text-lg">
                {[...Array(review.rating || 5)].map((_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>

              <p className="font-serif text-[#3D3A36] text-base md:text-lg font-light italic mb-9 flex-1 leading-relaxed">
                "{review.text}"
              </p>

              <div className="flex items-center gap-4 mt-auto pt-2">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-[#E2DACB] shadow-sm bg-[#EDE7DC] flex items-center justify-center shrink-0">
                  {review.avatar || review.image ? (
                    <img 
                      src={review.avatar || review.image} 
                      alt={review.name} 
                      onError={(e) => { e.target.style.display = 'none'; }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-serif text-[#735C00] text-lg font-bold">
                      {(review.name || "C")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-display font-bold uppercase tracking-[0.18em] text-[#2D2B29] text-[11px] mb-1">
                    {review.name}
                  </h4>
                  <p className="font-label-sm text-[#9A7B38] uppercase tracking-[0.25em] text-[9px] font-bold">
                    {review.role ? review.role.split(',')[0].toUpperCase() : "CLIENT"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
