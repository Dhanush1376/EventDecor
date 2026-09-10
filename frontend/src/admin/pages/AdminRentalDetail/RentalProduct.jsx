import React from 'react';

const formatDateDMY = (dateStr) => {
  if (!dateStr) return 'N/A';
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export function RentalProduct({ rental }) {
  // Use exact, uncompressed currency formatting (no 'K' or 'Cr' on invoices/orders)
  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const quantity = Number(rental.quantity || 1);
  const unitRentalPrice = Number(
    rental.rentalRate?.rentalPrice ??
      rental.rentalRate?.rate ??
      (quantity > 0 && rental.rentalCharge
        ? Math.round((rental.rentalCharge / quantity) * 100) / 100
        : rental.rentalCharge || 0),
  );

  const totalDeposit = Number(rental.securityDeposit || 0);
  const totalRentalCharge = Number(rental.rentalCharge || unitRentalPrice * quantity);
  const deliveryCharge = Number(rental.deliveryCharge || 0);
  const walletDeduction = Number(rental.walletDeduction || 0);
  const tax = Number(rental.tax || 0);
  const grandTotal = Number(
    rental.totalAmount ??
      Math.max(0, totalRentalCharge + totalDeposit + deliveryCharge - walletDeduction),
  );

  const items =
    Array.isArray(rental.items) && rental.items.length > 0
      ? rental.items.map((item) => {
          const itemQty = Number(item.quantity || item.qty || 1);
          const itemRate = Number(item.price ?? item.rentalPrice ?? unitRentalPrice);
          const itemDeposit =
            item.deposit !== undefined
              ? Number(item.deposit)
              : totalDeposit / (rental.items.length || 1);
          return {
            ...item,
            name: item.name || item.title || rental.productTitle || 'Rented Item',
            price: itemRate,
            quantity: itemQty,
            deposit: itemDeposit,
            itemTotal: itemRate * itemQty,
            image: item.image || item.imageSrc || rental.productImage || '',
            productId:
              item.productId ||
              item.product?._id ||
              item.product ||
              rental.product?._id ||
              rental.product,
          };
        })
      : [
          {
            name: rental.productTitle || 'Rented Product',
            price: unitRentalPrice,
            quantity: quantity,
            deposit: totalDeposit,
            itemTotal: totalRentalCharge,
            image:
              rental.productImage || rental.productImages?.[0] || rental.productThumbnail || '',
            rentalRate: unitRentalPrice,
            productId: rental.product?._id || rental.product,
          },
        ];

  return (
    <div className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border)] overflow-hidden">
      {/* Header */}
      <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">inventory_2</span>
          Rented Items
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] px-2.5 py-0.5 rounded-[4px] border border-[var(--admin-border-subtle)]">
            {items.length} {items.length === 1 ? 'Item' : 'Items'}
          </span>
          {rental.durationDays && (
            <span className="text-[11px] font-bold text-[var(--admin-accent)] bg-[var(--admin-accent-light)] px-2.5 py-0.5 rounded-[4px] border border-[var(--admin-accent-muted)]">
              {rental.durationDays} Days Duration
            </span>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="divide-y divide-[var(--admin-border-subtle)]">
        {items.map((item, index) => {
          const itemDeposit = item.deposit !== undefined ? item.deposit : totalDeposit;
          const productId = item.productId || item._id;

          return (
            <div
              key={index}
              className="px-3.5 py-4 sm:p-5 flex items-start gap-3 sm:gap-4 hover:bg-[var(--admin-surface-muted)] transition-colors group"
            >
              {/* Product Thumbnail */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[4px] bg-gray-100 dark:bg-stone-800 border border-[var(--admin-border)] shrink-0 overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="material-symbols-outlined text-[32px]">image</span>
                  </div>
                )}
                <div className="absolute top-0 right-0 bg-[var(--admin-text-primary)] text-[var(--admin-text-inverse)] text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-bl-[4px]">
                  RENTAL
                </div>
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] group-hover:text-[var(--admin-accent)] transition-colors line-clamp-2 leading-snug">
                    {item.name}
                  </h4>
                  {productId && (
                    <a
                      href={`/product/${productId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-5 px-1.5 text-[9.5px] font-bold text-[var(--admin-text-secondary)] hover:text-[var(--admin-accent)] hover:border-[var(--admin-accent)] bg-[var(--admin-surface)] rounded-[3px] border border-[var(--admin-border-subtle)] inline-flex items-center gap-1 shrink-0 transition-colors shadow-2xs cursor-pointer"
                      title="View item on shop"
                    >
                      <span>View</span>
                      <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                    </a>
                  )}
                </div>

                {/* Rental dates positioned at bottom right */}
                {rental.rentalStartDate && rental.rentalEndDate && (
                  <div className="flex justify-end mt-2">
                    <p className="text-[11px] text-[var(--admin-text-secondary)] font-medium inline-flex items-center gap-1 bg-[var(--admin-bg-subtle)]/70 px-2 py-0.5 rounded-[4px] border border-[var(--admin-border-subtle)]">
                      <span className="material-symbols-outlined text-[13px] text-[var(--admin-accent)]">
                        calendar_clock
                      </span>
                      <span>
                        {formatDateDMY(rental.rentalStartDate)} to{' '}
                        {formatDateDMY(rental.rentalEndDate)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Totals Footer */}
      <div className="px-3 py-4 sm:p-5 lg:p-6 bg-[var(--admin-bg-subtle)] border-t border-[var(--admin-border-subtle)]">
        <div className="flex flex-col items-end gap-2 text-[13px] font-medium text-[var(--admin-text-secondary)]">
          <div className="flex justify-between w-full sm:w-72">
            <span>
              Rental Price{' '}
              {quantity > 1
                ? `(${quantity} × ${formatCurrency(unitRentalPrice)})`
                : `(${formatCurrency(unitRentalPrice)})`}
            </span>
            <span className="font-bold text-[var(--admin-text-primary)] font-mono">
              {formatCurrency(totalRentalCharge)}
            </span>
          </div>

          <div className="flex justify-between w-full sm:w-72">
            <span className="text-[var(--admin-text-secondary)] font-medium">Security Deposit</span>
            <span className="font-bold text-[var(--admin-text-primary)] font-mono">
              {formatCurrency(totalDeposit)}
            </span>
          </div>

          {deliveryCharge > 0 && (
            <div className="flex justify-between w-full sm:w-72">
              <span>Delivery / Logistics</span>
              <span className="font-bold text-[var(--admin-text-primary)] font-mono">
                {formatCurrency(deliveryCharge)}
              </span>
            </div>
          )}

          {walletDeduction > 0 && (
            <div className="flex justify-between w-full sm:w-72 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">
                  account_balance_wallet
                </span>
                Siri Pay / Wallet Discount
              </span>
              <span className="font-bold font-mono">-{formatCurrency(walletDeduction)}</span>
            </div>
          )}

          <div className="flex justify-between w-full sm:w-72 pt-3 border-t border-[var(--admin-border-strong)] text-[15px] font-bold text-[var(--admin-text-primary)]">
            <span>Grand Total</span>
            <span className="text-[18px] font-black text-[var(--admin-accent)] font-mono">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
