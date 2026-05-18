import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { initialWebsiteContent } from "../data/websiteContentData";
import {
  productService,
  orderService,
  cmsService,
  analyticsService,
  reviewService,
  userService,
  galleryService,
  eventService,
} from "../../services/domainServices";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const AdminContext = createContext(null);

const STORAGE_KEY = "siri_admin_website_content";
const loadContent = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        parsed?.hero?.backgroundImage?.includes("hero_bg_luxury.jpg") ||
        parsed?.hero?.backgroundImage?.startsWith("/") ||
        parsed?.hero?.backgroundImage?.includes("luxury_royal_wedding.png")
      ) {
        localStorage.removeItem(STORAGE_KEY);
        return initialWebsiteContent;
      }
      return parsed;
    }
    return initialWebsiteContent;
  } catch {
    return initialWebsiteContent;
  }
};

const STORAGE_KEY_CATEGORIES = "siri_admin_custom_categories";
const initialCustomCategories = {
  products: [
    { id: "p1", name: "Traditional Return Gifts", count: 24, image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=600&auto=format&fit=crop", active: true, description: "Bespoke brass tambulam bowls and handcrafted shagun packaging." },
    { id: "p2", name: "Engagement Ring Trays", count: 18, image: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=600&auto=format&fit=crop", active: true, description: "Pearl beaded trays and custom carved wooden initials." },
    { id: "p3", name: "Carved Coconuts & Shagun", count: 12, image: "https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?q=80&w=600&auto=format&fit=crop", active: true, description: "Artisanal hand-painted coconuts for traditional ceremonies." },
    { id: "p4", name: "Customized Gift Hampers", count: 30, image: "https://images.unsplash.com/photo-1512909006721-3d6018887383?q=80&w=600&auto=format&fit=crop", active: true, description: "Velvet presentation hampers with South Indian sweet boxes." }
  ],
  events: [
    { id: "e1", name: "Telugu Heritage (Pellikuthuru)", count: 8, image: "https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?q=80&w=600&auto=format&fit=crop", active: true, description: "Royal Mysore brass urlis, marigold strings, and wooden carved seats." },
    { id: "e2", name: "Engagement Gift Setup", count: 15, image: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop", active: true, description: "Side-stage gift presentation pedestals and LED uplighting." },
    { id: "e3", name: "Ring Ceremony Showcases", count: 10, image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=600&auto=format&fit=crop", active: true, description: "Gold-leaf backdrop rings and velvet pedestal arrangements." },
    { id: "e4", name: "Tambulam & Shagun Counter", count: 20, image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=600&auto=format&fit=crop", active: true, description: "Royal wooden shelving with fresh jasmine runners." }
  ]
};

const loadCustomCategories = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    if (saved) return JSON.parse(saved);
    return initialCustomCategories;
  } catch {
    return initialCustomCategories;
  }
};

const mapDbProductToFrontend = (p) => {
  if (!p) return null;
  if (p.id && p.name && p.image) return p;
  
  let fStatus = "active";
  if (p.stock === 0) fStatus = "out_of_stock";
  else if (p.stock <= 5) fStatus = "low_stock";
  else if (!p.isActive) fStatus = "draft";
  
  return {
    id: p._id || p.id || "PRD-UNKNOWN",
    name: p.title || p.name || "Handcrafted Decor Piece",
    nameTE: p.teluguTitle || p.nameTE || "",
    category: p.category || "Uncategorized",
    price: p.price || 0,
    stock: p.stock !== undefined ? p.stock : 10,
    status: fStatus,
    featured: p.featured !== undefined ? p.featured : false,
    image: p.imageSrc || p.image || "https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?q=80&w=640&auto=format&fit=crop",
    views: p.views !== undefined ? p.views : 120,
    sold: p.sold !== undefined ? p.sold : 5,
    rating: p.rating || 5.0,
    description: p.description || "",
    rawProduct: p
  };
};

const mapDbOrderToFrontend = (o) => {
  if (!o) return null;
  if (o.id && o.customer && o.status) return o;
  
  const dateStr = o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '';
  
  // Use capitalized statuses strictly
  let fStatus = o.orderStatus || "Pending";
  // fallback map for old dev artifacts
  if (fStatus === "placed") fStatus = "Pending";
  else if (fStatus === "confirmed") fStatus = "Confirmed";
  else if (fStatus === "processing") fStatus = "Packed";
  else if (fStatus === "shipped") fStatus = "Shipped";
  else if (fStatus === "delivered") fStatus = "Delivered";
  else if (fStatus === "cancelled") fStatus = "Cancelled";
  
  const mappedItems = Array.isArray(o.items) ? o.items.map(item => ({
    name: item.title || item.name || "Handcrafted Piece",
    qty: item.quantity || item.qty || 1,
    price: item.price || 0
  })) : [];
  
  return {
    id: o._id || o.id || "ORD-UNKNOWN",
    customer: o.shippingAddress?.name || o.user?.name || "Store Customer",
    email: o.shippingAddress?.email || o.user?.email || "customer@email.com",
    phone: o.shippingAddress?.phone || o.user?.phone || "+91 98765 43210",
    items: mappedItems,
    total: o.total || o.subtotal || 0,
    status: fStatus,
    payment: o.paymentStatus === "paid" ? "Paid" : (o.paymentStatus === "COD Collected" ? "COD Collected" : (o.paymentMethod?.toLowerCase() === "cod" ? "COD Pending" : "Pending")),
    date: dateStr,
    address: o.shippingAddress ? `${o.shippingAddress.address}, ${o.shippingAddress.city}, ${o.shippingAddress.state} - ${o.shippingAddress.pincode}` : "Hyderabad",
    rawOrder: o,
    // Enterprise logistics mapping
    invoiceNumber: o.invoiceNumber,
    trackingNumber: o.trackingNumber,
    courierPartner: o.courierPartner,
    weight: o.weight,
    dimensions: o.dimensions,
    packageType: o.packageType,
    barcodeData: o.barcodeData,
    qrCodeData: o.qrCodeData,
    shippingAddress: o.shippingAddress,
    needByDate: o.needByDate
  };
};

const mapDbCustomerToFrontend = (c) => {
  if (!c) return null;
  if (c.id && c.orders !== undefined) return c;
  
  const totalSpent = Array.isArray(c.orders) ? c.orders.reduce((sum, order) => sum + (order.total || 0), 0) : 0;
  const orderCount = Array.isArray(c.orders) ? c.orders.length : 0;
  
  let segment = "New";
  if (orderCount > 5 || totalSpent > 50000) {
    segment = "VIP";
  } else if (orderCount > 0) {
    segment = "Regular";
  }
  
  const lastOrderDate = c.updatedAt ? new Date(c.updatedAt).toISOString().split('T')[0] : "2026-05-15";
  const city = c.addresses && c.addresses[0] ? c.addresses[0].city : "Hyderabad";
  
  return {
    id: c._id || c.id || "CUS-UNKNOWN",
    name: c.name || "Customer",
    email: c.email || "",
    phone: c.phone || "+91 98765 43210",
    orders: orderCount,
    totalSpent: totalSpent || 0,
    lastOrder: lastOrderDate,
    segment: segment,
    city: city,
    walletBalance: c.walletBalance || 0,
    siriCoins: c.siriCoins || 0,
    loyaltyTier: c.loyaltyTier || 'Bronze',
    rawUser: c
  };
};

const mapDbEventToFrontend = (e) => {
  if (!e) return null;
  if (e.id && e.eventType && e.customer) return e;
  
  const dateStr = e.createdAt ? new Date(e.createdAt).toISOString().split('T')[0] : "2026-05-20";
  
  return {
    id: e._id || e.id || "EVT-UNKNOWN",
    eventType: e.title || "Custom Consultation",
    customer: e.category || "Consultation Request",
    status: e.isActive ? "Confirmed" : "Pending",
    date: dateStr,
    venue: e.venueType || "Hyderabad",
    amount: e.pricing ? parseInt(e.pricing.replace(/[^0-9]/g, "")) || 45000 : 45000,
    payment: "Paid",
    staff: ["Siri", "Anji"],
    rawEvent: e
  };
};

export function AdminProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  const { logout } = useAuth();

  // ─── SaaS Simulation & Security States ───
  const [activeRole, setActiveRole] = useState(() => {
    return localStorage.getItem("siri_admin_active_role") || "owner";
  });

  const [safetyLock, setSafetyLock] = useState(() => {
    return localStorage.getItem("siri_admin_safety_lock") === "true";
  });

  const [maintenanceMode, setMaintenanceMode] = useState(() => {
    return localStorage.getItem("siri_admin_maintenance_mode") === "true";
  });

  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(() => {
    const saved = localStorage.getItem("siri_admin_idle_timeout");
    return saved ? parseInt(saved) : 15;
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    const saved = localStorage.getItem("siri_admin_audit_logs");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [
      { id: "log-1", actor: "SYSTEM", action: "INITIALIZE", details: "Enterprise Admin Workspace initiated", timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), status: "Success" },
      { id: "log-2", actor: "OWNER", action: "SECURITY_HEARTBEAT", details: "Inactivity daemon started successfully", timestamp: new Date(Date.now() - 3600000).toISOString(), status: "Success" }
    ];
  });

  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleSecondsLeft, setIdleSecondsLeft] = useState(30);

  const logAdminAction = useCallback((action, details, status = "Success") => {
    const actorName = localStorage.getItem("siri_admin_active_role") || "owner";
    const newLog = {
      id: `log-${Date.now()}`,
      actor: actorName.toUpperCase(),
      action,
      details,
      timestamp: new Date().toISOString(),
      status
    };
    setAuditLogs((prev) => {
      const updated = [newLog, ...prev].slice(0, 100);
      localStorage.setItem("siri_admin_audit_logs", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAuditLogs = useCallback(() => {
    setAuditLogs([]);
    localStorage.removeItem("siri_admin_audit_logs");
    toast.success("Audit trail log history cleared successfully.");
  }, []);

  const toggleSafetyLock = useCallback(() => {
    setSafetyLock((prev) => {
      const next = !prev;
      localStorage.setItem("siri_admin_safety_lock", next ? "true" : "false");
      logAdminAction("TOGGLE_SAFETY_LOCK", `Global safety write override lock set to ${next}`);
      toast.success(`Safety lock is now ${next ? "ACTIVE (Write Operations Blocked)" : "DISABLED"}`);
      return next;
    });
  }, [logAdminAction]);

  const toggleMaintenanceMode = useCallback(() => {
    setMaintenanceMode((prev) => {
      const next = !prev;
      localStorage.setItem("siri_admin_maintenance_mode", next ? "true" : "false");
      logAdminAction("TOGGLE_MAINTENANCE", `Global storefront maintenance mode set to ${next}`);
      toast.success(`Maintenance mode is now ${next ? "ENABLED" : "DISABLED"}`);
      return next;
    });
  }, [logAdminAction]);

  const changeActiveRole = useCallback((role) => {
    setActiveRole(role);
    localStorage.setItem("siri_admin_active_role", role);
    logAdminAction("ROLE_SWITCH", `Switched active preview role to ${role.toUpperCase()}`);
    toast.success(`Simulating '${role.toUpperCase()}' mode permissions`);
  }, [logAdminAction]);

  // ─── Idle Inactivity Heartbeat Daemon ───
  const lastActivityRef = useRef(Date.now());
  
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (showIdleWarning) {
        setShowIdleWarning(false);
        setIdleSecondsLeft(30);
      }
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - lastActivityRef.current;
      const elapsedSecs = Math.floor(elapsedMs / 1000);
      const totalTimeoutSecs = idleTimeoutMinutes * 60;
      const warningStartSecs = totalTimeoutSecs - 30;

      if (elapsedSecs >= totalTimeoutSecs) {
        clearInterval(interval);
        logAdminAction("SESSION_EXPIRED", "Inactivity timeout threshold exceeded, logging out");
        logout();
        toast.error("Session expired due to inactivity.", { duration: 8000 });
        window.location.href = "/auth";
      } else if (elapsedSecs >= warningStartSecs) {
        setShowIdleWarning(true);
        setIdleSecondsLeft(totalTimeoutSecs - elapsedSecs);
      } else {
        setShowIdleWarning(false);
      }
    }, 1000);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      clearInterval(interval);
    };
  }, [idleTimeoutMinutes, showIdleWarning, logout, logAdminAction]);

  // ─── Premium Dark Theme State ───
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem("siri_admin_theme_mode");
    return saved || "dark"; // Default to dark mode!
  });

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("siri_admin_theme_mode", next);
      return next;
    });
  }, []);

  // ─── Backend-Connected State ───
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [eventBookings, setEventBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPaletteOpen, setSearchPaletteOpen] = useState(false);

  // ─── Custom Categories & Themes State ───
  const [customCategories, setCustomCategories] = useState(loadCustomCategories);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(customCategories));
  }, [customCategories]);

  const addCustomCategory = useCallback((type, data) => {
    if (activeRole === "viewer") {
      toast.error("Viewer Role: Write operations are restricted!");
      return;
    }
    if (safetyLock) {
      toast.error("Safety Lock Active: Write operations are globally blocked!");
      return;
    }
    setCustomCategories(prev => {
      const next = { ...prev };
      const list = next[type] || [];
      const newCat = {
        id: `${type[0]}-${Date.now()}`,
        name: data.name,
        count: data.count || 0,
        image: data.image || "https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?q=80&w=600&auto=format&fit=crop",
        active: data.active !== undefined ? data.active : true,
        description: data.description || ""
      };
      next[type] = [newCat, ...list];
      logAdminAction("ADD_CATEGORY", `Added new category/theme '${data.name}' to ${type}`);
      toast.success(`${type === 'products' ? 'Product Category' : 'Event Theme'} added successfully!`);
      return next;
    });
  }, [activeRole, safetyLock, logAdminAction]);

  const updateCustomCategory = useCallback((type, id, data) => {
    if (activeRole === "viewer") {
      toast.error("Viewer Role: Write operations are restricted!");
      return;
    }
    if (safetyLock) {
      toast.error("Safety Lock Active: Write operations are globally blocked!");
      return;
    }
    setCustomCategories(prev => {
      const next = { ...prev };
      const list = next[type] || [];
      next[type] = list.map(item => item.id === id ? { ...item, ...data } : item);
      logAdminAction("UPDATE_CATEGORY", `Updated category/theme ID ${id}`);
      toast.success(`${type === 'products' ? 'Product Category' : 'Event Theme'} updated!`);
      return next;
    });
  }, [activeRole, safetyLock, logAdminAction]);

  const deleteCustomCategory = useCallback((type, id) => {
    if (activeRole === "viewer") {
      toast.error("Viewer Role: Write operations are restricted!");
      return;
    }
    if (safetyLock) {
      toast.error("Safety Lock Active: Write operations are globally blocked!");
      return;
    }
    setCustomCategories(prev => {
      const next = { ...prev };
      const list = next[type] || [];
      next[type] = list.filter(item => item.id !== id);
      logAdminAction("DELETE_CATEGORY", `Removed category/theme ID ${id}`);
      toast.success(`${type === 'products' ? 'Product Category' : 'Event Theme'} removed.`);
      return next;
    });
  }, [activeRole, safetyLock, logAdminAction]);

  // ─── Website Content CMS State ───
  const [websiteContent, setWebsiteContent] = useState(loadContent);
  const [contentHistory, setContentHistory] = useState([]);
  const [hasUnsavedContent, setHasUnsavedContent] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [publishToast, setPublishToast] = useState(null);

  // ─── Fetch Data from Backend on Mount ───
  useEffect(() => {
    const fetchAdminData = async () => {
      setDataLoading(true);
      try {
        const [productsRes, ordersRes, customersRes, reviewsRes, statsRes, eventsRes] =
          await Promise.allSettled([
            productService.getAll({ limit: 100 }),
            orderService.getAll({ limit: 50 }),
            userService.getAll({ limit: 50, role: "user" }),
            reviewService.getAll({ limit: 50 }),
            analyticsService.getDashboardStats(),
            eventService.getAll({ limit: 50 }),
          ]);

        if (productsRes.status === "fulfilled" && productsRes.value?.success) {
          const list = productsRes.value.data?.data || [];
          setProducts(list.map(mapDbProductToFrontend));
        }
        if (ordersRes.status === "fulfilled" && ordersRes.value?.success) {
          const list = ordersRes.value.data?.data || [];
          setOrders(list.map(mapDbOrderToFrontend));
        }
        if (customersRes.status === "fulfilled" && customersRes.value?.success) {
          const list = customersRes.value.data?.data || [];
          setCustomers(list.map(mapDbCustomerToFrontend));
        }
        if (reviewsRes.status === "fulfilled" && reviewsRes.value?.success) {
          setReviews(reviewsRes.value.data?.data || []);
        }
        if (statsRes.status === "fulfilled" && statsRes.value?.success) {
          setDashboardStats(statsRes.value.data);
        }
        if (eventsRes.status === "fulfilled" && eventsRes.value?.success) {
          const evData = eventsRes.value.data;
          const list = evData?.data || evData?.items || (Array.isArray(evData) ? evData : []);
          setEventBookings(list.map(mapDbEventToFrontend));
        }
      } catch (err) {
        console.error("Failed to load admin data:", err);
      } finally {
        setDataLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  // ─── Fetch CMS content from backend ───
  useEffect(() => {
    const fetchCMS = async () => {
      try {
        const response = await cmsService.getPublished();
        if (response.success && response.data && Object.keys(response.data).length > 0) {
          const merged = { ...initialWebsiteContent, ...response.data };
          setWebsiteContent(merged);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
      } catch (err) {
        console.warn("CMS API unavailable, using local data", err);
      }
    };
    fetchCMS();
  }, []);

  // Auto-save content to localStorage as draft
  useEffect(() => {
    if (hasUnsavedContent) {
      const timer = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(websiteContent));
        setLastSaved(new Date());
        setHasUnsavedContent(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [websiteContent, hasUnsavedContent]);

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);
  const toggleMobileSidebar = useCallback(
    () => setSidebarMobileOpen((p) => !p),
    [],
  );

  // ─── Product Actions (Backend-Connected) ───
  const deleteProduct = useCallback(async (productId) => {
    if (activeRole === "viewer") {
      toast.error("Viewer Role: Write operations are restricted!");
      return;
    }
    if (activeRole === "editor") {
      toast.error("Editor Role: Deleting catalog items is restricted!");
      return;
    }
    if (safetyLock) {
      toast.error("Safety Lock Active: Write operations are globally blocked!");
      return;
    }
    try {
      const res = await productService.delete(productId);
      if (res.success) {
        setProducts((prev) => prev.filter((p) => (p._id || p.id) !== productId));
        logAdminAction("DELETE_PRODUCT", `Deactivated product ID: ${productId}`);
        toast.success("Product deactivated");
      }
    } catch (err) {
      toast.error("Failed to delete product");
    }
  }, [activeRole, safetyLock, logAdminAction]);

  const toggleProductFeatured = useCallback(async (productId) => {
    if (activeRole === "viewer") {
      toast.error("Viewer Role: Write operations are restricted!");
      return;
    }
    if (safetyLock) {
      toast.error("Safety Lock Active: Write operations are globally blocked!");
      return;
    }
    try {
      const res = await productService.toggleFeatured(productId);
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) =>
            (p._id || p.id) === productId ? { ...p, featured: !p.featured } : p,
          ),
        );
        logAdminAction("TOGGLE_FEATURED", `Toggled featured status for product ID: ${productId}`);
        toast.success("Product featured status updated");
      }
    } catch (err) {
      toast.error("Failed to update product");
    }
  }, [activeRole, safetyLock, logAdminAction]);

  // ─── Order Actions (Backend-Connected) ───
  const updateOrderStatus = useCallback(async (orderId, newStatus, note, courierCharges) => {
    if (activeRole === "viewer") {
      toast.error("Viewer Role: Write operations are restricted!");
      return;
    }
    if (safetyLock) {
      toast.error("Safety Lock Active: Write operations are globally blocked!");
      return;
    }
    try {
      const res = await orderService.updateStatus(orderId, newStatus, note, courierCharges);
      if (res.success) {
        const mapped = res.data ? mapDbOrderToFrontend(res.data) : null;
        setOrders((prev) =>
          prev.map((o) => {
            if ((o.id || o._id) === orderId) {
              return mapped || { ...o, status: newStatus, orderStatus: newStatus };
            }
            return o;
          })
        );
        logAdminAction("UPDATE_ORDER", `Updated Order ID ${orderId} to status: ${newStatus}`);
        toast.success(`Order status updated to ${newStatus}`);
      }
    } catch (err) {
      toast.error("Failed to update order status");
    }
  }, [activeRole, safetyLock, logAdminAction]);

  // ─── Review Actions (Backend-Connected) ───
  const approveReview = useCallback(async (reviewId) => {
    if (activeRole === "viewer") {
      toast.error("Viewer Role: Write operations are restricted!");
      return;
    }
    if (activeRole === "editor") {
      toast.error("Editor Role: Moderating customer reviews is restricted!");
      return;
    }
    if (safetyLock) {
      toast.error("Safety Lock Active: Write operations are globally blocked!");
      return;
    }
    try {
      const res = await reviewService.updateStatus(reviewId, "approved");
      if (res.success) {
        setReviews((prev) =>
          prev.map((r) => ((r._id || r.id) === reviewId ? { ...r, status: "approved" } : r)),
        );
        logAdminAction("APPROVE_REVIEW", `Approved Review ID: ${reviewId}`);
        toast.success("Review approved");
      }
    } catch (err) {
      toast.error("Failed to approve review");
    }
  }, [activeRole, safetyLock, logAdminAction]);

  const markNotificationRead = useCallback((notifId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // ─── Website Content Actions (Backend-Connected) ───
  const updateContent = useCallback((section, data) => {
    setWebsiteContent((prev) => {
      const newContent = {
        ...prev,
        [section]: { ...prev[section], ...data, status: "modified" },
      };
      setContentHistory((h) => [
        ...h.slice(-19),
        { timestamp: new Date(), section, change: data },
      ]);
      setHasUnsavedContent(true);
      return newContent;
    });
  }, []);

  const updateNestedContent = useCallback((section, path, value) => {
    setWebsiteContent((prev) => {
      const newContent = structuredClone(prev);
      const keys = path.split(".");
      let obj = newContent[section];
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      newContent[section].status = "modified";
      setHasUnsavedContent(true);
      return newContent;
    });
  }, []);

  // Publish to BACKEND API
  const publishContent = useCallback(async (section) => {
    try {
      const sectionData = websiteContent[section];
      await cmsService.updateSection(section, sectionData);
      
      setWebsiteContent((prev) => {
        const next = {
          ...prev,
          [section]: { ...prev[section], status: "published" },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      setLastSaved(new Date());
      setPublishToast(`${section} published successfully!`);
      toast.success(`${section} published successfully!`);
      setTimeout(() => setPublishToast(null), 3000);
    } catch (err) {
      toast.error(`Failed to publish ${section}`);
    }
  }, [websiteContent]);

  // Publish ALL to BACKEND API (parallel with error reporting)
  const publishAllContent = useCallback(async () => {
    try {
      const sectionsToPublish = Object.entries(websiteContent).filter(
        ([, val]) => val?.status === "modified"
      );

      // Publish sections in parallel with error tracking
      const results = await Promise.allSettled(
        sectionsToPublish.map(([key, data]) => cmsService.updateSection(key, data))
      );
      
      const failedSections = [];
      results.forEach((result, idx) => {
        if (result.status === 'rejected') {
          failedSections.push(sectionsToPublish[idx][0]);
        }
      });

      // Then trigger publish-all on backend
      await cmsService.publishAll();

      setWebsiteContent((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          if (updated[key]?.status && !failedSections.includes(key)) {
            updated[key].status = "published";
          }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      setLastSaved(new Date());
      
      if (failedSections.length > 0) {
        toast.error(`Failed to publish: ${failedSections.join(", ")}`);
      } else {
        setPublishToast("All content published successfully!");
        toast.success("All content published successfully!");
      }
      setTimeout(() => setPublishToast(null), 3000);
    } catch (err) {
      toast.error("Failed to publish all content");
    }
  }, [websiteContent]);

  const resetContent = useCallback((section) => {
    setWebsiteContent((prev) => ({
      ...prev,
      [section]: initialWebsiteContent[section],
    }));
    setHasUnsavedContent(true);
  }, []);

  const resetAllContent = useCallback(() => {
    setWebsiteContent(initialWebsiteContent);
    localStorage.removeItem(STORAGE_KEY);
    setLastSaved(null);
    setHasUnsavedContent(false);
  }, []);

  // ─── Homepage Section Ordering ───
  const reorderHomepageSections = useCallback((fromIndex, toIndex) => {
    setWebsiteContent((prev) => {
      const sections = [...prev.homepageSections];
      const [moved] = sections.splice(fromIndex, 1);
      sections.splice(toIndex, 0, moved);
      setHasUnsavedContent(true);
      return { ...prev, homepageSections: sections };
    });
  }, []);

  const toggleHomepageSection = useCallback((sectionId) => {
    setWebsiteContent((prev) => ({
      ...prev,
      homepageSections: prev.homepageSections.map((s) =>
        s.id === sectionId ? { ...s, isVisible: !s.isVisible } : s,
      ),
    }));
    setHasUnsavedContent(true);
  }, []);

  // ─── Refresh functions for re-fetching data ───
  const refreshProducts = useCallback(async () => {
    try {
      const res = await productService.getAll({ limit: 100 });
      if (res.success) {
        const list = res.data?.data || [];
        setProducts(list.map(mapDbProductToFrontend));
      }
    } catch (err) { /* silent */ }
  }, []);

  const refreshOrders = useCallback(async () => {
    try {
      const res = await orderService.getAll({ limit: 50 });
      if (res.success) {
        const list = res.data?.data || [];
        setOrders(list.map(mapDbOrderToFrontend));
      }
    } catch (err) {
      console.warn('Orders refresh failed:', err);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      const res = await analyticsService.getDashboardStats();
      if (res.success) setDashboardStats(res.data);
    } catch (err) { /* silent */ }
  }, []);

  const refreshEvents = useCallback(async () => {
    try {
      const res = await eventService.getAll({ limit: 100 });
      if (res.success) {
        const evData = res.data;
        const list = evData?.data || evData?.items || (Array.isArray(evData) ? evData : []);
        setEventBookings(list.map(mapDbEventToFrontend));
      }
    } catch (err) { /* silent */ }
  }, []);

  return (
    <AdminContext.Provider
      value={{
        // Sidebar
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
        sidebarMobileOpen,
        setSidebarMobileOpen,
        toggleMobileSidebar,
        // Categories & Themes
        customCategories,
        addCustomCategory,
        updateCustomCategory,
        deleteCustomCategory,
        // Products
        products,
        setProducts,
        deleteProduct,
        toggleProductFeatured,
        refreshProducts,
        // Orders
        orders,
        updateOrderStatus,
        refreshOrders,
        // Customers
        customers,
        // Events
        eventBookings,
        refreshEvents,
        // Reviews
        reviews,
        approveReview,
        // Notifications
        notifications,
        unreadNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        // Dashboard
        dashboardStats,
        refreshDashboard,
        dataLoading,
        // Search
        searchQuery,
        setSearchQuery,
        searchPaletteOpen,
        setSearchPaletteOpen,
        // ─── Website Content CMS ───
        websiteContent,
        updateContent,
        updateNestedContent,
        publishContent,
        publishAllContent,
        resetContent,
        resetAllContent,
        hasUnsavedContent,
        lastSaved,
        publishToast,
        contentHistory,
        // Homepage sections
        reorderHomepageSections,
        toggleHomepageSection,
        // Premium Dark Theme
        themeMode,
        toggleTheme,
        // SaaS Simulation & Security
        activeRole,
        changeActiveRole,
        safetyLock,
        toggleSafetyLock,
        maintenanceMode,
        toggleMaintenanceMode,
        idleTimeoutMinutes,
        setIdleTimeoutMinutes,
        auditLogs,
        logAdminAction,
        clearAuditLogs,
        showIdleWarning,
        setShowIdleWarning,
        idleSecondsLeft,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
};
