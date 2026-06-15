import { useDashboard } from '../../context/DashboardContext';

export function DashboardHeader() {
  const {
    mobileShowContent,
    setMobileShowContent,
    selectedOrderId,
    setSelectedOrderId,
    activeTab,
    whatsappUrl,
  } = useDashboard();

  return (
    <div className="mb-6 border-b border-outline-variant/20 pb-3 flex justify-between items-center gap-4">
      {/* Mobile Back Button Navigation */}
      <div className="md:hidden flex-1 min-w-0">
        {mobileShowContent ? (
          selectedOrderId ? (
            <button
              onClick={() => setSelectedOrderId(null)}
              className="text-[11px] text-secondary hover:text-primary transition-colors cursor-pointer uppercase font-bold flex items-center gap-1 bg-transparent border-0 p-0"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              <span>My Order History</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedOrderId(null);
                setMobileShowContent(false);
              }}
              className="text-[11px] text-secondary hover:text-primary transition-colors cursor-pointer uppercase font-bold flex items-center gap-1 bg-transparent border-0 p-0"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              <span>My Account</span>
            </button>
          )
        ) : (
          <Link
            to="/"
            className="text-[11px] text-secondary hover:text-primary transition-colors cursor-pointer uppercase font-bold flex items-center gap-1 bg-transparent border-0 p-0"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            <span>Home</span>
          </Link>
        )}
      </div>

      {/* Desktop Breadcrumbs Navigation */}
      <nav className="hidden md:flex text-[11px] text-secondary flex-wrap items-center gap-2 tracking-wider uppercase font-bold flex-1 min-w-0">
        <Link to="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span className="text-outline-variant/50">/</span>
        <button
          onClick={() => {
            setSelectedOrderId(null);
            setMobileShowContent(false);
          }}
          className={`hover:text-primary transition-colors cursor-pointer uppercase bg-transparent border-0 p-0 font-bold ${!mobileShowContent ? 'text-on-surface' : 'text-secondary'}`}
        >
          My Account
        </button>
        {mobileShowContent && (
          <>
            <span className="text-outline-variant/50">/</span>
            {activeTab === 'profile' && <span className="text-on-surface">Profile Settings</span>}
            {activeTab === 'orders' &&
              (selectedOrderId ? (
                <>
                  <button
                    onClick={() => setSelectedOrderId(null)}
                    className="hover:text-primary transition-colors cursor-pointer uppercase text-secondary font-bold bg-transparent border-0 p-0"
                  >
                    My Order History
                  </button>
                  <span className="text-outline-variant/50">/</span>
                  <span className="text-on-surface">Order Details</span>
                </>
              ) : (
                <span className="text-on-surface">My Order History</span>
              ))}
            {activeTab === 'rentals' && <span className="text-on-surface">My Rentals</span>}
            {activeTab === 'bookings' && <span className="text-on-surface">My Event Bookings</span>}
            {activeTab === 'addresses' && <span className="text-on-surface">Delivery Sites</span>}
            {activeTab === 'preferences' && (
              <span className="text-on-surface">Platform Preferences</span>
            )}
            {activeTab === 'loyalty' && <span className="text-on-surface">Loyalty Club</span>}
            {activeTab === 'collections' && (
              <span className="text-on-surface">Curated Wishlist</span>
            )}
            {activeTab === 'shopping-bag' && (
              <span className="text-on-surface">My Shopping Bag</span>
            )}
          </>
        )}
      </nav>

      <div className="flex-shrink-0 pt-0.5 ml-auto">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1.5 cursor-pointer bg-transparent border-0 p-0"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.94 0c3.205.001 6.216 1.248 8.48 3.515 2.264 2.268 3.51 5.282 3.508 8.491-.004 6.618-5.33 11.942-11.943 11.942-1.999-.001-3.963-.5-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.298 1.448 5.28 1.449 5.4 0 9.794-4.397 9.797-9.798.001-2.615-1.015-5.074-2.862-6.924C16.96 1.983 14.502 1.002 11.94 1.002c-5.398 0-9.794 4.396-9.797 9.797-.001 2.083.548 4.12 1.588 5.922l-.993 3.623 3.71-.973zm11.233-5.267c-.287-.144-1.697-.838-1.958-.934-.26-.096-.45-.144-.64.144-.19.287-.736.934-.903 1.122-.167.188-.334.21-.62.067-.287-.144-1.21-.446-2.305-1.424-.853-.76-1.428-1.7-1.595-1.986-.167-.288-.018-.443.125-.585.13-.127.287-.335.43-.503.144-.167.19-.287.287-.479.096-.192.048-.36-.024-.503-.072-.144-.64-1.54-.877-2.115-.23-.553-.463-.478-.64-.488-.166-.008-.356-.01-.546-.01-.19 0-.501.071-.762.355-.26.287-1.002.979-1.002 2.39 0 1.411 1.026 2.776 1.17 2.968.143.192 2.019 3.083 4.89 4.323.683.296 1.217.473 1.633.606.688.218 1.314.187 1.81.113.553-.082 1.697-.694 1.937-1.365.24-.672.24-1.246.167-1.366-.073-.12-.26-.192-.547-.337z" />
          </svg>
          <span>Need Help?</span>
        </a>
      </div>
    </div>
  );
}
