import { Link, useParams } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { PolicySidebar, MobilePolicyNav } from '../components/layout/PolicySidebar';
import { SEO } from '../components/seo/SEO';
import { Skeleton } from '../components/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { policyService } from '../services/domainServices';
import { createSafeHtml } from '../utils/security/sanitize';
import { useEffect } from 'react';
import { getApiRootUrl } from '../config/apiConfig';
import logger from '../utils/core/logger';
import { MandalaElement } from '../components/ui/MandalaElement';

export function GenericPolicyPage({ slug: propSlug, defaultTitle }) {
  const { slug: paramSlug } = useParams();
  const slug = propSlug || paramSlug;
  const queryClient = useQueryClient();
  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['policy', slug],
    queryFn: () => policyService.getBySlug(slug),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!slug,
  });

  useEffect(() => {
    if (!slug) return;
    const rawApiUrl = getApiRootUrl();
    let socketServerUrl = rawApiUrl;
    if (socketServerUrl.endsWith('/api/v1')) {
      socketServerUrl = socketServerUrl.slice(0, -7);
    } else if (socketServerUrl.endsWith('/api')) {
      socketServerUrl = socketServerUrl.slice(0, -4);
    }

    let socket;

    import('socket.io-client')
      .then(({ io }) => {
        socket = io(`${socketServerUrl}/visitor`, {
          transports: ['websocket', 'polling'],
        });

        socket.on('policy-updated', (data) => {
          if (data?.slug === slug) {
            logger.info(`[PolicySync] Real-time update received for ${slug}, invalidating cache.`);
            queryClient.invalidateQueries({ queryKey: ['policy', slug] });
          }
        });
      })
      .catch((err) => {
        logger.warn('[PolicySync] Failed to load socket.io-client', err);
      });

    return () => {
      if (socket) socket.disconnect();
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
      className="bg-surface min-h-screen pt-24 pb-12 font-body text-on-surface selection:bg-primary/20 relative overflow-hidden"
    >
      <MandalaElement
        variant={1}
        className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 text-primary opacity-5 lg:opacity-10 pointer-events-none"
      />
      <MandalaElement
        variant={2}
        className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 text-primary opacity-5 lg:opacity-10 pointer-events-none"
      />
      <SEO title={policy.title} description={`Read our ${policy.title} at Siri Arts & Crafts.`} />

      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 lg:px-12 relative z-10">
        {/* Help Center Header */}
        <div className="mb-12 lg:mb-20 text-center lg:text-left">
          <nav className="text-[10px] uppercase font-bold text-on-surface-variant tracking-[0.2em] mb-6 flex items-center justify-center lg:justify-start gap-3">
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span className="w-1 h-1 rounded-full bg-outline-variant/50"></span>
            <span>Help Center</span>
            <span className="w-1 h-1 rounded-full bg-outline-variant/50"></span>
            <span className="text-on-surface">{defaultTitle || policy?.title || 'Policy'}</span>
          </nav>
          <h2 className="text-2xl lg:text-3xl font-body font-semibold text-on-surface mb-4">
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
                <div className="space-y-12">
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-1/3 mb-6" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-1/4 mb-6" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-10/12" />
                    <Skeleton className="h-4 w-full" />
                  </div>
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
          </main>
        </div>
      </div>
    </motion.div>
  );
}
