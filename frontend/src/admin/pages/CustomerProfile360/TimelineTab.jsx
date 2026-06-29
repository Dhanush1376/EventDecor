import React, { useState, useEffect } from 'react';
import { Activity, ShoppingBag, StickyNote, Filter } from 'lucide-react';
import { customerIntelligenceService } from '../../../services/domainServices';

export default function TimelineTab({ customerId }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchTimeline = async (reset = false) => {
    try {
      const currentSkip = reset ? 0 : skip;
      if (reset) setLoading(true);

      const res = await customerIntelligenceService.getCustomerTimeline(customerId, {
        skip: currentSkip,
        limit: 20,
        filter,
      });

      if (res?.success) {
        if (reset) {
          setTimeline(res.data.timeline);
        } else {
          setTimeline((prev) => [...prev, ...res.data.timeline]);
        }
        setHasMore(res.data.hasMore);
        setSkip(currentSkip + 20);
      }
    } catch (error) {
      console.error('Failed to fetch timeline', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, filter]);

  const getIcon = (iconString) => {
    switch (iconString) {
      case 'shopping_bag':
        return <ShoppingBag className="w-5 h-5 text-green-500" />;
      case 'note':
        return <StickyNote className="w-5 h-5 text-yellow-500" />;
      case 'analytics':
        return <Activity className="w-5 h-5 text-[var(--admin-accent)]" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getIconBg = (iconString) => {
    switch (iconString) {
      case 'shopping_bag':
        return 'bg-green-50 border-green-200';
      case 'note':
        return 'bg-yellow-50 border-yellow-200';
      case 'analytics':
        return 'bg-[var(--admin-bg-subtle)] border-[var(--admin-border-subtle)]';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Unified Timeline</h3>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--admin-accent)] bg-white"
          >
            <option value="all">All Activity</option>
            <option value="orders">Orders Only</option>
            <option value="events">Analytics Events</option>
            <option value="notes">Admin Notes</option>
          </select>
        </div>
      </div>

      {loading && timeline.length === 0 ? (
        <div className="animate-pulse h-64 bg-gray-50 rounded-lg"></div>
      ) : timeline.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-1">No Activity Found</p>
          <p className="text-sm text-gray-500">This customer hasn't generated any events yet.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-gray-200 ml-4 pl-8 space-y-8 pb-10">
          {timeline.map((item, idx) => (
            <div key={item._id || idx} className="relative group">
              <div
                className={`absolute -left-[45px] top-1 w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-sm ${getIconBg(item.icon)}`}
              >
                {getIcon(item.icon)}
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900 capitalize">
                    {item.title.replace(/_/g, ' ')}
                  </h4>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>

                {/* Event Metadata Payload */}
                {item.data && Object.keys(item.data).length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(item.data).map(([key, val]) => {
                      if (val === null || val === undefined) return null;
                      const formattedKey = key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, (str) => str.toUpperCase());
                      const displayVal =
                        typeof val === 'object' ? JSON.stringify(val) : String(val);
                      const isCurrency =
                        key.toLowerCase().includes('total') ||
                        key.toLowerCase().includes('revenue') ||
                        key.toLowerCase().includes('price');

                      return (
                        <div
                          key={key}
                          className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex flex-col justify-center"
                        >
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            {formattedKey}
                          </span>
                          <span
                            className="text-sm font-semibold text-gray-900 truncate"
                            title={displayVal}
                          >
                            {isCurrency && !isNaN(val)
                              ? `₹${Number(val).toLocaleString()}`
                              : displayVal}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="text-center pt-4 border-t border-gray-100">
          <button
            onClick={() => fetchTimeline(false)}
            className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-[var(--admin-accent)] hover:bg-gray-50 transition-colors"
          >
            {loading ? 'Loading...' : 'Load More History'}
          </button>
        </div>
      )}
    </div>
  );
}
