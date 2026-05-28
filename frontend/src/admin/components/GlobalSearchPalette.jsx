import React, { useState, useEffect, useRef } from"react";
import { useNavigate } from"react-router-dom";
import { motion } from"framer-motion";
import { useAdmin } from"../context/AdminContext";

// Navigation keywords for fuzzy search matching
const NAV_ITEMS = [
  { label:"Dashboard Overview", path:"/admin", category:"Navigation", icon:"dashboard", keywords:"stats, home, sales, analytics, revenues" },
  { label:"Homepage Hero Curation", path:"/admin/homepage", category:"Navigation", icon:"home", keywords:"banners, hero, slides, showcase, carousel" },
  { label:"Website Content CMS", path:"/admin/content", category:"Navigation", icon:"edit_note", keywords:"cms, policy, settings, shipping, footer, headers" },
  { label:"Heritage Photo Gallery", path:"/admin/gallery", category:"Navigation", icon:"photo_library", keywords:"gallery, media, designs, blueprint, curations" },
  { label:"Catalog Products", path:"/admin/products", category:"Navigation", icon:"inventory_2", keywords:"products, items, stock, edit products, catalog" },
  { label:"Add New Product", path:"/admin/products/add", category:"Navigation", icon:"add_circle", keywords:"create product, new item, catalog add" },
  { label:"Product Categories", path:"/admin/categories", category:"Navigation", icon:"category", keywords:"tags, collections, categorisation" },
  { label:"Warehouse Inventory", path:"/admin/inventory", category:"Navigation", icon:"warehouse", keywords:"stock, catalog, alerts, threshold" },
  { label:"Sales Orders", path:"/admin/orders", category:"Navigation", icon:"shopping_bag", keywords:"orders, sales, shipping, packages, deliveries" },
  { label:"Custom Blueprints & Inquiries", path:"/admin/custom-orders", category:"Navigation", icon:"architecture", keywords:"blueprints, custom, consultations, requests, event decor" },
  { label:"Customer Relationship CRM", path:"/admin/customers", category:"Navigation", icon:"group", keywords:"users, customers, profile, vip, list" },
  { label:"Coupons & Discounts", path:"/admin/coupons", category:"Navigation", icon:"sell", keywords:"discounts, offers, coupons, voucher, active offers" },
  { label:"Payments & Invoices", path:"/admin/payments", category:"Navigation", icon:"payments", keywords:"invoices, razorpay, cod, transaction history" },
  { label:"Event Bookings & Themes", path:"/admin/events", category:"Navigation", icon:"event", keywords:"events, setups, venue, active bookings" },
  { label:"Platform Analytics", path:"/admin/analytics", category:"Navigation", icon:"analytics", keywords:"revenues, insights, views, sales graphs" },
  { label:"Marketing Campaigns", path:"/admin/campaigns", category:"Navigation", icon:"campaign", keywords:"emails, subscribers, newsletters, push notifications" },
  { label:"Staff Team Management", path:"/admin/team", category:"Navigation", icon:"groups", keywords:"employees, access, roles, permissions" },
  { label:"System settings", path:"/admin/settings", category:"Navigation", icon:"settings", keywords:"profile, credentials, reset, backup" },
];

export function GlobalSearchPalette({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { products, orders, customers, eventBookings, setSearchQuery } = useAdmin();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setQuery("");
        setActiveIndex(0);
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Global escape & hotkeys listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key ==="Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Perform search across all available domains in the admin provider
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      if (!query.trim()) {
        // Default / empty state: suggest navigations
        setResults(NAV_ITEMS.slice(0, 7));
        setActiveIndex(0);
        return;
      }

      const q = query.toLowerCase().trim();
      const matches = [];

      // 1. Navigation Paths Match
      NAV_ITEMS.forEach(nav => {
        if (
          nav.label.toLowerCase().includes(q) ||
          nav.keywords.toLowerCase().includes(q)
        ) {
          matches.push({ ...nav, id: `nav-${nav.path}` });
        }
      });

      // 2. Product Search Match
      if (products) {
        products.forEach(p => {
          if (
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q)
          ) {
            matches.push({
              id: `prod-${p.id}`,
              label: p.name,
              sub: `Product • Category: ${p.category} • Price: ₹${p.price.toLocaleString()} • Stock: ${p.stock}`,
              category:"Products",
              icon:"inventory_2",
              path: `/admin/products`,
              action: () => {
                // Set context search query to highlight or filter
                setSearchQuery(p.name);
                navigate("/admin/products");
              }
            });
          }
        });
      }

      // 3. Sales Orders Match
      if (orders) {
        orders.forEach(o => {
          if (
            o.id.toLowerCase().includes(q) ||
            o.customer.toLowerCase().includes(q) ||
            (o.email && o.email.toLowerCase().includes(q))
          ) {
            matches.push({
              id: `ord-${o.id}`,
              label: `Order #${o.id.substring(o.id.length - 8).toUpperCase()}`,
              sub: `Order • Customer: ${o.customer} • Total: ₹${o.total.toLocaleString()} • Status: ${o.status}`,
              category:"Orders",
              icon:"shopping_bag",
              path: `/admin/orders/${o.id}`,
            });
          }
        });
      }

      // 4. Clients / Customers Match
      if (customers) {
        customers.forEach(c => {
          if (
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q)
          ) {
            matches.push({
              id: `cus-${c.id}`,
              label: c.name,
              sub: `CRM Customer • ${c.email} • City: ${c.city} • Tier: ${c.segment}`,
              category:"Customers",
              icon:"group",
              path: `/admin/customers/${c.id}`,
            });
          }
        });
      }

      // 5. Event Bookings Match
      if (eventBookings) {
        eventBookings.forEach(e => {
          if (
            e.eventType.toLowerCase().includes(q) ||
            e.customer.toLowerCase().includes(q) ||
            (e.venue && e.venue.toLowerCase().includes(q))
          ) {
            matches.push({
              id: `evt-${e.id}`,
              label: e.eventType,
              sub: `Event Setup • Client: ${e.customer} • Venue: ${e.venue} • Status: ${e.status}`,
              category:"Events",
              icon:"celebration",
              path: `/admin/events`,
            });
          }
        });
      }

      setResults(matches.slice(0, 15)); // Limit to top 15 results for performance
      setActiveIndex(0);
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, products, orders, customers, eventBookings, navigate, setSearchQuery]);

  // Scroll active item into view inside the command list
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[activeIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block:"nearest" });
      }
    }
  }, [activeIndex]);

  const handleKeyDown = (e) => {
    if (e.key ==="ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (e.key ==="ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key ==="Enter") {
      e.preventDefault();
      if (results[activeIndex]) {
        handleSelect(results[activeIndex]);
      }
    }
  };

  const handleSelect = (item) => {
    onClose();
    if (item.action) {
      item.action();
    } else {
      navigate(item.path);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-20 md:pt-28 px-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -8 }}
        className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[500px]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Box */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
          <span className="material-symbols-outlined text-[24px] text-black select-none">
            search
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a page name, order ID, product name, or client info..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[14px] text-slate-800 placeholder:text-slate-400 outline-none border-none ring-0 focus:ring-0 focus:border-none focus:outline-none w-full font-sans"
          />
          <button aria-label="close" 
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer active:scale-95 transition-transform hover:bg-slate-200"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Results Stream */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 bg-white"
        >
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center text-slate-400">
              <span className="material-symbols-outlined text-[36px] mb-2 text-slate-300">search_off</span>
              <p className="text-[12px] font-bold text-slate-700">No records found</p>
              <p className="text-[11px] max-w-[280px] mt-0.5">We couldn't find any products, orders, categories, or pages matching your search query.</p>
            </div>
          ) : (
            results.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <div
                  key={item.id || item.path}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex items-start gap-3.5 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                    isActive 
                      ?"bg-black text-white shadow-md shadow-slate-950/10 translate-x-1" 
                      :"hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isActive ?"bg-white/20 text-white" :"bg-slate-100 border border-slate-200 text-black"
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">
                      {item.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-semibold truncate ${isActive ?"text-white" :"text-slate-800"}`}>
                      {item.label}
                    </p>
                    <p className={`text-[11px] mt-0.5 truncate ${isActive ?"text-white/85" :"text-slate-400"}`}>
                      {item.sub || `${item.category} section`}
                    </p>
                  </div>
                  {isActive && (
                    <span className="material-symbols-outlined text-[16px] shrink-0 self-center text-white/95 animate-[pulse_1s_infinite]">
                      subdirectory_arrow_left
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* command keyboard guide */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] sm:text-[11px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-semibold select-none shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px] sm:text-[11px] sm:text-[11px]">▲▼</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px] sm:text-[11px] sm:text-[11px]">↵</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px] sm:text-[11px] sm:text-[11px]">ESC</kbd> Close
            </span>
          </div>
          <div>Siri Arts & Crafts Admin</div>
        </div>
      </motion.div>
    </div>
  );
}
