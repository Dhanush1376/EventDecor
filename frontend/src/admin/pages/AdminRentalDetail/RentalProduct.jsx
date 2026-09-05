import React from 'react';

export function RentalProduct({ rental }) {
  const startDate = new Date(rental.rentalStartDate).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const endDate = new Date(rental.rentalEndDate).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const productId = rental.product?._id || rental.product;
  const quantity = rental.quantity || 1;
  const ratePerDay =
    rental.rentalRate?.rate ||
    (rental.durationDays ? Math.round((rental.rentalCharge || 0) / rental.durationDays) : null);

  return (
    <div className="bg-[var(--admin-surface)] rounded-lg shadow-sm border border-[var(--admin-border)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)] shrink-0">
            inventory_2
          </span>
          <h3 className="text-[13.5px] font-bold text-[var(--admin-text-primary)] truncate">
            Rented Item
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold text-[var(--admin-text-primary)] bg-[var(--admin-surface)] px-2.5 py-0.5 rounded-md border border-[var(--admin-border-subtle)] shadow-xs">
            {quantity} {quantity === 1 ? 'Item' : 'Items'}
          </span>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200 shadow-xs">
            {rental.durationDays} Days Rental
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
          {/* Image */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-gray-100 border border-[var(--admin-border)] shrink-0 overflow-hidden relative shadow-inner">
            {rental.productImage ? (
              <img
                src={rental.productImage}
                alt={rental.productTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="material-symbols-outlined text-[32px]">image</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 w-full space-y-3">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-[16px] font-bold text-[var(--admin-text-primary)] leading-snug">
                  {rental.productTitle}
                </h4>
                {productId && (
                  <a
                    href={`/product/${productId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 flex items-center gap-1 shrink-0"
                    title="View item on shop"
                  >
                    <span>View Product</span>
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                  </a>
                )}
              </div>

              {ratePerDay ? (
                <p className="text-[12px] text-[var(--admin-text-secondary)] mt-1 font-medium">
                  Rate:{' '}
                  <strong className="text-[var(--admin-text-primary)]">
                    ₹{ratePerDay.toLocaleString('en-IN')}
                  </strong>{' '}
                  per day
                </p>
              ) : null}
            </div>

            {/* Simple, visual rental timeline boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    Pickup / Delivery Date
                  </span>
                  <span className="text-[12.5px] font-bold text-emerald-950 truncate block">
                    {startDate}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">assignment_return</span>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                    Return Date (Due)
                  </span>
                  <span className="text-[12.5px] font-bold text-amber-950 truncate block">
                    {endDate}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
