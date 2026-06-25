export interface InvoiceRow {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  total: number;
}

export const InvoiceTable = (rows: InvoiceRow[], subtotal: number, tax: number, total: number) => {
  const rowsHtml = rows
    .map(
      (row) => `
    <tr>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px;">${row.description}</td>
      <td align="center" style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">${row.quantity}</td>
      <td align="right" style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">₹${row.unitPrice}</td>
      <td align="right" style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 500;">₹${row.total}</td>
    </tr>
  `,
    )
    .join('');

  return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0; border-collapse: collapse;">
      <thead>
        <tr>
          <th align="left" style="padding: 12px 8px; border-bottom: 2px solid #e5e7eb; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Description</th>
          <th align="center" style="padding: 12px 8px; border-bottom: 2px solid #e5e7eb; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Qty</th>
          <th align="right" style="padding: 12px 8px; border-bottom: 2px solid #e5e7eb; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Unit Price</th>
          <th align="right" style="padding: 12px 8px; border-bottom: 2px solid #e5e7eb; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" align="right" style="padding: 12px 8px; color: #6b7280; font-size: 14px;">Subtotal</td>
          <td align="right" style="padding: 12px 8px; color: #111827; font-size: 14px; font-weight: 500;">₹${subtotal}</td>
        </tr>
        <tr>
          <td colspan="3" align="right" style="padding: 8px 8px; color: #6b7280; font-size: 14px;">Tax</td>
          <td align="right" style="padding: 8px 8px; color: #111827; font-size: 14px; font-weight: 500;">₹${tax}</td>
        </tr>
        <tr>
          <td colspan="3" align="right" style="padding: 16px 8px 8px 8px; color: #111827; font-size: 16px; font-weight: 600;">Total</td>
          <td align="right" style="padding: 16px 8px 8px 8px; color: #111827; font-size: 16px; font-weight: 600;">₹${total}</td>
        </tr>
      </tfoot>
    </table>
  `;
};
