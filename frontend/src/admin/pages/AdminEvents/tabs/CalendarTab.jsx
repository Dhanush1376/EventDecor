import { m as motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fadeUp } from '../../../components/AdminUIKit';

export function CalendarTab({ bookings }) {
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());

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
    for (let i = 0; i < firstDayIndex; i++) days.push({ day: null, dateStr: null });
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i, 12); // Use noon to avoid timezone issues with ISO string
      const dateStr = d.toISOString().split('T')[0];
      days.push({ day: i, dateStr });
    }
    return days;
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const calendarDays = getCalendarDays();
  const currentMonthName = currentDate.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const currentMonthBookings = bookings
    .filter((b) => {
      if (!b.date) return false;
      const d = new Date(b.date);
      return (
        d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth()
      );
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <motion.div
      key="calendar"
      initial="hidden"
      animate="show"
      variants={fadeUp}
      className="admin-card p-6 space-y-6"
    >
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center border-b border-[var(--admin-border-subtle)] pb-4">
        <div className="w-full md:w-auto">
          <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
            Monthly Event Schedule
          </span>
          <div className="flex items-center justify-between md:justify-start gap-3 w-full">
            <h3 className="text-[16px] font-bold text-[var(--admin-text-primary)] md:min-w-[120px]">
              {currentMonthName}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1 rounded hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button
                onClick={nextMonth}
                className="p-1 rounded hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 md:gap-4 text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shadow-sm bg-[#00E676]" /> Confirmed/Booked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shadow-sm bg-[#00E5FF]" /> Reserved
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shadow-sm bg-[#FFD600]" /> Draft
          </span>
        </div>
      </div>

      {/* Desktop Calendar Grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-2 text-center text-[11px] mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="py-2 font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-md)]"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-[11px]">
          {calendarDays.map((cell, idx) => {
            const dayBookings = cell.dateStr
              ? bookings.filter((b) => b.date.substring(0, 10) === cell.dateStr)
              : [];
            return (
              <div
                key={idx}
                className={`min-h-[100px] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] p-2 flex flex-col justify-between text-left transition-colors ${
                  cell.day
                    ? 'bg-[var(--admin-surface)] hover:border-[var(--admin-border-strong)]'
                    : 'bg-[var(--admin-bg-subtle)]'
                }`}
              >
                {cell.day && (
                  <span className="font-bold text-[var(--admin-text-tertiary)]">{cell.day}</span>
                )}
                {dayBookings.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {dayBookings.map((b) => {
                      const img = b.eventPackage?.image || b.inspirationImages?.[0];

                      let bgClass = 'bg-[var(--admin-surface-muted)] border-[var(--admin-border)]';
                      let textClass = 'text-[var(--admin-text-primary)]';
                      const statusLower = (b.status || '').toLowerCase();

                      if (statusLower === 'draft') {
                        bgClass = 'bg-[#FFD600]/10 border-[#FFD600]/20';
                        textClass = 'text-[#cfa000]'; // slightly darker for readability on white
                      } else if (statusLower === 'reserved') {
                        bgClass = 'bg-[#00E5FF]/10 border-[#00E5FF]/20';
                        textClass = 'text-[#00a8cc]';
                      } else if (
                        statusLower === 'confirmed' ||
                        statusLower === 'booked' ||
                        statusLower.includes('paid')
                      ) {
                        bgClass = 'bg-[#00E676]/10 border-[#00E676]/20';
                        textClass = 'text-[#00ab55]';
                      }

                      return (
                        <div
                          key={b._id || b.id}
                          onClick={() => navigate(`/admin/events/${b._id || b.id}`)}
                          className={`p-1.5 rounded-[var(--admin-radius-sm)] cursor-pointer shadow-sm border hover:border-[var(--admin-border-strong)] transition-all ${bgClass}`}
                          title={b.title}
                        >
                          {img && (
                            <div className="w-full h-12 mb-1.5 rounded bg-[var(--admin-surface)] overflow-hidden shrink-0 border border-[var(--admin-border-subtle)]">
                              <img src={img} alt={b.title} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="text-[10px] font-bold text-[var(--admin-text-primary)] truncate leading-tight mb-1">
                            {b.title}
                          </div>
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[8.5px] font-bold uppercase tracking-wider ${textClass}`}
                            >
                              {b.status?.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Calendar & Selected Date List */}
      <div className="md:hidden flex flex-col gap-6">
        {/* Compact Mobile Grid */}
        <div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="py-1 font-bold text-[var(--admin-text-secondary)]">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[13px]">
            {calendarDays.map((cell, idx) => {
              const dayBookings = cell.dateStr
                ? bookings.filter((b) => b.date.substring(0, 10) === cell.dateStr)
                : [];

              const isSelected = cell.dateStr === selectedDateStr;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (cell.dateStr) setSelectedDateStr(cell.dateStr);
                  }}
                  className={`aspect-square rounded-full flex flex-col items-center justify-center cursor-pointer transition-all ${
                    !cell.day
                      ? ''
                      : isSelected
                        ? 'bg-gray-900 text-white shadow-md scale-110'
                        : 'hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)]'
                  }`}
                >
                  {cell.day && <span className="font-bold mb-0.5">{cell.day}</span>}
                  {cell.day && dayBookings.length > 0 && (
                    <div className="flex gap-1 mt-0.5">
                      {dayBookings.slice(0, 3).map((b, i) => {
                        let dotColor = 'bg-[var(--admin-text-primary)]';
                        const statusLower = (b.status || '').toLowerCase();
                        if (statusLower === 'draft') dotColor = 'bg-[#FFD600]';
                        else if (statusLower === 'reserved') dotColor = 'bg-[#00E5FF]';
                        else if (
                          statusLower === 'confirmed' ||
                          statusLower === 'booked' ||
                          statusLower.includes('paid')
                        )
                          dotColor = 'bg-[#00E676]';

                        return (
                          <span key={i} className={`w-2 h-2 rounded-full shadow-sm ${dotColor}`} />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date List */}
        <div className="flex flex-col gap-3">
          <div className="text-[12px] font-bold text-[var(--admin-text-primary)] border-b border-[var(--admin-border-subtle)] pb-2 mb-2">
            {new Date(selectedDateStr).toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            })}
          </div>
          {(() => {
            const selectedBookings = bookings.filter(
              (b) => b.date && b.date.substring(0, 10) === selectedDateStr,
            );

            if (selectedBookings.length === 0) {
              return (
                <div className="py-6 text-center text-[12px] font-medium text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border-subtle)]">
                  No events for this date
                </div>
              );
            }

            return selectedBookings.map((b) => {
              const img = b.eventPackage?.image || b.inspirationImages?.[0];
              let bgClass = 'bg-[var(--admin-surface-muted)] border-[var(--admin-border)]';
              let textClass = 'text-[var(--admin-text-primary)]';
              const statusLower = (b.status || '').toLowerCase();

              if (statusLower === 'draft') {
                bgClass = 'bg-[#FFD600]/10 border-[#FFD600]/20';
                textClass = 'text-[#cfa000]';
              } else if (statusLower === 'reserved') {
                bgClass = 'bg-[#00E5FF]/10 border-[#00E5FF]/20';
                textClass = 'text-[#00a8cc]';
              } else if (
                statusLower === 'confirmed' ||
                statusLower === 'booked' ||
                statusLower.includes('paid')
              ) {
                bgClass = 'bg-[#00E676]/10 border-[#00E676]/20';
                textClass = 'text-[#00ab55]';
              }

              const eventDate = new Date(b.date);
              const dateFormatted = eventDate.toLocaleDateString('en-IN', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={b._id || b.id}
                  onClick={() => navigate(`/admin/events/${b._id || b.id}`)}
                  className={`p-3 rounded-xl cursor-pointer shadow-sm border hover:border-[var(--admin-border-strong)] transition-all flex gap-3 ${bgClass}`}
                >
                  {img ? (
                    <div className="w-16 h-16 rounded-lg bg-[var(--admin-surface)] overflow-hidden shrink-0 border border-[var(--admin-border-subtle)]">
                      <img src={img} alt={b.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-[var(--admin-surface)] flex items-center justify-center shrink-0 border border-[var(--admin-border-subtle)]">
                      <span className="material-symbols-outlined text-gray-400">event</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-0.5">
                      {dateFormatted}
                    </div>
                    <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)] truncate mb-1">
                      {b.title}
                    </h4>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${textClass}`}>
                      {b.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </motion.div>
  );
}
