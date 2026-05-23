import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PolicySidebar,
  MobilePolicyNav,
} from "../components/layout/PolicySidebar";
import { SEO } from "../components/seo/SEO";

export function Privacy() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-surface-container-low min-h-screen pt-20 pb-32 font-body text-on-surface"
    >
      <SEO
        title="Privacy Policy"
        description="Our commitment to protecting your data and privacy at Siri Arts & Crafts."
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
            <span className="text-on-surface">Privacy Policy</span>
          </nav>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-on-surface">
            Privacy Policy
          </h2>
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
                1. Data Collection
              </h2>
              <div className="text-sm text-secondary leading-relaxed space-y-3">
                <p>
                  We collect essential parameters to facilitate your luxury
                  shopping experience:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Identity:</strong> Name, cell number, and email
                    address.
                  </li>
                  <li>
                    <strong>Logistics:</strong> Delivery and billing address
                    coordinates.
                  </li>
                  <li>
                    <strong>Interaction:</strong> Browsing history and wishlist
                    preferences.
                  </li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-bold text-on-surface border-b border-surface-container pb-2">
                2. Usage of Information
              </h2>
              <div className="text-sm text-secondary leading-relaxed">
                <p>
                  Your data is used exclusively for order processing,
                  personalized artisan consultations, and secure platform
                  updates. We never trade or sell your private information to
                  third-party commercial entities.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-bold text-on-surface border-b border-surface-container pb-2">
                3. Security Infrastructure
              </h2>
              <div className="text-sm text-secondary leading-relaxed">
                <p>
                  We implement 256-bit SSL encryption across all data transit
                  points. Payment credentials are handled via PCI-DSS compliant
                  gateways and are never stored on our local heritage servers.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-bold text-on-surface border-b border-surface-container pb-2">
                4. Your Rights
              </h2>
              <div className="text-sm text-secondary leading-relaxed">
                <p>
                  You retain the absolute right to request access to your data,
                  initiate corrections, or request complete erasure of your
                  profile parameters from our digital registry at any time.
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
