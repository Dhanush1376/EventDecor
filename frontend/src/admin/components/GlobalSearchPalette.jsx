import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmin } from "../context/AdminContext";

// Navigation keywords for fuzzy search matching
const NAV_ITEMS = [
  { label: "Dashboard Overview", path: "/admin", category: "Navigation", icon: "dashboard", keywords: "stats, home, sales, analytics, revenues" },
  { label: "Homepage Hero Curation", path: "/admin/homepage", category: "Navigation", icon: "home", keywords: "banners, hero, slides, showcase, carousel" },
  { label: "Website Content CMS", path: "/admin/content", category: "Navigation", icon: "edit_note", keywords: "cms, policy, settings, shipping, footer, headers" },
  { label: "Heritage Photo Gallery", path: "/admin/gallery", category: "Navigation", icon: "photo_library", keywords: "gallery, media, designs, blueprint, curations" },
  { label: "Catalog Products", path: "/admin/products", category: "Navigation", icon: "inventory_2", keywords: "products, items, stock, edit products, catalog" },
  { label: "Add New Product", path: "/admin/products/add", category: "Navigation", icon: "add_circle", keywords: "create product, new item, catalog add" },
  { label: "Product Categories", path: "/admin/categories", category: "Navigation", icon: "category", keywords: "tags, collections, categorisation" },
  { label: "Warehouse Inventory", path: "/admin/inventory", category: "Navigation", icon: "warehouse", keywords: "stock, catalog, alerts, threshold" },
  { label: "Sales Orders", path: "/admin/orders", category: "Navigation", icon: "shopping_bag", keywords: "orders, sales, shipping, packages, deliveries" },
  { label: "Custom Blueprints & Inquiries", path: "/admin/custom-orders", category: "Navigation", icon: "architecture", keywords: "blueprints, custom, consultations, requests, event decor" },
  { label: "Customer Relationship CRM", path: "/admin/customers", category: "Navigation", icon: "group", keywords: "users, customers, profile, vip, list" },
  { label: "Coupons & Discounts", path: "/admin/coupons", category: "Navigation", icon: "sell", keywords: "discounts, offers, coupons, voucher, active offers" },
  { label: "Payments & Invoices", path: "/admin/payments", category: "Navigation", icon: "payments", keywords: "invoices, razorpay, cod, transaction history" },
  { label: "Event Bookings & Themes", path: "/admin/events", category: "Navigation", icon: "event", keywords: "events, setups, venue, active bookings" },
  { label: "Platform Analytics", path: "/admin/analytics", category: "Navigation", icon: "analytics", keywords: "revenues, insights, views, sales graphs" },
  { label: "Marketing Campaigns", path: "/admin/campaigns", category: "Navigation", icon: "campaign", keywords: "emails, subscribers, newsletters, push notifications" },
  { label: "Staff Team Management", path: "/admin/team", category: "Navigation", icon: "groups", keywords: "employees, access, roles, permissions" },
  { label: "System settings", path: "/admin/settings", category: "Navigation", icon: "settings", keywords: "profile, credentials, reset, backup" },
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
      if (e.key === "Escape") {
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
              category: "Products",
              icon: "inventory_2",
              path: `/admin/products`,
              action: () => {
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
              category: "Orders",
              icon: "shopping_bag",
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
              category: "Customers",
              icon: "group",
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
              category: "Events",
              icon: "celebration",
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
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
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
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 md:pt-28 px-4"
          style={{ background: "var(--admin-surface-overlay)", backdropFilter: "blur(4px)" }}
          onClick={onClose}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="w-full max-w-2xl overflow-hidden flex flex-col max-h-[600px] shadow-2xl"
            style={{ 
              background: "var(--admin-surface)",
              borderRadius: "var(--admin-radius-2xl)",
              border: "1px solid var(--admin-border)",
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            {/* Search Input Box */}
            <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--admin-border-subtle)" }}>
              <span className="material-symbols-outlined text-[24px] text-[var(--admin-text-primary)] select-none shrink-0">
                search
              </span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a page name, order ID, product name, or client info..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="search-portal-input flex-1 bg-transparent text-[16px] text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-placeholder)] outline-none border-none ring-0 focus:ring-0 focus:border-none focus:outline-none w-full min-w-0"
              />
              <div className="flex items-center gap-2 shrink-0">
                {query && (
                  <button 
                    onClick={() => setQuery("")}
                    className="admin-btn-icon w-7 h-7 flex items-center justify-center p-0 min-h-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
                <kbd className="hidden sm:flex items-center justify-center px-2 py-1 rounded-[var(--admin-radius-md)] text-[10px] font-semibold text-[var(--admin-text-tertiary)]"
                  style={{ background: "var(--admin-surface-muted)", border: "1px solid var(--admin-border)" }}>
                  ESC
                </kbd>
              </div>
            </div>

            {/* Results Stream */}
            <div 
              ref={listRef}
              className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5"
            >
              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--admin-text-tertiary)]">
                  <span className="material-symbols-outlined text-[40px] mb-3 text-[var(--admin-border-strong)]">search_off</span>
                  <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">No results found</p>
                  <p className="text-[12px] max-w-[280px] mt-1 text-[var(--admin-text-secondary)]">We couldn't find any items matching "{query}".</p>
                </div>
              ) : (
                results.map((item, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <div
                      key={item.id || item.path}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className="flex items-center gap-3.5 px-3 py-2.5 rounded-[var(--admin-radius-lg)] cursor-pointer transition-all duration-150 min-h-[52px]"
                      style={{
                        background: isActive ? "var(--admin-accent)" : "transparent",
                        color: isActive ? "white" : "var(--admin-text-primary)",
                      }}
                    >
                      <div className="w-8 h-8 rounded-[var(--admin-radius-md)] flex items-center justify-center shrink-0"
                        style={{
                          background: isActive ? "rgba(255,255,255,0.2)" : "var(--admin-surface-muted)",
                          border: isActive ? "1px solid rgba(255,255,255,0.1)" : "1px solid var(--admin-border)",
                          color: isActive ? "white" : "var(--admin-text-secondary)",
                        }}>
                        <span className="material-symbols-outlined text-[16px]">
                          {item.icon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p className={`text-[13px] font-semibold truncate ${isActive ? "text-white" : "text-[var(--admin-text-primary)]"}`}>
                          {item.label}
                        </p>
                        <p className={`text-[11px] truncate mt-0.5 ${isActive ? "text-white/80" : "text-[var(--admin-text-tertiary)]"}`}>
                          {item.sub || `${item.category} section`}
                        </p>
                      </div>
                      {isActive && (
                        <span className="material-symbols-outlined text-[18px] shrink-0 text-white/90 mr-1 animate-[pulse_2s_infinite]">
                          keyboard_return
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* command keyboard guide */}
            <div className="px-5 py-3 flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--admin-text-tertiary)] font-bold select-none shrink-0"
              style={{ borderTop: "1px solid var(--admin-border-subtle)", background: "var(--admin-bg-subtle)" }}>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded-[var(--admin-radius-sm)] text-[10px]" style={{ background: "var(--admin-surface)", border: "1px solid var(--admin-border)" }}>↑↓</kbd> Navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded-[var(--admin-radius-sm)] text-[10px]" style={{ background: "var(--admin-surface)", border: "1px solid var(--admin-border)" }}>↵</kbd> Select
                </span>
              </div>
              <div className="hidden sm:block">Admin Search Palette</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
