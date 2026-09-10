import { m as motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { StatusBadge, formatCurrency, fadeUp } from '../../../components/AdminUIKit';
import { handleImageError } from '../../../../utils/media/imageUtils';
import AdminServiceability from '../../AdminServiceability';

export function DashboardTab({
  bookings = [],
  showcases = [],
  events = [],
  setActiveTab,
  totalContractVal,
  outstandingBal,
  activeBookingsCount,
  upcomingSetupsCount,
}) {
  const navigate = useNavigate();

  const getBookingImage = (b) => {
    // 1. Direct package or inspiration image
    if (b.eventPackage?.image) return b.eventPackage.image;
    if (b.eventPackage?.imageSrc) return b.eventPackage.imageSrc;
    if (b.inspirationImages && b.inspirationImages.length > 0 && b.inspirationImages[0]) {
      return b.inspirationImages[0];
    }
    if (b.showcase?.image) return b.showcase.image;

    const allPool = [
      ...(Array.isArray(showcases) ? showcases : []),
      ...(Array.isArray(events) ? events : []),
    ];

    if (allPool.length > 0) {
      // 2. Lookup by ID
      const pkgId =
        b.eventPackage?._id ||
        (typeof b.eventPackage === 'string' ? b.eventPackage : null) ||
        b.showcaseId ||
        b.packageId;
      if (pkgId) {
        const byId = allPool.find((item) => (item._id || item.id) === pkgId);
        if (byId?.image || byId?.imageSrc) return byId.image || byId.imageSrc;
      }

      // 3. Title exact or substring match
      const bTitle = (b.title || '')
        .toLowerCase()
        .replace(/booking|setup|rent/g, '')
        .trim();
      if (bTitle) {
        const exact = allPool.find((s) => {
          const sTitle = (s.title || '').toLowerCase().trim();
          return (
            sTitle && (sTitle === bTitle || bTitle.includes(sTitle) || sTitle.includes(bTitle))
          );
        });
        if (exact?.image || exact?.imageSrc) return exact.image || exact.imageSrc;

        // 4. Token / keyword overlap match (in case title got renamed/edited)
        const bWords = bTitle
          .split(/\s+/)
          .filter((w) => w.length > 2 && !['for', 'the', 'and', 'with'].includes(w));
        let bestMatch = null;
        let highestScore = 0;
        for (const item of allPool) {
          const itemTitle = (item.title || '').toLowerCase();
          const itemImg = item.image || item.imageSrc;
          if (!itemImg) continue;
          let score = 0;
          for (const w of bWords) {
            if (itemTitle.includes(w)) score++;
          }
          if (score > highestScore) {
            highestScore = score;
            bestMatch = itemImg;
          }
        }
        if (bestMatch && highestScore > 0) return bestMatch;
      }

      // 5. Category / Event Type match
      const bType = (b.eventType || '').toLowerCase().replace(/[-_]+/g, ' ').trim();
      if (bType) {
        const byCat = allPool.find((item) => {
          const cat = (item.category || '').toLowerCase().replace(/[-_]+/g, ' ').trim();
          return (
            cat &&
            (cat === bType || bType.includes(cat) || cat.includes(bType)) &&
            (item.image || item.imageSrc)
          );
        });
        if (byCat?.image || byCat?.imageSrc) return byCat.image || byCat.imageSrc;
      }

      // 6. Stable fallback from available showcases/events so image is NEVER missing
      const bKey = b._id || b.id || b.title || '';
      const fallbackIdx =
        Math.abs(bKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % allPool.length;
      const fallback = allPool[fallbackIdx];
      if (fallback?.image || fallback?.imageSrc) return fallback.image || fallback.imageSrc;
    }

    return null;
  };

  return (
    <motion.div
      key="dashboard"
      initial="hidden"
      animate="show"
      variants={fadeUp}
      className="space-y-6"
    >
      {/* Real-time Event Bookings & Payment Reconciliation Ledger (Matches Orders Page) */}
      <motion.div
        variants={fadeUp}
        className="admin-card overflow-hidden text-left relative p-0 mb-6"
      >
        <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />
        <div className="grid grid-cols-2 md:grid-cols-4 bg-[var(--admin-surface)]">
          <div className="p-5 space-y-1 border-r border-b md:border-b-0 border-[var(--admin-border-subtle)]">
            <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
              Total Bookings Value
            </span>
            <p className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] font-mono">
              {formatCurrency(totalContractVal)}
            </p>
            <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
              Active bookings & volume
            </span>
          </div>
          <div className="p-5 space-y-1 border-b md:border-b-0 md:border-r border-[var(--admin-border-subtle)]">
            <span className="text-[10px] text-[var(--admin-warning)] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--admin-warning)] animate-pulse" />
              Pending Payments
            </span>
            <p className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] font-mono">
              {formatCurrency(outstandingBal)}
            </p>
            <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
              To collect from clients
            </span>
          </div>
          <div className="p-5 space-y-1 border-r border-[var(--admin-border-subtle)]">
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Setups Today
            </span>
            <p className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] font-mono">
              {activeBookingsCount}
            </p>
            <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
              Live on-site events
            </span>
          </div>
          <div className="p-5 space-y-1 bg-[var(--admin-success-light)] border-l-0">
            <span className="text-[10px] text-[var(--admin-success)] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--admin-success)]" />
              Upcoming Setups
            </span>
            <p className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-success)] font-mono">
              {upcomingSetupsCount}
            </p>
            <span className="text-[10px] text-[var(--admin-success)] opacity-80 mt-1 block">
              Confirmed & scheduled
            </span>
          </div>
        </div>
      </motion.div>

      {/* Side-by-Side: New Event Inquiries & Serviceability Configurations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Card: New Event Inquiries */}
        <div className="bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] shadow-xs overflow-hidden flex flex-col h-full">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[var(--admin-border-subtle)] flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] sm:text-[16px] font-bold text-[var(--admin-text-primary)] tracking-tight">
                New Event Inquiries
              </h3>
              <p className="text-[12px] text-[var(--admin-text-tertiary)] mt-0.5">
                {bookings.length} Total Bookings Recorded
              </p>
            </div>
            <span className="text-[11px] font-bold text-[var(--admin-accent)] bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/20 px-2.5 py-1 rounded-[4px] shrink-0">
              {bookings.slice(0, 6).length} Latest
            </span>
          </div>

          {/* Inquiries List */}
          <div className="p-3 sm:p-4 space-y-2.5 flex-1 max-h-[440px] overflow-y-auto">
            {bookings.length === 0 ? (
              <div className="text-center py-10 text-[13px] text-[var(--admin-text-tertiary)]">
                No event inquiries recorded yet.
              </div>
            ) : (
              bookings.slice(0, 6).map((b) => {
                const bId = b._id || b.id;
                const img = getBookingImage(b);
                const eventDateStr = b.date
                  ? new Date(b.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : null;
                const formattedType = (b.eventType || 'Event').replace(/[-_]+/g, ' ').trim();

                return (
                  <div
                    key={bId}
                    onClick={() => navigate(`/admin/events/${bId}`)}
                    className="p-3 bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)]/50 border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border)] rounded-[4px] flex items-center gap-3 transition-all cursor-pointer group shadow-2xs"
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[4px] overflow-hidden bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] shrink-0 flex items-center justify-center relative">
                      {img ? (
                        <img
                          src={img}
                          alt={b.title || 'Event'}
                          onError={handleImageError}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-[22px] text-[var(--admin-text-tertiary)]">
                          celebration
                        </span>
                      )}
                    </div>

                    {/* Middle Info */}
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-[var(--admin-accent)] bg-[var(--admin-accent)]/10 px-1.5 py-0.2 rounded-[3px] truncate max-w-[130px]">
                          {formattedType}
                        </span>
                        {b.bookingId && (
                          <span className="text-[10px] font-mono font-bold text-[var(--admin-text-tertiary)]">
                            #{b.bookingId.slice(-6).toUpperCase()}
                          </span>
                        )}
                        {eventDateStr && (
                          <span className="text-[10px] font-medium text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] px-1.5 py-0.2 rounded border border-[var(--admin-border-subtle)] hidden sm:inline-block">
                            {eventDateStr}
                          </span>
                        )}
                      </div>

                      <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)] group-hover:text-[var(--admin-accent)] transition-colors truncate">
                        {b.title || 'Event Booking'}
                      </h4>

                      <div className="flex items-center gap-2 text-[11px] text-[var(--admin-text-tertiary)] truncate">
                        {b.user?.name && (
                          <span className="flex items-center gap-1 font-medium text-[var(--admin-text-secondary)] truncate">
                            <span className="material-symbols-outlined text-[13px]">person</span>
                            {b.user.name}
                          </span>
                        )}
                        {b.venue?.city && (
                          <span className="flex items-center gap-1 truncate">
                            <span className="material-symbols-outlined text-[13px]">
                              location_on
                            </span>
                            {b.venue.city}
                          </span>
                        )}
                      </div>
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

          {/* Footer View All */}
          <div className="p-3 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)]">
            <button
              onClick={() => setActiveTab('bookings')}
              className="w-full py-2 text-[12px] font-bold text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>View All Bookings ({bookings.length})</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Right Card: Serviceability Configurations */}
        <AdminServiceability isEmbedded={true} />
      </div>
    </motion.div>
  );
}
