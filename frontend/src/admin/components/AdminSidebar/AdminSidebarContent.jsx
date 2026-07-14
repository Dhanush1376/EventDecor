import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { SiriLogo } from '../../../components/ui/SiriLogo';
import { useAuth } from '../../../context/AuthContext';
import { useAdmin } from '../../context/AdminContext';

export function AdminSidebarContent({
  sidebarOpen,
  setSidebarMobileOpen,
  sidebarSearch,
  setSidebarSearch,
  filteredNavSections,
  collapsedSections,
  toggleSection,
  recentlyEdited,
  handleNavRef,
  handleScroll,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { activeRole } = useAdmin();

  const effectiveRole = activeRole || user?.role || 'owner';

  // Filter sections by role before rendering
  const allowedSections = filteredNavSections.filter(
    (section) => !section.roles || section.roles.includes(effectiveRole),
  );

  return (
    <div
      className="flex flex-col h-full relative z-20 min-w-0"
      style={{ background: 'var(--admin-surface)', borderRight: '1px solid var(--admin-border)' }}
    >
      {/* Sidebar Header */}
      <div
        className={`flex items-center ${sidebarOpen ? 'px-5' : 'px-3 justify-center'} py-4 transition-all duration-300 overflow-hidden shrink-0`}
        style={{ borderBottom: '1px solid var(--admin-border-subtle)' }}
      >
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-3 cursor-pointer group outline-none overflow-hidden shrink-0 text-left min-h-0"
        >
          <SiriLogo size="32px" showSubtitle={false} className="shrink-0" />

          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -8, width: 0 }}
                animate={{ opacity: 1, x: 0, width: 'auto' }}
                exit={{ opacity: 0, x: -8, width: 0 }}
                className="flex flex-col whitespace-nowrap overflow-hidden"
              >
                <span
                  className="font-semibold text-[13px] tracking-wide text-[var(--admin-text-primary)]"
                  style={{ fontFamily: "'Playfair Display', 'Georgia', 'Times New Roman', serif" }}
                >
                  Siri arts & crafts
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] tracking-wider uppercase text-[var(--admin-text-tertiary)] font-medium">
                    Enterprise
                  </span>
                  <span
                    className="w-1 h-1 rounded-full"
                    style={{ background: 'var(--admin-accent)' }}
                  />
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
              background: 'var(--admin-bg-subtle)',
              border: '1px solid var(--admin-border-subtle)',
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
              style={{ boxShadow: 'none' }}
            />
            {sidebarSearch && (
              <button
                onClick={() => setSidebarSearch('')}
                className="w-5 h-5 min-h-0 flex items-center justify-center rounded-full hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)] flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[12px]">close</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav
        ref={handleNavRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar space-y-3"
      >
        {allowedSections.map((section, si) => {
          const isCollapsed = collapsedSections[si] && sidebarOpen && !sidebarSearch;
          return (
            <div key={si} className="space-y-0.5">
              {sidebarOpen && (
                <button
                  onClick={() => toggleSection(si)}
                  className="w-full flex items-center justify-between px-3 py-2.5 lg:py-1.5 mb-1 lg:mb-0.5 group min-h-[44px] lg:min-h-0 text-left outline-none cursor-pointer hover:bg-[var(--admin-surface-hover)] rounded-[var(--admin-radius-md)] transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-[11px] lg:text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] group-hover:text-[var(--admin-text-primary)] transition-colors">
                      {section.label}
                    </span>
                    {section.subtitle && (
                      <span className="text-[10px] lg:text-[9px] text-[var(--admin-text-tertiary)] group-hover:text-[var(--admin-text-secondary)] mt-0.5">
                        {section.subtitle}
                      </span>
                    )}
                  </div>
                  <span
                    className={`material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)] transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                  >
                    expand_more
                  </span>
                </button>
              )}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={{
                      visible: { height: 'auto', opacity: 1, overflow: 'visible' },
                      hidden: { height: 0, opacity: 0, overflow: 'hidden' },
                    }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="space-y-0.5"
                  >
                    {section.items
                      .filter((item) => !item.roles || item.roles.includes(effectiveRole))
                      .map((item, ii) => {
                        // We only want exact match or if it's not a root hub path.
                        // To prevent 'Active Rentals' from highlighting when 'Due Returns' is selected.
                        const isExact = location.pathname === item.path;
                        const isSubPath =
                          item.path !== '/admin' &&
                          item.path !== '/admin/rentals' &&
                          item.path !== '/admin/orders' &&
                          item.path !== '/admin/system' &&
                          location.pathname.startsWith(item.path);
                        const isActive = isExact || isSubPath;
                        return (
                          <NavLink
                            key={ii}
                            to={item.path}
                            end={item.path === '/admin'}
                            onClick={() => setSidebarMobileOpen(false)}
                            title={!sidebarOpen ? item.label : ''}
                            className={`flex items-center gap-3 lg:gap-2.5 px-3 py-2.5 lg:py-2 rounded-[var(--admin-radius-md)] text-[14px] lg:text-[13px] font-medium transition-all duration-150 group relative min-h-[44px] lg:min-h-[36px] ${
                              isActive
                                ? 'text-[var(--admin-accent-text)] font-semibold'
                                : 'text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text-primary)]'
                            } ${!sidebarOpen ? 'justify-center px-2' : ''}`}
                          >
                            {/* Active background */}
                            {isActive && (
                              <motion.div
                                layoutId="sidebarActiveBackground"
                                className="absolute inset-0 rounded-[var(--admin-radius-md)] z-0"
                                style={{
                                  background: `var(--admin-domain-${item.domain || 'settings'}-bg)`,
                                  borderLeft: `2px solid var(--admin-domain-${item.domain || 'settings'})`,
                                }}
                                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                              />
                            )}

                            <span
                              className={`material-symbols-outlined text-[20px] lg:text-[18px] relative z-10 transition-colors ${
                                isActive
                                  ? ''
                                  : 'text-[var(--admin-text-tertiary)] group-hover:text-[var(--admin-text-secondary)]'
                              }`}
                              style={{
                                color: isActive
                                  ? `var(--admin-domain-${item.domain || 'settings'})`
                                  : undefined,
                                fontVariationSettings: isActive
                                  ? "'FILL' 1, 'wght' 500"
                                  : "'FILL' 0, 'wght' 400",
                              }}
                            >
                              {item.icon}
                            </span>

                            {sidebarOpen && (
                              <span className="relative z-10 truncate">{item.label}</span>
                            )}

                            {!sidebarOpen && (
                              <div className="absolute left-full ml-2.5 px-2.5 py-1 bg-[var(--admin-text-primary)] text-[var(--admin-text-inverse)] text-[10px] rounded-[var(--admin-radius-md)] opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] shadow-[var(--admin-shadow-lg)] transition-opacity duration-150 font-semibold">
                                {item.label}
                              </div>
                            )}
                          </NavLink>
                        );
                      })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Recently Edited Products */}
        {sidebarOpen && !sidebarSearch && recentlyEdited.length > 0 && (
          <div
            className="pt-2 space-y-1"
            style={{ borderTop: '1px solid var(--admin-border-subtle)' }}
          >
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
                    style={{ border: '1px solid var(--admin-border)' }}
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
      <div
        className="p-3 shrink-0"
        style={{
          borderTop: '1px solid var(--admin-border-subtle)',
          background: 'var(--admin-surface)',
        }}
      >
        <NavLink
          to="/"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-[var(--admin-radius-md)] text-[13px] font-bold text-white bg-[var(--admin-accent)] hover:brightness-110 shadow-sm transition-all min-h-[36px] ${
            !sidebarOpen ? 'justify-center px-1' : ''
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">storefront</span>
          {sidebarOpen && <span>View Storefront</span>}
        </NavLink>
      </div>
    </div>
  );
}
