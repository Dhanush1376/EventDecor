import React, { useState, useMemo } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmin } from "../context/AdminContext";

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

  // Extract recently edited products dynamically from live catalog
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
    <div className="flex flex-col h-full bg-white border-r border-slate-200 relative z-20 min-w-0">
      {/* Sidebar Header */}
      <div
        className={`flex items-center ${sidebarOpen ? "px-6" : "px-3 justify-center"} py-5 border-b border-slate-100 transition-all duration-300 overflow-hidden shrink-0`}
      >
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-3 cursor-pointer group outline-none overflow-hidden shrink-0 text-left"
        >
          <div className="relative w-9 h-9 shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-102">
            <div className="absolute inset-0 bg-black rounded-lg opacity-10" />
            <div className="relative w-full h-full rounded-lg bg-black flex items-center justify-center shadow-xs">
              <span className="text-white font-sans font-bold text-[15px] tracking-tight">
                S
              </span>
            </div>
          </div>

          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10, width: 0 }}
                animate={{ opacity: 1, x: 0, width: "auto" }}
                exit={{ opacity: 0, x: -10, width: 0 }}
                className="flex flex-col whitespace-nowrap overflow-hidden"
              >
                <div className="flex flex-col justify-center">
                  <span className="font-sans text-[13px] font-bold text-slate-900 tracking-tight group-hover:text-black transition-colors duration-200">
                    Siri Arts & Crafts
                  </span>
                </div>
                <div className="flex items-center gap-1 leading-none mt-0.5">
                  <span className="text-[9px] tracking-wider uppercase text-slate-400 font-medium">
                    Enterprise
                  </span>
                  <div className="w-1 h-1 bg-indigo-400 rounded-full" />
                  <span className="text-[9px] tracking-wide text-slate-800 font-semibold">
                    Admin
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Sidebar Live Search Input */}
      {sidebarOpen && (
        <div className="px-4 pt-4 pb-2 shrink-0">
          <div className="relative flex items-center bg-slate-50 rounded-lg border border-slate-200/80 px-3 py-1.5 focus-within:border-slate-900/50 focus-within:bg-white focus-within:shadow-[0_0_0_1px_rgba(99,102,241,0.1)] transition-all">
            <span className="material-symbols-outlined text-[16px] text-slate-400 mr-2 select-none">
              search
            </span>
            <input
              type="text"
              placeholder="Search sections..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-[12px] text-slate-800 placeholder:text-slate-400/80 p-0 font-sans focus:ring-0"
            />
            {sidebarSearch && (
              <button
                onClick={() => setSidebarSearch("")}
                className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[12px]">close</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 custom-scrollbar space-y-4">
        {filteredNavSections.map((section, si) => (
          <div key={si} className="space-y-0.5">
            {sidebarOpen && (
              <div className="px-3 py-1 flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group relative min-h-[38px] ${
                    isActive
                      ? "text-black font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  } ${!sidebarOpen ? "justify-center px-2" : ""}`}
                >
                  {/* Active background pill */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebarActiveBackground"
                      className="absolute inset-0 bg-slate-100 rounded-lg z-0 border-l-2 border-black"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}

                  <span
                    className={`material-symbols-outlined text-[18px] relative z-10 transition-colors ${
                      isActive ? "text-black" : "text-slate-400 group-hover:text-slate-600"
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
                    <div className="absolute left-full ml-3 px-2 py-1 bg-slate-950 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] shadow-md transition-opacity duration-150">
                      {item.label}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}

        {/* Recently Edited Product Blocks */}
        {sidebarOpen && !sidebarSearch && recentlyEdited.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block">
              Recently Edited
            </span>
            <div className="space-y-1 px-1">
              {recentlyEdited.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                  className="w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 text-left border border-transparent transition-all cursor-pointer group"
                >
                  <img
                    src={p.image}
                    alt="Traditional wedding event decoration"
                    className="w-6.5 h-6.5 rounded-md object-cover shrink-0 border border-slate-200/80"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-slate-800 truncate group-hover:text-black transition-colors">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      ₹{p.price.toLocaleString()}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-[12px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    edit
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Sidebar Footer */}
      <div className="border-t border-slate-100 p-4 shrink-0 bg-white">
        <NavLink
          to="/"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-black transition-all ${
            !sidebarOpen ? "justify-center px-1" : ""
          }`}
        >
          <span className="material-symbols-outlined text-[18px] text-slate-800">
            storefront
          </span>
          {sidebarOpen && <span>View Storefront</span>}
        </NavLink>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 260 : 72 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-white border-r border-slate-200 z-40 overflow-hidden shadow-[1px_0_10px_rgba(0,0,0,0.02)]"
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
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[100] lg:hidden"
            />
            <motion.aside
              ref={mobileSidebarRef}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 h-dvh w-[min(80vw,280px)] bg-white z-[110] lg:hidden shadow-xl overflow-hidden"
            >
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setSidebarMobileOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Sticky Bottom Nav Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 min-h-[58px] bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 flex items-center justify-around px-2 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-safe-area-inset-bottom">
        {[
          { label: "Dashboard", icon: "dashboard", path: "/admin" },
          { label: "Products", icon: "inventory_2", path: "/admin/products" },
          {
            label: "Add",
            icon: "add",
            path: "/admin/products/add",
            isAction: true,
          },
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
                className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-md -translate-y-3 hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white"
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
              className="flex flex-col items-center justify-center gap-0.5 w-14 h-full relative cursor-pointer group"
            >
              {isActive && (
                <motion.div
                  layoutId="mobileBottomIndicator"
                  className="absolute top-0 w-8 h-0.5 bg-black rounded-full"
                />
              )}
              <span
                className={`material-symbols-outlined text-[18px] transition-colors ${
                  isActive ? "text-black" : "text-slate-400 group-hover:text-slate-600"
                }`}
                style={{
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {item.icon}
              </span>
              <span
                className={`text-[9px] font-medium tracking-tight ${
                  isActive ? "text-slate-900" : "text-slate-400"
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
