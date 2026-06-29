import { Link, useLocation } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { policyService } from '../../services/domainServices';
import { Skeleton } from '../ui';

export function PolicySidebar() {
  const { pathname } = useLocation();

  const { data: response, isLoading } = useQuery({
    queryKey: ['public-policies'],
    queryFn: () => policyService.getPublicPolicies(),
  });

  const policies =
    response?.data?.map((p) => ({
      title: p.title,
      path: `/policy/${p.slug}`,
    })) || [];

  return (
    <aside className="lg:col-span-3 space-y-6 sticky top-32 h-fit hidden lg:block border-r border-outline-variant/20 pr-8">
      <h2 className="font-label-sm text-on-surface-variant uppercase tracking-[0.2em] mb-8 font-semibold text-[11px]">
        Help Center
      </h2>
      <nav className="flex flex-col space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4 mb-4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          policies.map((policy) => {
            const isActive = pathname === policy.path;
            return (
              <Link
                key={policy.path}
                to={policy.path}
                className={`relative py-1 font-body text-[14px] transition-all duration-300 ${
                  isActive
                    ? 'text-on-surface font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-on-surface"
                  />
                )}
                {policy.title}
              </Link>
            );
          })
        )}
      </nav>
    </aside>
  );
}

export function MobilePolicyNav() {
  const { pathname } = useLocation();
  const { data: response, isLoading } = useQuery({
    queryKey: ['public-policies'],
    queryFn: () => policyService.getPublicPolicies(),
  });

  const policies =
    response?.data?.map((p) => ({
      title: p.title,
      path: `/policy/${p.slug}`,
    })) || [];

  return (
    <div className="lg:hidden mb-12 overflow-x-auto no-scrollbar border-b border-outline-variant/30">
      <div className="flex px-4 md:px-0 min-w-max">
        {isLoading ? (
          <div className="flex gap-4 px-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        ) : (
          policies.map((policy) => {
            const isActive = pathname === policy.path;
            return (
              <Link
                key={policy.path}
                to={policy.path}
                className={`relative px-6 py-4 text-[12px] uppercase tracking-widest transition-all duration-300 font-label-sm ${
                  isActive
                    ? 'text-on-surface font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {policy.title}
                {isActive && (
                  <motion.div
                    layoutId="mobile-policy-active"
                    className="absolute bottom-0 left-0 w-full h-[2px] bg-on-surface"
                  />
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
