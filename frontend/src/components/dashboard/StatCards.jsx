import { useDashboard } from '../../context/DashboardContext';

export function StatCards() {
  const { dashboardCounts } = useDashboard();

  return (
    <div className="bg-surface-bright border border-outline-variant/35 rounded-lg p-3.5 sm:p-4 mb-6 shadow-2xs">
      <div className="grid grid-cols-3 divide-x divide-outline-variant/30 text-center">
        {/* Card 1: Active Rentals */}
        <div className="flex items-center justify-center gap-3 px-2 sm:px-4 py-1">
          <div className="text-center sm:text-left min-w-0 flex-1">
            <span className="block text-[8px] sm:text-[10px] uppercase font-bold text-[#8c7335] tracking-wider sm:tracking-[0.15em] font-label truncate">
              Active Rentals
            </span>
            <strong className="text-base sm:text-2xl font-display text-[#5a481f] font-semibold mt-0.5 sm:mt-1 block leading-none">
              {dashboardCounts.activeRentals}
            </strong>
          </div>
          <div className="bg-[#8c7335]/10 p-2 rounded-lg border border-[#8c7335]/20 hidden sm:flex shrink-0">
            <svg
              className="w-5 h-5 text-[#8c7335]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Upcoming Returns */}
        <div className="flex items-center justify-center gap-3 px-2 sm:px-4 py-1">
          <div className="text-center sm:text-left min-w-0 flex-1">
            <span className="block text-[8px] sm:text-[10px] uppercase font-bold text-amber-700 tracking-wider sm:tracking-[0.15em] font-label truncate">
              Upcoming Returns
            </span>
            <strong className="text-base sm:text-2xl font-display text-amber-900 font-semibold mt-0.5 sm:mt-1 block leading-none">
              {dashboardCounts.upcomingReturns}
            </strong>
          </div>
          <div className="bg-amber-50 p-2 rounded-lg border border-amber-200/50 hidden sm:flex shrink-0">
            <svg
              className="w-5 h-5 text-amber-700"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Purchase Orders */}
        <div className="flex items-center justify-center gap-3 px-2 sm:px-4 py-1">
          <div className="text-center sm:text-left min-w-0 flex-1">
            <span className="block text-[8px] sm:text-[10px] uppercase font-bold text-secondary tracking-wider sm:tracking-[0.15em] font-label truncate">
              Purchase Orders
            </span>
            <strong className="text-base sm:text-2xl font-display text-on-surface font-semibold mt-0.5 sm:mt-1 block leading-none">
              {dashboardCounts.purchaseOrders}
            </strong>
          </div>
          <div className="bg-surface-container p-2 rounded-lg border border-outline-variant/20 hidden sm:flex shrink-0">
            <svg
              className="w-5 h-5 text-secondary"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
