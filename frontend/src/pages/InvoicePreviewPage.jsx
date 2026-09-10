import React, { useState } from 'react';
import { InvoiceTemplate } from '../components/ui/InvoiceTemplate';

const sampleReferenceOrder = {
  _id: '68bc22849129031022',
  orderId: '68bc22849129031022',
  invoiceNumber: 'INV-2026-000022',
  invoice: {
    number: 'INV-2026-000022',
    issuedAt: new Date('2026-09-06'),
  },
  createdAt: new Date('2026-09-06'),
  paymentMethod: 'COD',
  customer: 'Dhanush Atmakuri',
  shippingAddress: {
    name: 'Dhanush Atmakuri',
    email: 'dhanush1376@gmail.com',
    phone: '9154691315',
    address: '28-1-50, Near enugu chettu, Ongole,',
    city: 'Ongole',
    state: 'Andhra pradesh',
    pincode: '523001',
  },
  store: {
    displayName: 'Siri Arts & Crafts',
    legalCompanyName: 'Premium Studio & Handicrafts',
    gstin: '29AAAES9284D1ZX',
    addressLine1: '#28-1-92, South Street, ONGOLE-523001,',
    addressLine2: 'Prakasam District, Andhra Pradesh',
    city: 'India',
  },
  items: [
    {
      title: 'Kondapalli Family Set',
      quantity: 1,
      price: 1499,
    },
  ],
  subtotal: 1499,
  shippingFee: 0,
  tax: {
    taxableAmount: 1295.76,
    cgst: 116.62,
    sgst: 116.62,
    totalTax: 233.24,
    grandTotal: 1529,
    currencySymbol: '₹',
  },
  totalAmount: 1529,
};

const sampleExtremeOrder = {
  _id: '68bc99999999999999',
  orderId: '68bc99999999999999',
  invoiceNumber: 'INV-2026-999999-EXTREME-SPECIAL-EDITION',
  createdAt: new Date(),
  paymentMethod: 'ONLINE_PREPAID',
  shippingAddress: {
    name: 'Sri Sri Sri Ramachandra Venkata Subrahmanya Sastry Garu Bahadur',
    email:
      'ramachandra.venkata.subrahmanya.sastry.official.business.long.email@company-enterprise.org',
    phone: '+91 9876543210 / 08592-234567',
    address:
      'Door No. 12-34/56, 3rd Floor, Golden Jubilee Tower, Behind Old Municipal Complex, Ramnagar Colony, Extension Phase 2',
    city: 'Visakhapatnam Metropolitan Region',
    state: 'Andhra Pradesh',
    pincode: '530002',
  },
  items: [
    { title: 'Handcrafted Kondapalli Dasavatara Wooden Statues Set', quantity: 2, price: 4999 },
    {
      title: 'Tirupati Venkateswara Swamy Brass Murti 12 Inch Antique Gold Finish',
      quantity: 1,
      price: 8500,
    },
    { title: 'Traditional Kalamkari Peacock Wall Hanging 4x6 Feet', quantity: 3, price: 1200 },
  ],
  subtotal: 22098,
  discount: 2000,
  shippingFee: 250,
  tax: {
    taxableAmount: 17201.69,
    cgst: 1548.15,
    sgst: 1548.15,
    totalTax: 3096.31,
    grandTotal: 23444,
  },
  totalAmount: 23444,
};

export default function InvoicePreviewPage() {
  const [useExtreme, setUseExtreme] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const currentOrder = useExtreme ? sampleExtremeOrder : sampleReferenceOrder;

  return (
    <div className="min-h-screen bg-neutral-100 py-6 px-2 sm:px-4 flex flex-col items-center">
      {/* Test Controls */}
      <div className="mb-4 flex items-center gap-3 bg-white p-2.5 rounded-full shadow-sm border border-neutral-200 flex-wrap justify-center">
        <button
          id="btn-reference"
          onClick={() => setUseExtreme(false)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            !useExtreme ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Reference Order
        </button>
        <button
          id="btn-extreme"
          onClick={() => setUseExtreme(true)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            useExtreme ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Extreme Data
        </button>
        <button
          id="btn-modal"
          onClick={() => setShowModal(!showModal)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            showModal ? 'bg-emerald-700 text-white' : 'bg-gray-900 text-white'
          }`}
        >
          {showModal ? 'Close Modal View' : 'Preview as Modal'}
        </button>
      </div>

      {/* Direct Canvas View */}
      {!showModal && (
        <div className="w-full max-w-2xl bg-transparent flex justify-center">
          <InvoiceTemplate order={currentOrder} onClose={() => {}} />
        </div>
      )}

      {/* Modal Dialog Simulation (Matches OrderSuccess, Dashboard, Admin) */}
      {showModal && (
        <>
          <div
            onClick={() => setShowModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] no-print"
          />
          <div className="invoice-modal-container fixed bottom-0 left-0 right-0 lg:top-0 lg:bottom-0 lg:my-auto lg:h-fit lg:rounded-[28px] mx-auto w-full max-w-[580px] max-h-[92vh] bg-surface rounded-t-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-outline-variant/30 z-[101] overflow-y-auto no-scrollbar pt-2.5 pb-2 px-3 sm:pt-3 sm:pb-2.5 sm:px-4 print:static print:p-0 print:border-none print:shadow-none print:bg-white">
            <InvoiceTemplate order={currentOrder} onClose={() => setShowModal(false)} />
          </div>
        </>
      )}
    </div>
  );
}
