import React, { useState, useEffect } from 'react';
import { SectionHeader, AdminField, AdminInput, AdminTextarea, AdminToggle } from '../AdminUIKit';
import { ImageUpload } from '../ImageUpload';
import { couponService } from '../../../services/domainServices';

export function ShopPageEditor({ content, onUpdate }) {
  const sp = content || {};
  const hero = sp.hero || {};
  const promo = sp.promo || {};

  const [coupons, setCoupons] = useState([]);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const res = await couponService.getAll();
        if (res.success && res.data) {
          setCoupons(res.data.data || res.data.items || (Array.isArray(res.data) ? res.data : []));
        }
      } catch (err) {
        console.error('Failed to fetch coupons:', err);
      }
    };
    fetchCoupons();
  }, []);

  return (
    <div className="space-y-8">
      <SectionHeader
        icon="storefront"
        title="Shop Page Customizer"
        description="Configure banner headline, description, hero background image, and promo banner."
      />

      <div className="space-y-8">
        {/* Hero Section Banner */}
        <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
            <span className="material-symbols-outlined text-[150px]">storefront</span>
          </div>
          <div className="relative z-10 space-y-6">
            <span className="text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-[0.1em] block border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
              1. Hero Section Setup
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AdminField
                label="Hero Title"
                description="The primary main headline of the shop page"
              >
                <AdminInput
                  value={hero.title || ''}
                  onChange={(e) =>
                    onUpdate('shopPage', { hero: { ...hero, title: e.target.value } })
                  }
                  className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                  placeholder="e.g. Heritage Collection"
                />
              </AdminField>

              <AdminField
                label="Hero Subtitle"
                description="A short tagline or category group text"
              >
                <AdminInput
                  value={hero.subtitle || ''}
                  onChange={(e) =>
                    onUpdate('shopPage', { hero: { ...hero, subtitle: e.target.value } })
                  }
                  className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                  placeholder="e.g. Curated Artisanship"
                />
              </AdminField>
            </div>

            <AdminField
              label="Hero Description"
              description="Immersive description paragraph detailing the shop collections"
            >
              <AdminTextarea
                value={hero.description || ''}
                onChange={(e) =>
                  onUpdate('shopPage', { hero: { ...hero, description: e.target.value } })
                }
                rows={3}
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                placeholder="Describe your collections here..."
              />
            </AdminField>

            <div className="bg-[var(--admin-surface-muted)] p-5 rounded-md border border-[var(--admin-border-subtle)] mt-2">
              <ImageUpload
                label="Hero Background Image"
                value={hero.backgroundImage || ''}
                onChange={(val) =>
                  onUpdate('shopPage', { hero: { ...hero, backgroundImage: val } })
                }
                folder="cms"
              />
            </div>
          </div>
        </div>

        {/* Promo Banner Settings */}
        <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6">
            <span className="material-symbols-outlined text-[150px]">campaign</span>
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
              <span className="text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-[0.1em] block">
                2. Promo Banner Settings
              </span>
              <div className="flex items-center gap-3 bg-[var(--admin-surface-muted)] px-3 py-1.5 rounded-full border border-[var(--admin-border)] shadow-[var(--admin-shadow-xs)] transition-colors hover:border-[var(--admin-accent)]/50">
                <span className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">
                  Enable Promo Banner
                </span>
                <AdminToggle
                  checked={promo.isActive !== false}
                  onChange={() =>
                    onUpdate('shopPage', {
                      promo: { ...promo, isActive: promo.isActive === false ? true : false },
                    })
                  }
                />
              </div>
            </div>

            <AdminField
              label="Linked Coupon"
              description="Select a coupon to automatically apply its discount to the storefront banner."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-3">
                {/* None Option */}
                <div
                  onClick={() => onUpdate('shopPage', { promo: { ...promo, linkedCouponId: '' } })}
                  className={`relative p-5 rounded-md border transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[110px] group ${
                    !promo.linkedCouponId
                      ? 'bg-[var(--admin-accent-subtle)] border-[var(--admin-accent)] shadow-[var(--admin-shadow-sm)]'
                      : 'bg-[var(--admin-surface-muted)] border-[var(--admin-border)] hover:border-[var(--admin-text-tertiary)] opacity-70 hover:opacity-100'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[24px] mb-2 ${!promo.linkedCouponId ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text-tertiary)] group-hover:text-[var(--admin-text-secondary)]'}`}
                  >
                    block
                  </span>
                  <span
                    className={`font-semibold text-[13px] ${!promo.linkedCouponId ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text-secondary)]'}`}
                  >
                    No Linked Coupon
                  </span>
                  <span className="text-[10px] font-normal text-[var(--admin-text-tertiary)] mt-1">
                    Auto-detect or manual
                  </span>

                  {!promo.linkedCouponId && (
                    <span className="absolute top-3 right-3 material-symbols-outlined text-[var(--admin-accent)] text-[18px]">
                      check_circle
                    </span>
                  )}
                </div>

                {/* Coupon Cards */}
                {coupons.map((c) => {
                  const isSelected = promo.linkedCouponId === (c._id || c.code);
                  return (
                    <div
                      key={c._id || c.code}
                      onClick={() =>
                        onUpdate('shopPage', {
                          promo: { ...promo, linkedCouponId: c._id || c.code },
                        })
                      }
                      className={`relative p-5 rounded-md border transition-all cursor-pointer flex flex-col justify-center min-h-[110px] overflow-hidden group ${
                        isSelected
                          ? 'bg-[var(--admin-accent-subtle)] border-[var(--admin-accent)] shadow-[var(--admin-shadow-sm)]'
                          : 'bg-[var(--admin-surface)] border-[var(--admin-border)] hover:border-[var(--admin-accent)]/50 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`material-symbols-outlined text-[16px] ${isSelected ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text-tertiary)] group-hover:text-[var(--admin-text-secondary)]'}`}
                        >
                          local_activity
                        </span>
                        <span
                          className={`font-bold text-[14px] tracking-wide ${isSelected ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text-primary)]'}`}
                        >
                          {c.code}
                        </span>
                      </div>
                      <div
                        className={`text-[22px] font-black leading-none mb-2 ${isSelected ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text-primary)]'}`}
                      >
                        {c.discountType === 'percentage'
                          ? `${c.discountValue}% OFF`
                          : `₹${c.discountValue} OFF`}
                      </div>
                      <div className="text-[10px] text-[var(--admin-text-tertiary)] uppercase tracking-wider font-semibold flex items-center gap-1.5 mt-auto">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-green-500' : 'bg-red-500'}`}
                        ></span>
                        {c.isActive ? 'Active' : 'Inactive'}
                        {c.expiryDate && (
                          <>
                            <span className="opacity-50">•</span>
                            Expires{' '}
                            {new Date(c.expiryDate).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </>
                        )}
                      </div>

                      {isSelected && (
                        <div className="absolute top-3 right-3 text-[var(--admin-accent)]">
                          <span className="material-symbols-outlined text-[20px]">
                            check_circle
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </AdminField>
          </div>
        </div>
      </div>
    </div>
  );
}
