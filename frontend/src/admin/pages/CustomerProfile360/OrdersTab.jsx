import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { orderService } from '../../../services/domainServices';
import { StatusBadge, formatCurrency } from '../../components/AdminUIKit';

export default function OrdersTab({ customerId }) {
  const navigate = useNavigate();
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await orderService.getAll({ user: customerId });
        // The paginated response is nested in response.data.data
        const orders = response?.data?.data || response?.data || [];
        setCustomerOrders(Array.isArray(orders) ? orders : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [customerId]);

  if (loading)
    return <div className="p-12 text-center animate-pulse text-gray-500">Loading orders...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Order History</h3>
      </div>

      {customerOrders.length > 0 ? (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {customerOrders.map((o) => (
                <tr key={o._id || o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900 text-sm uppercase tracking-wider">
                      {o._id ? o._id.substring(o._id.length - 8) : o.id}
                    </p>
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {new Date(o.createdAt || o.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">{formatCurrency(o.total)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={o.orderStatus || o.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate(`/admin/orders/${o._id || o.id}`)}
                      className="p-2 bg-white rounded border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-[var(--admin-accent)] transition-colors"
                      title="View Order"
                    >
                      <span className="material-symbols-outlined text-[18px] block">
                        visibility
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-20 text-center bg-gray-50 border border-dashed border-gray-300 rounded-xl">
          <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-1">No Orders Yet</p>
          <p className="text-sm text-gray-500">This customer hasn't placed any orders.</p>
        </div>
      )}
    </div>
  );
}
