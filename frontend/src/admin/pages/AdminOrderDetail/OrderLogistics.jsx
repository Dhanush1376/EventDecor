import React from 'react';
import { m as motion } from 'framer-motion';
import { fadeUp } from '../../components/AdminUIKit';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';

export function OrderLogistics({ order, trackingQR }) {
  return (
    <motion.div variants={fadeUp} className="admin-card p-6 relative overflow-hidden">
      {/* Top accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-[var(--admin-text-primary)]"></div>

      <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-5 flex items-center justify-between">
        <span>Enterprise Logistics</span>
        <span className="text-[10px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] px-2 py-0.5 rounded-[var(--admin-radius-sm)] font-bold uppercase tracking-wider border border-[var(--admin-border-subtle)]">
          {order.courierPartner || 'Delhivery'}
        </span>
      </h2>

      <div className="space-y-3 mb-6 bg-[var(--admin-surface-muted)] p-5 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]">
        <div className="flex justify-between items-center text-[12px]">
          <span className="text-[var(--admin-text-secondary)] font-medium">Tracking AWB</span>
          <span className="font-bold text-[var(--admin-text-primary)]">
            {order.trackingNumber || 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center text-[12px]">
          <span className="text-[var(--admin-text-secondary)] font-medium">Invoice No</span>
          <span className="font-bold text-[var(--admin-text-primary)]">
            {order.invoiceNumber || 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center text-[12px]">
          <span className="text-[var(--admin-text-secondary)] font-medium">Package</span>
          <span className="font-bold text-[var(--admin-text-primary)]">
            {order.packageType || 'Box'} ({order.weight || '1.0'}kg)
          </span>
        </div>
      </div>

      {order.barcodeData && (
        <div className="flex justify-center mb-6 py-4 bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]">
          <Barcode
            value={order.barcodeData}
            height={35}
            width={1.5}
            displayValue={false}
            background="transparent"
          />
        </div>
      )}

      <div className="flex flex-col items-center justify-center p-4 border border-dashed border-[var(--admin-border-strong)] rounded-[var(--admin-radius-lg)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] transition-colors">
        <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-3">
          Scan to Track
        </span>
        <QRCodeSVG value={trackingQR} size={110} level="M" />
      </div>
    </motion.div>
  );
}
