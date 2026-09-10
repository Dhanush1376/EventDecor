import { X } from 'lucide-react';
import { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { CANONICAL_INVOICE } from './invoiceTokens';

const QRCodeCanvas = lazy(() => import('qrcode.react').then((m) => ({ default: m.QRCodeCanvas })));
const Barcode = lazy(() => import('react-barcode'));

/**
 * Canonical InvoiceTemplate — Pure Presentation Component
 *
 * Enforces ONE CANONICAL INVOICE SPECIFICATION:
 * - 540px canonical width canvas
 * - Identical element positions, spacing, card proportions, typography hierarchy everywhere
 * - No internal responsive reflow (cards never stack, columns never hide)
 * - Scaled uniformly on smaller screens via CanonicalInvoiceWrapper
 * - Browser download captures unscaled canonical canvas (desktop & mobile outputs match)
 */
export function InvoiceTemplate({ order, user = {}, onClose, isAdmin = false }) {
  const outerRadiusClass = isAdmin ? 'rounded-[6px]' : 'rounded-[28px]';
  const cardRadiusClass = isAdmin ? 'rounded-[4px]' : 'rounded-2xl';
  const btnRadiusClass = isAdmin ? 'rounded-[4px]' : 'rounded-full';

  const [isDownloading, setIsDownloading] = useState(false);
  const [scale, setScale] = useState(1);
  const [canvasHeight, setCanvasHeight] = useState(780);

  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const printRef = useRef(null);

  // Measure container and apply uniform scale (min(1, availableWidth / 540))
  useEffect(() => {
    const updateMetrics = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const horizontalMargin = containerWidth < CANONICAL_INVOICE.CANVAS_WIDTH ? 16 : 0;
      const availableWidth = Math.max(280, containerWidth - horizontalMargin);
      const computedScale = Math.min(1, availableWidth / CANONICAL_INVOICE.CANVAS_WIDTH);
      setScale(computedScale);

      if (contentRef.current) {
        setCanvasHeight(contentRef.current.offsetHeight);
      }
    };

    updateMetrics();
    window.addEventListener('resize', updateMetrics);

    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateMetrics());
      if (containerRef.current) ro.observe(containerRef.current);
      if (contentRef.current) ro.observe(contentRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateMetrics);
      if (ro) ro.disconnect();
    };
  }, []);

  if (!order) return null;

  // ─── Order Items & Category Segregation ───────────────────────────
  const rawItems = Array.isArray(order.items) && order.items.length > 0 ? order.items : [];

  const checkItemRental = (item) => {
    if (!item) return false;
    if (item.type === 'rental' || item.isRental === true) return true;
    if (item.rentalInfo && (item.rentalInfo.startDate || item.rentalInfo.durationDays)) return true;
    if (item.rentalStartDate || item.rentalEndDate) return true;
    if (item.rentalDurationDays) return true;
    if (order.orderType === 'rental' && item.type !== 'purchase') return true;
    return false;
  };

  const rentalItemsRaw = rawItems.filter(checkItemRental);
  const purchaseItemsRaw = rawItems.filter((i) => !checkItemRental(i));

  const isMixed =
    (rentalItemsRaw.length > 0 && purchaseItemsRaw.length > 0) ||
    order.orderKind === 'mixed' ||
    order.isMixed === true;

  const isPureRental =
    !isMixed &&
    ((rentalItemsRaw.length > 0 && purchaseItemsRaw.length === 0) ||
      Boolean(order.rentalOrderId) ||
      (order.orderType === 'rental' && purchaseItemsRaw.length === 0) ||
      order.isPureRental === true ||
      (order.isRental === true && purchaseItemsRaw.length === 0));

  const isPurePurchase = !isMixed && !isPureRental;

  // ─── Read from immutable snapshots ─────────────────────────────────
  const invoiceSnap = order.invoice || {};
  const storeSnap = order.store || {};
  const taxSnap = typeof order.tax === 'object' && order.tax !== null ? order.tax : {};

  // ─── Invoice metadata ─────────────────────────────────────────────
  const orderId = isPureRental
    ? order.rentalOrderId || order.orderId || order._id || order.id || 'N/A'
    : order.orderId || order._id || order.id || 'N/A';

  const displayInvoiceNumber = isPureRental
    ? order.rentalOrderId ||
      (order._id ? `RNT-${order._id.slice(-8).toUpperCase()}` : 'Not Generated')
    : invoiceSnap.number ||
      order.invoiceNumber ||
      (order._id ? `INV-${order._id.slice(-8).toUpperCase()}` : 'Not Generated');

  const invoiceNumber = displayInvoiceNumber;
  const invoiceHeading = isMixed
    ? 'TAX INVOICE'
    : isPureRental
      ? 'TAX INVOICE — RENTAL'
      : 'TAX INVOICE';

  const rawDate =
    invoiceSnap.issuedAt ||
    order.createdAt ||
    (isPureRental ? order.rentalStartDate : null) ||
    order.date;
  const invoiceDate = rawDate
    ? new Date(rawDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  // ─── Store identity (from snapshot) ────────────────────────────────
  const businessName = storeSnap.displayName || 'Siri Arts & Crafts';
  const legalName = storeSnap.legalCompanyName || '';
  const gstin = storeSnap.gstin || '29AAAES9284D1ZX';
  const storeEmail = storeSnap.email || 'support@siriartsandcrafts.com';

  const storeAddressLines = storeSnap.addressLine1
    ? [
        storeSnap.addressLine1,
        storeSnap.addressLine2,
        [storeSnap.city, storeSnap.state].filter(Boolean).join(', '),
        storeSnap.postalCode,
        storeSnap.country,
      ].filter(Boolean)
    : ['#28-1-92, South Street, ONGOLE-523001,', 'Prakasam District, Andhra Pradesh', 'India'];

  // ─── Payment (from live order fields) ──────────────────────────────
  const paymentMode = order.paymentMethod || order.paymentMode || 'COD';

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

  // ─── Items (normalized) ───────────────────────────────────────────
  const items =
    rawItems.length > 0
      ? rawItems.map((item) => {
          const itemIsRental = checkItemRental(item);
          return {
            ...item,
            title: item.title || item.name || (itemIsRental ? 'Event Rental Item' : 'Product'),
            quantity: item.quantity || item.qty || 1,
            price: Number(item.price) || Number(item.rentalPrice) || 0,
            isRental: itemIsRental,
            type: itemIsRental ? 'rental' : 'purchase',
            rentalDurationDays:
              item.rentalDurationDays ||
              item.rentalInfo?.durationDays ||
              (itemIsRental ? order.durationDays : undefined),
            rentalStartDate:
              item.rentalStartDate ||
              item.rentalInfo?.startDate ||
              (itemIsRental ? order.rentalStartDate : undefined),
            rentalEndDate:
              item.rentalEndDate ||
              item.rentalInfo?.endDate ||
              (itemIsRental ? order.rentalEndDate : undefined),
            deposit: itemIsRental
              ? item.deposit || item.securityDeposit || (order.securityDeposit ?? 0)
              : 0,
          };
        })
      : [
          {
            title: 'Kondapalli Family Set',
            quantity: 1,
            price: 1499,
          },
        ];

  // ─── Financial calculations (Authoritative values) ─────────────────
  const purchaseSubtotal = items
    .filter((i) => !i.isRental)
    .reduce((acc, i) => acc + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);

  const rentalCharge =
    items
      .filter((i) => i.isRental)
      .reduce((acc, i) => acc + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0) ||
    (isPureRental ? Number(order.rentalCharge) || 0 : 0);

  const subtotal = isPurePurchase
    ? (taxSnap.subtotal ?? order.subtotal ?? purchaseSubtotal)
    : isPureRental
      ? (order.rentalCharge ?? taxSnap.subtotal ?? order.subtotal ?? rentalCharge)
      : purchaseSubtotal + rentalCharge;

  const discount = taxSnap.discount ?? order.discount ?? 0;
  const securityDeposit = isPurePurchase
    ? 0
    : (order.securityDeposit ??
      order.depositTotal ??
      items.filter((i) => i.isRental).reduce((acc, i) => acc + (Number(i.deposit) || 0), 0));

  const deliveryCharge = isPureRental
    ? (order.deliveryCharge ?? order.shippingFee ?? 0)
    : (order.shippingFee ?? order.deliveryCharge ?? 0);
  const shippingFee = deliveryCharge;

  const taxAmount = isPureRental
    ? typeof order.tax === 'number'
      ? order.tax
      : (taxSnap.totalTax ?? 0)
    : (taxSnap.totalTax ??
      (typeof order.tax === 'number' ? order.tax : (order.tax?.totalTax ?? 0)));

  const totalTax = Number(taxSnap.totalTax ?? taxAmount) || 0;

  const walletDeduction = order.walletDeduction ?? 0;
  const grandTotal =
    taxSnap.grandTotal ??
    order.totalAmount ??
    order.total ??
    subtotal + securityDeposit + deliveryCharge + taxAmount - discount - walletDeduction;

  const taxableAmount = isPurePurchase
    ? Number(taxSnap.taxableAmount ?? subtotal - (totalTax || taxAmount)) ||
      (subtotal > taxAmount ? subtotal - taxAmount : subtotal)
    : isPureRental
      ? Number(taxSnap.taxableAmount ?? rentalCharge) || 0
      : Number(taxSnap.taxableAmount ?? subtotal) || 0;

  const cgst = Number(taxSnap.cgst ?? (totalTax > 0 ? totalTax / 2 : 0)) || 0;
  const sgst = Number(taxSnap.sgst ?? (totalTax > 0 ? totalTax / 2 : 0)) || 0;
  const currency = taxSnap.currencySymbol || '₹';

  const cgstPercent = taxableAmount > 0 ? ((cgst / taxableAmount) * 100).toFixed(0) : '9';
  const sgstPercent = taxableAmount > 0 ? ((sgst / taxableAmount) * 100).toFixed(0) : '9';

  // ─── Tracking info ────────────────────────────────────────────────
  const trackingNumber =
    order.trackingNumber || (isPureRental ? order.rentalOrderId || orderId : displayInvoiceNumber);
  const trackingQR = isPureRental
    ? `${window.location.origin}/dashboard/rentals`
    : isMixed
      ? `${window.location.origin}/dashboard`
      : `${window.location.origin}/track/${orderId}`;

  const rentalStartDate = order.rentalStartDate || items.find((i) => i.isRental)?.rentalStartDate;
  const rentalEndDate = order.rentalEndDate || items.find((i) => i.isRental)?.rentalEndDate;
  const rentalDurationDays =
    order.durationDays ||
    items.find((i) => i.isRental)?.rentalDurationDays ||
    order.rentalRate?.rentalDurationDays ||
    1;

  // ─── Unscaled PDF Capture ─────────────────────────────────────────
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const element = printRef.current;
      if (!element) throw new Error('Invoice element not found');

      // Create an offscreen clone to capture the unscaled canonical 540px invoice
      const clone = element.cloneNode(true);
      clone.id = 'invoice-pdf-capture-clone';
      clone.style.width = '540px';
      clone.style.minWidth = '540px';
      clone.style.maxWidth = '540px';
      clone.style.transform = 'none';
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.zIndex = '-9999';
      clone.style.backgroundColor = '#ffffff';
      clone.style.fontFamily = CANONICAL_INVOICE.FONT_FAMILY;
      document.body.appendChild(clone);

      // Copy canvas bitmaps (QR code and Barcode) from original into clone
      const origCanvases = element.querySelectorAll('canvas');
      const cloneCanvases = clone.querySelectorAll('canvas');
      origCanvases.forEach((orig, idx) => {
        const dest = cloneCanvases[idx];
        if (dest) {
          dest.width = orig.width;
          dest.height = orig.height;
          const destCtx = dest.getContext('2d');
          if (destCtx) {
            destCtx.drawImage(orig, 0, 0);
          }
        }
      });

      await new Promise((r) => setTimeout(r, 60));

      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(clone, {
        scale: 3, // 540 * 3 = 1620px (crystal sharp)
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 540,
        windowWidth: 1200,
      });

      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Fit gracefully onto single A4 page (210mm x 297mm)
      const margin = 12;
      const pdfWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', margin, margin, pdfWidth, Math.min(pdfHeight, 273));

      // Build authoritative clean filename
      const rawNum = isPureRental ? displayInvoiceNumber : invoiceNumber;
      const cleanNum = (
        rawNum && rawNum !== 'Not Generated'
          ? rawNum
          : order._id
            ? String(order._id).slice(-8).toUpperCase()
            : 'DOC'
      ).replace(/[^a-zA-Z0-9-_]/g, '_');
      const filename = isPureRental
        ? `Rental_Invoice_${cleanNum}.pdf`
        : isMixed
          ? `Combined_Invoice_${cleanNum}.pdf`
          : `Invoice_${cleanNum}.pdf`;

      // Use an explicitly attached anchor with Blob to guarantee Edge/Chrome
      // honors link.download rather than saving raw blob UUIDs without extensions
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = filename;
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();

      setTimeout(() => {
        if (downloadLink.parentNode) {
          downloadLink.parentNode.removeChild(downloadLink);
        }
        URL.revokeObjectURL(blobUrl);
      }, 250);
    } catch (err) {
      console.error('Invoice download failed', err);
    }
    setIsDownloading(false);
  };

  const INVOICE_FONT = CANONICAL_INVOICE.FONT_FAMILY;

  return (
    <div
      className="canonical-invoice-wrapper w-full flex flex-col items-center"
      style={{ fontFamily: INVOICE_FONT }}
    >
      {/* Strict Font Enforcement: Guarantees 100% constant font across all pages (Storefront, Admin, Dashboard, OrderSuccess, etc.) */}
      <style>{`
        .canonical-invoice-wrapper,
        .canonical-invoice-wrapper h1,
        .canonical-invoice-wrapper h2,
        .canonical-invoice-wrapper h3,
        .canonical-invoice-wrapper h4,
        .canonical-invoice-wrapper h5,
        .canonical-invoice-wrapper h6,
        .canonical-invoice-wrapper p,
        .canonical-invoice-wrapper span,
        .canonical-invoice-wrapper div,
        .canonical-invoice-wrapper strong,
        .canonical-invoice-wrapper td,
        .canonical-invoice-wrapper th {
          font-family: ${INVOICE_FONT} !important;
        }
        .canonical-invoice-wrapper .font-mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
        }
        .canonical-invoice-wrapper .material-symbols-outlined {
          font-family: 'Material Symbols Outlined', sans-serif !important;
        }
      `}</style>

      {/* Action Header Strip (Hidden in print) */}
      <div className="no-print w-full max-w-[540px] flex justify-between items-center pb-2 mb-1.5 px-0.5">
        <h3
          className="text-[12px] font-bold uppercase tracking-wider text-[#111827]"
          style={{ fontFamily: INVOICE_FONT }}
        >
          {invoiceHeading}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`w-8 h-8 min-w-[32px] min-h-[32px] aspect-square ${btnRadiusClass} p-0 shrink-0 overflow-hidden flex items-center justify-center bg-[#111827] hover:bg-black text-white transition-all shadow-sm active:scale-95 disabled:opacity-70 cursor-pointer`}
            title="Download PDF"
          >
            <span className="material-symbols-outlined text-[15px] leading-none select-none pointer-events-none flex items-center justify-center">
              {isDownloading ? 'hourglass_top' : 'download'}
            </span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className={`w-8 h-8 min-w-[32px] min-h-[32px] aspect-square ${btnRadiusClass} p-0 shrink-0 overflow-hidden flex items-center justify-center bg-white border border-[#e5e7eb] hover:bg-gray-50 text-[#6b7280] transition-colors shadow-sm active:scale-95 cursor-pointer`}
              title="Close"
            >
              <X className="w-4 h-4 shrink-0" strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      {/* Canonical Scaled Wrapper: Safe Transform with Zero Blank Space & Zero Cropping */}
      <div ref={containerRef} className="w-full flex justify-center items-start overflow-hidden">
        <div
          style={{
            width: `${Math.round(CANONICAL_INVOICE.CANVAS_WIDTH * scale)}px`,
            height: `${Math.round(canvasHeight * scale)}px`,
            position: 'relative',
            transition: 'width 0.1s ease, height 0.1s ease',
          }}
        >
          <div
            ref={contentRef}
            style={{
              width: `${CANONICAL_INVOICE.CANVAS_WIDTH}px`,
              minWidth: `${CANONICAL_INVOICE.CANVAS_WIDTH}px`,
              maxWidth: `${CANONICAL_INVOICE.CANVAS_WIDTH}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            {/* CANONICAL INVOICE CANVAS (Exact 540px Fixed Composition) */}
            <div
              ref={printRef}
              id="invoice-download-area"
              className={`print-invoice-area w-[540px] bg-white ${outerRadiusClass} border border-[#e5e7eb] p-6 pb-2.5 text-black font-sans shadow-sm print:shadow-none print:border-none print:p-4`}
              style={{ fontFamily: INVOICE_FONT }}
            >
              {/* Header Section */}
              <div className="flex justify-between items-start">
                {/* Left: Brand Identity */}
                <div className="w-[56%] pr-2">
                  <h1
                    className="text-[17px] font-bold text-black uppercase tracking-tight leading-tight"
                    style={{ fontFamily: INVOICE_FONT }}
                  >
                    {businessName}
                  </h1>
                  {legalName && legalName !== businessName && (
                    <p className="text-[9px] text-[#6b7280] font-medium tracking-wide mt-0.5">
                      {legalName}
                    </p>
                  )}
                  <div className="text-[9.5px] text-[#4b5563] mt-1.5 space-y-0.5 leading-snug">
                    {storeAddressLines.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                    <p className="font-semibold text-black mt-1">GSTIN: {gstin}</p>
                  </div>
                </div>

                {/* Right: Invoice Metadata */}
                <div className="w-[44%] text-right pl-2">
                  <h2
                    className="text-[16px] font-black uppercase tracking-wider text-[#111827]"
                    style={{ fontFamily: INVOICE_FONT }}
                  >
                    {invoiceHeading}
                  </h2>
                  <div className="text-[9.5px] text-[#4b5563] mt-1.5 space-y-0.5 leading-snug">
                    {displayInvoiceNumber !== 'Not Generated' && (
                      <p>
                        Invoice No:{' '}
                        <strong className="text-black font-mono font-bold">
                          {displayInvoiceNumber}
                        </strong>
                      </p>
                    )}
                    {invoiceDate !== 'N/A' && <p>Invoice Date: {invoiceDate}</p>}
                    {paymentMode !== 'N/A' && (
                      <p>
                        Payment:{' '}
                        <strong className="text-black uppercase font-bold">{paymentMode}</strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Solid Black Separator Line */}
              <div className="w-full border-b-2 border-[#111827] mt-3.5 mb-3.5" />

              {/* Billed To & Shipped To Cards: ALWAYS SIDE-BY-SIDE */}
              <div className="grid grid-cols-2 gap-3 mb-3.5">
                {/* Billed To Card */}
                <div className={`bg-[#f9fafb] p-3 ${cardRadiusClass} border border-[#f3f4f6]`}>
                  <h3
                    className="font-bold text-[#6b7280] uppercase tracking-wider text-[8.5px] pb-1 mb-1.5 border-b border-[#e5e7eb]"
                    style={{ fontFamily: INVOICE_FONT }}
                  >
                    BILLED TO:
                  </h3>
                  <p className="font-bold text-[#111827] text-[11.5px] truncate">{customerName}</p>
                  {customerEmail && (
                    <p className="text-[#4b5563] text-[9.5px] break-all leading-tight mt-0.5">
                      {customerEmail}
                    </p>
                  )}
                  {customerPhone && (
                    <p className="text-[#4b5563] text-[9.5px] mt-0.5">{customerPhone}</p>
                  )}
                </div>

                {/* Shipped To Card */}
                <div className={`bg-[#f9fafb] p-3 ${cardRadiusClass} border border-[#f3f4f6]`}>
                  <h3
                    className="font-bold text-[#6b7280] uppercase tracking-wider text-[8.5px] pb-1 mb-1.5 border-b border-[#e5e7eb]"
                    style={{ fontFamily: INVOICE_FONT }}
                  >
                    SHIPPED TO:
                  </h3>
                  <p className="font-bold text-[#111827] text-[11.5px] truncate">{customerName}</p>
                  <p className="text-[#4b5563] text-[9.5px] leading-tight mt-0.5 line-clamp-2">
                    {addressLine1}
                    {addressLine2 ? `, ${addressLine2}` : ''}
                  </p>
                  {pin && (
                    <span className="text-black font-bold text-[10.5px] block mt-0.5">{pin}</span>
                  )}
                </div>
              </div>

              {/* Rental Schedule (Only for rental/mixed orders) */}
              {(isPureRental || (isMixed && rentalItemsRaw.length > 0)) && (
                <div
                  className={`bg-[#f9fafb] p-3 ${cardRadiusClass} border border-[#e5e7eb] mb-3.5`}
                >
                  <h3
                    className="font-bold text-[#6b7280] uppercase tracking-wider text-[8.5px] pb-1 mb-1.5 border-b border-[#e5e7eb]"
                    style={{ fontFamily: INVOICE_FONT }}
                  >
                    {isMixed ? 'Rental Items Schedule & Terms' : 'Rental Period & Terms'}
                  </h3>
                  <div className="grid grid-cols-4 gap-2 text-[9.5px]">
                    <div>
                      <span className="text-[#6b7280] block text-[7.5px] uppercase font-semibold">
                        Start:
                      </span>
                      <strong className="text-[#111827]">
                        {rentalStartDate
                          ? new Date(rentalStartDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })
                          : 'Not Set'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#6b7280] block text-[7.5px] uppercase font-semibold">
                        End:
                      </span>
                      <strong className="text-[#111827]">
                        {rentalEndDate
                          ? new Date(rentalEndDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Not Set'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#6b7280] block text-[7.5px] uppercase font-semibold">
                        Duration:
                      </span>
                      <strong className="text-[#111827]">
                        {rentalDurationDays} Day{rentalDurationDays !== 1 ? 's' : ''}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#6b7280] block text-[7.5px] uppercase font-semibold">
                        Deposit:
                      </span>
                      <span className="font-mono font-bold text-[#059669]">
                        {currency}
                        {securityDeposit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Line Items Table (Canonical 3-Column Structure) */}
              <div className="mb-3">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#f3f4f6] border-b border-[#e5e7eb] text-[9px] font-bold text-[#374151]">
                      <th className="text-left py-2 px-3 uppercase tracking-wider">Item</th>
                      <th className="text-center py-2 px-2 uppercase tracking-wider w-[50px]">
                        Qty
                      </th>
                      <th className="text-right py-2 px-3 uppercase tracking-wider w-[90px]">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e7eb] text-[10.5px]">
                    {items.map((item, idx) => {
                      const title = item.title || item.name || 'Item';
                      const qty = item.quantity || item.qty || 1;
                      const price = item.price || 0;
                      const lineTotal = price * qty;

                      return (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-medium text-[#111827]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{title}</span>
                              {isMixed && (
                                <span
                                  className={`text-[7px] font-bold px-1 py-0.5 rounded uppercase ${
                                    item.isRental
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {item.isRental ? 'Rental' : 'Purchase'}
                                </span>
                              )}
                            </div>
                            {!item.isRental && item.variant && item.variant !== 'Default' && (
                              <span className="block text-[8px] text-[#6b7280] font-light mt-0.5">
                                Style: {item.variant}
                              </span>
                            )}
                            {item.isRental && (
                              <span className="block text-[8px] text-[#8c7335] font-medium mt-0.5">
                                Duration:{' '}
                                {item.variant ||
                                  `${item.rentalDurationDays || rentalDurationDays || 1} Day Rental`}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center text-[#1f2937]">{qty}</td>
                          <td className="py-2.5 px-3 text-right font-bold font-mono text-[#030712]">
                            {currency}
                            {lineTotal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Subtotals Section */}
                <div className="pt-2 pr-3 space-y-1 text-[10px] text-right">
                  <div className="flex justify-end gap-3">
                    <span className="font-bold text-[#4b5563]">Gross Subtotal:</span>
                    <span className="font-bold font-mono text-[#111827] w-[90px]">
                      {currency}
                      {subtotal.toLocaleString()}
                    </span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-end gap-3 text-[#15803d]">
                      <span className="font-bold">Coupon Discount:</span>
                      <span className="font-bold font-mono w-[90px]">
                        -{currency}
                        {discount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {shippingFee > 0 && (
                    <div className="flex justify-end gap-3">
                      <span className="font-bold text-[#4b5563]">Shipping:</span>
                      <span className="font-bold font-mono text-[#111827] w-[90px]">
                        {currency}
                        {shippingFee.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <span className="font-medium text-[#4b5563]">Taxes & GST:</span>
                    <span className="font-medium font-mono text-[#111827] w-[90px]">
                      {currency}
                      {taxAmount > 0 ? taxAmount.toFixed(2) : totalTax.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Grand Total Banner */}
                <div className="bg-[#f9fafb] border-t border-b border-[#111827] py-2 px-3 flex justify-between items-center mt-2.5">
                  <span className="font-black text-[#111827] text-[10.5px] uppercase tracking-wider">
                    GRAND TOTAL (INC. TAXES):
                  </span>
                  <span className="font-black font-mono text-black text-[14px]">
                    {currency}
                    {grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* GST Tax Assessment: FULL WIDTH CARD */}
              <div
                className={`bg-[#f9fafb] ${cardRadiusClass} p-3 border border-[#f3f4f6] mt-3 mb-3`}
              >
                <h4
                  className="font-bold text-[9px] uppercase tracking-wider text-[#374151] pb-1 mb-1.5 border-b border-[#e5e7eb]"
                  style={{ fontFamily: INVOICE_FONT }}
                >
                  GST TAX ASSESSMENT
                </h4>
                <div className="space-y-1 text-[9.5px]">
                  <div className="flex justify-between items-center text-[#4b5563]">
                    <span>Taxable Basic Value:</span>
                    <span className="font-semibold font-mono text-[#111827]">
                      {currency}
                      {taxableAmount > 0
                        ? taxableAmount.toFixed(2)
                        : (grandTotal - totalTax).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[#4b5563]">
                    <span>Integrated SGST ({sgstPercent}%):</span>
                    <span className="font-semibold font-mono text-[#111827]">
                      {currency}
                      {sgst > 0 ? sgst.toFixed(2) : (totalTax / 2).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[#4b5563]">
                    <span>Integrated CGST ({cgstPercent}%):</span>
                    <span className="font-semibold font-mono text-[#111827]">
                      {currency}
                      {cgst > 0 ? cgst.toFixed(2) : (totalTax / 2).toFixed(2)}
                    </span>
                  </div>

                  <div className="border-b border-dashed border-[#d1d5db] my-1" />

                  <div className="flex justify-between items-center font-bold text-[#111827]">
                    <span>Total Taxes (Inclusive):</span>
                    <span className="font-black font-mono text-black">
                      {currency}
                      {totalTax > 0 ? totalTax.toFixed(2) : taxAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Tracking: FULL WIDTH ROW (QR Left, Wide Barcode Right) */}
              <div className="mt-2.5 mb-2">
                <h4
                  className="font-bold text-[9px] uppercase tracking-wider text-[#1f2937] mb-1.5"
                  style={{ fontFamily: INVOICE_FONT }}
                >
                  ORDER TRACKING
                </h4>
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Square QR Code */}
                  <div className="shrink-0">
                    <Suspense
                      fallback={
                        <div className="w-[68px] h-[68px] bg-gray-100 rounded animate-pulse" />
                      }
                    >
                      <QRCodeCanvas
                        value={trackingQR}
                        size={68}
                        level="H"
                        includeMargin={false}
                        className="rounded"
                      />
                    </Suspense>
                  </div>

                  {/* Right: Barcode with Centered "SCAN" Label */}
                  <div className="flex-1 flex flex-col items-center justify-center pl-2">
                    <span className="font-bold text-[8px] uppercase tracking-widest text-[#6b7280] mb-0.5 text-center">
                      SCAN
                    </span>
                    <div className="w-full flex justify-center overflow-hidden">
                      <Suspense
                        fallback={<div className="w-48 h-9 bg-gray-100 rounded animate-pulse" />}
                      >
                        <Barcode
                          value={
                            trackingNumber !== 'Pending' && trackingNumber !== 'Not Generated'
                              ? trackingNumber
                              : orderId.slice(-10)
                          }
                          height={36}
                          width={1.25}
                          displayValue={false}
                          margin={0}
                          renderer="canvas"
                        />
                      </Suspense>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Legal Disclaimer */}
              <div className="border-t border-[#f3f4f6] pt-1.5 mt-2 text-center text-[#9ca3af] text-[7.5px] font-light leading-normal">
                This is a secure computer generated tax invoice issued under {businessName}{' '}
                regulations and requires no physical signatures.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
