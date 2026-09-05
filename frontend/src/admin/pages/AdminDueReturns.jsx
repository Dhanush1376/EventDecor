import React, { useState, useEffect } from 'react';
import { m as motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import rentalService from '../../services/api/rentalService';
import { SkeletonTable, EmptyState, fadeUp } from '../components/AdminUIKit';
import { EXTERNAL_URLS } from '../../config/constants';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';

export function AdminDueReturns() {
  const navigate = useNavigate();
  const [data, setData] = useState({ dueToday: [], overdue: [], upcoming: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDueReturns = async () => {
      try {
        const res = await rentalService.adminGetDueReturns();
        if (res.success) {
          setData(res.data);
        }
      } catch (error) {
        toast.error('Failed to load due returns');
      } finally {
        setLoading(false);
      }
    };
    fetchDueReturns();
  }, []);

  const goToDetail = (id) => {
    navigate(`/admin/rentals/detail/${id}`);
  };

  const renderSection = (title, items, icon, colorClass, emptyMessage) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="mb-8">
        <h3 className={`text-[15px] font-bold flex items-center gap-2 mb-4 ${colorClass}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
          {title} ({items.length})
        </h3>
        <div className="admin-card p-0 bg-transparent sm:bg-white sm:shadow-sm sm:border sm:border-[var(--admin-border-subtle)]">
          <div className="hidden md:block overflow-x-auto">
            <table className="admin-table w-full min-w-[700px]">
              <thead>
                <tr>
                  <th>Rental ID</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Return Date</th>
                  <th>Days Overdue</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const endDate = new Date(r.rentalEndDate);
                  endDate.setHours(0, 0, 0, 0);

                  const diffTime = today - endDate;
                  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                  return (
                    <tr
                      key={r._id}
                      className="admin-table-row-clickable group bg-gray-50 border-gray-200"
                      onClick={() => goToDetail(r._id)}
                    >
                      <td className="font-semibold text-[var(--admin-text-primary)]">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            #{r._id.substring(r._id.length - 8).toUpperCase()}
                          </div>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded w-max bg-indigo-100 text-indigo-700">
                            RENTAL
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span
                            className="font-semibold text-[var(--admin-text-primary)] truncate max-w-[150px]"
                            title={
                              r.userId?.name || r.user?.name || r.shippingAddress?.name || 'Guest'
                            }
                          >
                            {r.userId?.name || r.user?.name || r.shippingAddress?.name || 'Guest'}
                          </span>
                          <span className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">call</span>
                            {r.userId?.phone || r.user?.phone || r.shippingAddress?.phone || 'N/A'}
                          </span>
                          {r.shippingAddress?.address && (
                            <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1.5 flex items-start gap-1 leading-tight max-w-[150px]">
                              <span className="material-symbols-outlined text-[11px] mt-0.5 shrink-0">
                                location_on
                              </span>
                              <span className="truncate whitespace-normal line-clamp-2">
                                {r.shippingAddress.address}
                                {r.shippingAddress.city ? `, ${r.shippingAddress.city}` : ''}
                              </span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="max-w-[200px] py-3 pr-4">
                        <div className="flex items-center gap-3 w-full">
                          <img
                            src={
                              r.productImage ||
                              r.productImages?.[0] ||
                              r.productThumbnail ||
                              'https://placehold.co/100x100/f3f4f6/a1a1aa?text=Image'
                            }
                            alt={r.productTitle}
                            className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm bg-gray-100 shrink-0"
                          />
                          <span
                            className="text-[12.5px] font-medium text-[var(--admin-text-secondary)] leading-snug line-clamp-2"
                            title={r.productTitle}
                          >
                            {r.productTitle}
                          </span>
                        </div>
                      </td>
                      <td className="font-bold text-[var(--admin-text-primary)]">
                        {endDate.toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        {diffDays > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-100 text-red-700 rounded-[var(--admin-radius-sm)] border border-red-200 text-[10px] font-bold uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[12px]">warning</span>
                            {diffDays} days overdue
                          </span>
                        ) : diffDays === 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-100 text-amber-700 rounded-[var(--admin-radius-sm)] border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[12px]">today</span>
                            Due Today
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-[var(--admin-radius-sm)] border border-indigo-200 text-[10px] font-bold uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                            in {Math.abs(diffDays)} days
                          </span>
                        )}
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => goToDetail(r._id)}
                            className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                            title="Process Return"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              forward_to_inbox
                            </span>
                          </button>

                          {/* WhatsApp Contact */}
                          <a
                            href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${(r.userId?.phone || r.user?.phone || r.shippingAddress?.phone || '').replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[#25D366] transition-colors"
                            title="Contact via WhatsApp"
                          >
                            <WhatsAppIcon className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex md:hidden flex-col gap-3 px-1 py-3">
            {items.map((r) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const endDate = new Date(r.rentalEndDate);
              endDate.setHours(0, 0, 0, 0);

              const diffTime = today - endDate;
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              const imgSrc =
                r.productImage ||
                r.productImages?.[0] ||
                r.productThumbnail ||
                'https://placehold.co/100x100/f3f4f6/a1a1aa?text=Image';

              return (
                <div
                  key={r._id}
                  onClick={() => goToDetail(r._id)}
                  className="bg-gray-50 border-gray-200 rounded-[12px] p-4 border shadow-sm hover:border-gray-500 hover:shadow-md transition-all duration-200 cursor-pointer group text-left flex flex-col relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-12 h-12 pointer-events-none z-10 overflow-hidden rounded-tl-[12px]">
                    <div className="absolute top-2 -left-7 w-24 text-[7px] font-extrabold text-white text-center uppercase py-[2px] -rotate-45 shadow-sm tracking-wider bg-indigo-500">
                      RENTAL
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[15px] font-bold text-gray-900 ml-6">
                      #{r._id.substring(r._id.length - 8).toUpperCase()}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-gray-200 text-gray-700">
                      {endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mb-2 text-gray-800">
                    <span className="text-[12px] font-medium uppercase tracking-wide truncate max-w-[140px]">
                      {r.userId?.name || r.user?.name || r.shippingAddress?.name || 'Guest'}
                    </span>
                    <div className="flex items-center gap-1.5 text-[12px] font-medium">
                      <span className="material-symbols-outlined text-[15px]">call</span>
                      {(r.userId?.phone || r.user?.phone || r.shippingAddress?.phone || 'N/A')
                        .replace('+91', '')
                        .trim()}
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5 mb-4 text-gray-800">
                    <span className="material-symbols-outlined text-[15px] mt-0.5 shrink-0">
                      location_on
                    </span>
                    <span className="text-[11px] leading-snug line-clamp-2">
                      {r.shippingAddress?.address || 'Address not provided'}
                      {r.shippingAddress?.city ? `, ${r.shippingAddress.city}` : ''}
                    </span>
                  </div>

                  <div className="border-y border-black/5 py-3 mb-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={imgSrc}
                        alt=""
                        className="w-[34px] h-[34px] rounded-md object-cover border border-white shadow-sm bg-gray-100 shrink-0"
                      />
                      <div className="flex flex-col">
                        <span className="text-[11px] text-gray-800 leading-snug line-clamp-2 mt-0.5 font-bold">
                          {r.productTitle}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-1">
                    <div>
                      {diffDays > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-[4px] border border-red-200 text-[9px] font-bold uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[10px]">warning</span>
                          {diffDays}d overdue
                        </span>
                      ) : diffDays === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-[4px] border border-amber-200 text-[9px] font-bold uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[10px]">today</span>
                          Due Today
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-[4px] border border-indigo-200 text-[9px] font-bold uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[10px]">schedule</span>
                          in {Math.abs(diffDays)}d
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        className="text-gray-700 hover:text-[var(--admin-primary)] transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToDetail(r._id);
                        }}
                        title="Process Return"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          forward_to_inbox
                        </span>
                      </button>

                      <a
                        href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${(r.userId?.phone || r.user?.phone || r.shippingAddress?.phone || '').replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-700 hover:text-[#25D366] transition-colors"
                        title="WhatsApp"
                      >
                        <WhatsAppIcon className="w-[18px] h-[18px]" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <motion.div initial="hidden" animate="show" exit="hidden" variants={fadeUp}>
        <SkeletonTable rows={5} cols={6} />
      </motion.div>
    );
  }

  const hasAnyData =
    data.dueToday?.length > 0 || data.overdue?.length > 0 || data.upcoming?.length > 0;

  if (!hasAnyData) {
    return (
      <motion.div initial="hidden" animate="show" exit="hidden" variants={fadeUp} className="py-12">
        <EmptyState
          icon="check_circle"
          title="All Caught Up"
          description="There are no overdue returns or returns due today."
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      exit="hidden"
      variants={fadeUp}
      className="space-y-2"
    >
      {renderSection('Overdue', data.overdue, 'warning', 'text-red-600')}
      {renderSection('Due Today', data.dueToday, 'today', 'text-amber-600')}
      {renderSection('Upcoming (Next 3 Days)', data.upcoming, 'event_upcoming', 'text-indigo-600')}
    </motion.div>
  );
}
