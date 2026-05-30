import React, { useState, useMemo } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmin } from "../context/AdminContext";
import { SiriLogo } from "../../components/ui/SiriLogo";

const navSections = [
  {
    label: "Home",
    items: [{ label: "Dashboard", icon: "dashboard", path: "/admin", keywords: "stats, home, sales, overview" }],
  },
  {
    label: "Edit Website",
    items: [
      { label: "Dynamic Layouts", icon: "view_carousel", path: "/admin/layouts", keywords: "layouts, sections, homepage" },
      { label: "Edit Web Pages", icon: "edit_note", path: "/admin/content", keywords: "cms, homepage, hero, pages, policy" },
      { label: "Photo Gallery", icon: "photo_library", path: "/admin/gallery", keywords: "photos, heritage, images" },
      { label: "Policy Management", icon: "gavel", path: "/admin/policies", keywords: "policy, terms, legal, privacy" },
    ],
  },
  {
    label: "Products & Stock",
    items: [
      { label: "Categories", icon: "category", path: "/admin/categories", keywords: "taxonomy, tags, labels" },
      { label: "Product List", icon: "inventory_2", path: "/admin/products", keywords: "items, stock, catalog" },
      { label: "Stock Levels", icon: "warehouse", path: "/admin/inventory", keywords: "alerts, stock count, storage" },
    ],
  },
  {
    label: "Sales & Bookings",
    items: [
      { label: "Orders", icon: "shopping_bag", path: "/admin/orders", keywords: "sales, checkout, delivery" },
      { label: "Special Requests", icon: "architecture", path: "/admin/custom-orders", keywords: "customization, consultation, event decor" },
      { label: "Customers", icon: "group", path: "/admin/customers", keywords: "users, crm, segments, vip" },
      { label: "Discount Coupons", icon: "sell", path: "/admin/coupons", keywords: "discounts, vouchers" },
      { label: "Payments", icon: "payments", path: "/admin/payments", keywords: "razorpay, cod, invoice, cashflow" },
    ],
  },
  {
    label: "Bookings & Feedback",
    items: [
      { label: "Event Bookings", icon: "event", path: "/admin/events", keywords: "booking, setups, dates" },
    ],
  },
  {
    label: "Reports & Settings",
    items: [
      { label: "Sales Reports", icon: "analytics", path: "/admin/analytics", keywords: "trends, metrics, profits" },
      { label: "AI Engine Analytics", icon: "psychology", path: "/admin/recommendations", keywords: "recommendations, trending, metrics" },
      { label: "Marketing Emails", icon: "campaign", path: "/admin/campaigns", keywords: "marketing, email, newsletters" },
      { label: "Manage Staff", icon: "groups", path: "/admin/team", keywords: "staff, employees, access, permissions" },
      { label: "System Users", icon: "admin_panel_settings", path: "/admin/system-users", keywords: "admins, super, security, access" },
      { label: "Settings", icon: "settings", path: "/admin/settings", keywords: "profile, backups, config" },
      { label: "Global Config", icon: "settings_suggest", path: "/admin/config", keywords: "flags, variables, toggles" },
    ],
  },
];

export function AdminSidebar() {
  const { sidebarOpen, sidebarMobileOpen, setSidebarMobileOpen, products } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const mobileSidebarRef = React.useRef(null);
  const [sidebarSearch, setSidebarSearch] = useState("");

  // Filter sections by search query
  const filteredNavSections = useMemo(() => {
    if (!sidebarSearch.trim()) return navSections;
    const q = sidebarSearch.toLowerCase().trim();
    return navSections
      .map((section) => {
        const matchedItems = section.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.keywords.toLowerCase().includes(q)
        );
        return { ...section, items: matchedItems };
      })
      .filter((section) => section.items.length > 0);
  }, [sidebarSearch]);

  // Recently edited products
  const recentlyEdited = useMemo(() => {
    if (!products || products.length === 0) return [];
    return products.slice(0, 3);
  }, [products]);

  // Focus trap on mobile
  React.useEffect(() => {
    if (sidebarMobileOpen) {
      const focusable = mobileSidebarRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      }
      const handleKeyDown = (e) => {
        if (e.key === "Escape") setSidebarMobileOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [sidebarMobileOpen, setSidebarMobileOpen]);

  const sidebarContent = (
    <div className="flex flex-col h-full relative z-20 min-w-0" style={{ background: "var(--admin-surface)", borderRight: "1px solid var(--admin-border)" }}>
      {/* Sidebar Header */}
      <div
        className={`flex items-center ${sidebarOpen ? "px-5" : "px-3 justify-center"} py-4 transition-all duration-300 overflow-hidden shrink-0`}
        style={{ borderBottom: "1px solid var(--admin-border-subtle)" }}
      >
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-3 cursor-pointer group outline-none overflow-hidden shrink-0 text-left min-h-0"
        >
          <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
            <div className="w-full h-full rounded-[var(--admin-radius-md)] flex items-center justify-center shadow-[var(--admin-shadow-xs)]" style={{ background: "var(--admin-accent)" }}>
              <span className="text-white font-bold text-[14px] tracking-tight">
                S
              </span>
            </div>
          </div>

          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -8, width: 0 }}
                animate={{ opacity: 1, x: 0, width: "auto" }}
                exit={{ opacity: 0, x: -8, width: 0 }}
                className="flex flex-col whitespace-nowrap overflow-hidden"
              >
                <SiriLogo size="20px" showSubtitle={false} />
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] tracking-wider uppercase text-[var(--admin-text-tertiary)] font-medium">
                    Enterprise
                  </span>
                  <span className="w-1 h-1 rounded-full" style={{ background: "var(--admin-accent)" }} />
                  <span className="text-[9px] tracking-wide text-[var(--admin-text-secondary)] font-semibold">
                    Admin
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Sidebar Search */}
      {sidebarOpen && (
        <div className="px-3 pt-3 pb-1.5 shrink-0">
          <div
            className="relative flex items-center rounded-[var(--admin-radius-md)] px-3 py-1.5 transition-all"
            style={{
              background: "var(--admin-bg-subtle)",
              border: "1px solid var(--admin-border-subtle)",
            }}
          >
            <span className="material-symbols-outlined text-[15px] text-[var(--admin-text-tertiary)] mr-2 select-none">
              search
            </span>
            <input
              type="text"
              placeholder="Search sections..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-[12px] text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-placeholder)] p-0 focus:ring-0 min-h-0"
              style={{ boxShadow: "none" }}
            />
            {sidebarSearch && (
              <button
                onClick={() => setSidebarSearch("")}
                className="p-0.5 rounded-full hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)] flex items-center justify-center min-h-0"
              >
                <span className="material-symbols-outlined text-[12px]">close</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar space-y-3">
        {filteredNavSections.map((section, si) => (
          <div key={si} className="space-y-0.5">
            {sidebarOpen && (
              <div className="px-3 py-1.5 mb-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                  {section.label}
                </span>
              </div>
            )}
            {section.items.map((item, ii) => {
              const isActive = location.pathname === item.path || 
                (item.path !== "/admin" && location.pathname.startsWith(item.path));
              return (
                <NavLink
                  key={ii}
                  to={item.path}
                  end={item.path === "/admin"}
                  onClick={() => setSidebarMobileOpen(false)}
                  title={!sidebarOpen ? item.label : ""}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-[var(--admin-radius-md)] text-[13px] font-medium transition-all duration-150 group relative min-h-[36px] ${
                    isActive
                      ? "text-[var(--admin-accent-text)] font-semibold"
                      : "text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text-primary)]"
                  } ${!sidebarOpen ? "justify-center px-2" : ""}`}
                >
                  {/* Active background */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebarActiveBackground"
                      className="absolute inset-0 rounded-[var(--admin-radius-md)] z-0"
                      style={{
                        background: "var(--admin-accent-light)",
                        borderLeft: "2px solid var(--admin-accent)",
                      }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}

                  <span
                    className={`material-symbols-outlined text-[18px] relative z-10 transition-colors ${
                      isActive ? "text-[var(--admin-accent)]" : "text-[var(--admin-text-tertiary)] group-hover:text-[var(--admin-text-secondary)]"
                    }`}
                    style={{
                      fontVariationSettings: isActive
                        ? "'FILL' 1, 'wght' 500"
                        : "'FILL' 0, 'wght' 400",
                    }}
                  >
                    {item.icon}
                  </span>

                  {sidebarOpen && <span className="relative z-10 truncate">{item.label}</span>}

                  {!sidebarOpen && (
                    <div className="absolute left-full ml-2.5 px-2.5 py-1 bg-[var(--admin-text-primary)] text-[var(--admin-text-inverse)] text-[10px] rounded-[var(--admin-radius-md)] opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] shadow-[var(--admin-shadow-lg)] transition-opacity duration-150 font-semibold">
                      {item.label}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}

        {/* Recently Edited Products */}
        {sidebarOpen && !sidebarSearch && recentlyEdited.length > 0 && (
          <div className="pt-2 space-y-1" style={{ borderTop: "1px solid var(--admin-border-subtle)" }}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-text-tertiary)] px-3 block">
              Recently Edited
            </span>
            <div className="space-y-0.5 px-1">
              {recentlyEdited.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                  className="w-full flex items-center gap-2.5 p-1.5 rounded-[var(--admin-radius-md)] hover:bg-[var(--admin-surface-hover)] text-left border border-transparent transition-all cursor-pointer group min-h-0"
                >
                  <img
                    src={p.image}
                    alt="Product thumbnail"
                    className="w-6 h-6 rounded-[var(--admin-radius-sm)] object-cover shrink-0"
                    style={{ border: "1px solid var(--admin-border)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[var(--admin-text-primary)] truncate group-hover:text-[var(--admin-accent)] transition-colors">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-[var(--admin-text-tertiary)]">
                      ₹{p.price.toLocaleString()}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-[12px] text-[var(--admin-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">
                    edit
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 shrink-0" style={{ borderTop: "1px solid var(--admin-border-subtle)", background: "var(--admin-surface)" }}>
        <NavLink
          to="/"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-[var(--admin-radius-md)] text-[13px] font-semibold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text-primary)] transition-all min-h-[36px] ${
            !sidebarOpen ? "justify-center px-1" : ""
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            storefront
          </span>
          {sidebarOpen && <span>View Storefront</span>}
        </NavLink>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 260 : 72 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40 overflow-hidden"
        style={{
          background: "var(--admin-surface)",
          borderRight: "1px solid var(--admin-border)",
          boxShadow: "1px 0 8px rgba(0,0,0,0.02)",
        }}
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {sidebarMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarMobileOpen(false)}
              className="fixed inset-0 z-[100] lg:hidden"
              style={{ background: "var(--admin-surface-overlay)", backdropFilter: "blur(4px)" }}
            />
            <motion.aside
              ref={mobileSidebarRef}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 h-dvh w-[min(82vw,300px)] z-[110] lg:hidden overflow-hidden"
              style={{ background: "var(--admin-surface)", boxShadow: "var(--admin-shadow-2xl)" }}
            >
              <div className="absolute top-3 right-3 z-10">
                <button
                  onClick={() => setSidebarMobileOpen(false)}
                  className="p-2.5 rounded-[var(--admin-radius-md)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)] cursor-pointer min-h-0"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 admin-mobile-bottom-nav"
        style={{
          minHeight: "var(--admin-bottom-nav-height)",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          borderTop: "1px solid var(--admin-border)",
          boxShadow: "0 -2px 12px rgba(0,0,0,0.04)",
        }}
      >
        {[
          { label: "Dashboard", icon: "dashboard", path: "/admin" },
          { label: "Products", icon: "inventory_2", path: "/admin/products" },
          { label: "Add", icon: "add", path: "/admin/products/add", isAction: true },
          { label: "Orders", icon: "shopping_bag", path: "/admin/orders" },
          { label: "Settings", icon: "settings", path: "/admin/settings" },
        ].map((item, index) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/admin" &&
              !item.isAction &&
              location.pathname.startsWith(item.path));

          if (item.isAction) {
            return (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className="w-11 h-11 rounded-full flex items-center justify-center shadow-[var(--admin-shadow-md)] -translate-y-3 hover:scale-105 active:scale-95 transition-all cursor-pointer min-h-0"
                style={{
                  background: "var(--admin-accent)",
                  color: "white",
                  border: "2px solid var(--admin-surface)",
                }}
                title={item.label}
              >
                <span className="material-symbols-outlined text-[20px] font-bold">
                  add
                </span>
              </button>
            );
          }

          return (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-0.5 w-14 h-full relative cursor-pointer group min-h-0"
            >
              {isActive && (
                <motion.div
                  layoutId="mobileBottomIndicator"
                  className="absolute top-0 w-8 h-0.5 rounded-full"
                  style={{ background: "var(--admin-accent)" }}
                />
              )}
              <span
                className={`material-symbols-outlined text-[19px] transition-colors ${
                  isActive ? "text-[var(--admin-accent)]" : "text-[var(--admin-text-tertiary)] group-hover:text-[var(--admin-text-secondary)]"
                }`}
                style={{
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {item.icon}
              </span>
              <span
                className={`text-[9px] font-medium tracking-tight ${
                  isActive ? "text-[var(--admin-accent)]" : "text-[var(--admin-text-tertiary)]"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
