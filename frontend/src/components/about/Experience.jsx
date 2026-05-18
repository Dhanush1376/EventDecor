import React from "react";
import { motion } from "framer-motion";
import { SectionWrapper } from "../layout";
import { MandalaElement } from "../ui/MandalaElement";

const eventTypes = [
  {
    id: 1,
    title: "Traditional Weddings",
    subtitle: "Pellikuthuru & Pellikutuku",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBZBEDcwKob0pNIA9hznZFXRijWsUylcaexjcyYHU3uJ0G6FJsCl8PUmwvoqng7V7FcYfXHAKVXvTQslP1jvT8zs20B1g3wPof07Mlyd2AZv8gm6wtooHrXzTBK4pnESxISwoLM3prUNpSp-k9uBH3KyBN8T5jcQ_x_nUeGAbF77roym8CBSDLlg4Td3OzkkXbuG66SpvhETJaOKYjPxDbhxtuOK3v2b85m87Yzsbz3ik2leo2G609lS8sokN-GIlYkesf59GTAGsk",
  },
  {
    id: 2,
    title: "Baby Showers",
    subtitle: "Seemantham Ceremonies",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA7F3ck_1VBGtclja4rFpblASLZWmGyrrSeXc-D7PYlO1RJFSwwrZdHFE80h72hY1_kcwRRwjHuqfhG4Zlouur0m6jrXSLrhifw9vDKzna2lQ-ju5fdSEXiP7YRFTwnqlKsqohXveyKFObF5Wlx3w4eHE_H8k0Y1_l5DTr3WtpRbeEK40rGPLPe9CzEazxPBk_dKXe0G4hYrk0NZhhWEsdpFvGFb0pGyqjB5La45C5zfJ87FPCec_D1_Au1Z-IJca6gythEhj_rF4g",
  },
  {
    id: 3,
    title: "Half Saree Functions",
    subtitle: "Langa Voni Celebrations",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDe83Lsd47lZqynVJ0kMtX8bQXTRecbu7H0C1BlkLxOasxemcqQEuKnNyGxKot0fwPK8XK3B7KlKM6L4TPRVgoVdJqq9XbM6x-UQ1iVr-aTMjYA2PVJ-t5AklU0knTE2gCEJQlcCrgbfKRxQQCm0QcC2jFkShh9Zl7gMAmORpzgwWgZwoyWnB5OVEcj4hALz_cOJBfuUW6PkCCrjivtHrJZ46oFXRq2xHqpkcUUppREtOkav1hREotXGozlrWwmRfDfzcmP54tYsm8",
  },
];

export function Experience({ handleImageError }) {
  return (
    <SectionWrapper className="!py-24 relative overflow-hidden">
      <MandalaElement
        className="absolute top-0 right-0 opacity-[0.05]"
        size={600}
        duration={180}
        variant={2}
      />
      <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
        <div className="max-w-2xl space-y-6 text-left">
          <span className="font-label text-[11px] text-primary uppercase tracking-[0.5em] font-bold">
            The Experience
          </span>
          <h2 className="font-display text-[42px] md:text-[64px] leading-tight tracking-tight">
            Milestones Defined by <br />{" "}
            <span className="italic font-light">Artistic Excellence.</span>
          </h2>
        </div>
        <p className="font-body text-[15px] text-secondary/60 md:text-right max-w-sm font-light">
          From the first naming ceremony to the grandest wedding, we bring
          heritage to life with bespoke traditional decor.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-8 h-[600px] md:h-[800px]">
        <div className="col-span-1 md:col-span-6 lg:col-span-7 h-full rounded-[64px] overflow-hidden group relative shadow-luxury">
          <img
            onError={handleImageError}
            src={eventTypes[0].image}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            alt="Events"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-all duration-500" />
          <div className="absolute bottom-12 left-12 text-white">
            <span className="font-label text-[10px] uppercase tracking-widest text-white/90 font-bold mb-4 block">
              {eventTypes[0].subtitle}
            </span>
            <h3 className="font-display text-[42px]">{eventTypes[0].title}</h3>
          </div>
        </div>
        <div className="col-span-1 md:col-span-6 lg:col-span-5 flex flex-col gap-8 h-full">
          <div className="flex-1 rounded-[48px] overflow-hidden group relative shadow-luxury">
            <img
              onError={handleImageError}
              src={eventTypes[1].image}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              alt="Events"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-all duration-500" />
            <div className="absolute bottom-10 left-10 text-white">
              <span className="font-label text-[10px] uppercase tracking-widest text-white/90 font-bold mb-2 block">
                {eventTypes[1].subtitle}
              </span>
              <h3 className="font-display text-[32px]">
                {eventTypes[1].title}
              </h3>
            </div>
          </div>
          <div className="flex-1 rounded-[48px] overflow-hidden group relative shadow-luxury">
            <img
              onError={handleImageError}
              src={eventTypes[2].image}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              alt="Events"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-all duration-500" />
            <div className="absolute bottom-10 left-10 text-white">
              <span className="font-label text-[10px] uppercase tracking-widest text-white/90 font-bold mb-2 block">
                {eventTypes[2].subtitle}
              </span>
              <h3 className="font-display text-[32px]">
                {eventTypes[2].title}
              </h3>
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
