import React from 'react';

/**
 * Summary card displayed during checkout when rental items are in the cart.
 * Shows the rental duration, return date, security deposit, and late fee terms.
 */
export default function RentalDateSummaryCard({
  hasRentalItems,
  rentalStartDate,
  rentalEndDate,
  depositTotal = 0,
}) {
  if (!hasRentalItems || !rentalStartDate || !rentalEndDate) {
    return null;
  }

  const startDateFormatted = new Date(rentalStartDate).toLocaleDateString('en-IN');
  const endDateFormatted = new Date(rentalEndDate).toLocaleDateString('en-IN');

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-5 mb-4 shadow-xs mt-4 mx-0 sm:mx-0">
      <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[15px]">description</span>
        Rental Agreement Summary
      </h4>
      <div className="space-y-1.5 text-[11px] text-secondary mt-3">
        <div className="flex justify-between">
          <span className="font-medium">Rental Period:</span>
          <span className="font-bold">
            {startDateFormatted} - {endDateFormatted}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Return Date:</span>
          <span className="font-bold">{endDateFormatted}</span>
        </div>
        {depositTotal > 0 && (
          <div className="flex justify-between">
            <span className="font-medium">Security Deposit:</span>
            <span className="font-bold">₹{depositTotal.toLocaleString()}</span>
          </div>
        )}
        <div className="mt-3 p-2 bg-white/60 rounded-md text-[10px] italic">
          <strong>Late Fee Policy:</strong> Failure to return the items by the return date will
          result in a daily penalty deducted from the security deposit.
        </div>
      </div>
    </div>
  );
}
