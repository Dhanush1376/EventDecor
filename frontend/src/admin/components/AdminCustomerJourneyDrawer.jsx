import React from 'react';
import { AdminCustomerDetailDrawer } from './AdminCustomerDetailDrawer';

export function AdminCustomerJourneyDrawer({
  customerId,
  customerData,
  customer,
  isOpen,
  onClose,
  onDelete,
}) {
  return (
    <AdminCustomerDetailDrawer
      customerId={customerId}
      customerData={customerData || customer}
      isOpen={isOpen}
      onClose={onClose}
      onDelete={onDelete}
    />
  );
}

export default AdminCustomerJourneyDrawer;
