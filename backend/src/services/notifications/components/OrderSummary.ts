export interface OrderSummaryProps {
  subtotal: number | string;
  shipping: number | string;
  tax?: number | string;
  discount?: number | string;
  total: number | string;
}

export const OrderSummary = ({ subtotal, shipping, tax, discount, total }: OrderSummaryProps) => {
  const taxHtml =
    tax !== undefined
      ? `
    <tr>
      <td style="padding: 8px 0; color: #6b7280; font-size: 15px;">Tax</td>
      <td align="right" style="padding: 8px 0; color: #111827; font-size: 15px;">₹${tax}</td>
    </tr>
  `
      : '';

  const discountHtml = discount
    ? `
    <tr>
      <td style="padding: 8px 0; color: #10b981; font-size: 15px;">Discount</td>
      <td align="right" style="padding: 8px 0; color: #10b981; font-size: 15px;">-₹${discount}</td>
    </tr>
  `
    : '';

  return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
      <tr>
        <td style="padding: 8px 0; color: #6b7280; font-size: 15px;">Subtotal</td>
        <td align="right" style="padding: 8px 0; color: #111827; font-size: 15px;">₹${subtotal}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280; font-size: 15px;">Shipping</td>
        <td align="right" style="padding: 8px 0; color: #111827; font-size: 15px;">₹${shipping}</td>
      </tr>
      ${taxHtml}
      ${discountHtml}
      <tr>
        <td style="padding: 16px 0 8px 0; color: #111827; font-size: 18px; font-weight: 600; border-top: 1px solid #e5e7eb;">Total</td>
        <td align="right" style="padding: 16px 0 8px 0; color: #111827; font-size: 18px; font-weight: 600; border-top: 1px solid #e5e7eb;">₹${total}</td>
      </tr>
    </table>
  `;
};
