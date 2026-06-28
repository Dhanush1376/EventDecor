import React, { useState, useEffect } from 'react';
import { Activity, Globe, Users, ShoppingCart, Search } from 'lucide-react';
import { io } from 'socket.io-client';
import { getApiRootUrl } from '../../../config/apiConfig';

export default function LiveOperationsDashboard() {
  const [activeVisitors, setActiveVisitors] = useState(new Map());

  useEffect(() => {
    // Connect to /admin namespace for alerts
    const socket = io(`${getApiRootUrl()}/admin`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('live:visitor_sync', (data) => {
      setActiveVisitors((prev) => {
        const next = new Map(prev);

        // Sync visitors from server
        data.visitors.forEach((visitor) => {
          const key =
            visitor.sessionId ||
            visitor.socketId ||
            `anon-${Math.random().toString(36).substr(2, 9)}`;
          next.set(key, { ...visitor, lastSeen: data.timestamp });
        });

        return next;
      });
    });

    // Cleanup stale visitors (no heartbeat for > 60s)
    const cleanupInterval = setInterval(() => {
      setActiveVisitors((prev) => {
        const next = new Map(prev);
        const now = Date.now();
        for (const [key, val] of next.entries()) {
          if (now - val.lastSeen > 60000) {
            next.delete(key);
          }
        }
        return next;
      });
    }, 10000);

    return () => {
      socket.disconnect();
      clearInterval(cleanupInterval);
    };
  }, []);

  const visitors = Array.from(activeVisitors.values()).sort((a, b) => b.lastSeen - a.lastSeen);

  return (
    <div className="space-y-6">
      <div className="bg-[var(--admin-bg-subtle)] rounded-xl p-6 md:p-8 flex items-center justify-between shadow-sm border border-[var(--admin-border-subtle)]">
        <div>
          <h2 className="text-2xl font-bold mb-1 flex items-center gap-2 text-[var(--admin-text-primary)]">
            <Globe className="w-6 h-6 text-green-400 animate-pulse" />
            Live Operations
          </h2>
          <p className="text-[var(--admin-text-secondary)] max-w-lg">
            Monitor real-time visitor activity, active carts, and search queries across the
            platform.
          </p>
        </div>
        <div className="bg-white/50 backdrop-blur-sm p-6 rounded-xl border border-[var(--admin-border-subtle)] text-center min-w-[160px]">
          <p className="text-[var(--admin-text-secondary)] text-sm font-medium mb-1">
            Active Visitors
          </p>
          <p className="text-5xl font-bold text-[var(--admin-text-primary)]">{visitors.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--admin-accent)]" /> Active Sessions Feed
          </h3>
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        </div>

        {visitors.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Globe className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p>Waiting for live visitor traffic...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {visitors.map((visitor, idx) => (
              <div
                key={idx}
                className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--admin-surface-muted)] flex items-center justify-center shrink-0 border border-[var(--admin-border-strong)]">
                  <Users className="w-5 h-5 text-[var(--admin-accent)]" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    Viewing: {visitor.currentPage || 'Unknown Page'}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{Math.floor((Date.now() - visitor.lastSeen) / 1000)}s ago</span>

                    {visitor.productViewed && (
                      <span className="flex items-center gap-1 text-[var(--admin-accent)] bg-[var(--admin-surface-muted)] px-2 py-0.5 rounded border border-[var(--admin-border-strong)]">
                        <ShoppingCart className="w-3 h-3" /> Product{' '}
                        {visitor.productViewed.substring(0, 8)}...
                      </span>
                    )}

                    {visitor.searchQuery && (
                      <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        <Search className="w-3 h-3" /> "{visitor.searchQuery}"
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
