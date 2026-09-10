import React, { useState } from 'react';
import Tag from 'lucide-react/dist/esm/icons/tag';
import { CouponCard } from '../../../../components/ui/ProductCoupons';

export function CouponPreview({ formData }) {
  const [copied, setCopied] = useState(false);

  const couponData = {
    code: formData.code || 'COUPON',
    discountType: formData.discountType || 'percentage',
    discountValue: formData.discountValue || 0,
    minOrderAmount: Number(formData.minOrderAmount || 0),
    expiryDate: formData.expiryDate || '',
  };

  const handleCopy = () => {
    if (formData.code) {
      navigator.clipboard?.writeText(formData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* Sleek Live Preview Heading */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--admin-border)]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-[var(--admin-accent)]">
            visibility
          </span>
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)]">
            Storefront Preview
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Product Detail Page Coupon Card */}
      <div className="w-full max-w-[280px] sm:max-w-[300px] mr-auto space-y-2.5 text-left">
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-[var(--admin-text-primary)]" strokeWidth={1.5} />
          <span className="font-label text-[10.5px] text-[var(--admin-text-primary)] uppercase tracking-[0.1em] font-bold">
            Available Coupons & Savings
          </span>
        </div>

        <CouponCard
          coupon={couponData}
          isBest={Boolean(formData.isFeatured)}
          isEligible={formData.isActive !== false}
          isCopied={copied}
          onApply={handleCopy}
          showHoverByDefault={true}
        />
      </div>
    </div>
  );
}
