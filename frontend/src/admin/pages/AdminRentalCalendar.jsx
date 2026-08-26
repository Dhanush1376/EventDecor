import { m as motion } from 'framer-motion';
import { useCallback } from 'react';
import { PageHeader, fadeUp, stagger } from '../components/AdminUIKit';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import rentalService from '../../services/api/rentalService';

export function AdminRentalCalendar({ hideHeader = false }) {
  const [calendarData, setCalendarData] = useState([]);
  const [_dataLoading, setDataLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [productId, _setProductId] = useState(''); // Optionally filter by product

  const fetchCalendar = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await rentalService.adminGetCalendar(productId, currentMonth, currentYear);
      if (res.success) {
        // Backend returns { success: true, data: { bookings: [...] } }
        const bookings = res.data?.bookings || (res.data?.data && res.data.data.bookings) || [];
        setCalendarData(Array.isArray(bookings) ? bookings : []);
      }
    } catch (_err) {
      toast.error('Failed to load rental calendar');
    } finally {
      setDataLoading(false);
    }
  }, [productId, currentMonth, currentYear]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...days];

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      {!hideHeader && (
        <PageHeader
          title="Rental Calendar"
          subtitle="Track product availability and upcoming returns"
          icon="calendar_month"
          iconColor="info"
        />
      )}

      <motion.div variants={fadeUp} className="admin-card p-6 flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-6">
          <button onClick={handlePrevMonth} className="admin-btn-icon">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <h2 className="text-[16px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider">
            {new Date(currentYear, currentMonth - 1).toLocaleString('default', {
              month: 'long',
              year: 'numeric',
            })}
          </h2>
          <button onClick={handleNextMonth} className="admin-btn-icon">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        <div className="w-full">
          <div className="w-full grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div
                key={d}
                className="text-[9px] sm:text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider py-1 sm:py-2"
              >
                {d.substring(0, 3)}
              </div>
            ))}
          </div>

          <div className="w-full grid grid-cols-7 gap-1 sm:gap-2">
            {calendarCells.map((day, idx) => {
              if (!day)
                return (
                  <div
                    key={idx}
                    className="bg-[var(--admin-bg-subtle)] rounded opacity-50 min-h-[50px] sm:min-h-[80px]"
                  />
                );

              const currentDate = new Date(currentYear, currentMonth - 1, day);
              currentDate.setHours(0, 0, 0, 0);

              const safeCalendarData = Array.isArray(calendarData) ? calendarData : [];
              const dayEvents = safeCalendarData.filter((b) => {
                if (!b.startDate || !b.endDate) return false;
                const start = new Date(b.startDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(b.endDate);
                end.setHours(0, 0, 0, 0);
                return currentDate >= start && currentDate <= end;
              });

              return (
                <div
                  key={idx}
                  className="border border-[var(--admin-border-subtle)] rounded p-1 sm:p-2 text-center sm:text-left bg-[var(--admin-surface)] min-h-[50px] sm:min-h-[80px] flex flex-col transition-colors hover:border-[var(--admin-border-strong)] overflow-hidden"
                >
                  <span className="text-[10px] sm:text-[11px] font-bold text-[var(--admin-text-tertiary)]">
                    {day}
                  </span>
                  <div className="mt-0.5 sm:mt-1 flex-1 flex flex-col gap-0.5 sm:space-y-1">
                    {dayEvents.map((evt, eIdx) => (
                      <div
                        key={eIdx}
                        className="text-[8px] sm:text-[9px] bg-[var(--admin-info-light)] text-[var(--admin-info)] px-0.5 sm:px-1 rounded truncate leading-tight sm:leading-normal"
                        title={evt.rentalOrder?.productTitle || 'Booking'}
                      >
                        <span className="hidden sm:inline">
                          {evt.rentalOrder?.productTitle ||
                            `Booking #${evt.rentalOrder?.rentalOrderId || evt._id?.substring(0, 4)}`}
                        </span>
                        <span className="sm:hidden">
                          {evt.rentalOrder?.productTitle?.substring(0, 4) || 'Bkg'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
