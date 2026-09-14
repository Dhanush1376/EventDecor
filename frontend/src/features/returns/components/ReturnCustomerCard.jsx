import React from 'react';

export function ReturnCustomerCard({
  customer,
  pickupAddress = {},
  userStats = { totalOrders: 1, totalReturns: 0, returnPercentage: 0 },
  onViewProfile,
}) {
  const customerName = customer?.name || pickupAddress?.name || 'Customer Name';
  const customerPhone = customer?.phone || pickupAddress?.phone || 'No phone provided';
  const customerEmail = customer?.email || 'No email provided';

  const fullAddress = [
    pickupAddress.address || pickupAddress.street || pickupAddress.addressLine1,
    pickupAddress.addressLine2,
    pickupAddress.locality,
    pickupAddress.landmark,
    pickupAddress.city,
    pickupAddress.district,
    pickupAddress.state,
    pickupAddress.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="bg-white dark:bg-stone-900 rounded-[4px] shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">person</span>
          Customer
        </h3>
        {onViewProfile && (
          <button
            type="button"
            onClick={onViewProfile}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] hover:underline cursor-pointer transition-colors"
            title="View Customer Profile"
          >
            <span>View Profile</span>
            <span className="material-symbols-outlined text-[12px]">open_in_new</span>
          </button>
        )}
      </div>

      <div className="p-4 sm:p-5 space-y-5 text-xs">
        {/* Customer Identity Row */}
        <div
          onClick={onViewProfile}
          className={`flex items-start gap-3.5 p-1.5 -m-1.5 rounded-[4px] transition-colors ${
            onViewProfile ? 'hover:bg-[var(--admin-surface-muted)]/70 cursor-pointer group' : ''
          }`}
          title={onViewProfile ? 'Click to view customer profile' : undefined}
        >
          <div
            className={`w-11 h-11 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-[15px] border border-blue-100 dark:border-blue-900/40 shadow-2xs ${
              onViewProfile ? 'group-hover:scale-105 transition-transform' : ''
            }`}
          >
            {customerName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p
                className={`text-[14.5px] font-bold text-[var(--admin-text-primary)] truncate ${
                  onViewProfile ? 'group-hover:text-[var(--admin-accent)] transition-colors' : ''
                }`}
              >
                {customerName}
              </p>
              {onViewProfile && (
                <span className="material-symbols-outlined text-[13px] text-[var(--admin-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">
                  open_in_new
                </span>
              )}
            </div>
            <div className="text-[12px] text-[var(--admin-text-secondary)] mt-1 flex flex-col gap-1">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)]">
                  phone
                </span>
                <span className="font-mono text-[11.5px]">{customerPhone}</span>
              </span>
              <span className="flex items-center gap-1.5 truncate">
                <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)]">
                  mail
                </span>
                <span className="truncate">{customerEmail}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Account Activity & Return Metrics */}
        <div className="!mt-4 grid grid-cols-3 gap-2 py-2.5 px-3 rounded-[4px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] text-center">
          <div>
            <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-bold tracking-wider block">
              Orders
            </span>
            <p className="text-[14px] font-bold font-mono text-[var(--admin-text-primary)] mt-0.5">
              {userStats?.totalOrders || 1}
            </p>
          </div>
          <div className="border-x border-[var(--admin-border-subtle)]">
            <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-bold tracking-wider block">
              Returns
            </span>
            <p className="text-[14px] font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
              {userStats?.totalReturns || 0}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-bold tracking-wider block">
              Return Rate
            </span>
            <p className="text-[14px] font-bold font-mono text-[var(--admin-text-primary)] mt-0.5">
              {userStats?.returnPercentage || 0}%
            </p>
          </div>
        </div>

        {/* Reverse Pickup Address */}
        <div className="pt-4 border-t border-[var(--admin-border-subtle)]">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/60 dark:border-amber-800/40 shadow-2xs mt-0.5">
              <span className="material-symbols-outlined text-[20px]">location_on</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10.5px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider block">
                  Reverse Pickup Address
                </span>
                {fullAddress && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] hover:underline cursor-pointer transition-colors"
                    title="View on Google Maps"
                  >
                    <span>Maps</span>
                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                  </a>
                )}
              </div>
              <p className="font-semibold text-[var(--admin-text-primary)] text-[12.5px]">
                {pickupAddress.name || customerName}
              </p>
              <p className="text-[12px] text-[var(--admin-text-secondary)] mt-1 leading-relaxed">
                {fullAddress || 'No pickup address specified.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
