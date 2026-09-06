import { X } from 'lucide-react';
import { useState, useRef, Suspense, lazy } from 'react';

const QRCodeCanvas = lazy(() => import('qrcode.react').then((m) => ({ default: m.QRCodeCanvas })));
const Barcode = lazy(() => import('react-barcode'));

/**
 * InvoiceTemplate — Pure Presentation Component
 *
 * Renders authoritative tax invoice data for:
 * 1. Standard purchase orders (immutable snapshots, GST assessment, shipping).
 * 2. Rental orders (rental agreement, duration, start/end dates, security deposit).
 * 3. Mixed orders (cleanly segregates purchased merchandise from rented decor items).
 */
export function InvoiceTemplate({ order, user = {}, onClose }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef(null);

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
  const isRental = isPureRental; // legacy alias for pure rental

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
    ? 'TAX INVOICE — COMBINED'
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
  const legalName = storeSnap.legalCompanyName || 'Premium Studio & Handicrafts';
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
    : ['#28-1-92, South Street', 'ONGOLE-523001, Prakasam District', 'Andhra Pradesh'];

  // ─── Payment (from live order fields) ──────────────────────────────
  const paymentMode = order.paymentMethod || order.paymentMode || 'N/A';

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

  // ─── Items (normalized for purchase, rental, or mixed orders) ──────
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
      : isPureRental
        ? [
            {
              title:
                order.productTitle ||
                order.product?.title ||
                order.product?.name ||
                order.title ||
                'Event Rental Item',
              quantity: order.quantity || 1,
              price:
                order.rentalRate?.rentalPrice ||
                (typeof order.rentalCharge === 'number'
                  ? Math.round((order.rentalCharge / (order.quantity || 1)) * 100) / 100
                  : 0),
              rentalCharge: order.rentalCharge || order.rentalRate?.rentalPrice || 0,
              variant:
                order.variant ||
                (order.durationDays
                  ? `${order.durationDays} Day${order.durationDays > 1 ? 's' : ''} Rental`
                  : 'Rental'),
              isRental: true,
              type: 'rental',
              rentalDurationDays: order.durationDays || order.rentalRate?.rentalDurationDays || 1,
              rentalStartDate: order.rentalStartDate,
              rentalEndDate: order.rentalEndDate,
              deposit: order.securityDeposit || 0,
            },
          ]
        : [];

  // ─── Financial calculations ───────────────────────────────────────
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

  const walletDeduction = order.walletDeduction ?? 0;
  const grandTotal =
    taxSnap.grandTotal ??
    order.totalAmount ??
    order.total ??
    subtotal + securityDeposit + deliveryCharge + taxAmount - discount - walletDeduction;

  const taxableAmount = isPurePurchase
    ? Number(taxSnap.taxableAmount ?? subtotal) || 0
    : isPureRental
      ? Number(taxSnap.taxableAmount ?? rentalCharge) || 0
      : Number(taxSnap.taxableAmount ?? subtotal) || 0;

  const totalTax = Number(taxSnap.totalTax ?? taxAmount) || 0;
  const cgst = Number(taxSnap.cgst ?? (totalTax > 0 ? totalTax / 2 : 0)) || 0;
  const sgst = Number(taxSnap.sgst ?? (totalTax > 0 ? totalTax / 2 : 0)) || 0;
  const currency = taxSnap.currencySymbol || '₹';

  const cgstPercent = taxableAmount > 0 ? ((cgst / taxableAmount) * 100).toFixed(0) : '0';
  const sgstPercent = taxableAmount > 0 ? ((sgst / taxableAmount) * 100).toFixed(0) : '0';

  // ─── Shipping & Tracking ──────────────────────────────────────────
  const courierPartner =
    order.courierPartner || (isPureRental ? 'Siri Logistics' : 'Not Yet Dispatched');
  const trackingNumber =
    order.trackingNumber || (isPureRental ? order.rentalOrderId || orderId : 'Pending');
  const trackingQR = isPureRental
    ? `${window.location.origin}/dashboard/rentals`
    : isMixed
      ? `${window.location.origin}/dashboard`
      : `${window.location.origin}/track/${orderId}`;

  // ─── Assessment / Tax box display logic ───────────────────────────
  const hasTaxSnapshot = Boolean(
    taxSnap.grandTotal ||
    taxAmount > 0 ||
    taxableAmount > 0 ||
    (securityDeposit > 0 && !isPurePurchase),
  );

  const rentalStartDate = order.rentalStartDate || items.find((i) => i.isRental)?.rentalStartDate;
  const rentalEndDate = order.rentalEndDate || items.find((i) => i.isRental)?.rentalEndDate;
  const rentalDurationDays =
    order.durationDays ||
    items.find((i) => i.isRental)?.rentalDurationDays ||
    order.rentalRate?.rentalDurationDays ||
    1;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const element = printRef.current;
      if (!element) throw new Error('Invoice element not found');

      const parentModal = element.closest('.invoice-modal-container');
      const originalMaxHeight = parentModal ? parentModal.style.maxHeight : '';
      const originalOverflow = parentModal ? parentModal.style.overflow : '';

      if (parentModal) {
        parentModal.style.maxHeight = 'none';
        parentModal.style.overflow = 'visible';
      }

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

      const margin = 10;
      const pdfWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', margin, margin, pdfWidth, pdfHeight);
      pdf.save(
        isPureRental
          ? `Rental_Invoice_${displayInvoiceNumber}.pdf`
          : isMixed
            ? `Combined_Invoice_${displayInvoiceNumber}.pdf`
            : `Invoice_${invoiceNumber}.pdf`,
      );
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
          {invoiceHeading}
        </h3>
        <div className="flex items-center gap-2 lg:gap-3">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 min-w-0 min-h-0 aspect-square p-0 shrink-0 bg-gradient-to-r from-[#111827] to-black hover:from-black hover:to-[#1f2937] text-white rounded-full transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-wait"
            title="Download PDF"
          >
            <span className="material-symbols-outlined text-[16px] lg:text-[20px]">
              {isDownloading ? 'hourglass_top' : 'download'}
            </span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 min-w-0 min-h-0 aspect-square p-0 shrink-0 bg-white border border-[#e5e7eb] hover:border-red-200 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors duration-200 text-[#6b7280] shadow-sm active:scale-95"
              title="Close"
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
            <h2 className="text-[12px] sm:text-lg lg:text-2xl font-black uppercase tracking-wider text-[#1f2937]">
              {invoiceHeading}
            </h2>
            <div className="text-[7px] sm:text-[9px] lg:text-[11px] text-[#4b5563] mt-1.5 lg:mt-3 space-y-0.5 lg:space-y-1">
              {displayInvoiceNumber !== 'Not Generated' && (
                <p>
                  {isPureRental ? 'Rental ID: ' : 'Invoice No: '}
                  <strong className="text-black font-mono">{displayInvoiceNumber}</strong>
                </p>
              )}
              <p className="hidden sm:block">
                {isPureRental ? 'Reference: ' : 'Order Ref: '}
                <span className="font-mono">{displayInvoiceNumber.substring(0, 16)}</span>
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

        {/* Rental Terms & Period Banner (Only shown if pure rental or mixed with rental items) */}
        {(isPureRental || (isMixed && rentalItemsRaw.length > 0)) && (
          <div className="bg-[#f9fafb] p-3 lg:p-4 rounded-xl border border-[#e5e7eb] mb-4 lg:mb-6 print:bg-white print:border print:p-2">
            <h3 className="font-black text-[#374151] uppercase tracking-widest border-b border-[#e5e7eb] pb-1 mb-2 text-[7px] lg:text-[10px]">
              {isMixed ? 'Rental Items Schedule & Terms' : 'Rental Period & Terms'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[8px] sm:text-[9px] lg:text-[11px]">
              <div>
                <span className="text-[#6b7280] block text-[7px] lg:text-[9px] uppercase font-semibold">
                  Rental Start:
                </span>
                <strong className="text-[#111827]">
                  {rentalStartDate
                    ? new Date(rentalStartDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Not Set'}
                </strong>
              </div>
              <div>
                <span className="text-[#6b7280] block text-[7px] lg:text-[9px] uppercase font-semibold">
                  Rental End:
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
                <span className="text-[#6b7280] block text-[7px] lg:text-[9px] uppercase font-semibold">
                  Duration:
                </span>
                <strong className="text-[#111827]">
                  {rentalDurationDays} Day{rentalDurationDays !== 1 ? 's' : ''}
                </strong>
              </div>
              <div>
                <span className="text-[#6b7280] block text-[7px] lg:text-[9px] uppercase font-semibold">
                  Security Deposit:
                </span>
                <span className="font-mono font-bold text-[#059669]">
                  {currency}
                  {securityDeposit.toLocaleString()}
                  <span className="ml-1 text-[7px] lg:text-[8px] font-normal uppercase text-[#059669]">
                    ({order.depositStatus || 'Refundable'})
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}

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
                  {isMixed ? 'Price / Rate' : isPureRental ? 'Rental Rate' : 'Price'}
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{title}</span>
                        {isMixed && (
                          <span
                            className={`text-[6px] lg:text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
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
                        <span className="block text-[6px] lg:text-[9px] text-[#6b7280] font-light mt-0.5">
                          Style: {item.variant}
                        </span>
                      )}
                      {item.isRental && (
                        <span className="block text-[6px] lg:text-[9px] text-[#8c7335] font-medium mt-0.5">
                          Duration:{' '}
                          {item.variant ||
                            `${item.rentalDurationDays || rentalDurationDays || 1} Day Rental`}
                        </span>
                      )}
                      {item.isRental && (item.rentalStartDate || rentalStartDate) && (
                        <span className="block text-[6px] lg:text-[9px] text-[#6b7280] font-light mt-0.5">
                          Period:{' '}
                          {new Date(item.rentalStartDate || rentalStartDate).toLocaleDateString(
                            'en-IN',
                            {
                              day: 'numeric',
                              month: 'short',
                            },
                          )}{' '}
                          –{' '}
                          {new Date(item.rentalEndDate || rentalEndDate).toLocaleDateString(
                            'en-IN',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            },
                          )}
                        </span>
                      )}
                    </td>
                    <td className="p-1.5 lg:p-3 text-center text-[#1f2937]">{qty}</td>
                    <td className="p-1.5 lg:p-3 text-right font-mono text-[#4b5563] hidden sm:table-cell">
                      {currency}
                      {price.toLocaleString()}
                    </td>
                    <td className="p-1.5 lg:p-3 text-right font-mono text-[#4b5563] hidden lg:table-cell">
                      {cgst > 0 ? `${currency}${(cgst / qty).toFixed(2)}` : '—'}
                    </td>
                    <td className="p-1.5 lg:p-3 text-right font-mono text-[#4b5563] hidden lg:table-cell">
                      {sgst > 0 ? `${currency}${(sgst / qty).toFixed(2)}` : '—'}
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
              {isMixed ? (
                <>
                  <tr>
                    <td
                      className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] sm:hidden"
                      colSpan="2"
                    >
                      Purchased Items Subtotal:
                    </td>
                    <td
                      className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] hidden sm:table-cell lg:hidden"
                      colSpan="3"
                    >
                      Purchased Items Subtotal:
                    </td>
                    <td
                      className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] hidden lg:table-cell"
                      colSpan="5"
                    >
                      Purchased Items Subtotal:
                    </td>
                    <td className="text-right p-1.5 lg:p-2 font-bold font-mono text-[#111827]">
                      {currency}
                      {purchaseSubtotal.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td
                      className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] sm:hidden"
                      colSpan="2"
                    >
                      Rental Decor Charges:
                    </td>
                    <td
                      className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] hidden sm:table-cell lg:hidden"
                      colSpan="3"
                    >
                      Rental Decor Charges:
                    </td>
                    <td
                      className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] hidden lg:table-cell"
                      colSpan="5"
                    >
                      Rental Decor Charges:
                    </td>
                    <td className="text-right p-1.5 lg:p-2 font-bold font-mono text-[#111827]">
                      {currency}
                      {rentalCharge.toLocaleString()}
                    </td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] sm:hidden"
                    colSpan="2"
                  >
                    {isPureRental ? 'Rental Charge:' : 'Gross Subtotal:'}
                  </td>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] hidden sm:table-cell lg:hidden"
                    colSpan="3"
                  >
                    {isPureRental ? 'Rental Charge:' : 'Gross Subtotal:'}
                  </td>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] hidden lg:table-cell"
                    colSpan="5"
                  >
                    {isPureRental ? 'Rental Charge:' : 'Gross Subtotal:'}
                  </td>
                  <td className="text-right p-1.5 lg:p-2 font-bold font-mono text-[#111827]">
                    {currency}
                    {subtotal.toLocaleString()}
                  </td>
                </tr>
              )}

              {!isPurePurchase && securityDeposit > 0 && (
                <tr>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#059669] sm:hidden"
                    colSpan="2"
                  >
                    Security Deposit{' '}
                    <span className="text-[7px] lg:text-[9px] font-normal">(Refundable)</span>:
                  </td>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#059669] hidden sm:table-cell lg:hidden"
                    colSpan="3"
                  >
                    Security Deposit{' '}
                    <span className="text-[7px] lg:text-[9px] font-normal">(Refundable)</span>:
                  </td>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#059669] hidden lg:table-cell"
                    colSpan="5"
                  >
                    Security Deposit{' '}
                    <span className="text-[7px] lg:text-[9px] font-normal">(Refundable)</span>:
                  </td>
                  <td className="text-right p-1.5 lg:p-2 font-bold font-mono text-[#059669]">
                    {currency}
                    {securityDeposit.toLocaleString()}
                  </td>
                </tr>
              )}

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
                    {isPureRental
                      ? 'Delivery Charge:'
                      : isMixed
                        ? 'Shipping & Delivery:'
                        : 'Shipping:'}
                  </td>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] hidden sm:table-cell lg:hidden"
                    colSpan="3"
                  >
                    {isPureRental
                      ? 'Delivery Charge:'
                      : isMixed
                        ? 'Shipping & Delivery:'
                        : 'Shipping:'}
                  </td>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] hidden lg:table-cell"
                    colSpan="5"
                  >
                    {isPureRental
                      ? 'Delivery Charge:'
                      : isMixed
                        ? 'Shipping & Delivery:'
                        : 'Shipping:'}
                  </td>
                  <td className="text-right p-1.5 lg:p-2 font-bold font-mono text-[#111827]">
                    {currency}
                    {shippingFee.toLocaleString()}
                  </td>
                </tr>
              )}

              {taxAmount > 0 && (
                <tr>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] sm:hidden"
                    colSpan="2"
                  >
                    Taxes & GST:
                  </td>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] hidden sm:table-cell lg:hidden"
                    colSpan="3"
                  >
                    Taxes & GST:
                  </td>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#4b5563] hidden lg:table-cell"
                    colSpan="5"
                  >
                    Taxes & GST:
                  </td>
                  <td className="text-right p-1.5 lg:p-2 font-bold font-mono text-[#111827]">
                    {currency}
                    {taxAmount.toLocaleString()}
                  </td>
                </tr>
              )}

              {walletDeduction > 0 && (
                <tr>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#15803d] sm:hidden"
                    colSpan="2"
                  >
                    Wallet Deduction:
                  </td>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#15803d] hidden sm:table-cell lg:hidden"
                    colSpan="3"
                  >
                    Wallet Deduction:
                  </td>
                  <td
                    className="text-right p-1.5 lg:p-2 font-bold text-[#15803d] hidden lg:table-cell"
                    colSpan="5"
                  >
                    Wallet Deduction:
                  </td>
                  <td className="text-right p-1.5 lg:p-2 font-bold font-mono text-[#15803d]">
                    -{currency}
                    {walletDeduction.toLocaleString()}
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
          {/* Tax / Assessment Breakdown Table */}
          {hasTaxSnapshot ? (
            <div className="p-2 lg:p-4 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl w-full sm:max-w-[50%] print:bg-white print:border-none print:p-0">
              <h4 className="font-black text-[7px] lg:text-[9px] uppercase tracking-widest text-[#374151] border-b border-[#e5e7eb] pb-1 mb-1.5 lg:mb-2">
                {isMixed
                  ? 'Order & Rental Tax Assessment'
                  : isPureRental
                    ? 'Rental Fee & Tax Assessment'
                    : 'GST Tax Assessment'}
              </h4>
              <table className="w-full text-[7px] lg:text-[10px]">
                <tbody>
                  {isMixed ? (
                    <>
                      <tr>
                        <td className="py-0.5 lg:py-1 text-[#4b5563]">Purchased Taxable Value:</td>
                        <td className="text-right py-0.5 lg:py-1 font-mono text-[#111827] font-semibold">
                          {currency}
                          {purchaseSubtotal.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5 lg:py-1 text-[#4b5563]">Rental Charge (Base):</td>
                        <td className="text-right py-0.5 lg:py-1 font-mono text-[#111827] font-semibold">
                          {currency}
                          {rentalCharge.toFixed(2)}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td className="py-0.5 lg:py-1 text-[#4b5563]">
                        {isPureRental ? 'Rental Charge (Base):' : 'Taxable Basic Value:'}
                      </td>
                      <td className="text-right py-0.5 lg:py-1 font-mono text-[#111827] font-semibold">
                        {currency}
                        {taxableAmount.toFixed(2)}
                      </td>
                    </tr>
                  )}

                  {!isPurePurchase && securityDeposit > 0 && (
                    <tr>
                      <td className="py-0.5 lg:py-1 text-[#059669]">
                        Refundable Security Deposit:
                      </td>
                      <td className="text-right py-0.5 lg:py-1 font-mono text-[#059669] font-semibold">
                        {currency}
                        {securityDeposit.toFixed(2)}
                      </td>
                    </tr>
                  )}

                  {sgst > 0 && (
                    <tr>
                      <td className="py-0.5 lg:py-1 text-[#4b5563]">
                        Integrated SGST ({sgstPercent}%):
                      </td>
                      <td className="text-right py-0.5 lg:py-1 font-mono text-[#111827] font-semibold">
                        {currency}
                        {sgst.toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {cgst > 0 && (
                    <tr>
                      <td className="py-0.5 lg:py-1 text-[#4b5563]">
                        Integrated CGST ({cgstPercent}%):
                      </td>
                      <td className="text-right py-0.5 lg:py-1 font-mono text-[#111827] font-semibold">
                        {currency}
                        {cgst.toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {totalTax > 0 && (
                    <tr className="border-t border-dashed border-[#d1d5db] font-bold font-mono">
                      <td className="pt-1 lg:pt-2 text-[#1f2937]">
                        {isPureRental ? 'Total Taxes:' : 'Total Taxes (Inclusive):'}
                      </td>
                      <td className="text-right pt-1 lg:pt-2 text-black font-black">
                        {currency}
                        {totalTax.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {!isPurePurchase && securityDeposit > 0 && (
                <p className="text-[6px] lg:text-[8px] text-[#6b7280] mt-2 italic leading-tight">
                  * Security deposit of {currency}
                  {securityDeposit.toLocaleString()} is held until return inspection.
                </p>
              )}
            </div>
          ) : (
            <div className="hidden sm:block w-full sm:max-w-[50%]" />
          )}

          {/* Courier, Barcode, and QR Code Info */}
          <div className="flex justify-between items-center w-full sm:w-[45%]">
            <div className="space-y-0.5 lg:space-y-1">
              <h3 className="font-black text-[#1f2937] text-[7px] lg:text-[10px] uppercase tracking-wider mb-1 lg:mb-2">
                {isPureRental
                  ? 'Rental Tracking'
                  : isMixed
                    ? 'Order & Rental Tracking'
                    : 'Order Tracking'}
              </h3>
              {courierPartner !== 'Not Yet Dispatched' && (
                <p className="text-[7px] lg:text-[11px] text-[#4b5563]">
                  Carrier: <strong className="text-black font-semibold">{courierPartner}</strong>
                </p>
              )}
              {trackingNumber !== 'Pending' && (
                <p className="text-[7px] lg:text-[11px] text-[#4b5563]">
                  Ref: <strong className="text-black font-mono font-bold">{trackingNumber}</strong>
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
                    value={
                      trackingNumber !== 'Pending'
                        ? trackingNumber
                        : displayInvoiceNumber !== 'Not Generated'
                          ? displayInvoiceNumber
                          : orderId.slice(-8)
                    }
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
