import { Info } from 'lucide-react';
import React from 'react';
import { ProductSummaryCard } from '../ui/CustomizationFields';
import { DynamicCustomOrderWizard } from '../ui/DynamicCustomOrderWizard';

export function CustomOrderWizard({
  isAuthenticated,
  runProtectedAction,
  linkedProduct,
  setLinkedProduct,
  setActiveTab,
  loadWorkspaceData,
  eventIdQuery,
}) {
  return (
    <div className="space-y-4 w-full">
      {/* Elegant Luxury Guest Acknowledgment */}
      {!isAuthenticated && (
        <div className="bg-white border border-[var(--color-gold)]/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px] shadow-sm">
          <div className="flex items-center gap-2.5">
            <Info className="text-[var(--color-gold)] text-[20px]" strokeWidth={1.5} />
            <p className="text-[#685C57] font-light">
              <strong className="text-[var(--color-on-surface)] font-medium">Guest Session:</strong>{' '}
              Draft your request now. Sign in later to submit and track quotes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => runProtectedAction(() => {})}
            className="px-4 py-1.5 bg-[var(--color-on-surface)] text-white rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-[var(--color-gold)] transition-all cursor-pointer text-center shrink-0 self-start sm:self-auto"
          >
            Sign In / Register
          </button>
        </div>
      )}

      {linkedProduct && (
        <div className="mb-6">
          <ProductSummaryCard product={linkedProduct} onClear={() => setLinkedProduct(null)} />
        </div>
      )}

      <DynamicCustomOrderWizard
        onComplete={(order) => {
          setActiveTab('tracker');
          loadWorkspaceData();
        }}
        initialProductPayload={
          linkedProduct
            ? {
                productId: linkedProduct._id,
                productType: linkedProduct.category,
                productTitle: linkedProduct.title,
                productSnapshot: {
                  productId: linkedProduct._id,
                  title: linkedProduct.title,
                  imageSrc:
                    linkedProduct.images && linkedProduct.images.length > 0
                      ? linkedProduct.images[0].url || linkedProduct.images[0]
                      : '',
                  price: linkedProduct.price,
                },
              }
            : null
        }
        initialEventType={eventIdQuery ? { eventId: eventIdQuery } : null}
      />
    </div>
  );
}
