import React from 'react';
import { AdminCustomerDetailDrawer } from './AdminCustomerDetailDrawer';

export default function AdminCustomerProfileModal({ customer, onClose, onDelete }) {
  const customerId =
    customer?._id || customer?.id || (typeof customer === 'string' ? customer : null);
  const customerData = typeof customer === 'object' ? customer : null;

  return (
    <AdminCustomerDetailDrawer
      customerId={customerId}
      customerData={customerData}
      customer={customer}
      isOpen={Boolean(customerId || customerData)}
      onClose={onClose}
      onDelete={onDelete}
    />
  );
}

export { AdminCustomerProfileModal };
