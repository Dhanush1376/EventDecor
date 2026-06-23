import { m as motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { fadeUp } from '../../../components/AdminUIKit';

export function CalendarTab({ bookings }) {
  const navigate = useNavigate();

  const getCalendarDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) days.push({ day: null, dateStr: null });
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ day: i, dateStr });
    }
    return days;
  };

  const calendarDays = getCalendarDays();
  const currentMonthName = new Date().toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <motion.div
      key="calendar"
      initial="hidden"
      animate="show"
      variants={fadeUp}
      className="admin-card p-6 space-y-6"
    >
      <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-4">
        <div>
          <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
            Monthly Event Schedule
          </span>
          <h3 className="text-[16px] font-bold text-[var(--admin-text-primary)]">
            {currentMonthName}
          </h3>
        </div>
        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--admin-accent)]" /> Wedding
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--admin-text-primary)]" /> Engagement
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--admin-warning)]" /> Haldi
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-[11px]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="py-2 font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-md)]"
          >
            {day}
          </div>
        ))}
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
                  {dayBookings.map((b) => (
                    <div
                      key={b._id}
                      onClick={() => navigate(`/admin/bookings/${b._id || b.id}`)}
                      className={`p-1.5 text-[10px] font-bold rounded-[var(--admin-radius-sm)] text-white truncate cursor-pointer shadow-sm ${
                        b.eventType === 'wedding'
                          ? 'bg-[var(--admin-accent)]'
                          : b.eventType === 'engagement'
                            ? 'bg-[var(--admin-text-primary)] text-white'
                            : 'bg-[var(--admin-warning)] text-white'
                      }`}
                      title={b.title}
                    >
                      {b.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
