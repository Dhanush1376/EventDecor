export interface ProductCardProps {
  image?: string;
  name: string;
  variant?: string;
  price: string | number;
  quantity: number;
  sku?: string;
}

export const ProductCard = ({ image, name, variant, price, quantity, sku }: ProductCardProps) => {
  const imageHtml = image
    ? `<td width="80" valign="top" style="padding-right: 16px;">
         <img src="${image}" alt="${name}" width="80" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb;" />
       </td>`
    : '';

  const variantHtml = variant
    ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">Variant: ${variant}</p>`
    : '';

  const skuHtml = sku
    ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #9ca3af; font-family: monospace;">SKU: ${sku}</p>`
    : '';

  return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px; border-bottom: 1px solid #f3f4f6; padding-bottom: 16px;">
      <tr>
        ${imageHtml}
        <td valign="top">
          <h4 style="margin: 0 0 4px 0; font-size: 16px; color: #111827; font-weight: 600;">${name}</h4>
          ${variantHtml}
          ${skuHtml}
        </td>
        <td valign="top" align="right" style="padding-left: 16px;">
          <p style="margin: 0 0 4px 0; font-size: 16px; color: #111827; font-weight: 500;">₹${price}</p>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Qty: ${quantity}</p>
        </td>
      </tr>
    </table>
  `;
};
