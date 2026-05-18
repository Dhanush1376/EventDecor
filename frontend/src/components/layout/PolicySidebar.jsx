import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export function PolicySidebar() {
  const { pathname } = useLocation();

  const policies = [
    { title: "Shipping Policy", path: "/shipping" },
    { title: "Returns & Exchanges", path: "/returns" },
    { title: "Privacy Policy", path: "/privacy" },
    { title: "Terms & Conditions", path: "/terms" },
  ];

  return (
    <aside className="lg:col-span-3 space-y-2 sticky top-28 h-fit hidden lg:block">
      <h2 className="font-label-sm text-secondary uppercase tracking-[0.2em] mb-6 font-bold">
        Policy Navigation
      </h2>
      {policies.map((policy) => {
        const isActive = pathname === policy.path;
        return (
          <Link
            key={policy.path}
            to={policy.path}
            className={`block px-4 py-3 rounded-xl font-label-sm text-[12px] uppercase tracking-widest transition-all ${
              isActive
                ? "bg-primary text-surface shadow-md font-bold"
                : "text-secondary hover:bg-surface-container-low hover:text-primary font-medium"
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{policy.title}</span>
              {isActive && (
                <motion.span
                  layoutId="active-policy"
                  className="material-symbols-outlined text-sm"
                >
                  chevron_right
                </motion.span>
              )}
            </div>
          </Link>
        );
      })}
    </aside>
  );
}

export function MobilePolicyNav() {
  const { pathname } = useLocation();
  const policies = [
    { title: "Shipping", path: "/shipping" },
    { title: "Returns", path: "/returns" },
    { title: "Privacy", path: "/privacy" },
    { title: "Terms", path: "/terms" },
  ];

  return (
    <div className="lg:hidden mb-10 overflow-x-auto no-scrollbar pb-2 border-b border-outline-variant/20">
      <div className="flex gap-2">
        {policies.map((policy) => {
          const isActive = pathname === policy.path;
          return (
            <Link
              key={policy.path}
              to={policy.path}
              className={`px-4 py-2 rounded-full whitespace-nowrap font-label-sm text-[10px] uppercase tracking-widest border transition-all ${
                isActive
                  ? "bg-primary text-surface border-primary font-bold"
                  : "bg-surface-bright text-secondary border-outline-variant/30 font-medium"
              }`}
            >
              {policy.title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
