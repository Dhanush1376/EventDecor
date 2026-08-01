import { AlertCircle } from 'lucide-react';
import { Skeleton } from './Skeleton';

/**
 * A centralized, robust rendering utility for data-fetching states.
 * Ensures consistent handling of loading, error, and empty states across the entire app.
 */
export function StateRenderer({
  isLoading,
  isError,
  isEmpty,
  data,
  skeleton: SkeletonComponent = Skeleton,
  errorComponent: ErrorComponent,
  emptyComponent: EmptyComponent,
  children,
}) {
  if (isLoading) {
    return SkeletonComponent ? <SkeletonComponent /> : <Skeleton />;
  }

  if (isError) {
    if (ErrorComponent) return <ErrorComponent />;
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center px-4">
        <AlertCircle className="text-[48px] text-error mb-4 font-light" strokeWidth={1.5} />
        <h3 className="font-headline text-xl text-on-surface mb-2">Something went wrong</h3>
        <p className="font-body text-on-surface-variant max-w-sm">
          We encountered an issue while retrieving this information. Please try again.
        </p>
      </div>
    );
  }

  if (isEmpty || (Array.isArray(data) && data.length === 0) || !data) {
    if (EmptyComponent) return <EmptyComponent />;
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center px-4">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-4 font-light">
          inbox
        </span>
        <h3 className="font-headline text-xl text-on-surface mb-2">Nothing to see here</h3>
        <p className="font-body text-on-surface-variant max-w-sm">
          There are no items to display at this moment. Check back later!
        </p>
      </div>
    );
  }

  return children(data);
}
