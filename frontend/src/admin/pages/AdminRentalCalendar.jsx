import { m as motion } from 'framer-motion';
import { useCallback } from 'react';
import { PageHeader, fadeUp, stagger } from '../components/AdminUIKit';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import rentalService from '../../services/api/rentalService';

export function AdminRentalCalendar() {
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
      <PageHeader
        title="Rental Calendar"
        subtitle="Track product availability and upcoming returns"
        icon="calendar_month"
        iconColor="info"
      />

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

        <div className="w-full grid grid-cols-7 gap-2 text-center mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div
              key={d}
              className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider py-2"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="w-full grid grid-cols-7 gap-2 min-h-[400px]">
          {calendarCells.map((day, idx) => {
            if (!day)
              return <div key={idx} className="bg-[var(--admin-bg-subtle)] rounded opacity-50" />;

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
                className="border border-[var(--admin-border-subtle)] rounded p-2 text-left bg-[var(--admin-surface)] min-h-[80px] flex flex-col transition-colors hover:border-[var(--admin-border-strong)]"
              >
                <span className="text-[11px] font-bold text-[var(--admin-text-tertiary)]">
                  {day}
                </span>
                <div className="mt-1 flex-1 space-y-1">
                  {dayEvents.map((evt, eIdx) => (
                    <div
                      key={eIdx}
                      className="text-[9px] bg-[var(--admin-info-light)] text-[var(--admin-info)] px-1 rounded truncate mb-1"
                      title={evt.rentalOrder?.productTitle || 'Booking'}
                    >
                      {evt.rentalOrder?.productTitle ||
                        `Booking #${evt.rentalOrder?.rentalOrderId || evt._id?.substring(0, 4)}`}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
