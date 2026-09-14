import React from 'react';
import { handleImageError } from '../../../utils/media/imageUtils';
import { PLACEHOLDER_IMAGES } from '../../../constants/placeholderImages';
import { formatINR } from '../utils/returnDomainUtils';

export function ReturnItemInspectionCard({
  item,
  index,
  inspectionState = {},
  onInspectionChange,
  onInspectionSubmit,
  onPreviewImage,
  canInspect = false,
}) {
  const itemUnit = Number(item.unitPrice || 0);
  const itemQty = Number(item.returnQuantity || 1);
  const itemTotal = itemUnit * itemQty;

  const currentInspection = inspectionState[index] || {
    originalProduct: true,
    accessoriesPresent: true,
    packagingIntact: true,
    workingCondition: true,
    inspectionScore: 100,
    remarks: '',
  };

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Product Header Strip */}
      <div className="flex gap-3 sm:gap-4 items-start">
        <img
          src={item.imageSrc || PLACEHOLDER_IMAGES.product}
          alt={item.title || 'Product'}
          onError={handleImageError}
          onClick={() => item.imageSrc && onPreviewImage && onPreviewImage(item.imageSrc)}
          className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-[4px] border border-[var(--admin-border-subtle)] shadow-2xs flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-[var(--admin-text-primary)] leading-snug">
              {item.title || 'Product'}
            </h4>
            <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-[4px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border border-[var(--admin-border-subtle)]">
              Qty: {itemQty} of {item.orderedQuantity || itemQty}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1">
            {item.sku && (
              <span className="text-[11px] font-mono text-[var(--admin-text-tertiary)]">
                SKU: {item.sku}
              </span>
            )}
            {item.variant && (
              <span className="inline-block bg-[var(--admin-bg-subtle)] text-[var(--admin-text-secondary)] text-[10px] font-semibold px-2 py-0.5 rounded-[4px] border border-[var(--admin-border-subtle)]">
                Variant: {item.variant}
              </span>
            )}
          </div>

          <p className="mt-1.5 text-xs font-bold text-[var(--admin-text-primary)] font-mono">
            ₹{formatINR(itemUnit)}{' '}
            <span className="text-[11px] font-normal text-[var(--admin-text-tertiary)]">
              / unit
            </span>
            <span className="text-[var(--admin-text-tertiary)] font-normal mx-1.5">•</span>
            <span className="text-[var(--admin-accent)]">Total: ₹{formatINR(itemTotal)}</span>
          </p>
        </div>
      </div>

      {/* Customer Reason Quote */}
      <div className="p-3.5 rounded-[4px] bg-amber-500/5 border border-amber-500/20 text-xs space-y-1">
        <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider font-bold text-amber-800 dark:text-amber-300">
          <span className="material-symbols-outlined text-[14px] text-amber-600">help_center</span>
          Customer Return Reason:
        </div>
        <p className="font-semibold text-[var(--admin-text-primary)]">
          {item.reason || 'Customer request'}
        </p>
        {item.description && item.description !== item.reason && (
          <p className="text-[var(--admin-text-secondary)] text-[11px] italic leading-relaxed pt-0.5">
            "{item.description}"
          </p>
        )}
      </div>

      {/* Evidence Photos */}
      {item.evidenceImages?.length > 0 && (
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)] mb-2 block">
            Customer Attached Photos ({item.evidenceImages.length})
          </span>
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            {item.evidenceImages.map((img, i) => (
              <img
                key={i}
                src={img}
                alt="Evidence"
                onClick={() => onPreviewImage && onPreviewImage(img)}
                className="w-14 h-14 object-cover rounded-[4px] border border-[var(--admin-border-subtle)] shadow-2xs cursor-pointer hover:scale-105 transition-transform shrink-0"
              />
            ))}
          </div>
        </div>
      )}

      {/* Warehouse Quality Inspection Section */}
      <div className="pt-2">
        {item.inspectionResult?.inspectedAt ? (
          <div className="p-3.5 rounded-[4px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--admin-border-subtle)]">
              <span className="font-bold text-[var(--admin-text-primary)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">
                  fact_check
                </span>
                Warehouse Inspection Result
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-[4px] text-xs font-bold border ${
                  item.inspectionResult.inspectionScore >= 80
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                Score: {item.inspectionResult.inspectionScore}/100
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2 bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border-subtle)]">
                <span className="text-[10px] text-[var(--admin-text-tertiary)] block font-medium">
                  Original Product
                </span>
                <span
                  className={`font-bold ${item.inspectionResult.originalProduct ? 'text-emerald-700' : 'text-red-700'}`}
                >
                  {item.inspectionResult.originalProduct ? 'Verified' : 'Failed'}
                </span>
              </div>
              <div className="p-2 bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border-subtle)]">
                <span className="text-[10px] text-[var(--admin-text-tertiary)] block font-medium">
                  Accessories
                </span>
                <span
                  className={`font-bold ${item.inspectionResult.accessoriesPresent ? 'text-emerald-700' : 'text-red-700'}`}
                >
                  {item.inspectionResult.accessoriesPresent ? 'Complete' : 'Missing'}
                </span>
              </div>
              <div className="p-2 bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border-subtle)]">
                <span className="text-[10px] text-[var(--admin-text-tertiary)] block font-medium">
                  Packaging
                </span>
                <span
                  className={`font-bold ${item.inspectionResult.packagingIntact ? 'text-emerald-700' : 'text-red-700'}`}
                >
                  {item.inspectionResult.packagingIntact ? 'Intact' : 'Damaged'}
                </span>
              </div>
              <div className="p-2 bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border-subtle)]">
                <span className="text-[10px] text-[var(--admin-text-tertiary)] block font-medium">
                  Working Condition
                </span>
                <span
                  className={`font-bold ${item.inspectionResult.workingCondition ? 'text-emerald-700' : 'text-red-700'}`}
                >
                  {item.inspectionResult.workingCondition ? 'Functional' : 'Faulty'}
                </span>
              </div>
            </div>
            {item.inspectionResult.remarks && (
              <p className="text-[11px] text-[var(--admin-text-secondary)] italic pt-1 border-t border-[var(--admin-border-subtle)]">
                Inspector Note: "{item.inspectionResult.remarks}"
              </p>
            )}
          </div>
        ) : canInspect ? (
          <div className="p-4 rounded-[4px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] space-y-3.5 text-xs">
            <h5 className="font-bold text-[var(--admin-text-primary)] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-amber-600">
                rate_review
              </span>
              Record Warehouse Inspection
            </h5>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { field: 'originalProduct', label: 'Original Item' },
                { field: 'accessoriesPresent', label: 'Accessories' },
                { field: 'packagingIntact', label: 'Packaging Intact' },
                { field: 'workingCondition', label: 'Functional' },
              ].map(({ field, label }) => (
                <label
                  key={field}
                  className="flex items-center gap-2 p-2 bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border-subtle)] cursor-pointer hover:border-[var(--admin-accent)] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(currentInspection[field])}
                    onChange={(e) =>
                      onInspectionChange && onInspectionChange(index, field, e.target.checked)
                    }
                    className="accent-amber-600 rounded"
                  />
                  <span className="text-[11px] font-medium text-[var(--admin-text-primary)]">
                    {label}
                  </span>
                </label>
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-medium text-[var(--admin-text-secondary)]">
                  Quality Score:
                </span>
                <span className="font-mono font-bold text-[var(--admin-text-primary)]">
                  {currentInspection.inspectionScore}/100
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={currentInspection.inspectionScore}
                onChange={(e) =>
                  onInspectionChange &&
                  onInspectionChange(index, 'inspectionScore', Number(e.target.value))
                }
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <textarea
                placeholder="Add inspector notes or defect remarks..."
                value={currentInspection.remarks || ''}
                onChange={(e) =>
                  onInspectionChange && onInspectionChange(index, 'remarks', e.target.value)
                }
                rows={2}
                className="admin-input w-full text-xs !rounded-[4px]"
              />
            </div>

            <button
              type="button"
              onClick={() => onInspectionSubmit && onInspectionSubmit(index)}
              className="admin-btn admin-btn-primary !h-8 text-xs !rounded-[4px] cursor-pointer"
            >
              Submit Item Inspection
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
