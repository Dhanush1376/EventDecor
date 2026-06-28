import { Link } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { PolicySidebar, MobilePolicyNav } from '../components/layout/PolicySidebar';
import { SEO } from '../components/seo/SEO';
import { Skeleton } from '../components/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { policyService } from '../services/domainServices';
import { createSafeHtml } from '../utils/security/sanitize';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { getApiRootUrl } from '../config/apiConfig';
import logger from '../utils/core/logger';

export function GenericPolicyPage({ slug, defaultTitle }) {
  const queryClient = useQueryClient();
  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['policy', slug],
    queryFn: () => policyService.getBySlug(slug),
  });

  useEffect(() => {
    const rawApiUrl = getApiRootUrl();
    let socketServerUrl = rawApiUrl;
    if (socketServerUrl.endsWith('/api/v1')) {
      socketServerUrl = socketServerUrl.slice(0, -7);
    } else if (socketServerUrl.endsWith('/api')) {
      socketServerUrl = socketServerUrl.slice(0, -4);
    }

    const socket = io(`${socketServerUrl}/visitor`, {
      transports: ['websocket', 'polling'],
    });

    socket.on('policy-updated', (data) => {
      if (data?.slug === slug) {
        logger.info(`[PolicySync] Real-time update received for ${slug}, invalidating cache.`);
        queryClient.invalidateQueries({ queryKey: ['policy', slug] });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [slug, queryClient]);

  const policy = response?.data || {
    title: defaultTitle,
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
      <SEO title={policy.title} description={`Read our ${policy.title} at Siri Arts & Crafts.`} />

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
        {/* Help Center Header */}
        <div className="mb-12 md:mb-20 text-center md:text-left">
          <nav className="text-[10px] uppercase font-bold text-on-surface-variant tracking-[0.2em] mb-6 flex items-center justify-center md:justify-start gap-3">
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span className="w-1 h-1 rounded-full bg-outline-variant/50"></span>
            <span>Help Center</span>
            <span className="w-1 h-1 rounded-full bg-outline-variant/50"></span>
            <span className="text-on-surface">{defaultTitle}</span>
          </nav>
          <h2 className="text-2xl md:text-3xl font-body font-semibold text-on-surface mb-4">
            {isLoading ? <Skeleton className="h-10 w-64" /> : policy.title}
          </h2>
          <div className="text-[12px] text-on-surface-variant uppercase tracking-widest font-medium">
            {isLoading ? (
              <Skeleton className="h-4 w-40" />
            ) : (
              `Last updated: ${new Date(policy.updatedAt).toLocaleDateString()}`
            )}
          </div>
        </div>

        <MobilePolicyNav />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-24">
          <PolicySidebar />

          <main className="lg:col-span-8 xl:col-span-7">
            <div className="prose prose-sm max-w-none prose-headings:font-body prose-headings:font-bold prose-headings:text-on-surface prose-p:text-on-surface/80 prose-p:leading-relaxed prose-p:font-normal prose-li:text-on-surface/80 prose-li:font-normal prose-li:leading-relaxed space-y-8">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-5/6" />
                  <Skeleton className="h-6 w-4/6" />
                </div>
              ) : isError ? (
                <div className="text-red-500">Failed to load policy. Please try again later.</div>
              ) : (
                (() => {
                  try {
                    const sets = JSON.parse(policy.content);
                    if (Array.isArray(sets)) {
                      return (
                        <div className="space-y-8">
                          {sets.map((set, i) => (
                            <div key={i} className="space-y-3">
                              {set.heading && (
                                <h2 className="font-bold text-[15px] text-on-surface">
                                  {set.heading}
                                </h2>
                              )}
                              {set.paragraph && (
                                <p className="text-[13px] text-on-surface/80 leading-relaxed font-normal whitespace-pre-wrap">
                                  {set.paragraph}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    }
                  } catch (e) {}

                  // Fallback for legacy raw HTML content
                  return (
                    <div
                      className="text-[13px] text-on-surface/80 leading-relaxed font-normal space-y-3 [&_h2]:font-bold [&_h2]:text-[15px] [&_h2]:text-on-surface [&_h2]:mt-8 [&_h2:first-child]:mt-0 [&_h2]:mb-3 [&_p]:mb-4"
                      dangerouslySetInnerHTML={createSafeHtml(policy.content)}
                    />
                  );
                })()
              )}
            </div>

            <div className="mt-24 pt-12 border-t border-outline-variant/20 text-[10px] text-on-surface-variant uppercase tracking-[0.2em] text-center md:text-left">
              © {new Date().getFullYear()} Siri Arts & Crafts. All Rights Reserved.
            </div>
          </main>
        </div>
      </div>
    </motion.div>
  );
}
