import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PolicySidebar,
  MobilePolicyNav,
} from "../components/layout/PolicySidebar";
import { SEO } from "../components/seo/SEO";
import { useWebsiteContent } from "../hooks/useWebsiteContent";

export function Returns() {
  const { policies } = useWebsiteContent();
  const returns = policies?.returns || {
    title: "Returns & Refunds",
    lastUpdated: "May 15, 2026",
    sections: []
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-surface-container-low min-h-screen pt-20 pb-32 font-body text-on-surface"
    >
      <SEO
        title="Returns & Refunds"
        description="Understand our returns, exchanges, and refund policies at Siri Arts & Crafts."
      />
      <div className="max-w-max-width mx-auto px-4 sm:px-6">
        {/* Help Center Header */}
        <div className="mb-6 pb-6 border-b border-outline-variant/40">
          <nav className="text-[11px] uppercase font-bold text-secondary tracking-widest mb-4 flex items-center gap-2">
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span>/</span>
            <span>Help Center</span>
            <span>/</span>
            <span className="text-on-surface">Returns & Refunds</span>
          </nav>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-on-surface">
            {returns.title}
          </h2>
          <p className="text-[11px] text-secondary mt-2">
            Last updated: {returns.lastUpdated}
          </p>
        </div>

        <MobilePolicyNav />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <PolicySidebar />

          {/* Main Content Area */}
          <main className="lg:col-span-9 bg-surface-bright border border-outline-variant/40 rounded-lg p-6 sm:p-10 shadow-xs space-y-10">
            {returns.sections?.map((section, idx) => (
              <section key={idx} className="space-y-4">
                <h2 className="text-lg font-bold text-on-surface border-b border-surface-container pb-2">
                  {section.title}
                </h2>
                <div 
                  className="text-sm text-secondary leading-relaxed space-y-3"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </section>
            ))}

            <div className="pt-8 mt-8 border-t border-surface-container text-[11px] text-secondary uppercase tracking-widest text-center">
              © 2026 Siri Arts & Crafts. All Rights Reserved.
            </div>
          </main>
        </div>
      </div>
    </motion.div>
  );
}
