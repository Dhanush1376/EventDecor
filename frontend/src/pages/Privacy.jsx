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
      transition={{ duration: 0.6 }}
      className="bg-surface min-h-screen pt-24 pb-32 font-body text-on-surface selection:bg-primary/20"
    >
      <SEO
        title="Privacy Policy"
        description="Our commitment to protecting your data and privacy at Siri Arts & Crafts."
      />
      
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
        {/* Help Center Header - Huge Typography */}
        <div className="mb-12 md:mb-20 text-center md:text-left">
          <nav className="text-[10px] uppercase font-bold text-on-surface-variant tracking-[0.2em] mb-6 flex items-center justify-center md:justify-start gap-3">
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span className="w-1 h-1 rounded-full bg-outline-variant/50"></span>
            <span>Help Center</span>
            <span className="w-1 h-1 rounded-full bg-outline-variant/50"></span>
            <span className="text-on-surface">Privacy Policy</span>
          </nav>
          <h2 className="text-4xl md:text-6xl lg:text-[72px] font-display font-light text-on-surface tracking-tight leading-none mb-6">
            Privacy Policy
          </h2>
          <p className="text-[12px] text-on-surface-variant uppercase tracking-widest font-medium">
            Last updated: May 15, 2026
          </p>
        </div>

        <MobilePolicyNav />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-24">
          <PolicySidebar />

          {/* Main Content Area - Editorial Flow */}
          <main className="lg:col-span-8 xl:col-span-7">
            <div className="prose prose-sm md:prose-base max-w-none prose-headings:font-display prose-headings:font-normal prose-headings:tracking-tight prose-headings:text-on-surface prose-p:text-on-surface/80 prose-p:leading-loose prose-p:font-light prose-li:text-on-surface/80 prose-li:font-light prose-li:leading-loose space-y-16">
              
              <section className="scroll-mt-32">
                <h3 className="text-2xl md:text-3xl text-on-surface mb-6">
                  1. Data Collection
                </h3>
                <div className="text-[15px] text-on-surface/80 leading-[1.8] font-light space-y-4">
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

              <section className="scroll-mt-32">
                <h3 className="text-2xl md:text-3xl text-on-surface mb-6">
                  2. Usage of Information
                </h3>
                <div className="text-[15px] text-on-surface/80 leading-[1.8] font-light space-y-4">
                  <p>
                    Your data is used exclusively for order processing,
                    personalized artisan consultations, and secure platform
                    updates. We never trade or sell your private information to
                    third-party commercial entities.
                  </p>
                </div>
              </section>

              <section className="scroll-mt-32">
                <h3 className="text-2xl md:text-3xl text-on-surface mb-6">
                  3. Security Infrastructure
                </h3>
                <div className="text-[15px] text-on-surface/80 leading-[1.8] font-light space-y-4">
                  <p>
                    We implement 256-bit SSL encryption across all data transit
                    points. Payment credentials are handled via PCI-DSS compliant
                    gateways and are never stored on our local heritage servers.
                  </p>
                </div>
              </section>

              <section className="scroll-mt-32">
                <h3 className="text-2xl md:text-3xl text-on-surface mb-6">
                  4. Your Rights
                </h3>
                <div className="text-[15px] text-on-surface/80 leading-[1.8] font-light space-y-4">
                  <p>
                    You retain the absolute right to request access to your data,
                    initiate corrections, or request complete erasure of your
                    profile parameters from our digital registry at any time.
                  </p>
                </div>
              </section>

            </div>

            <div className="mt-24 pt-12 border-t border-outline-variant/20 text-[10px] text-on-surface-variant uppercase tracking-[0.2em] text-center md:text-left">
              © 2026 Siri Arts & Crafts. All Rights Reserved.
            </div>
          </main>
        </div>
      </div>
    </motion.div>
  );
}
