import { MetadataGrid, InvoiceTable, CTAButton } from '../../components';

export const OrderCreatedAdminTemplate = (data: any) => {
  const { customerInfo, customerStats, orderDetails, products, finance, deliveryInfo } = data;

  const productRows = products.map((p: any) => ({
    description: `${p.name} (SKU: ${p.sku})`,
    quantity: p.quantity,
    unitPrice: p.price,
    total: p.price * p.quantity,
  }));

  const content = `
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px 0; color: #111827;">New Order Received</h2>
      <p style="margin: 0; color: #4b5563; font-family: monospace;">ID: ${orderDetails.id} | Platform Fee: ₹${finance.fees.platformFee} | Est. Margin: ${finance.profitability.marginPercentage}</p>
    </div>

    ${MetadataGrid({
      title: 'Customer Intelligence',
      data: {
        Name: customerInfo.name,
        Email: customerInfo.email,
        Phone: customerInfo.phone,
        LTV: `₹${customerStats.lifetimeSpend}`,
        Orders: customerStats.orderCount,
        Tier: customerInfo.loyaltyTier,
        IP: customerInfo.device?.ip || 'N/A',
      },
    })}

    ${MetadataGrid({
      title: 'Financial Breakdown',
      data: {
        'Gross Revenue': `₹${finance.grossRevenue}`,
        'Net Revenue': `₹${finance.netRevenue}`,
        GST: `₹${finance.taxes.total}`,
        'Gateway Fee': `₹${finance.fees.gatewayFee}`,
        'Est. Profit': `₹${finance.profitability.estimatedProfit}`,
      },
    })}

    <h3 style="margin: 32px 0 16px 0; color: #111827;">Itemized Breakdown</h3>
    ${InvoiceTable(productRows, orderDetails.subtotal, orderDetails.tax || 0, orderDetails.total)}

    <div style="margin-top: 32px; display: flex; gap: 12px;">
      ${CTAButton('View Order', `/admin/orders/${orderDetails.id}`, 'primary')}
      ${CTAButton('View Customer', `/admin/customers/${customerInfo.id}`, 'secondary')}
    </div>
  `;

  return {
    html: content,
    subject: `[NEW ORDER] ₹${orderDetails.total} from ${customerInfo.name}`,
    preheader: `Order ID: ${orderDetails.id} | LTV: ₹${customerStats.lifetimeSpend}`,
  };
};
