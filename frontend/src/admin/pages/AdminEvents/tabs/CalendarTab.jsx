import React, { useState, useEffect, useMemo } from 'react';
import { m as motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { StatusBadge, formatCurrency, fadeUp } from '../../../components/AdminUIKit';
import { handleImageError } from '../../../../utils/media/imageUtils';

export function CalendarTab({ bookings = [], showcases = [], onMonthSummaryChange }) {
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('all');

  // Create local date string in YYYY-MM-DD format for today
  const tzOffset = new Date().getTimezoneOffset() * 60000;
  const localISOTime = new Date(Date.now() - tzOffset).toISOString().split('T')[0];
  const [selectedDateStr, setSelectedDateStr] = useState(localISOTime);

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Previous month padding
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDay = prevMonthTotalDays - i;
      const prevDate = new Date(year, month - 1, prevDay, 12);
      days.push({
        day: prevDay,
        dateStr: prevDate.toISOString().split('T')[0],
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i, 12);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ day: i, dateStr, isCurrentMonth: true });
    }

    // Next month padding to fill out 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i, 12);
      days.push({ day: i, dateStr: nextDate.toISOString().split('T')[0], isCurrentMonth: false });
    }

    return days;
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDateStr(localISOTime);
  };

  const getBookingThumbnail = (b) => {
    if (b.eventPackage?.image) return b.eventPackage.image;
    if (b.eventPackage?.imageSrc) return b.eventPackage.imageSrc;
    if (b.inspirationImages && b.inspirationImages.length > 0 && b.inspirationImages[0]) {
      return b.inspirationImages[0];
    }
    if (b.showcase?.image) return b.showcase.image;
    if (b.image) return b.image;

    if (Array.isArray(showcases) && showcases.length > 0) {
      const pkgId = b.eventPackage?._id || b.showcaseId || b.packageId;
      if (pkgId) {
        const found = showcases.find((s) => (s._id || s.id) === pkgId);
        if (found?.image) return found.image;
      }
      const bTitle = (b.title || '').toLowerCase().trim();
      if (bTitle) {
        const foundTitle = showcases.find((s) => s.title && s.title.toLowerCase().includes(bTitle));
        if (foundTitle?.image) return foundTitle.image;
      }
      return showcases[0]?.image || null;
    }
    return null;
  };

  const calendarDays = getCalendarDays();
  const currentMonthName = currentDate.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const monthYearStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const currentMonthBookings = bookings.filter((b) => {
    if (!b.date) return false;
    const datePrefix = b.date.substring(0, 7);
    return datePrefix === monthYearStr;
  });

  const filteredMonthBookings = currentMonthBookings.filter((b) => {
    if (statusFilter === 'all') return true;
    const status = (b.status || '').toLowerCase();
    if (statusFilter === 'confirmed') return status === 'confirmed' || status === 'booked';
    if (statusFilter === 'pending') return status.includes('pending');
    if (statusFilter === 'inquiry') return status === 'inquiry' || status === 'draft';
    return true;
  });

  const confirmedCount = currentMonthBookings.filter(
    (b) =>
      (b.status || '').toLowerCase() === 'confirmed' || (b.status || '').toLowerCase() === 'booked',
  ).length;

  const pendingCount = currentMonthBookings.filter((b) =>
    (b.status || '').toLowerCase().includes('pending'),
  ).length;

  const totalMonthValue = currentMonthBookings.reduce(
    (acc, b) => acc + Number(b.pricing?.totalPrice || 0),
    0,
  );

  const selectedDateBookings = bookings.filter(
    (b) => b.date && b.date.substring(0, 10) === selectedDateStr,
  );

  const selectedDateFormatted = new Date(selectedDateStr + 'T00:00:00').toLocaleDateString(
    'en-IN',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  );

  // Find next upcoming event from today onwards
  const nextUpcomingBooking = useMemo(() => {
    const todayStr = localISOTime;
    const futureBookings = bookings
      .filter((b) => b.date && b.date.substring(0, 10) > todayStr)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return futureBookings[0] || null;
  }, [bookings, localISOTime]);

  const nextEventDateFormatted = useMemo(() => {
    if (!nextUpcomingBooking?.date) return null;
    const d = new Date(nextUpcomingBooking.date.substring(0, 10) + 'T00:00:00');
    return d.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
  }, [nextUpcomingBooking]);

  const nextEventDaysDiff = useMemo(() => {
    if (!nextUpcomingBooking?.date) return null;
    const today = new Date(localISOTime + 'T00:00:00');
    const nextDate = new Date(nextUpcomingBooking.date.substring(0, 10) + 'T00:00:00');
    const diffTime = nextDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1) return `in ${diffDays} days`;
    return null;
  }, [nextUpcomingBooking, localISOTime]);

  useEffect(() => {
    if (onMonthSummaryChange) {
      onMonthSummaryChange({
        count: currentMonthBookings.length,
        confirmed: confirmedCount,
        pending: pendingCount,
        monthName: currentMonthName,
      });
    }
  }, [
    currentMonthBookings.length,
    confirmedCount,
    pendingCount,
    currentMonthName,
    onMonthSummaryChange,
  ]);

  return (
    <motion.div
      key="calendar"
      initial="hidden"
      animate="show"
      variants={fadeUp}
      className="space-y-4"
    >
      {/* Calendar Controls Toolbar (Strictly 1 line, compact, no wrapping or scrolling) */}
      <div className="bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] shadow-xs p-2 overflow-hidden">
        <div className="flex items-center justify-between gap-2 flex-nowrap">
          {/* Controls: Month Stepper + Today + Status Dropdown strictly in 1 line */}
          <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
            {/* Month Stepper Buttons */}
            <div className="flex items-center bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] p-0.5 min-h-0 h-[32px] sm:h-[34px] max-h-[32px] sm:max-h-[34px] box-border shrink-0">
              <button
                type="button"
                onClick={prevMonth}
                className="min-h-0 w-[24px] h-[24px] min-w-[24px] max-h-[24px] rounded-[3px] box-border flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface)] transition-colors cursor-pointer"
                title="Previous Month"
              >
                <span className="material-symbols-outlined text-[15px]">chevron_left</span>
              </button>

              <span className="px-1.5 text-[11.5px] sm:text-[12px] font-bold text-[var(--admin-text-primary)] min-w-[75px] sm:min-w-[90px] text-center select-none truncate">
                {currentMonthName}
              </span>

              <button
                type="button"
                onClick={nextMonth}
                className="min-h-0 w-[24px] h-[24px] min-w-[24px] max-h-[24px] rounded-[3px] box-border flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface)] transition-colors cursor-pointer"
                title="Next Month"
              >
                <span className="material-symbols-outlined text-[15px]">chevron_right</span>
              </button>
            </div>

            {/* Jump to Today Button */}
            <button
              type="button"
              onClick={goToToday}
              className="min-h-0 h-[32px] sm:h-[34px] max-h-[32px] sm:max-h-[34px] box-border inline-flex items-center justify-center px-2.5 sm:px-3 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] text-[11.5px] sm:text-[12px] font-bold leading-none transition-colors cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
            >
              Today
            </button>

            {/* Status Filter Select (Compact, strictly 1 line, single custom arrow) */}
            <div className="relative shrink-0 flex items-center h-[32px] sm:h-[34px] min-h-0 max-h-[32px] sm:max-h-[34px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ backgroundImage: 'none' }}
                className="admin-no-arrow min-h-0 h-[32px] sm:h-[34px] max-h-[32px] sm:max-h-[34px] box-border pl-2 pr-6 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-text-primary)] text-[11.5px] sm:text-[12px] font-bold outline-none cursor-pointer shadow-2xs !appearance-none !bg-none whitespace-nowrap leading-none"
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="inquiry">Inquiries</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5 text-[var(--admin-text-tertiary)]">
                <span className="material-symbols-outlined text-[15px]">expand_more</span>
              </div>
            </div>
          </div>

          {/* Right: Quick Month Volume on desktop */}
          {totalMonthValue > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 shrink-0 text-[12px]">
              <span className="text-[var(--admin-text-tertiary)]">Volume:</span>
              <span className="font-mono font-bold text-[var(--admin-accent)]">
                {formatCurrency(totalMonthValue)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Calendar Table (Unified Grid Architecture) */}
      <div className="hidden md:block bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] shadow-xs overflow-hidden w-full min-w-0">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)] text-center text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] w-full">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="py-2.5 border-r last:border-r-0 border-[var(--admin-border-subtle)] min-w-0 truncate"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Month Day Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[var(--admin-border-subtle)] w-full">
          {calendarDays.map((cell, idx) => {
            const isToday = cell.dateStr === localISOTime;
            const isSelected = cell.dateStr === selectedDateStr;

            const dayBookings = cell.dateStr
              ? filteredMonthBookings.filter(
                  (b) => b.date && b.date.substring(0, 10) === cell.dateStr,
                )
              : [];

            return (
              <div
                key={idx}
                onClick={() => {
                  if (cell.dateStr) setSelectedDateStr(cell.dateStr);
                }}
                className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors cursor-pointer group relative min-w-0 overflow-hidden ${
                  !cell.isCurrentMonth
                    ? 'bg-[var(--admin-bg-subtle)]/40 opacity-40'
                    : isSelected
                      ? 'bg-[var(--admin-accent)]/5 ring-1 ring-inset ring-[var(--admin-accent)]'
                      : 'bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)]/50'
                }`}
              >
                {/* Cell Header: Day Number + Event Count */}
                <div className="flex items-center justify-between">
                  {cell.day ? (
                    <span
                      className={`text-[12px] font-bold ${
                        isToday
                          ? 'w-6 h-6 rounded-full bg-[var(--admin-accent)] text-white flex items-center justify-center shadow-xs'
                          : cell.isCurrentMonth
                            ? 'text-[var(--admin-text-primary)]'
                            : 'text-[var(--admin-text-tertiary)]'
                      }`}
                    >
                      {cell.day}
                    </span>
                  ) : (
                    <span />
                  )}

                  {dayBookings.length > 0 && (
                    <span className="text-[10px] font-bold font-mono text-[var(--admin-accent)] bg-[var(--admin-accent)]/10 px-1.5 py-0.2 rounded-[3px]">
                      {dayBookings.length} {dayBookings.length === 1 ? 'event' : 'events'}
                    </span>
                  )}
                </div>

                {/* Event Mini Cards inside Cell */}
                <div className="space-y-1.5 mt-2 flex-1">
                  {dayBookings.slice(0, 3).map((b) => {
                    const bId = b._id || b.id;
                    const img = getBookingThumbnail(b);
                    const statusLower = (b.status || '').toLowerCase();

                    const isConfirmed = statusLower === 'confirmed' || statusLower === 'booked';
                    const isPending = statusLower.includes('pending');

                    return (
                      <div
                        key={bId}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/events/${bId}`);
                        }}
                        className="p-1.5 rounded-[4px] border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] hover:border-[var(--admin-accent)] hover:shadow-xs transition-all flex items-center gap-1.5 group/card min-w-0"
                        title={`${b.title || 'Event'} - ${formatCurrency(b.pricing?.totalPrice || 0)}`}
                      >
                        {/* Status color indicator stripe */}
                        <div
                          className={`w-1 h-6 rounded-full shrink-0 ${
                            isConfirmed
                              ? 'bg-emerald-500'
                              : isPending
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                          }`}
                        />

                        {/* Thumbnail */}
                        {img && (
                          <div className="w-6 h-6 rounded-[2px] overflow-hidden bg-[var(--admin-surface-muted)] shrink-0 border border-[var(--admin-border-subtle)]">
                            <img
                              src={img}
                              alt=""
                              onError={handleImageError}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Title & Price */}
                        <div className="min-w-0 flex-1">
                          <p className="text-[10.5px] font-bold text-[var(--admin-text-primary)] truncate group-hover/card:text-[var(--admin-accent)] transition-colors leading-tight">
                            {b.title || 'Event Booking'}
                          </p>
                          <p className="text-[9.5px] font-mono font-semibold text-[var(--admin-text-secondary)]">
                            {formatCurrency(b.pricing?.totalPrice || 0)}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {dayBookings.length > 3 && (
                    <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] text-center pt-0.5">
                      +{dayBookings.length - 3} more
                    </p>
                  )}

                  {/* Empty state for Present Date (Today) */}
                  {isToday && dayBookings.length === 0 && (
                    <div className="h-full min-h-[58px] flex flex-col justify-center items-center text-center p-1.5 rounded-[4px] bg-[var(--admin-surface-muted)]/80 border border-dashed border-[var(--admin-border)] my-auto">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-[var(--admin-text-tertiary)] leading-tight">
                        <span className="material-symbols-outlined text-[13px] text-[var(--admin-text-tertiary)]">
                          event_busy
                        </span>
                        <span>No events today</span>
                      </div>

                      {nextUpcomingBooking && nextEventDateFormatted ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetDate = nextUpcomingBooking.date.substring(0, 10);
                            setSelectedDateStr(targetDate);
                            const [y, m] = targetDate.substring(0, 7).split('-').map(Number);
                            setCurrentDate(new Date(y, m - 1, 1));
                          }}
                          className="mt-1.5 px-2 py-0.5 rounded-[3px] bg-[var(--admin-accent)]/10 hover:bg-[var(--admin-accent)]/20 text-[var(--admin-accent)] text-[9.5px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title={`Next event on ${nextEventDateFormatted}`}
                        >
                          <span className="material-symbols-outlined text-[11px]">
                            arrow_forward
                          </span>
                          <span>Next: {nextEventDateFormatted}</span>
                        </button>
                      ) : (
                        <span className="text-[9px] text-[var(--admin-text-tertiary)] mt-1">
                          No upcoming events
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Calendar Grid & Selected Date Section */}
      <div className="md:hidden space-y-4">
        {/* Compact Mobile Month Calendar */}
        <div className="bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] shadow-xs p-3">
          <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] mb-2 pb-2 border-b border-[var(--admin-border-subtle)]">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((cell, idx) => {
              const isToday = cell.dateStr === localISOTime;
              const isSelected = cell.dateStr === selectedDateStr;

              const dayBookings = cell.dateStr
                ? bookings.filter((b) => b.date && b.date.substring(0, 10) === cell.dateStr)
                : [];

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (cell.dateStr) setSelectedDateStr(cell.dateStr);
                  }}
                  className={`aspect-square rounded-[4px] flex flex-col items-center justify-center p-1 transition-all cursor-pointer relative ${
                    !cell.isCurrentMonth
                      ? 'opacity-30 text-[var(--admin-text-tertiary)]'
                      : isSelected
                        ? 'bg-[var(--admin-accent)] text-white font-bold shadow-xs'
                        : isToday
                          ? 'border border-[var(--admin-accent)] text-[var(--admin-accent)] font-bold'
                          : 'hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)]'
                  }`}
                >
                  <span className="text-[12px] leading-none">{cell.day}</span>
                  {dayBookings.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {dayBookings.slice(0, 3).map((_, i) => (
                        <span
                          key={i}
                          className={`w-1 h-1 rounded-full ${
                            isSelected ? 'bg-white' : 'bg-[var(--admin-accent)]'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Bookings List */}
        <div className="bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                {selectedDateFormatted}
              </h3>
              <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
                {selectedDateBookings.length}{' '}
                {selectedDateBookings.length === 1 ? 'Booking Scheduled' : 'Bookings Scheduled'}
              </p>
            </div>
            <span className="text-[10px] font-bold font-mono text-[var(--admin-accent)] bg-[var(--admin-accent)]/10 px-2 py-0.5 rounded-[4px]">
              {selectedDateBookings.length} Setups
            </span>
          </div>

          <div className="p-3 space-y-2.5">
            {selectedDateBookings.length === 0 ? (
              <div className="py-7 px-4 text-center bg-[var(--admin-surface-muted)] rounded-[4px] border border-dashed border-[var(--admin-border)] flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-[24px] text-[var(--admin-text-tertiary)] mb-1">
                  event_busy
                </span>
                <p className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                  {selectedDateStr === localISOTime
                    ? 'No events for today'
                    : 'No events scheduled for this date.'}
                </p>
                {selectedDateStr === localISOTime &&
                  nextUpcomingBooking &&
                  nextEventDateFormatted && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetDate = nextUpcomingBooking.date.substring(0, 10);
                        setSelectedDateStr(targetDate);
                        const [y, m] = targetDate.substring(0, 7).split('-').map(Number);
                        setCurrentDate(new Date(y, m - 1, 1));
                      }}
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[var(--admin-accent)] text-white text-[12px] font-bold shadow-xs hover:opacity-95 transition-all cursor-pointer"
                    >
                      <span>
                        Next Event: {nextEventDateFormatted}{' '}
                        {nextEventDaysDiff ? `(${nextEventDaysDiff})` : ''}
                      </span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  )}
              </div>
            ) : (
              selectedDateBookings.map((b) => {
                const bId = b._id || b.id;
                const img = getBookingThumbnail(b);
                const shortId = b.bookingId || (bId ? `#${bId.slice(-6).toUpperCase()}` : '');

                return (
                  <div
                    key={bId}
                    onClick={() => navigate(`/admin/events/${bId}`)}
                    className="p-3 rounded-[4px] border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] hover:border-[var(--admin-border)] transition-all flex items-center gap-3 cursor-pointer shadow-2xs"
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-[4px] overflow-hidden bg-[var(--admin-surface-muted)] shrink-0 border border-[var(--admin-border)] flex items-center justify-center">
                      {img ? (
                        <img
                          src={img}
                          alt={b.title || 'Event'}
                          onError={handleImageError}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-[20px] text-[var(--admin-text-tertiary)]">
                          celebration
                        </span>
                      )}
                    </div>

                    {/* Middle Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {b.eventType && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--admin-accent)] bg-[var(--admin-accent)]/10 px-1.5 py-0.2 rounded-[3px] truncate max-w-[120px]">
                            {b.eventType.replace(/[-_]+/g, ' ')}
                          </span>
                        )}
                        {shortId && (
                          <span className="text-[10px] font-mono font-bold text-[var(--admin-text-tertiary)]">
                            {shortId}
                          </span>
                        )}
                      </div>

                      <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)] truncate mt-0.5">
                        {b.title || 'Event Booking'}
                      </h4>

                      <p className="text-[11px] text-[var(--admin-text-tertiary)] truncate">
                        {b.user?.name || 'Customer'} • {b.venue?.city || 'Venue'}
                      </p>
                    </div>

                    {/* Right Price & Status */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-1 pl-2">
                      <span className="text-[13px] font-extrabold text-[var(--admin-text-primary)] font-mono">
                        {formatCurrency(b.pricing?.totalPrice || 0)}
                      </span>
                      <StatusBadge status={(b.status || 'pending').replace('_', '')} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default CalendarTab;
