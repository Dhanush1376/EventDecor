import React from "react";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";

export function InvoiceTemplate({ order, user = {}, onClose }) {
  if (!order) return null;

  // Normalize order data to handle differences between Admin, Dashboard, and Success pages
  const orderId = order._id || order.id || "N/A";
  const invoiceNumber = order.invoiceNumber || `INV-${orderId.substring(orderId.length - 8).toUpperCase()}`;
  
  // Date formatting
  let invoiceDate = "N/A";
  if (order.createdAt) {
    invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });
  } else if (order.date) {
    invoiceDate = order.date;
  }

  const paymentMode = order.paymentMethod || order.payment || (order.paymentInfo && order.paymentInfo.method) || "N/A";

  const customerName = order.shippingAddress?.name || order.deliveryAddress?.name || order.customer || user.name || "Customer";
  const customerEmail = order.email || user.email || "";
  const customerPhone = order.shippingAddress?.phone || order.deliveryAddress?.phone || order.phone || user.phone || "";

  // Normalize Address
  let addressLine1 = order.shippingAddress?.address || order.deliveryAddress?.addressString || order.address || "";
  let addressLine2 = "";
  let pin = "";
  let landmark = "";

  if (order.shippingAddress || order.deliveryAddress) {
    const addrObj = order.shippingAddress || order.deliveryAddress;
    const parts = [];
    if (addrObj.locality) parts.push(addrObj.locality);
    if (addrObj.city) parts.push(addrObj.city);
    if (addrObj.state) parts.push(addrObj.state);
    if (parts.length > 0) {
      addressLine2 = parts.join(", ");
    }
    pin = addrObj.pincode || "";
    landmark = addrObj.landmark || "";
  }

  const items = order.items || [];
  const total = order.total || order.totalAmount || 0;
  const shippingFee = order.shippingFee || 0;
  const discount = order.discount || 0;
  const subtotal = total - shippingFee + discount;

  const courierPartner = order.courierPartner || "Delhivery Logistics";
  const trackingNumber = order.trackingNumber || `SR-${orderId.substring(orderId.length - 8).toUpperCase()}-IN`;
  const trackingQR = `${window.location.origin}/track/${orderId}`;

  return (
    <div className="print-invoice-area p-8 text-black text-sm bg-white font-sans relative">
      {/* Close Button / Controls (Hidden in print) */}
      <div className="no-print flex justify-between items-center pb-4 mb-6 border-b border-gray-100">
        <h3 className="font-display text-md font-bold uppercase tracking-wider text-[#735c00]">
          Tax Invoice
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-[#735c00] text-white font-bold text-[10px] uppercase tracking-widest rounded-xl hover:brightness-110 shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            Print / Save A4 PDF
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Tax Invoice Header */}
      <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-6">
        <div>
          <h2 className="text-3xl font-display font-black uppercase tracking-widest text-[#735c00]">Siri Arts & Crafts</h2>
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1">Premium Studio & Handicrafts</p>
          <div className="text-[11px] text-gray-600 mt-2 space-y-0.5 leading-relaxed font-light">
            <p>#28-1-92, South Street</p>
            <p>ONGOLE-523001, Prakasam District</p>
            <p>Andhra Pradesh</p>
            <p className="font-semibold text-black mt-1">GSTIN: 29AAAES9284D1ZX</p>
          </div>
        </div>
        
        <div className="text-right">
          <h2 className="text-2xl font-black uppercase tracking-wider text-gray-800">TAX INVOICE</h2>
          <div className="text-[11px] text-gray-600 mt-3 space-y-1">
            <p>Invoice No: <strong className="text-black font-mono">{invoiceNumber}</strong></p>
            <p>Order Reference: <span className="font-mono">{orderId.substring(0, 12)}...</span></p>
            <p>Invoice Date: {invoiceDate}</p>
            <p>Payment Mode: <strong className="text-black uppercase">{paymentMode}</strong></p>
          </div>
        </div>
      </div>

      {/* Billing and Shipping Fields */}
      <div className="grid grid-cols-2 gap-8 mb-8 text-[12px]">
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 print:bg-white print:border-none print:p-0">
          <h3 className="font-black text-gray-700 uppercase tracking-widest border-b border-gray-200 pb-1 mb-2 text-[10px]">
            Billed To (Customer):
          </h3>
          <p className="font-bold text-gray-900 text-xs">{customerName}</p>
          {customerEmail && <p className="text-gray-600 mt-1">{customerEmail}</p>}
          {customerPhone && <p className="text-gray-600 mt-0.5">{customerPhone}</p>}
        </div>
        
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 print:bg-white print:border-none print:p-0">
          <h3 className="font-black text-gray-700 uppercase tracking-widest border-b border-gray-200 pb-1 mb-2 text-[10px]">
            Shipped To:
          </h3>
          <p className="text-gray-900 font-semibold">{customerName}</p>
          <p className="text-gray-600 mt-1 leading-relaxed">
            {addressLine1}{addressLine2 ? `, ${addressLine2}` : ""}
            {pin && <> <br /> <strong className="text-black font-bold">{pin}</strong></>}
          </p>
          {landmark && (
            <p className="text-gray-500 text-[11px] mt-1">Landmark: {landmark}</p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-8 border-collapse text-[12px]">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-300 font-bold">
            <th className="text-left p-3 uppercase tracking-wider text-gray-700">Artisanal Design Curation</th>
            <th className="text-center p-3 uppercase tracking-wider text-gray-700 w-16">Qty</th>
            <th className="text-right p-3 uppercase tracking-wider text-gray-700 w-28">Unit Price</th>
            <th className="text-right p-3 uppercase tracking-wider text-gray-700 w-28">CGST (9%)</th>
            <th className="text-right p-3 uppercase tracking-wider text-gray-700 w-28">SGST (9%)</th>
            <th className="text-right p-3 uppercase tracking-wider text-gray-700 w-28">Total Price</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item, idx) => {
            const title = item.title || item.name || "Handcrafted Element";
            const qty = item.quantity || item.qty || 1;
            const price = item.price || 0;
            const lineTotal = price * qty;
            
            // Inclusive GST Calculations
            const basePrice = price / 1.18;
            const cgst = (price - basePrice) / 2;
            const sgst = (price - basePrice) / 2;

            return (
              <tr key={idx} className="hover:bg-gray-50/50">
                <td className="p-3 font-semibold text-gray-900">
                  {title}
                  {item.variant && item.variant !== "Default" && (
                    <span className="block text-[10px] text-gray-500 font-light mt-0.5">Style: {item.variant}</span>
                  )}
                </td>
                <td className="p-3 text-center text-gray-800">{qty}</td>
                <td className="p-3 text-right font-mono text-gray-600">₹{basePrice.toFixed(2)}</td>
                <td className="p-3 text-right font-mono text-gray-600">₹{(cgst * qty).toFixed(2)}</td>
                <td className="p-3 text-right font-mono text-gray-600">₹{(sgst * qty).toFixed(2)}</td>
                <td className="p-3 text-right font-bold font-mono text-gray-950">₹{lineTotal.toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t border-gray-300">
          <tr>
            <td colSpan="5" className="text-right p-2 font-bold text-gray-600">Gross Subtotal:</td>
            <td className="text-right p-2 font-bold font-mono text-gray-900">₹{subtotal.toLocaleString()}</td>
          </tr>
          {discount > 0 && (
            <tr>
              <td colSpan="5" className="text-right p-2 font-bold text-green-700">Coupon Discount:</td>
              <td className="text-right p-2 font-bold font-mono text-green-700">-₹{discount.toLocaleString()}</td>
            </tr>
          )}
          {shippingFee > 0 && (
            <tr>
              <td colSpan="5" className="text-right p-2 font-bold text-gray-600">Bespoke Shipping Fee:</td>
              <td className="text-right p-2 font-bold font-mono text-gray-900">₹{shippingFee.toLocaleString()}</td>
            </tr>
          )}
          <tr className="bg-gray-50 print:bg-white border-t border-double border-gray-900">
            <td colSpan="5" className="text-right p-3 font-black text-gray-800 text-xs uppercase tracking-wider">Grand Total (Inclusive of Taxes):</td>
            <td className="text-right p-3 font-black font-mono text-[#735c00] text-[15px]">₹{total.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      {/* Tax Breakdown Table */}
      <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-xl max-w-md print:bg-white print:border-none print:p-0">
        <h4 className="font-black text-[9px] uppercase tracking-widest text-gray-700 border-b border-gray-200 pb-1 mb-2">
          GST Tax Assessment Breakdown
        </h4>
        <table className="w-full text-[10px]">
          <tbody>
            <tr>
              <td className="py-1 text-gray-600">Taxable Basic Value:</td>
              <td className="text-right py-1 font-mono text-gray-900 font-semibold">₹{(total / 1.18).toFixed(2)}</td>
            </tr>
            <tr>
              <td className="py-1 text-gray-600">Integrated SGST (9%):</td>
              <td className="text-right py-1 font-mono text-gray-900 font-semibold">₹{((total - total / 1.18) / 2).toFixed(2)}</td>
            </tr>
            <tr>
              <td className="py-1 text-gray-600">Integrated CGST (9%):</td>
              <td className="text-right py-1 font-mono text-gray-900 font-semibold">₹{((total - total / 1.18) / 2).toFixed(2)}</td>
            </tr>
            <tr className="border-t border-dashed border-gray-300 font-bold font-mono">
              <td className="pt-2 text-gray-850">Total Assessment Taxes (Inclusive):</td>
              <td className="text-right pt-2 text-[#735c00] font-black">₹{(total - total / 1.18).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Courier, Barcode, and QR Code Info */}
      <div className="flex justify-between items-start border-t border-gray-300 pt-6 mt-8">
        <div className="w-1/2 space-y-1">
          <h3 className="font-black text-gray-800 text-[10px] uppercase tracking-wider mb-2">Logistics Dispatch Audit</h3>
          <p className="text-[11px] text-gray-600">Logistics Carrier: <strong className="text-black font-semibold">{courierPartner}</strong></p>
          <p className="text-[11px] text-gray-600">Tracking AWB: <strong className="text-black font-mono font-bold">{trackingNumber}</strong></p>
          <div className="pt-3">
            <Barcode value={trackingNumber} height={35} width={1.2} displayValue={true} fontSize={9} margin={0} />
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <h3 className="font-black text-gray-800 text-[10px] uppercase tracking-wider mb-2">Scan Live Transit</h3>
          <QRCodeSVG value={trackingQR} size={90} level="M" />
          <span className="text-[8px] text-gray-400 mt-2 font-light font-mono">Powered by Logistics Feed</span>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="mt-12 text-center text-gray-400 text-[10px] border-t border-gray-100 pt-4 leading-normal font-light">
        This is a secure computer generated tax invoice issued under Siri Arts & Crafts boutique regulations and requires no physical signatures. For inquiry, reach support@siriartsandcrafts.com.
      </div>
    </div>
  );
}
