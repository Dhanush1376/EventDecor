import React from "react";
import { motion } from "framer-motion";
import { SectionWrapper } from "../layout";
import { fadeUp, staggerContainer } from "../../animations/variants";

const teamMembers = [
  {
    id: 1,
    name: "Siri",
    role: "Founder & Master Artisan",
    image: "https://res.cloudinary.com/drxgnnzeb/image/upload/v1779129336/event_decor_ecommerce/assets/event_decor_team_founder.jpg",
  },
  {
    id: 2,
    name: "Karthik",
    role: "Operations & Strategy",
    image: "https://res.cloudinary.com/drxgnnzeb/image/upload/v1779129337/event_decor_ecommerce/assets/event_decor_team_operations.jpg",
  },
  {
    id: 3,
    name: "Lakshmi",
    role: "Lead Florist",
    image: "https://res.cloudinary.com/drxgnnzeb/image/upload/v1779129335/event_decor_ecommerce/assets/event_decor_team_florist.jpg",
  },
  {
    id: 4,
    name: "Ramesh",
    role: "Structural Architect",
    image: "https://res.cloudinary.com/drxgnnzeb/image/upload/v1779129333/event_decor_ecommerce/assets/event_decor_team_architect.jpg",
  },
];

export function TeamGrid({ handleImageError }) {
  return (
    <SectionWrapper variant="bright" className="!py-24">
      <div className="text-center mb-16">
        <span className="font-label text-[11px] text-primary uppercase tracking-[0.5em] font-bold mb-4 block">
          Our Collective
        </span>
        <h2 className="font-display text-[42px] md:text-[56px] tracking-tight">
          Meet the Artisans
        </h2>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8"
      >
        {teamMembers.map((member) => (
          <motion.div
            key={member.id}
            variants={fadeUp}
            className="space-y-4 group"
          >
            <div className="aspect-[3/4] rounded-[32px] overflow-hidden bg-surface-container shadow-md border border-black/5 relative">
              <img
                src={member.image}
                alt={member.name}
                onError={handleImageError}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-center">
              <h4 className="font-display text-xl text-black">{member.name}</h4>
              <p className="font-label text-[10px] uppercase tracking-widest text-black/40 font-bold">
                {member.role}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </SectionWrapper>
  );
}
