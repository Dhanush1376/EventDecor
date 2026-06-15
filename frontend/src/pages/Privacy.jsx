import { Link } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { PolicySidebar, MobilePolicyNav } from '../components/layout/PolicySidebar';
import { SEO } from '../components/seo/SEO';
import { Skeleton } from '../components/ui';
import { useQuery } from '@tanstack/react-query';
import { policyService } from '../services/domainServices';
import { createSafeHtml } from '../utils/sanitize';

export function Privacy() {
  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['policy', 'privacy-policy'],
    queryFn: () => policyService.getBySlug('privacy-policy'),
  });

  const privacy = response?.data || {
    title: 'Privacy Policy',
    content: '<p>Policy content is not available.</p>',
    updatedAt: new Date().toISOString(),
  };
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
          <h2 className="text-2xl md:text-3xl font-body font-semibold text-on-surface mb-4">
            {isLoading ? <Skeleton className="h-10 w-64" /> : privacy.title}
          </h2>
          <p className="text-[12px] text-on-surface-variant uppercase tracking-widest font-medium">
            {isLoading ? (
              <Skeleton className="h-4 w-40" />
            ) : (
              `Last updated: ${new Date(privacy.updatedAt).toLocaleDateString()}`
            )}
          </p>
        </div>

        <MobilePolicyNav />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-24">
          <PolicySidebar />

          {/* Main Content Area - Editorial Flow */}
          <main className="lg:col-span-8 xl:col-span-7">
            <div className="prose prose-sm max-w-none prose-headings:font-body prose-headings:font-semibold prose-headings:text-on-surface prose-p:text-on-surface/80 prose-p:leading-relaxed prose-p:font-normal prose-li:text-on-surface/80 prose-li:font-normal prose-li:leading-relaxed space-y-8">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-5/6" />
                  <Skeleton className="h-6 w-4/6" />
                </div>
              ) : isError ? (
                <div className="text-red-500">Failed to load policy. Please try again later.</div>
              ) : (
                <div
                  className="text-[13px] text-on-surface/80 leading-relaxed font-normal space-y-3"
                  dangerouslySetInnerHTML={createSafeHtml(privacy.content)}
                />
              )}
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
