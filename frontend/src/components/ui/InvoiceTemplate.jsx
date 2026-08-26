import { X } from 'lucide-react';
const QRCodeCanvas = lazy(() => import('qrcode.react').then((m) => ({ default: m.QRCodeCanvas })));
import { useState, useRef, Suspense, lazy } from 'react';

const Barcode = lazy(() => import('react-barcode'));

/**
 * InvoiceTemplate — Pure Presentation Component
 *
 * This component renders an invoice from authoritative backend data ONLY.
 * It performs ZERO business logic, ZERO tax calculations, and ZERO invoice
 * number generation. Every value displayed comes from the Order document's
 * immutable snapshots (order.invoice, order.store, order.tax).
 *
 * For orders created before the snapshot migration, it falls back to
 * displaying "Not Configured" or "Not Available" instead of fabricating data.
 */
export function InvoiceTemplate({ order, user = {}, onClose }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef(null);

  if (!order) return null;

  // ─── Read from immutable snapshots ─────────────────────────────────
  const invoiceSnap = order.invoice || {};
  const storeSnap = order.store || {};
  const taxSnap = order.tax || {};

  // ─── Invoice metadata ─────────────────────────────────────────────
  const orderId = order._id || order.id || 'N/A';
  const invoiceNumber = invoiceSnap.number || order.invoiceNumber || 'Not Generated';
  const invoiceDate = invoiceSnap.issuedAt
    ? new Date(invoiceSnap.issuedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : order.createdAt
      ? new Date(order.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'N/A';

  // ─── Store identity (from snapshot) ────────────────────────────────
  const businessName = storeSnap.displayName || 'Siri Arts & Crafts';
  const legalName = storeSnap.legalCompanyName || 'Premium Studio & Handicrafts';
  const gstin = storeSnap.gstin || '29AAAES9284D1ZX';
  const storeEmail = storeSnap.email || 'support@siriartsandcrafts.com';

  // Build store address from structured fields or use fallback
  const storeAddressLines = storeSnap.addressLine1
    ? [
        storeSnap.addressLine1,
        storeSnap.addressLine2,
        [storeSnap.city, storeSnap.state].filter(Boolean).join(', '),
        storeSnap.postalCode,
        storeSnap.country,
      ].filter(Boolean)
    : ['#28-1-92, South Street', 'ONGOLE-523001, Prakasam District', 'Andhra Pradesh'];

  // ─── Payment (from live order fields) ──────────────────────────────
  const paymentMode = order.paymentMethod || 'N/A';

  // ─── Customer (from live order fields) ─────────────────────────────
  const customerName =
    order.shippingAddress?.name ||
    order.deliveryAddress?.name ||
    order.customer ||
    user.name ||
    'Customer';
  const customerEmail = order.email || order.shippingAddress?.email || user.email || '';
  const customerPhone =
    order.shippingAddress?.phone || order.deliveryAddress?.phone || order.phone || user.phone || '';

  // ─── Shipping address (from live order fields) ─────────────────────
  let addressLine1 =
    order.shippingAddress?.address || order.deliveryAddress?.addressString || order.address || '';
  let addressLine2 = '';
  let pin = '';

  if (order.shippingAddress || order.deliveryAddress) {
    const addrObj = order.shippingAddress || order.deliveryAddress;
    const parts = [];
    if (addrObj.locality) parts.push(addrObj.locality);
    if (addrObj.city) parts.push(addrObj.city);
    if (addrObj.state) parts.push(addrObj.state);
    if (parts.length > 0) {
      addressLine2 = parts.join(', ');
    }
    pin = addrObj.pincode || '';
  }

  // ─── Items (from live order) ───────────────────────────────────────
  const items = order.items || [];

  // ─── Financial data (from tax snapshot) ────────────────────────────
  const subtotal = taxSnap.subtotal ?? order.subtotal ?? 0;
  const discount = taxSnap.discount ?? order.discount ?? 0;
  const shippingFee = order.shippingFee ?? 0;
  const grandTotal = taxSnap.grandTotal ?? order.total ?? order.totalAmount ?? 0;
  const taxableAmount = taxSnap.taxableAmount ?? 0;
  const cgst = taxSnap.cgst ?? 0;
  const sgst = taxSnap.sgst ?? 0;
  const totalTax = taxSnap.totalTax ?? 0;
  const currency = taxSnap.currencySymbol || '₹';

  // Derive CGST/SGST percentage from amounts (for display only)
  const cgstPercent = taxableAmount > 0 ? ((cgst / taxableAmount) * 100).toFixed(0) : '0';
  const sgstPercent = taxableAmount > 0 ? ((sgst / taxableAmount) * 100).toFixed(0) : '0';

  // ─── Shipping (live, not snapshotted) ──────────────────────────────
  const courierPartner = order.courierPartner || 'Not Yet Dispatched';
  const trackingNumber = order.trackingNumber || 'Pending';
  const trackingQR = `${window.location.origin}/track/${orderId}`;

  // ─── Missing data warnings ─────────────────────────────────────────
  const hasTaxSnapshot = Boolean(taxSnap.grandTotal);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const element = printRef.current;
      if (!element) throw new Error('Invoice element not found');

      // Temporarily remove overflow restrictions from parent modal to prevent html2canvas cropping
      const parentModal = element.closest('.invoice-modal-container');
      const originalMaxHeight = parentModal ? parentModal.style.maxHeight : '';
      const originalOverflow = parentModal ? parentModal.style.overflow : '';

      if (parentModal) {
        parentModal.style.maxHeight = 'none';
        parentModal.style.overflow = 'visible';
      }

      // Dynamically load heavy libraries only when downloading!
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(element, {
        scale: 4,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.offsetWidth,
      });

      if (parentModal) {
        parentModal.style.maxHeight = originalMaxHeight;
        parentModal.style.overflow = originalOverflow;
      }

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Add a 10mm margin around the invoice box on the A4 page
      const margin = 10;
      const pdfWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', margin, margin, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${invoiceNumber}.pdf`);
    } catch (err) {
      console.error('Invoice download failed', err);
    }
    setIsDownloading(false);
  };

  return (
    <div className="w-full bg-[#f9fafb] lg:bg-white rounded-xl p-4 lg:p-6 mx-auto max-w-4xl">
      {/* Close Button / Controls (Hidden in print) */}
      <div className="no-print flex justify-between items-center pb-3 lg:pb-4 mb-4 lg:mb-5">
        <h3 className="font-display text-sm lg:text-md font-bold uppercase tracking-wider text-black">
          Tax Invoice
        </h3>
        <div className="flex items-center gap-2 lg:gap-3">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 min-w-0 min-h-0 aspect-square p-0 shrink-0 bg-gradient-to-r from-[#111827] to-black hover:from-black hover:to-[#1f2937] text-white rounded-full transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-wait"
          >
            <span className="material-symbols-outlined text-[16px] lg:text-[20px]">
              {isDownloading ? 'hourglass_top' : 'download'}
            </span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 min-w-0 min-h-0 aspect-square p-0 shrink-0 bg-white border border-[#e5e7eb] hover:border-red-200 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors duration-200 text-[#6b7280] shadow-sm active:scale-95"
            >
              <X className="text-[16px] lg:text-[20px]" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      <div
        ref={printRef}
        id="invoice-download-area"
        className="print-invoice-area p-5 sm:p-6 lg:p-8 text-black text-[9px] sm:text-xs lg:text-sm bg-white font-sans relative shadow-sm print:shadow-none w-full border border-[#e5e7eb] rounded-xl"
      >
        {/* Tax Invoice Header */}
        <div className="flex justify-between items-start border-b-2 border-[#111827] pb-4 lg:pb-6 mb-4 lg:mb-6">
          <div className="w-[55%]">
            <h2 className="text-[14px] sm:text-xl lg:text-3xl font-display font-black uppercase tracking-normal text-black leading-tight">
              {businessName}
            </h2>
            {legalName && legalName !== businessName && (
              <p className="text-[7px] sm:text-[9px] lg:text-[11px] text-[#6b7280] font-bold uppercase tracking-widest mt-0.5 lg:mt-1">
                {legalName}
              </p>
            )}
            <div className="text-[8px] sm:text-[10px] lg:text-[11px] text-[#4b5563] mt-1.5 lg:mt-2 space-y-0.5 lg:space-y-1 leading-snug font-light">
              {storeAddressLines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
              <p className="font-semibold text-black mt-1">GSTIN: {gstin}</p>
            </div>
          </div>

          <div className="text-right w-[45%]">
            {invoiceNumber !== 'Not Generated' && (
              <h2 className="text-[12px] sm:text-lg lg:text-2xl font-black uppercase tracking-wider text-[#1f2937]">
                TAX INVOICE
              </h2>
            )}
            <div className="text-[7px] sm:text-[9px] lg:text-[11px] text-[#4b5563] mt-1.5 lg:mt-3 space-y-0.5 lg:space-y-1">
              {invoiceNumber !== 'Not Generated' && (
                <p>
                  Invoice No: <strong className="text-black font-mono">{invoiceNumber}</strong>
                </p>
              )}
              <p className="hidden sm:block">
                Order Ref: <span className="font-mono">{orderId.substring(0, 12)}...</span>
              </p>
              {invoiceDate !== 'N/A' && <p>Invoice Date: {invoiceDate}</p>}
              {paymentMode !== 'N/A' && (
                <p>
                  Payment: <strong className="text-black uppercase">{paymentMode}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Billing and Shipping Fields */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-8 mb-4 lg:mb-8">
          <div className="bg-[#f9fafb] p-2 lg:p-4 rounded-xl border border-[#f3f4f6] print:bg-white print:border-none print:p-0">
            <h3 className="font-black text-[#374151] uppercase tracking-widest border-b border-[#e5e7eb] pb-1 mb-1.5 lg:mb-2 text-[7px] lg:text-[10px]">
              Billed To:
            </h3>
            <p className="font-bold text-[#111827] text-[9px] lg:text-xs">{customerName}</p>
            {customerEmail && (
              <p className="text-[#4b5563] mt-0.5 lg:mt-1 text-[8px] lg:text-[11px] break-all">
                {customerEmail}
              </p>
            )}
            {customerPhone && (
              <p className="text-[#4b5563] mt-0.5 text-[8px] lg:text-[11px]">{customerPhone}</p>
            )}
          </div>

          <div className="bg-[#f9fafb] p-2 lg:p-4 rounded-xl border border-[#f3f4f6] print:bg-white print:border-none print:p-0">
            <h3 className="font-black text-[#374151] uppercase tracking-widest border-b border-[#e5e7eb] pb-1 mb-1.5 lg:mb-2 text-[7px] lg:text-[10px]">
              Shipped To:
            </h3>
            <p className="text-[#111827] font-semibold text-[9px] lg:text-xs">{customerName}</p>
            <p className="text-[#4b5563] mt-0.5 lg:mt-1 leading-snug text-[8px] lg:text-[11px]">
              {addressLine1}
              {addressLine2 ? `, ${addressLine2}` : ''}
              {pin && (
                <>
                  {' '}
                  <br /> <strong className="text-black font-bold">{pin}</strong>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-4 lg:mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f3f4f6] border-b border-[#d1d5db] font-bold text-[7px] lg:text-[10px]">
                <th className="text-left p-1.5 lg:p-3 uppercase tracking-wider text-[#374151]">
                  Item
                </th>
                <th className="text-center p-1.5 lg:p-3 uppercase tracking-wider text-[#374151]">
                  Qty
                </th>
                <th className="text-right p-1.5 lg:p-3 uppercase tracking-wider text-[#374151] hidden sm:table-cell">
                  Price
                </th>
                <th className="text-right p-1.5 lg:p-3 uppercase tracking-wider text-[#374151] hidden lg:table-cell">
                  CGST
                </th>
                <th className="text-right p-1.5 lg:p-3 uppercase tracking-wider text-[#374151] hidden lg:table-cell">
                  SGST
                </th>
                <th className="text-right p-1.5 lg:p-3 uppercase tracking-wider text-[#374151]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb] text-[8px] lg:text-[11px]">
              {items.map((item, idx) => {
                const title = item.title || item.name || 'Item';
                const qty = item.quantity || item.qty || 1;
                const price = item.price || 0;
                const lineTotal = price * qty;

                return (
                  <tr key={idx} className="hover:bg-[#f9fafb]">
                    <td className="p-1.5 lg:p-3 font-semibold text-[#111827]">
                      {title}
                      {item.variant && item.variant !== 'Default' && (
                        <span className="block text-[6px] lg:text-[9px] text-[#6b7280] font-light mt-0.5">
                          Style: {item.variant}
                        </span>
                      )}
                    </td>
                    <td className="p-1.5 lg:p-3 text-center text-[#1f2937]">{qty}</td>
                    <td className="p-1.5 lg:p-3 text-right font-mono text-[#4b5563] hidden sm:table-cell">
                      {currency}
                      {price.toLocaleString()}
                    </td>
                    <td className="p-1.5 lg:p-3 text-right font-mono text-[#4b5563] hidden lg:table-cell">
                      —
                    </td>
                    <td className="p-1.5 lg:p-3 text-right font-mono text-[#4b5563] hidden lg:table-cell">
                      —
                    </td>
                    <td className="p-1.5 lg:p-3 text-right font-bold font-mono text-[#030712]">
                      {currency}
                      {lineTotal.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-[#d1d5db] text-[8px] lg:text-[11px]">
              <tr>
                <td
                  className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] sm:hidden"
                  colSpan="2"
                >
                  Gross Subtotal:
                </td>
                <td
                  className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] hidden sm:table-cell lg:hidden"
                  colSpan="3"
                >
                  Gross Subtotal:
                </td>
                <td
                  className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] hidden lg:table-cell"
                  colSpan="5"
                >
                  Gross Subtotal:
                </td>
                <td className="text-right p-1.5 lg:p-2 font-bold font-mono text-[#111827]">
                  {currency}
                  {subtotal.toLocaleString()}
                </td>
              </tr>
              {discount > 0 && (
                <tr>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#15803d] sm:hidden"
                    colSpan="2"
                  >
                    Coupon Discount:
                  </td>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#15803d] hidden sm:table-cell lg:hidden"
                    colSpan="3"
                  >
                    Coupon Discount:
                  </td>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#15803d] hidden lg:table-cell"
                    colSpan="5"
                  >
                    Coupon Discount:
                  </td>
                  <td className="text-right p-1.5 lg:p-2 font-bold font-mono text-[#15803d]">
                    -{currency}
                    {discount.toLocaleString()}
                  </td>
                </tr>
              )}
              {shippingFee > 0 && (
                <tr>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] sm:hidden"
                    colSpan="2"
                  >
                    Shipping:
                  </td>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] hidden sm:table-cell lg:hidden"
                    colSpan="3"
                  >
                    Shipping:
                  </td>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] hidden lg:table-cell"
                    colSpan="5"
                  >
                    Shipping:
                  </td>
                  <td className="text-right p-1.5 lg:p-2 font-bold font-mono text-[#111827]">
                    {currency}
                    {shippingFee.toLocaleString()}
                  </td>
                </tr>
              )}
              <tr className="bg-[#f9fafb] print:bg-white border-t border-double border-[#111827]">
                <td
                  className="text-right p-2 lg:p-3 font-black text-[#1f2937] text-[8px] lg:text-xs uppercase tracking-wider sm:hidden"
                  colSpan="2"
                >
                  Grand Total (Inc. Taxes):
                </td>
                <td
                  className="text-right p-2 lg:p-3 font-black text-[#1f2937] text-[8px] lg:text-xs uppercase tracking-wider hidden sm:table-cell lg:hidden"
                  colSpan="3"
                >
                  Grand Total (Inc. Taxes):
                </td>
                <td
                  className="text-right p-2 lg:p-3 font-black text-[#1f2937] text-[8px] lg:text-xs uppercase tracking-wider hidden lg:table-cell"
                  colSpan="5"
                >
                  Grand Total (Inc. Taxes):
                </td>
                <td className="text-right p-2 lg:p-3 font-black font-mono text-black text-[11px] lg:text-[15px]">
                  {currency}
                  {grandTotal.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-4">
          {/* Tax Breakdown Table */}
          <div className="p-2 lg:p-4 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl w-full sm:max-w-[50%] print:bg-white print:border-none print:p-0">
            {hasTaxSnapshot && (
              <>
                <h4 className="font-black text-[7px] lg:text-[9px] uppercase tracking-widest text-[#374151] border-b border-[#e5e7eb] pb-1 mb-1.5 lg:mb-2">
                  GST Tax Assessment
                </h4>
                <table className="w-full text-[7px] lg:text-[10px]">
                  <tbody>
                    <tr>
                      <td className="py-0.5 lg:py-1 text-[#4b5563]">Taxable Basic Value:</td>
                      <td className="text-right py-0.5 lg:py-1 font-mono text-[#111827] font-semibold">
                        {currency}
                        {taxableAmount.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-0.5 lg:py-1 text-[#4b5563]">
                        Integrated SGST ({sgstPercent}%):
                      </td>
                      <td className="text-right py-0.5 lg:py-1 font-mono text-[#111827] font-semibold">
                        {currency}
                        {sgst.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-0.5 lg:py-1 text-[#4b5563]">
                        Integrated CGST ({cgstPercent}%):
                      </td>
                      <td className="text-right py-0.5 lg:py-1 font-mono text-[#111827] font-semibold">
                        {currency}
                        {cgst.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="border-t border-dashed border-[#d1d5db] font-bold font-mono">
                      <td className="pt-1 lg:pt-2 text-[#1f2937]">Total Taxes (Inclusive):</td>
                      <td className="text-right pt-1 lg:pt-2 text-black font-black">
                        {currency}
                        {totalTax.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}
          </div>

          {/* Courier, Barcode, and QR Code Info */}
          <div className="flex justify-between items-center w-full sm:w-[45%]">
            <div className="space-y-0.5 lg:space-y-1">
              <h3 className="font-black text-[#1f2937] text-[7px] lg:text-[10px] uppercase tracking-wider mb-1 lg:mb-2">
                Order Tracking
              </h3>
              {courierPartner !== 'Not Yet Dispatched' && (
                <p className="text-[7px] lg:text-[11px] text-[#4b5563]">
                  Carrier: <strong className="text-black font-semibold">{courierPartner}</strong>
                </p>
              )}
              {trackingNumber !== 'Pending' && (
                <p className="text-[7px] lg:text-[11px] text-[#4b5563]">
                  AWB: <strong className="text-black font-mono font-bold">{trackingNumber}</strong>
                </p>
              )}
              <div className="pt-1 lg:pt-3">
                <Suspense
                  fallback={
                    <div className="w-[60px] h-[60px] bg-[#f3f4f6] animate-pulse rounded"></div>
                  }
                >
                  <QRCodeCanvas
                    value={trackingQR}
                    size={60}
                    level="H"
                    includeMargin={true}
                    className="rounded"
                  />
                </Suspense>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <h3 className="font-black text-[#1f2937] text-[6px] lg:text-[9px] uppercase tracking-wider mb-1 lg:mb-2 text-center">
                Scan
              </h3>
              <div className="mt-1">
                <Suspense
                  fallback={<div className="w-20 h-8 bg-[#f3f4f6] animate-pulse rounded"></div>}
                >
                  <Barcode
                    value={trackingNumber !== 'Pending' ? trackingNumber : orderId.slice(-8)}
                    height={28}
                    width={1.2}
                    displayValue={false}
                    margin={0}
                    renderer="canvas"
                  />
                </Suspense>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="mt-6 lg:mt-12 text-center text-[#9ca3af] text-[6px] lg:text-[10px] border-t border-[#f3f4f6] pt-3 lg:pt-4 leading-normal font-light">
          This is a secure computer generated tax invoice issued under {businessName} regulations
          and requires no physical signatures.
          {storeEmail && <> For inquiry, reach {storeEmail}.</>}
        </div>
      </div>
    </div>
  );
}
