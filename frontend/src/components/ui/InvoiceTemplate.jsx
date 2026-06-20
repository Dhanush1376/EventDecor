import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
export function InvoiceTemplate({ order, user = {}, onClose }) {
  if (!order) return null;

  // Normalize order data to handle differences between Admin, Dashboard, and Success pages
  const orderId = order._id || order.id || 'N/A';
  const invoiceNumber =
    order.invoiceNumber || `INV-${orderId.substring(orderId.length - 8).toUpperCase()}`;

  // Date formatting
  let invoiceDate = 'N/A';
  if (order.createdAt) {
    invoiceDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } else if (order.date) {
    invoiceDate = order.date;
  }

  const paymentMode =
    order.paymentMethod ||
    order.payment ||
    (order.paymentInfo && order.paymentInfo.method) ||
    'N/A';

  const customerName =
    order.shippingAddress?.name ||
    order.deliveryAddress?.name ||
    order.customer ||
    user.name ||
    'Customer';
  const customerEmail = order.email || user.email || '';
  const customerPhone =
    order.shippingAddress?.phone || order.deliveryAddress?.phone || order.phone || user.phone || '';

  // Normalize Address
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

  const items = order.items || [];
  const total = order.total || order.totalAmount || 0;
  const shippingFee = order.shippingFee || 0;
  const discount = order.discount || 0;
  const subtotal = total - shippingFee + discount;

  const courierPartner = order.courierPartner || 'Delhivery Logistics';
  const trackingNumber =
    order.trackingNumber || `SR-${orderId.substring(orderId.length - 8).toUpperCase()}-IN`;
  const trackingQR = `${window.location.origin}/track/${orderId}`;

  return (
    <div className="w-full bg-gray-50 md:bg-white rounded-xl">
      <div className="print-invoice-area p-5 sm:p-6 md:p-8 text-black text-[9px] sm:text-xs md:text-sm bg-white font-sans relative shadow-sm print:shadow-none mx-auto w-full max-w-4xl">
        {/* Close Button / Controls (Hidden in print) */}
        <div className="no-print flex justify-between items-center pb-3 md:pb-4 mb-4 md:mb-6 border-b border-gray-100">
          <h3 className="font-display text-sm md:text-md font-bold uppercase tracking-wider text-[var(--color-gold-dark)]">
            Tax Invoice
          </h3>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 px-4 md:px-6 h-8 md:h-10 bg-gradient-to-r from-gray-900 to-black hover:from-black hover:to-gray-800 text-white rounded-full font-bold uppercase tracking-[0.2em] text-[8px] md:text-[10px] transition-all duration-300 shadow-md hover:shadow-lg active:scale-95"
            >
              <span className="material-symbols-outlined text-[13px] md:text-base">print</span>
              <span>Print</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-white border border-gray-200 hover:border-gray-400 hover:bg-gray-50 hover:text-red-500 rounded-full transition-all duration-300 text-gray-500 shadow-sm hover:shadow-md active:scale-95 group"
              >
                <span className="material-symbols-outlined text-[16px] md:text-[20px] transition-transform duration-300 group-hover:rotate-90">
                  close
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Tax Invoice Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4 md:pb-6 mb-4 md:mb-6">
          <div className="w-[55%]">
            <h2 className="text-[14px] sm:text-xl md:text-3xl font-display font-black uppercase tracking-widest text-[var(--color-gold-dark)] leading-tight">
              Siri Arts & Crafts
            </h2>
            <p className="text-[7px] sm:text-[9px] md:text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 md:mt-1">
              Premium Studio & Handicrafts
            </p>
            <div className="text-[8px] sm:text-[10px] md:text-[11px] text-gray-600 mt-1.5 md:mt-2 space-y-0.5 md:space-y-1 leading-snug font-light">
              <p>#28-1-92, South Street</p>
              <p>ONGOLE-523001, Prakasam District</p>
              <p>Andhra Pradesh</p>
              <p className="font-semibold text-black mt-1">GSTIN: 29AAAES9284D1ZX</p>
            </div>
          </div>

          <div className="text-right w-[45%]">
            <h2 className="text-[12px] sm:text-lg md:text-2xl font-black uppercase tracking-wider text-gray-800">
              TAX INVOICE
            </h2>
            <div className="text-[7px] sm:text-[9px] md:text-[11px] text-gray-600 mt-1.5 md:mt-3 space-y-0.5 md:space-y-1">
              <p>
                Invoice No: <strong className="text-black font-mono">{invoiceNumber}</strong>
              </p>
              <p className="hidden sm:block">
                Order Ref: <span className="font-mono">{orderId.substring(0, 12)}...</span>
              </p>
              <p>Invoice Date: {invoiceDate}</p>
              <p>
                Payment: <strong className="text-black uppercase">{paymentMode}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Billing and Shipping Fields */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 md:gap-8 mb-4 md:mb-8">
          <div className="bg-gray-50 p-2 md:p-4 rounded-xl border border-gray-100 print:bg-white print:border-none print:p-0">
            <h3 className="font-black text-gray-700 uppercase tracking-widest border-b border-gray-200 pb-1 mb-1.5 md:mb-2 text-[7px] md:text-[10px]">
              Billed To:
            </h3>
            <p className="font-bold text-gray-900 text-[9px] md:text-xs">{customerName}</p>
            {customerEmail && (
              <p className="text-gray-600 mt-0.5 md:mt-1 text-[8px] md:text-[11px] truncate">
                {customerEmail}
              </p>
            )}
            {customerPhone && (
              <p className="text-gray-600 mt-0.5 text-[8px] md:text-[11px]">{customerPhone}</p>
            )}
          </div>

          <div className="bg-gray-50 p-2 md:p-4 rounded-xl border border-gray-100 print:bg-white print:border-none print:p-0">
            <h3 className="font-black text-gray-700 uppercase tracking-widest border-b border-gray-200 pb-1 mb-1.5 md:mb-2 text-[7px] md:text-[10px]">
              Shipped To:
            </h3>
            <p className="text-gray-900 font-semibold text-[9px] md:text-xs">{customerName}</p>
            <p className="text-gray-600 mt-0.5 md:mt-1 leading-snug text-[8px] md:text-[11px]">
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
        <div className="mb-4 md:mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 font-bold text-[7px] md:text-[10px]">
                <th className="text-left p-1.5 md:p-3 uppercase tracking-wider text-gray-700">
                  Item
                </th>
                <th className="text-center p-1.5 md:p-3 uppercase tracking-wider text-gray-700">
                  Qty
                </th>
                <th className="text-right p-1.5 md:p-3 uppercase tracking-wider text-gray-700 hidden sm:table-cell">
                  Price
                </th>
                <th className="text-right p-1.5 md:p-3 uppercase tracking-wider text-gray-700 hidden md:table-cell">
                  CGST
                </th>
                <th className="text-right p-1.5 md:p-3 uppercase tracking-wider text-gray-700 hidden md:table-cell">
                  SGST
                </th>
                <th className="text-right p-1.5 md:p-3 uppercase tracking-wider text-gray-700">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-[8px] md:text-[11px]">
              {items.map((item, idx) => {
                const title = item.title || item.name || 'Handcrafted Element';
                const qty = item.quantity || item.qty || 1;
                const price = item.price || 0;
                const lineTotal = price * qty;

                // Inclusive GST Calculations
                const basePrice = price / 1.18;
                const cgst = (price - basePrice) / 2;
                const sgst = (price - basePrice) / 2;

                return (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="p-1.5 md:p-3 font-semibold text-gray-900">
                      {title}
                      {item.variant && item.variant !== 'Default' && (
                        <span className="block text-[6px] md:text-[9px] text-gray-500 font-light mt-0.5">
                          Style: {item.variant}
                        </span>
                      )}
                    </td>
                    <td className="p-1.5 md:p-3 text-center text-gray-800">{qty}</td>
                    <td className="p-1.5 md:p-3 text-right font-mono text-gray-600 hidden sm:table-cell">
                      ₹{basePrice.toFixed(2)}
                    </td>
                    <td className="p-1.5 md:p-3 text-right font-mono text-gray-600 hidden md:table-cell">
                      ₹{(cgst * qty).toFixed(2)}
                    </td>
                    <td className="p-1.5 md:p-3 text-right font-mono text-gray-600 hidden md:table-cell">
                      ₹{(sgst * qty).toFixed(2)}
                    </td>
                    <td className="p-1.5 md:p-3 text-right font-bold font-mono text-gray-950">
                      ₹{lineTotal.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-gray-300 text-[8px] md:text-[11px]">
              <tr>
                <td
                  className="text-right p-1.5 md:p-2 font-bold text-gray-600 sm:hidden"
                  colSpan="2"
                >
                  Gross Subtotal:
                </td>
                <td
                  className="text-right p-1.5 md:p-2 font-bold text-gray-600 hidden sm:table-cell md:hidden"
                  colSpan="3"
                >
                  Gross Subtotal:
                </td>
                <td
                  className="text-right p-1.5 md:p-2 font-bold text-gray-600 hidden md:table-cell"
                  colSpan="5"
                >
                  Gross Subtotal:
                </td>
                <td className="text-right p-1.5 md:p-2 font-bold font-mono text-gray-900">
                  ₹{subtotal.toLocaleString()}
                </td>
              </tr>
              {discount > 0 && (
                <tr>
                  <td
                    className="text-right p-1.5 md:p-2 font-bold text-green-700 sm:hidden"
                    colSpan="2"
                  >
                    Coupon Discount:
                  </td>
                  <td
                    className="text-right p-1.5 md:p-2 font-bold text-green-700 hidden sm:table-cell md:hidden"
                    colSpan="3"
                  >
                    Coupon Discount:
                  </td>
                  <td
                    className="text-right p-1.5 md:p-2 font-bold text-green-700 hidden md:table-cell"
                    colSpan="5"
                  >
                    Coupon Discount:
                  </td>
                  <td className="text-right p-1.5 md:p-2 font-bold font-mono text-green-700">
                    -₹{discount.toLocaleString()}
                  </td>
                </tr>
              )}
              {shippingFee > 0 && (
                <tr>
                  <td
                    className="text-right p-1.5 md:p-2 font-bold text-gray-600 sm:hidden"
                    colSpan="2"
                  >
                    Shipping:
                  </td>
                  <td
                    className="text-right p-1.5 md:p-2 font-bold text-gray-600 hidden sm:table-cell md:hidden"
                    colSpan="3"
                  >
                    Shipping:
                  </td>
                  <td
                    className="text-right p-1.5 md:p-2 font-bold text-gray-600 hidden md:table-cell"
                    colSpan="5"
                  >
                    Shipping:
                  </td>
                  <td className="text-right p-1.5 md:p-2 font-bold font-mono text-gray-900">
                    ₹{shippingFee.toLocaleString()}
                  </td>
                </tr>
              )}
              <tr className="bg-gray-50 print:bg-white border-t border-double border-gray-900">
                <td
                  className="text-right p-2 md:p-3 font-black text-gray-800 text-[8px] md:text-xs uppercase tracking-wider sm:hidden"
                  colSpan="2"
                >
                  Grand Total (Inc. Taxes):
                </td>
                <td
                  className="text-right p-2 md:p-3 font-black text-gray-800 text-[8px] md:text-xs uppercase tracking-wider hidden sm:table-cell md:hidden"
                  colSpan="3"
                >
                  Grand Total (Inc. Taxes):
                </td>
                <td
                  className="text-right p-2 md:p-3 font-black text-gray-800 text-[8px] md:text-xs uppercase tracking-wider hidden md:table-cell"
                  colSpan="5"
                >
                  Grand Total (Inc. Taxes):
                </td>
                <td className="text-right p-2 md:p-3 font-black font-mono text-[var(--color-gold-dark)] text-[11px] md:text-[15px]">
                  ₹{total.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-4">
          {/* Tax Breakdown Table */}
          <div className="p-2 md:p-4 bg-gray-50 border border-gray-200 rounded-xl w-full sm:max-w-[50%] print:bg-white print:border-none print:p-0">
            <h4 className="font-black text-[7px] md:text-[9px] uppercase tracking-widest text-gray-700 border-b border-gray-200 pb-1 mb-1.5 md:mb-2">
              GST Tax Assessment
            </h4>
            <table className="w-full text-[7px] md:text-[10px]">
              <tbody>
                <tr>
                  <td className="py-0.5 md:py-1 text-gray-600">Taxable Basic Value:</td>
                  <td className="text-right py-0.5 md:py-1 font-mono text-gray-900 font-semibold">
                    ₹{(total / 1.18).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-0.5 md:py-1 text-gray-600">Integrated SGST (9%):</td>
                  <td className="text-right py-0.5 md:py-1 font-mono text-gray-900 font-semibold">
                    ₹{((total - total / 1.18) / 2).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-0.5 md:py-1 text-gray-600">Integrated CGST (9%):</td>
                  <td className="text-right py-0.5 md:py-1 font-mono text-gray-900 font-semibold">
                    ₹{((total - total / 1.18) / 2).toFixed(2)}
                  </td>
                </tr>
                <tr className="border-t border-dashed border-gray-300 font-bold font-mono">
                  <td className="pt-1 md:pt-2 text-gray-850">Total Taxes (Inclusive):</td>
                  <td className="text-right pt-1 md:pt-2 text-[var(--color-gold-dark)] font-black">
                    ₹{(total - total / 1.18).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Courier, Barcode, and QR Code Info */}
          <div className="flex justify-between items-center w-full sm:w-[45%]">
            <div className="space-y-0.5 md:space-y-1">
              <h3 className="font-black text-gray-800 text-[7px] md:text-[10px] uppercase tracking-wider mb-1 md:mb-2">
                Dispatch Audit
              </h3>
              <p className="text-[7px] md:text-[11px] text-gray-600">
                Carrier: <strong className="text-black font-semibold">{courierPartner}</strong>
              </p>
              <p className="text-[7px] md:text-[11px] text-gray-600">
                AWB: <strong className="text-black font-mono font-bold">{trackingNumber}</strong>
              </p>
              <div className="pt-1 md:pt-3">
                <Barcode
                  value={trackingNumber}
                  height={20}
                  width={1}
                  displayValue={false}
                  margin={0}
                />
              </div>
            </div>

            <div className="flex flex-col items-center">
              <h3 className="font-black text-gray-800 text-[6px] md:text-[9px] uppercase tracking-wider mb-1 md:mb-2 text-center">
                Scan
              </h3>
              <div className="w-12 h-12 md:w-20 md:h-20">
                <QRCodeSVG value={trackingQR} width="100%" height="100%" level="M" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="mt-6 md:mt-12 text-center text-gray-400 text-[6px] md:text-[10px] border-t border-gray-100 pt-3 md:pt-4 leading-normal font-light">
          This is a secure computer generated tax invoice issued under Siri Arts & Crafts boutique
          regulations and requires no physical signatures. For inquiry, reach
          support@siriartsandcrafts.com.
        </div>
      </div>
    </div>
  );
}
