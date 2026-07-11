import React, { useState, useEffect } from 'react';
import Activity from 'lucide-react/dist/esm/icons/activity';
import ShoppingCart from 'lucide-react/dist/esm/icons/shopping-cart';
import MousePointerClick from 'lucide-react/dist/esm/icons/mouse-pointer-click';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Search from 'lucide-react/dist/esm/icons/search';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import { customerIntelligenceService } from '../../../services/domainServices';
import logger from '../../../utils/core/logger';

export default function JourneyTab({ customerId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJourney = async () => {
      try {
        const data = await customerIntelligenceService.getCustomerJourney(customerId);
        setEvents(data || []);
      } catch (err) {
        logger.error('Failed to load customer journey', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJourney();
  }, [customerId]);

  const getEventIcon = (type) => {
    switch (type) {
      case 'page_view':
        return <Eye className="w-4 h-4 text-blue-500" />;
      case 'product_click':
        return <MousePointerClick className="w-4 h-4 text-[var(--admin-accent)]" />;
      case 'add_to_cart':
        return <ShoppingCart className="w-4 h-4 text-purple-500" />;
      case 'search':
        return <Search className="w-4 h-4 text-amber-500" />;
      case 'purchase':
        return <Activity className="w-4 h-4 text-green-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'page_view':
        return 'bg-blue-50 border-blue-200';
      case 'product_click':
        return 'bg-[var(--admin-bg-subtle)] border-[var(--admin-border-subtle)]';
      case 'add_to_cart':
        return 'bg-purple-50 border-purple-200';
      case 'search':
        return 'bg-amber-50 border-amber-200';
      case 'purchase':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) return <div className="animate-pulse h-64 bg-gray-50 rounded-lg"></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
        <select className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--admin-accent)]">
          <option value="all">All Events</option>
          <option value="purchases">Purchases Only</option>
          <option value="cart">Cart Activity</option>
        </select>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Activity className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No recent activity recorded</p>
          <p className="text-sm text-gray-500">
            The 90-day event retention window might have expired or no events tracked.
          </p>
        </div>
      ) : (
        <div className="relative border-l-2 border-gray-200 ml-4 pl-6 space-y-8">
          {events.map((event, idx) => (
            <div key={idx} className="relative">
              {/* Timeline Dot */}
              <div className="absolute -left-[35px] top-1 w-6 h-6 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                {getEventIcon(event.eventType)}
              </div>

              <div className={`p-4 rounded-lg border ${getEventColor(event.eventType)} shadow-sm`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-gray-900 capitalize">
                    {event.eventType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>

                {/* Event Metadata payload */}
                {event.metadata && (
                  <div className="text-sm text-gray-700 bg-white/50 rounded p-2 mt-2">
                    <pre className="whitespace-pre-wrap font-sans">
                      {Object.entries(event.metadata).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-gray-500">{k}:</span> {v}
                        </div>
                      ))}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
