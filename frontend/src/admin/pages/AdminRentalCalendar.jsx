import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import rentalService from '../../services/rentalService';
import { PageHeader, fadeUp, stagger } from '../components/AdminUIKit';

export function AdminRentalCalendar() {
  const [calendarData, setCalendarData] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [productId, setProductId] = useState(''); // Optionally filter by product

  useEffect(() => {
    fetchCalendar();
  }, [currentMonth, currentYear, productId]);

  const fetchCalendar = async () => {
    setDataLoading(true);
    try {
      const res = await rentalService.adminGetCalendar(productId, currentMonth, currentYear);
      if (res.success) {
        setCalendarData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load rental calendar');
    } finally {
      setDataLoading(false);
    }
  };

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

            // Check if this day has any bookings in calendarData
            // Note: calendarData structure from API should be processed here, assuming it's an array of dates or events.
            // For now, we'll just render the day cell.
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = calendarData.filter((d) => d.date === dateStr);

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
                      className="text-[9px] bg-[var(--admin-info-light)] text-[var(--admin-info)] px-1 rounded truncate"
                      title={evt.title}
                    >
                      {evt.title || `Booking #${evt.rentalId?.substring(evt.rentalId.length - 4)}`}
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
