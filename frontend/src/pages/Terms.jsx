import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PolicySidebar,
  MobilePolicyNav,
} from "../components/layout/PolicySidebar";
import { SEO } from "../components/seo/SEO";

export function Terms() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-surface-container-low min-h-screen pt-20 pb-32 font-body text-on-surface"
    >
      <SEO
        title="Terms & Conditions"
        description="Read our terms of service and legal conditions for using the Siri Arts & Crafts platform."
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
            <span className="text-on-surface">Terms & Conditions</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-on-surface">
            Terms & Conditions
          </h1>
          <p className="text-[11px] text-secondary mt-2">
            Last updated: May 15, 2026
          </p>
        </div>

        <MobilePolicyNav />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <PolicySidebar />

          {/* Main Content Area */}
          <main className="lg:col-span-9 bg-surface-bright border border-outline-variant/40 rounded-lg p-6 sm:p-10 shadow-xs space-y-10">
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-on-surface border-b border-surface-container pb-2">
                1. Use of Platform
              </h2>
              <div className="text-sm text-secondary leading-relaxed">
                <p>
                  By accessing the Siri Arts & Crafts studio, you agree to
                  utilize our services for lawful procurement and bespoke
                  consultations only. Unauthorized scraping, imitation of design
                  patterns, or system interference is strictly prohibited.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-bold text-on-surface border-b border-surface-container pb-2">
                2. Intellectual Property
              </h2>
              <div className="text-sm text-secondary leading-relaxed">
                <p>
                  All design motifs, artisanal photographs, and product
                  descriptions are the exclusive intellectual property of Siri
                  Arts & Crafts. Reproduction of hand-carved patterns or digital
                  assets without prior written consent is actionable under IP
                  laws.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-bold text-on-surface border-b border-surface-container pb-2">
                3. Bespoke Commissioning
              </h2>
              <div className="text-sm text-secondary leading-relaxed">
                <p>
                  Orders for custom-crafted items require a 50% non-refundable
                  deposit to initiate artisan work. Variations in natural
                  materials (wood grain, stone texture) are hallmarks of
                  authenticity and do not qualify as defects.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-bold text-on-surface border-b border-surface-container pb-2">
                4. Limitation of Liability
              </h2>
              <div className="text-sm text-secondary leading-relaxed">
                <p>
                  Siri Arts & Crafts is not liable for indirect or consequential
                  damages arising from transit delays caused by third-party
                  logistics or force majeure events affecting artisan workshops.
                </p>
              </div>
            </section>

            <div className="pt-8 mt-8 border-t border-surface-container text-[11px] text-secondary uppercase tracking-widest text-center">
              © 2026 Siri Arts & Crafts. All Rights Reserved.
            </div>
          </main>
        </div>
      </div>
    </motion.div>
  );
}
