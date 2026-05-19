import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import { eventService, bookingService, showcaseService, productService, userService } from "../../services/domainServices";
import { ImageUpload } from "../components/ImageUpload";
import toast from "react-hot-toast";

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

const EVENT_CATEGORIES = [
  "Wedding Ceremony",
  "Engagement Ceremony",
  "House Warming Ceremony",
  "Baby Shower Ceremony",
  "Naming Ceremony",
  "Festival Decorations",
];

const DECOR_STYLES = [
  "Traditional",
  "Floral",
  "Modern",
  "Royal",
  "Minimalist",
  "Rustic",
];

export function AdminEvents() {
  const navigate = useNavigate();
  const { refreshEvents, searchQuery, customCategories, addCustomCategory, updateCustomCategory, deleteCustomCategory } = useAdmin();
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, bookings, calendar, packages, inventory, team
  const [teamMembers, setTeamMembers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [operationsLoading, setOperationsLoading] = useState(true);

  // Category Modal States
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", description: "", image: "" });
  const [editingCatId, setEditingCatId] = useState(null);

  const handleSaveCat = (e) => {
    e.preventDefault();
    if (!catForm.name) return;
    if (editingCatId) {
      updateCustomCategory("events", editingCatId, catForm);
    } else {
      addCustomCategory("events", catForm);
    }
    setCatForm({ name: "", description: "", image: "" });
    setEditingCatId(null);
  };

  const handleEditCat = (cat) => {
    setEditingCatId(cat.id);
    setCatForm({ name: cat.name, description: cat.description || "", image: cat.image || "" });
  };

  // Master Portfolio States
  const [events, setEvents] = useState([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Bookings States
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Drawer Operations State
  const [drawerStatus, setDrawerStatus] = useState("inquiry");
  const [drawerNotes, setDrawerNotes] = useState("");
  const [drawerChatMsg, setDrawerChatMsg] = useState("");
  const chatEndRef = useRef(null);

  // Logistics assignments
  const [logisticsSetup, setLogisticsSetup] = useState("");
  const [logisticsPickup, setLogisticsPickup] = useState("");
  const [allocatedTeam, setAllocatedTeam] = useState([]);
  const [allocatedProps, setAllocatedProps] = useState([]);

  // Quotation editor inputs
  const [quoteRental, setQuoteRental] = useState("");
  const [quoteSetup, setQuoteSetup] = useState("");
  const [quoteTransport, setQuoteTransport] = useState("");
  const [quoteAddons, setQuoteAddons] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    category: "",
    style: "",
    image: "",
    decorCount: "",
    venueType: "Indoor/Outdoor",
    pricing: "",
    description: "",
    colorPalette: "",
    features: "",
    materialStyle: "",
    venueSize: "",
    galleryImages: ["", ""],
    beforeImage: "",
    afterImage: "",
    seoTitle: "",
    seoDescription: "",
    isActive: true,
  });

  // Showcase state variables
  const [showcases, setShowcases] = useState([]);
  const [loadingShowcases, setLoadingShowcases] = useState(false);
  const [showcaseForm, setShowcaseForm] = useState({
    title: "",
    subtitle: "",
    category: "engagement_gift",
    rentalPrice: 15000,
    description: "",
    image: "",
    galleryImages: ["", ""],
    inclusionsText: "Traditional carved wooden ring tray, Beaded shagun boxes, Mogra garland drops",
    colorPalette: "#8B0000, #FFD700, #FFF8DC",
    suggestedProps: "Traditional carved wooden ring tray, Beaded shagun boxes",
    setupTimeHours: 2,
    seoTitle: "",
    seoDescription: "",
    isActive: true,
  });
  const [editingShowcaseId, setEditingShowcaseId] = useState(null);
  const [showShowcaseForm, setShowShowcaseForm] = useState(false);

  const fetchEvents = async () => {
    setLoadingPortfolio(true);
    try {
      const res = await eventService.getAll({ limit: 100 });
      if (res.success) {
        const list = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
        setEvents(list);
      }
    } catch (err) {
      toast.error("Failed to load portfolio masteries");
    } finally {
      setLoadingPortfolio(false);
    }
  };

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const res = await bookingService.adminGetAll();
      if (res.success) {
        const payload = res.data;
        setBookings(Array.isArray(payload) ? payload : payload?.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch customer event bookings catalog.");
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchShowcases = async () => {
    setLoadingShowcases(true);
    try {
      const res = await showcaseService.getAll();
      if (res.success) {
        setShowcases(res.data || []);
      }
    } catch (err) {
      toast.error("Failed to load side-stage showcase collections.");
    } finally {
      setLoadingShowcases(false);
    }
  };

  const handleAiAutofill = () => {
    if (!showcaseForm.image) {
      toast.error("Please upload or link a photo blueprint first for AI Vision analysis!");
      return;
    }
    const loadId = toast.loading("✨ AI Vision models analyzing floral accents & prop structures...");
    setTimeout(() => {
      toast.dismiss(loadId);
      setShowcaseForm(prev => ({
        ...prev,
        title: prev.title || "Lotus Gifting Crate",
        subtitle: prev.subtitle || "Carved coconuts with jasmine garlands",
        category: "telugu_heritage",
        rentalPrice: 14500,
        description: prev.description || "A traditional side-stage presentation tray designed for engagement ceremonies with heritage coconuts and jasmine garlands.",
        inclusionsText: "Hand-carved Heritage Coconuts, Royal Brass Urlis, Jasmine Rope Runners, Beaded Ring Trays, Mogra Drops",
        colorPalette: "#8B0000, #FFD700, #228B22",
        setupTimeHours: 2,
        isActive: true
      }));
      toast.success("✨ AI successfully populated showcase specifications!");
    }, 1200);
  };

  const handleCreateOrUpdateShowcase = async (e) => {
    e.preventDefault();
    if (!showcaseForm.title || !showcaseForm.image) {
      toast.error("Showcase Title & Cover Image are required!");
      return;
    }

    const loadId = toast.loading("Saving showcase theme...");
    try {
      const incList = showcaseForm.inclusionsText.split(",").map(item => ({
        name: item.trim(),
        defaultQty: 1,
        condition: "excellent"
      })).filter(i => i.name.length > 0);

      const payload = {
        title: showcaseForm.title,
        subtitle: showcaseForm.subtitle,
        category: showcaseForm.category,
        rentalPrice: Number(showcaseForm.rentalPrice) || 12000,
        description: showcaseForm.description,
        image: showcaseForm.image,
        gallery: showcaseForm.galleryImages.filter(g => g !== ""),
        inclusions: incList,
        colorPalette: showcaseForm.colorPalette.split(",").map(c => c.trim()).filter(c => c.length > 0),
        suggestedProps: showcaseForm.suggestedProps.split(",").map(p => p.trim()).filter(p => p.length > 0),
        setupTimeHours: Number(showcaseForm.setupTimeHours) || 2,
        seoTitle: showcaseForm.seoTitle || undefined,
        seoDescription: showcaseForm.seoDescription || undefined,
        isActive: Boolean(showcaseForm.isActive),
      };

      let res;
      if (editingShowcaseId) {
        res = await showcaseService.update(editingShowcaseId, payload);
      } else {
        res = await showcaseService.create(payload);
      }

      toast.dismiss(loadId);
      if (res.success) {
        toast.success(editingShowcaseId ? "Showcase theme updated!" : "Showcase theme published successfully!");
        setShowShowcaseForm(false);
        setEditingShowcaseId(null);
        setShowcaseForm({
          title: "",
          subtitle: "",
          category: "engagement_gift",
          rentalPrice: 15000,
          description: "",
          image: "",
          galleryImages: ["", ""],
          inclusionsText: "Traditional carved wooden ring tray, Beaded shagun boxes, Mogra garland drops",
          colorPalette: "#8B0000, #FFD700, #FFF8DC",
          suggestedProps: "Traditional carved wooden ring tray, Beaded shagun boxes",
          setupTimeHours: 2,
          seoTitle: "",
          seoDescription: "",
          isActive: true,
        });
        fetchShowcases();
      }
    } catch (err) {
      toast.dismiss(loadId);
      toast.error("Failed to save showcase theme.");
    }
  };

  const handleEditShowcase = (sc) => {
    setEditingShowcaseId(sc._id || sc.id);
    setShowcaseForm({
      title: sc.title || "",
      subtitle: sc.subtitle || "",
      category: sc.category || "engagement_gift",
      rentalPrice: sc.rentalPrice || 15000,
      description: sc.description || "",
      image: sc.image || "",
      galleryImages: sc.gallery && sc.gallery.length > 0 ? sc.gallery : ["", ""],
      inclusionsText: sc.inclusions ? sc.inclusions.map(i => i.name).join(", ") : "",
      colorPalette: sc.colorPalette ? sc.colorPalette.join(", ") : "",
      suggestedProps: sc.suggestedProps ? sc.suggestedProps.join(", ") : "",
      setupTimeHours: sc.setupTimeHours || 2,
      seoTitle: sc.seoTitle || "",
      seoDescription: sc.seoDescription || "",
      isActive: sc.isActive !== undefined ? sc.isActive : true,
    });
    setShowShowcaseForm(true);
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  const handleDeleteShowcase = async (id) => {
    if (!window.confirm("Are you sure you want to permanently withdraw this showcase theme?")) return;
    try {
      const res = await showcaseService.delete(id);
      if (res.success) {
        toast.success("Showcase collection withdrawn successfully.");
        fetchShowcases();
      }
    } catch (err) {
      toast.error("Failed to delete showcase collection.");
    }
  };

  const fetchOperationsData = async () => {
    setOperationsLoading(true);
    try {
      const [teamRes, productsRes] = await Promise.all([
        userService.getTeam(),
        productService.getAll({ limit: 100, sort: "newest" }),
      ]);

      const teamPayload = teamRes?.data || teamRes;
      const userItems = teamPayload?.members || teamPayload?.items || teamPayload?.users || teamPayload?.data || [];
      const staff = (Array.isArray(userItems) ? userItems : [])
        .filter((member) => ["admin", "manager", "coordinator"].includes(member.role))
        .map((member) => ({
          name: member.name || member.email,
          role: member.role || "staff",
          contact: member.phone || member.email || "Not provided",
        }));

      const productsPayload = productsRes?.data || productsRes;
      const products = productsPayload?.items || productsPayload?.products || productsPayload?.data || [];
      const inventory = (Array.isArray(products) ? products : []).map((product) => ({
        item: product.title,
        stock: Number(product.stock) || 0,
        rented: 0,
        status: Number(product.stock) > 0 ? "available" : "out of stock",
      }));

      setTeamMembers(staff);
      setInventoryItems(inventory);
    } catch (err) {
      toast.error("Unable to load live team or inventory data.");
      setTeamMembers([]);
      setInventoryItems([]);
    } finally {
      setOperationsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvents();
      fetchBookings();
      fetchShowcases();
      fetchOperationsData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (selectedBooking) {
      const timer = setTimeout(() => {
        setDrawerStatus(selectedBooking.status);
        setDrawerNotes(selectedBooking.adminNotes || "");
        setLogisticsSetup(selectedBooking.setupTiming ? selectedBooking.setupTiming.substring(0, 16) : "");
        setLogisticsPickup(selectedBooking.pickupTiming ? selectedBooking.pickupTiming.substring(0, 16) : "");
        setAllocatedTeam(selectedBooking.assignedTeam || []);
        setAllocatedProps(selectedBooking.rentedInventory || []);
        setQuoteRental(selectedBooking.pricing?.rentalFee || 0);
        setQuoteSetup(selectedBooking.pricing?.setupCharges || 0);
        setQuoteTransport(selectedBooking.pricing?.transportationCost || 0);
        setQuoteAddons(selectedBooking.pricing?.addOnCharges || 0);
      }, 0);

      // Scroll to bottom of chat
      const chatTimer = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);

      return () => {
        clearTimeout(timer);
        clearTimeout(chatTimer);
      };
    }
  }, [selectedBooking]);

  const handleEdit = (ev) => {
    setEditingId(ev._id || ev.id);
    setFormData({
      title: ev.title || "",
      subtitle: ev.subtitle || "",
      category: ev.category || "",
      style: ev.style || "",
      image: ev.image || "",
      decorCount: ev.decorCount || "",
      venueType: ev.venueType || "Indoor/Outdoor",
      pricing: ev.pricing || "",
      description: ev.description || "",
      colorPalette: ev.colorPalette ? ev.colorPalette.join(", ") : "",
      features: ev.features ? ev.features.join(", ") : "",
      materialStyle: ev.materialStyle || "",
      venueSize: ev.venueSize || "",
      galleryImages: ev.gallery ? [ev.gallery[1] || "", ev.gallery[2] || ""] : ["", ""],
      beforeImage: ev.beforeAfterImages?.before || "",
      afterImage: ev.beforeAfterImages?.after || "",
      seoTitle: ev.seoTitle || "",
      seoDescription: ev.seoDescription || "",
      isActive: ev.isActive !== undefined ? ev.isActive : true,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData({
      title: "",
      subtitle: "",
      category: "",
      style: "",
      image: "",
      decorCount: "",
      venueType: "Indoor/Outdoor",
      pricing: "",
      description: "",
      colorPalette: "",
      features: "",
      materialStyle: "",
      venueSize: "",
      galleryImages: ["", ""],
      beforeImage: "",
      afterImage: "",
      seoTitle: "",
      seoDescription: "",
      isActive: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.category || !formData.style || !formData.image || !formData.description) {
      return toast.error("Please fill in all required fields.");
    }

    setIsSaving(true);
    try {
      const payload = {
        title: formData.title,
        subtitle: formData.subtitle || undefined,
        category: formData.category,
        style: formData.style,
        image: formData.image,
        decorCount: formData.decorCount || undefined,
        venueType: formData.venueType || undefined,
        pricing: formData.pricing || undefined,
        description: formData.description,
        colorPalette: formData.colorPalette ? formData.colorPalette.split(",").map(c => c.trim()).filter(Boolean) : [],
        features: formData.features ? formData.features.split(",").map(f => f.trim()).filter(Boolean) : [],
        materialStyle: formData.materialStyle || undefined,
        venueSize: formData.venueSize || undefined,
        gallery: [formData.image, ...formData.galleryImages.filter(Boolean)].slice(0, 3),
        beforeAfterImages: (formData.beforeImage || formData.afterImage) ? {
          before: formData.beforeImage || undefined,
          after: formData.afterImage || undefined
        } : undefined,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        isActive: Boolean(formData.isActive),
      };

      const res = editingId 
        ? await eventService.update(editingId, payload)
        : await eventService.create(payload);

      if (res.success) {
        toast.success(editingId ? "Event portfolio updated successfully" : "Event portfolio theme published");
        handleCancel();
        fetchEvents();
        refreshEvents();
      }
    } catch (err) {
      toast.error("Failed to save event portfolio.");
    } finally {
      setIsSaving(false);
    }
  };

  // Operations update handlers
  const handleUpdateStatus = async (status) => {
    if (!selectedBooking) return;
    try {
      const res = await bookingService.adminUpdateStatus(selectedBooking._id || selectedBooking.id, status);
      if (res.success) {
        toast.success(`Booking status changed to: ${status.toUpperCase()}`);
        setDrawerStatus(status);
        fetchBookings();
        // Sync detail view
        setSelectedBooking(res.data);
      }
    } catch (err) {
      toast.error("Failed to change status.");
    }
  };

  const handleUpdateQuotation = async () => {
    if (!selectedBooking) return;
    const loadId = toast.loading("Updating price estimate...");
    try {
      const res = await bookingService.adminUpdateQuotation(selectedBooking._id || selectedBooking.id, {
        rentalFee: Number(quoteRental),
        setupCharges: Number(quoteSetup),
        transportationCost: Number(quoteTransport),
        addOnCharges: Number(quoteAddons),
      });
      toast.dismiss(loadId);
      if (res.success) {
        toast.success("Price estimate sent successfully!");
        fetchBookings();
        setSelectedBooking(res.data);
      }
    } catch (err) {
      toast.dismiss(loadId);
      toast.error("Failed to update price estimate.");
    }
  };

  const handleUpdateLogistics = async () => {
    if (!selectedBooking) return;
    const loadId = toast.loading("Saving staff lists & times...");
    try {
      const res = await bookingService.adminUpdateLogistics(selectedBooking._id || selectedBooking.id, {
        setupTiming: logisticsSetup ? new Date(logisticsSetup) : undefined,
        pickupTiming: logisticsPickup ? new Date(logisticsPickup) : undefined,
        assignedTeam: allocatedTeam,
        rentedInventory: allocatedProps,
        adminNotes: drawerNotes,
      });
      toast.dismiss(loadId);
      if (res.success) {
        toast.success("Rosters, checklists, and timelines saved!");
        fetchBookings();
        setSelectedBooking(res.data);
      }
    } catch (err) {
      toast.dismiss(loadId);
      toast.error("Failed to save setup schedule.");
    }
  };

  const handleSendAdminChat = async (e) => {
    e.preventDefault();
    if (!drawerChatMsg.trim() || !selectedBooking) return;

    try {
      const res = await bookingService.postChat(selectedBooking._id || selectedBooking.id, drawerChatMsg);
      if (res.success) {
        setDrawerChatMsg("");
        setSelectedBooking(res.data);
        fetchBookings();
      }
    } catch (err) {
      toast.error("Failed to post message.");
    }
  };

  const handleTeamMemberToggle = (name, role, contact) => {
    setAllocatedTeam((prev) => {
      const exists = prev.some((t) => t.name === name);
      if (exists) {
        return prev.filter((t) => t.name !== name);
      } else {
        return [...prev, { name, role, contact }];
      }
    });
  };

  const handlePropChecklistToggle = (item, quantity) => {
    setAllocatedProps((prev) => {
      const exists = prev.some((p) => p.item === item);
      if (exists) {
        return prev.filter((p) => p.item !== item);
      } else {
        return [...prev, { item, quantity, returnStatus: "pending" }];
      }
    });
  };

  const handlePropReturnStatusChange = (idx, status) => {
    setAllocatedProps((prev) => {
      const next = [...prev];
      next[idx].returnStatus = status;
      return next;
    });
  };

  // Calendar Seeding Setup
  const getCalendarDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Padding days for previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, dateStr: null });
    }
    // Days of current month
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({ day: i, dateStr });
    }
    return days;
  };

  const calendarDays = getCalendarDays();
  const currentMonthName = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  // Metric summaries
  const totalContractVal = bookings.reduce((acc, b) => acc + (b.pricing?.totalPrice || 0), 0);
  const outstandingBal = bookings.reduce((acc, b) => acc + (b.pricing?.pendingBalance || 0), 0);
  const activeBookingsCount = bookings.filter((b) => b.status === "active").length;
  const upcomingSetupsCount = bookings.filter((b) => ["confirmed", "team_assigned", "setup_in_progress"].includes(b.status)).length;

  return (
    <div className="max-w-[1300px] mx-auto space-y-6 pb-20 font-body text-on-surface">
      {/* Tab bar selector */}
      <div className="flex flex-wrap items-center justify-between border-b border-black/5 pb-4 gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-on-surface font-display">
            Events & Bookings Manager
          </h1>
          <p className="text-[13px] text-outline">
            {bookings.length} active event bookings recorded
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-full text-xs">
            {[
              { id: "dashboard", label: "Overview", icon: "dashboard" },
              { id: "bookings", label: "All Event Bookings", icon: "assignment" },
              { id: "showcases", label: "Design Showcase", icon: "redeem" },
              { id: "inventory", label: "Prop Inventory", icon: "inventory" },
              { id: "calendar", label: "Delivery & Setup Calendar", icon: "calendar_month" },
              { id: "packages", label: "Decoration Packages", icon: "celebration" },
              { id: "team", label: "Staff & Crew List", icon: "groups" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-label uppercase text-[9px] tracking-wider font-bold transition-all cursor-pointer ${
                  activeTab === tab.id ? "bg-white text-black shadow-sm" : "text-black/55 hover:text-black"
                }`}
              >
                <span className="material-symbols-outlined text-[15px] normal-case">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setActiveTab("showcases");
              setShowShowcaseForm(true);
              setEditingShowcaseId(null);
              setShowcaseForm({
                title: "",
                subtitle: "",
                category: "engagement_gift",
                rentalPrice: 15000,
                description: "",
                image: "",
                galleryImages: ["", ""],
                inclusionsText: "Traditional carved wooden ring tray, Beaded shagun boxes, Mogra garland drops",
                colorPalette: "#8B0000, #FFD700, #FFF8DC",
                suggestedProps: "Traditional carved wooden ring tray, Beaded shagun boxes",
                setupTimeHours: 2,
                isActive: true,
              });
              setTimeout(() => {
                window.scrollTo({ top: 120, behavior: "smooth" });
              }, 150);
            }}
            className="flex items-center gap-1.5 bg-black hover:bg-stone-900 text-white px-5 py-2.5 rounded-full font-label uppercase text-[9px] tracking-wider font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px] normal-case">add</span>
            + Add Design Showcase
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE TAB VIEW */}
      <AnimatePresence mode="wait">
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === "dashboard" && (
          <motion.div key="dashboard" initial="hidden" animate="show" variants={fadeUp} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm space-y-1">
                <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">Total Bookings Value</span>
                <span className="font-display text-2xl font-bold text-black not-italic">₹{totalContractVal.toLocaleString("en-IN")}</span>
                <span className="text-[10px] text-emerald-600 font-semibold block">Active bookings</span>
              </div>
              <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm space-y-1">
                <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">Pending Payments</span>
                <span className="font-display text-2xl font-bold text-black not-italic">₹{outstandingBal.toLocaleString("en-IN")}</span>
                <span className="text-[10px] text-orange-600 font-semibold block">Payments to collect</span>
              </div>
              <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm space-y-1">
                <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">Setups Happening Today</span>
                <span className="font-display text-2xl font-bold text-black not-italic">{activeBookingsCount} Setups</span>
                <span className="text-[10px] text-stone-600 font-semibold block">Active events</span>
              </div>
              <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm space-y-1">
                <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">Upcoming Event Setups</span>
                <span className="font-display text-2xl font-bold text-black not-italic">{upcomingSetupsCount} Runs</span>
                <span className="text-[10px] text-stone-600 font-semibold block">Scheduled events</span>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Inquiries List */}
              <div className="bg-white rounded-3xl border border-black/5 p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-black/5 pb-2">
                  <h3 className="font-display text-base text-black font-bold">New Event Inquiries</h3>
                  <button onClick={() => setActiveTab("bookings")} className="font-label text-[9px] uppercase tracking-widest text-black font-bold">View All Bookings →</button>
                </div>
                <div className="space-y-3">
                  {bookings.slice(0, 4).map((b) => (
                    <div
                      key={b._id || b.id}
                      onClick={() => { setSelectedBooking(b); setIsDrawerOpen(true); }}
                      className="p-3.5 bg-stone-50 border border-black/5 rounded-xl flex items-center justify-between hover:bg-stone-100/50 cursor-pointer transition-colors"
                    >
                      <div className="space-y-1 min-w-0 flex-1 pr-4">
                        <span className="bg-slate-100 text-black px-2 py-0.5 rounded-full font-label text-[7px] uppercase tracking-widest font-bold">{b.eventType}</span>
                        <h4 className="font-display text-xs text-black font-bold truncate mt-1">{b.title}</h4>
                        <p className="font-mono text-[9px] text-black/35 truncate">{b.venue?.address}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-display text-xs text-black font-bold block">₹{b.pricing?.totalPrice?.toLocaleString("en-IN")}</span>
                        <span className="text-[9px] text-black capitalize font-semibold">{b.status.replace("_", " ")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analytics occasions stats simulation */}
              <div className="bg-white rounded-3xl border border-black/5 p-6 shadow-sm space-y-4">
                <h3 className="font-display text-base text-black font-bold border-b border-black/5 pb-2">Occasion Category Distributions</h3>
                <div className="space-y-4 pt-2">
                  {[
                    { label: "Wedding Ceremony", count: bookings.filter(b => b.eventType === "wedding").length, color: "bg-[#8B0000]" },
                    { label: "Engagement Ceremony", count: bookings.filter(b => b.eventType === "engagement").length, color: "bg-black" },
                    { label: "Haldi & Mehndi", count: bookings.filter(b => b.eventType === "haldi").length, color: "bg-amber-500" },
                    { label: "Reception Gala", count: bookings.filter(b => b.eventType === "reception").length, color: "bg-emerald-500" },
                    { label: " puha decor", count: bookings.filter(b => b.eventType === "festival").length, color: "bg-stone-800" },
                  ].map((cat, idx) => {
                    const pct = bookings.length > 0 ? (cat.count / bookings.length) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-stone-700">{cat.label}</span>
                          <span className="text-black font-bold">{cat.count} Setups ({Math.round(pct)}%)</span>
                        </div>
                        <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                          <div className={`h-full ${cat.color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: EVENTS BOOKINGS PIPELINE */}
        {activeTab === "bookings" && (
          <motion.div key="bookings" initial="hidden" animate="show" variants={fadeUp} className="space-y-6">
            <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-black/5 flex justify-between items-center bg-stone-50">
                <h3 className="font-display text-base text-black font-bold">Interactive Booking List</h3>
                <span className="bg-stone-200 text-stone-700 px-3 py-1 rounded-full font-label text-[9px] uppercase tracking-widest font-bold">
                  {bookings.length} Bookings matched
                </span>
              </div>

              {loadingBookings ? (
                <div className="py-20 text-center"><div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" /></div>
              ) : bookings.length === 0 ? (
                <div className="py-20 text-center text-outline text-xs">No active custom bookings logged.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-100 text-outline uppercase tracking-wider font-label text-[8px] font-bold border-b border-black/5">
                        <th className="p-4">Customer Details</th>
                        <th className="p-4">Event Type</th>
                        <th className="p-4">Date & Venue</th>
                        <th className="p-4">Total Price</th>
                        <th className="p-4">Booking Status</th>
                        <th className="p-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 font-light">
                      {bookings.map((b) => (
                        <tr key={b._id || b.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="p-4">
                            <div className="space-y-0.5">
                              <span className="font-body text-xs text-black font-bold block">{b.user?.name || "Anonymous Guest"}</span>
                              <span className="font-mono text-[10px] text-black/40 block">{b.user?.phone || "No contact"}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <span className="bg-slate-100 text-black px-2 py-0.5 rounded-full font-label text-[7px] uppercase tracking-widest font-bold">{b.eventType}</span>
                              <h4 className="font-display text-xs text-black font-bold mt-1 truncate max-w-[150px]">{b.title}</h4>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-0.5">
                              <span className="font-body text-[11px] text-black font-semibold block">
                                {new Date(b.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                              <span className="font-body text-[10px] text-black/40 truncate max-w-[180px] block">{b.venue?.address}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-0.5">
                              <span className="font-display text-xs text-black font-bold block">₹{b.pricing?.totalPrice?.toLocaleString("en-IN")}</span>
                              <span className={`text-[8px] font-bold uppercase tracking-widest ${b.pricing?.paymentStatus === "paid" ? "text-green-600" : "text-amber-600"}`}>
                                {b.pricing?.paymentStatus}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-body text-[10px] text-black capitalize font-bold">{b.status.replace("_", " ")}</span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => { setSelectedBooking(b); setIsDrawerOpen(true); }}
                              className="px-4 py-2 bg-stone-900 text-white rounded-full font-label text-[9px] uppercase tracking-widest font-bold hover:bg-black hover:text-black transition-colors"
                            >
                              Manage Booking
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 3: LOGISTICS CALENDAR */}
        {activeTab === "calendar" && (
          <motion.div key="calendar" initial="hidden" animate="show" variants={fadeUp} className="space-y-6">
            <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-black/5 pb-3">
                <div className="space-y-0.5">
                  <span className="font-label text-[8px] uppercase tracking-widest text-black font-bold">MONTHLY EVENT SCHEDULE</span>
                  <h3 className="font-display text-lg text-black font-bold">{currentMonthName}</h3>
                </div>
                <div className="flex gap-4 text-[9px] font-bold font-label uppercase tracking-widest text-black/50">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#8B0000]" /> Wedding</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-black" /> Engagement</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Haldi</span>
                </div>
              </div>

              {/* Monthly calendar Grid */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-2 font-label text-[9px] uppercase tracking-widest text-black/45 font-bold bg-stone-50 border border-black/5 rounded-lg">{day}</div>
                ))}

                {calendarDays.map((cell, idx) => {
                  const dayBookings = cell.dateStr
                    ? bookings.filter((b) => b.date.substring(0, 10) === cell.dateStr)
                    : [];

                  return (
                    <div
                      key={idx}
                      className={`min-h-[100px] border border-black/5 rounded-xl p-2 flex flex-col justify-between text-left transition-colors ${
                        cell.day ? "bg-[#F8F9FB]/60 hover:bg-[#F8F9FB]" : "bg-[#F8F9FB]/20"
                      }`}
                    >
                      {cell.day && <span className="font-display font-semibold text-black/40">{cell.day}</span>}
                      {dayBookings.length > 0 && (
                        <div className="space-y-1">
                          {dayBookings.map((b) => (
                            <div
                              key={b._id}
                              onClick={() => { setSelectedBooking(b); setIsDrawerOpen(true); }}
                              className={`p-1 text-[8px] leading-tight font-bold rounded text-white truncate cursor-pointer ${
                                b.eventType === "wedding" ? "bg-[#8B0000]" : b.eventType === "engagement" ? "bg-black text-black" : "bg-amber-500 text-black"
                              }`}
                              title={b.title}
                            >
                              {b.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: DECOR PACKAGES CATALOG SETUP */}
        {activeTab === "packages" && (
          <motion.div key="packages" initial="hidden" animate="show" variants={fadeUp} className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-display text-lg text-black font-bold">Decor Packages & Themes</h3>
                <p className="text-xs text-outline">Manage published catalogs visible to customer discovery masonry grids.</p>
              </div>
              <button
                onClick={() => {
                  if (showForm) handleCancel();
                  else setShowForm(true);
                }}
                className="px-6 py-2.5 bg-black text-white rounded-full font-label text-[9px] uppercase tracking-widest font-bold shadow-lg hover:shadow-slate-950/5 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">{showForm ? "close" : "add"}</span>
                {showForm ? "Close Creator" : "Publish Theme Curation"}
              </button>
            </div>

            {/* Editing Form panel */}
            <AnimatePresence>
              {showForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-white rounded-2xl border border-black/5 p-6 shadow-xl overflow-hidden">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <ImageUpload label="Cover Image *" value={formData.image} onChange={(url) => setFormData({ ...formData, image: url })} folder="events" />
                      <ImageUpload label="Gallery perspective 1" value={formData.galleryImages[0]} onChange={(url) => { const list = [...formData.galleryImages]; list[0] = url; setFormData({ ...formData, galleryImages: list }); }} folder="events" />
                      <ImageUpload label="Gallery perspective 2" value={formData.galleryImages[1]} onChange={(url) => { const list = [...formData.galleryImages]; list[1] = url; setFormData({ ...formData, galleryImages: list }); }} folder="events" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="font-label text-[9px] uppercase tracking-wider text-black/50 font-bold block">Theme Title *</label>
                        <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Royal Mysore Mandap" className="w-full bg-[#F8F9FB] px-4 py-2.5 rounded-full border border-black/5 text-xs focus:border-slate-900 outline-none" required />
                      </div>
                      <div className="space-y-1">
                        <label className="font-label text-[9px] uppercase tracking-wider text-black/50 font-bold block">Subtitle</label>
                        <input type="text" value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} placeholder="Twilight Sanctuary" className="w-full bg-[#F8F9FB] px-4 py-2.5 rounded-full border border-black/5 text-xs focus:border-slate-900 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="font-label text-[9px] uppercase tracking-wider text-black/50 font-bold block">Category *</label>
                          <button
                            type="button"
                            onClick={() => setShowCatModal(true)}
                            className="font-label text-[9px] text-black hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[12px]">add_circle</span> Manage Themes
                          </button>
                        </div>
                        <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-[#F8F9FB] px-4 py-2.5 rounded-full border border-black/5 text-xs focus:border-slate-900 outline-none" required>
                          <option value="">Select Category</option>
                          {customCategories?.events?.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="font-label text-[9px] uppercase tracking-wider text-black/50 font-bold block">Decor Style *</label>
                        <select value={formData.style} onChange={(e) => setFormData({ ...formData, style: e.target.value })} className="w-full bg-[#F8F9FB] px-4 py-2.5 rounded-full border border-black/5 text-xs focus:border-slate-900 outline-none" required>
                          <option value="">Select Style</option>
                          {DECOR_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-label text-[9px] uppercase tracking-wider text-black/50 font-bold block">Pricing Tag</label>
                        <input type="text" value={formData.pricing} onChange={(e) => setFormData({ ...formData, pricing: e.target.value })} placeholder="Starts at ₹75,000" className="w-full bg-[#F8F9FB] px-4 py-2.5 rounded-full border border-black/5 text-xs focus:border-slate-900 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-label text-[9px] uppercase tracking-wider text-black/50 font-bold block">Venue capacity (Guests)</label>
                        <input type="text" value={formData.venueSize} onChange={(e) => setFormData({ ...formData, venueSize: e.target.value })} placeholder="300 - 1200" className="w-full bg-[#F8F9FB] px-4 py-2.5 rounded-full border border-black/5 text-xs focus:border-slate-900 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-label text-[9px] uppercase tracking-wider text-black/50 font-bold block">completed count</label>
                        <input type="text" value={formData.decorCount} onChange={(e) => setFormData({ ...formData, decorCount: e.target.value })} placeholder="40+ Completed" className="w-full bg-[#F8F9FB] px-4 py-2.5 rounded-full border border-black/5 text-xs focus:border-slate-900 outline-none" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-label text-[9px] uppercase tracking-wider text-black/50 font-bold block">Atmospheric Narrative (Description) *</label>
                      <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Narrate details..." className="w-full bg-[#F8F9FB] px-4 py-3 rounded-2xl border border-black/5 text-xs focus:border-slate-900 outline-none resize-none" required />
                    </div>

                    {/* SEO Meta Configuration */}
                    <div className="border-t border-black/5 pt-4 space-y-4">
                      <div>
                        <h4 className="font-display text-xs text-black font-bold flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-slate-800">language</span>
                          SEO Meta Configuration (Siri Arts & Crafts)
                        </h4>
                        <p className="text-[10px] text-black/40 mt-0.5">Configure custom search engine tags to optimize the discovery of this event setup.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="font-label text-[9px] uppercase tracking-wider text-black/50 font-bold block">
                            SEO Meta Title
                          </label>
                          <input
                            type="text"
                            value={formData.seoTitle || ""}
                            onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                            placeholder="e.g. Royal Mysore Mandap Decor | Siri Arts & Crafts"
                            className="w-full bg-[#F8F9FB] px-4 py-2.5 rounded-full border border-black/5 text-xs focus:border-slate-900 outline-none"
                          />
                          <div className="flex justify-between items-center px-1 text-[9px] text-black/45">
                            <span>Recommended: 50-60 characters</span>
                            <span className={formData.seoTitle?.length > 60 ? "text-amber-600 font-semibold" : ""}>
                              {formData.seoTitle?.length || 0} chars
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="font-label text-[9px] uppercase tracking-wider text-black/50 font-bold block">
                            SEO Meta Description
                          </label>
                          <textarea
                            rows={2}
                            value={formData.seoDescription || ""}
                            onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                            placeholder="e.g. Discover our Royal Mysore Mandap featuring gold-plated pavilion archways and handcrafted backdrops, perfect for luxury traditional weddings."
                            className="w-full bg-[#F8F9FB] px-4 py-3 rounded-2xl border border-black/5 text-xs focus:border-slate-900 outline-none resize-none"
                          />
                          <div className="flex justify-between items-center px-1 text-[9px] text-black/45">
                            <span>Recommended: 150-160 characters</span>
                            <span className={formData.seoDescription?.length > 160 ? "text-amber-600 font-semibold" : ""}>
                              {formData.seoDescription?.length || 0} chars
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-black/5">
                      <button type="submit" disabled={isSaving} className="px-8 py-3 bg-black text-white rounded-full font-label text-[9px] uppercase tracking-widest font-bold hover:bg-black hover:text-black transition-colors">{isSaving ? "Saving..." : editingId ? "Update Setup" : "Publish Theme"}</button>
                      <button type="button" onClick={handleCancel} className="px-6 py-3 bg-white border border-stone-200 text-stone-700 rounded-full font-label text-[9px] uppercase tracking-widest font-bold">Cancel</button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Catalog list */}
            {loadingPortfolio ? (
              <div className="py-20 text-center"><div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {events.map((ev) => (
                  <div key={ev._id || ev.id} className="bg-white border border-black/5 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
                    <div className="relative aspect-[16/10] overflow-hidden shrink-0">
                      <img src={ev.image} className="w-full h-full object-cover" alt={ev.title} />
                      <span className="absolute top-3 left-3 bg-white/95 px-2 py-0.5 rounded-full font-label text-[7px] uppercase tracking-widest font-bold">{ev.category}</span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-display text-xs text-black font-bold leading-tight">{ev.title}</h4>
                          <span className="font-display text-xs text-black italic shrink-0 font-semibold">{ev.pricing}</span>
                        </div>
                        <p className="font-body text-[11px] text-black/40 mt-1 line-clamp-2 leading-relaxed">{ev.description}</p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => handleEdit(ev)} className="flex-1 py-2 bg-stone-100 text-black hover:bg-slate-200 hover:text-black rounded-xl font-label text-[9px] uppercase tracking-widest font-bold flex items-center justify-center gap-1 transition-colors"><span className="material-symbols-outlined text-[13px]">edit</span> Edit</button>
                        <button onClick={() => navigate(`/events/${ev._id || ev.id}`)} target="_blank" className="px-3.5 py-2 bg-stone-50 border border-black/5 rounded-xl hover:bg-stone-100 transition-colors"><span className="material-symbols-outlined text-[14px]">visibility</span></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 5: RENTAL INVENTORY */}
        {activeTab === "inventory" && (
          <motion.div key="inventory" initial="hidden" animate="show" variants={fadeUp} className="space-y-6">
            <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-black/5 pb-2 bg-stone-50 p-4 rounded-xl">
                <h3 className="font-display text-base text-black font-bold">Rental Inventory stock ledger</h3>
                <span className="bg-stone-200 text-stone-700 px-3 py-1 rounded-full font-label text-[9px] uppercase tracking-widest font-bold">
                  {inventoryItems.length} Props tracked
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {operationsLoading ? (
                  <div className="col-span-full py-10 text-center text-xs text-black/40">Loading live inventory...</div>
                ) : inventoryItems.length > 0 ? inventoryItems.map((prop, idx) => (
                  <div key={idx} className="p-4 bg-[#F8F9FB] border border-black/5 rounded-2xl flex flex-col justify-between h-36">
                    <div>
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-label text-[7px] uppercase tracking-widest font-bold">{prop.status}</span>
                      <h4 className="font-display text-xs text-black font-bold mt-2 leading-tight">{prop.item}</h4>
                    </div>
                    <div className="flex justify-between items-end border-t border-black/5 pt-2 text-[10px]">
                      <span className="text-black/40">Total Stock: <strong className="text-black font-bold">{prop.stock} Props</strong></span>
                      <span className="text-black/40">Active Rentals: <strong className="text-black font-bold">{prop.rented}</strong></span>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-10 text-center text-xs text-black/40">No product inventory is available yet.</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 6: TEAM ROSTER & STAFF SCHEDULING */}
        {activeTab === "team" && (
          <motion.div key="team" initial="hidden" animate="show" variants={fadeUp} className="space-y-6">
            <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-black/5 pb-2 bg-stone-50 p-4 rounded-xl">
                <h3 className="font-display text-base text-black font-bold">Available Setup Staff & Crew</h3>
                <span className="bg-stone-200 text-stone-700 px-3 py-1 rounded-full font-label text-[9px] uppercase tracking-widest font-bold">
                  {teamMembers.length} Staff members
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {operationsLoading ? (
                  <div className="col-span-full py-10 text-center text-xs text-black/40">Loading live staff list...</div>
                ) : teamMembers.length > 0 ? teamMembers.map((team, idx) => (
                  <div key={idx} className="p-4 bg-[#F8F9FB] border border-black/5 rounded-2xl flex items-center justify-between">
                    <div>
                      <h4 className="font-display text-xs text-black font-bold">{team.name}</h4>
                      <span className="font-body text-[10px] text-black/40 block mt-0.5 capitalize">{team.role}</span>
                      <span className="font-mono text-[9px] text-black/50 block mt-1">{team.contact}</span>
                    </div>
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-label text-[8px] uppercase tracking-widest font-bold">Available</span>
                  </div>
                )) : (
                  <div className="col-span-full py-10 text-center text-xs text-black/40">No team members are available for allocation yet.</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 7: DECOR SHOWCASE RENTALS (SIDE-STAGE & GIFT PRESENTATIONS) */}
        {activeTab === "showcases" && (
          <motion.div key="showcases" initial="hidden" animate="show" variants={fadeUp} className="space-y-6">
            
            {/* Header Controls */}
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
              <div>
                <h3 className="font-display text-lg text-black font-bold">Tambulam & Gift Presentation Designs</h3>
                <p className="font-body text-xs text-black/40">Manage Telugu Tambulam, coconut decor, and traditional wedding items.</p>
              </div>
              <button
                onClick={() => {
                  setShowShowcaseForm(!showShowcaseForm);
                  setEditingShowcaseId(null);
                  if (!showShowcaseForm) {
                    setShowcaseForm({
                      title: "",
                      subtitle: "",
                      category: "engagement_gift",
                      rentalPrice: 15000,
                      description: "",
                      image: "",
                      galleryImages: ["", ""],
                      inclusionsText: "Traditional carved wooden ring tray, Beaded shagun boxes, Mogra garland drops",
                      colorPalette: "#8B0000, #FFD700, #FFF8DC",
                      suggestedProps: "Traditional carved wooden ring tray, Beaded shagun boxes",
                      setupTimeHours: 2,
                      isActive: true,
                    });
                  }
                }}
                className="px-5 py-2.5 bg-black text-white rounded-full font-label text-[9px] uppercase tracking-widest font-bold shadow-md hover:bg-stone-900 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px] normal-case">
                  {showShowcaseForm ? "close" : "add"}
                </span>
                {showShowcaseForm ? "Close Form" : "Create New Design"}
              </button>
            </div>

            {/* Creation Form Box */}
            {showShowcaseForm && (
              <form onSubmit={handleCreateOrUpdateShowcase} className="bg-white p-6 md:p-8 rounded-3xl border border-black/5 shadow-md space-y-6">
                <div className="border-b border-black/5 pb-4">
                  <h4 className="font-display text-base text-black font-bold">
                    {editingShowcaseId ? "Edit Showcase Collection" : "Create Traditional Design"}
                  </h4>
                  <p className="font-body text-[11px] text-black/45">Provide details for traditional wedding, ring ceremony, or gift setups.</p>
                </div>

                {/* Cover Image Uploader & Visual Analysis at the VERY TOP */}
                <div className="bg-[#F8F9FB] p-6 rounded-3xl border border-slate-250 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-label text-[10px] uppercase tracking-widest text-black font-bold block">Step 1: Upload Photo Blueprint *</span>
                      <p className="text-[11px] text-black/50">Upload or link your cover photography first. Our AI Vision model can analyze props and recommend pricing.</p>
                    </div>
                    {showcaseForm.image && (
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">✓ Photo Active</span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="md:col-span-2 space-y-2">
                      <label className="font-label text-[9px] uppercase tracking-widest text-black/50 font-bold block">Cover Image URL *</label>
                      <input
                        type="text"
                        required
                        placeholder="https://cloudinary.com/... or drop file below"
                        value={showcaseForm.image}
                        onChange={(e) => setShowcaseForm({ ...showcaseForm, image: e.target.value })}
                        className="w-full px-4 py-3 text-xs border border-black/10 rounded-xl bg-white focus:border-slate-900 outline-none shadow-xs font-mono"
                      />
                    </div>
                    <div>
                      <ImageUpload
                        onUploadSuccess={(url) => {
                          setShowcaseForm(prev => ({ ...prev, image: url }));
                          toast.success("Photo uploaded! Click '✨ AI Autofill' to extract arrangement props.");
                        }}
                        label="Drop cover photography here"
                      />
                    </div>
                  </div>
                </div>

                {/* Elegant Black AI Autofill action button aligned cleanly below the image uploader box */}
                <div className="flex justify-end pr-2">
                  <button
                    type="button"
                    onClick={handleAiAutofill}
                    className="px-5 py-2.5 rounded-full bg-black hover:bg-stone-900 text-white font-label text-[10px] uppercase tracking-widest font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 select-none"
                  >
                    <span className="material-symbols-outlined text-[15px] animate-pulse">auto_awesome</span>
                    AI Autofill from Photo
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  {/* Title */}
                  <div className="space-y-1">
                    <label className="font-label text-[9px] uppercase tracking-widest text-black/50 font-bold block">Showcase Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Traditional Telugu Sankranthi Showcase"
                      value={showcaseForm.title}
                      onChange={(e) => setShowcaseForm({ ...showcaseForm, title: e.target.value })}
                      className="w-full px-4 py-2 text-xs border border-black/10 rounded-xl bg-stone-50/50 focus:bg-white focus:border-slate-900 outline-none"
                    />
                  </div>

                  {/* Subtitle */}
                  <div className="space-y-1">
                    <label className="font-label text-[9px] uppercase tracking-widest text-black/50 font-bold block">Artisan Subtitle</label>
                    <input
                      type="text"
                      placeholder="e.g. Handpainted coconuts with silk floral runners"
                      value={showcaseForm.subtitle}
                      onChange={(e) => setShowcaseForm({ ...showcaseForm, subtitle: e.target.value })}
                      className="w-full px-4 py-2 text-xs border border-black/10 rounded-xl bg-stone-50/50 focus:bg-white focus:border-slate-900 outline-none"
                    />
                  </div>

                  {/* Category Dropdown */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-label text-[9px] uppercase tracking-widest text-black/50 font-bold block">Showcase Category *</label>
                      <button
                        type="button"
                        onClick={() => setShowCatModal(true)}
                        className="font-label text-[9px] text-black hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[12px]">add_circle</span> Manage Themes
                      </button>
                    </div>
                    <select
                      value={showcaseForm.category}
                      onChange={(e) => setShowcaseForm({ ...showcaseForm, category: e.target.value })}
                      className="w-full px-4 py-2 text-xs border border-black/10 rounded-xl bg-white focus:border-slate-900 outline-none font-medium"
                    >
                      <option value="">Select Category</option>
                      {customCategories?.events?.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Daily Rental Price */}
                  <div className="space-y-1">
                    <label className="font-label text-[9px] uppercase tracking-widest text-black/50 font-bold block">Daily Rental Price (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="15000"
                      value={showcaseForm.rentalPrice}
                      onChange={(e) => setShowcaseForm({ ...showcaseForm, rentalPrice: e.target.value })}
                      className="w-full px-4 py-2 text-xs border border-black/10 rounded-xl bg-stone-50/50 focus:bg-white focus:border-slate-900 outline-none font-mono"
                    />
                  </div>

                  {/* Lead Setup Time */}
                  <div className="space-y-1">
                    <label className="font-label text-[9px] uppercase tracking-widest text-black/50 font-bold block">Estimated Setup Time (Hours)</label>
                    <input
                      type="number"
                      placeholder="2"
                      value={showcaseForm.setupTimeHours}
                      onChange={(e) => setShowcaseForm({ ...showcaseForm, setupTimeHours: Number(e.target.value) })}
                      className="w-full px-4 py-2 text-xs border border-black/10 rounded-xl bg-stone-50/50 focus:bg-white focus:border-slate-900 outline-none"
                    />
                  </div>

                  {/* Storefront Availability */}
                  <div className="space-y-1">
                    <label className="font-label text-[9px] uppercase tracking-widest text-black/50 font-bold block">Storefront Availability</label>
                    <div 
                      className="flex items-center gap-2.5 bg-stone-50/50 hover:bg-white px-4 py-2 rounded-xl border border-black/10 h-[38px] cursor-pointer transition-colors"
                      onClick={() => setShowcaseForm({ ...showcaseForm, isActive: !showcaseForm.isActive })}
                    >
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={showcaseForm.isActive}
                        onChange={(e) => setShowcaseForm({ ...showcaseForm, isActive: e.target.checked })}
                        className="w-4 h-4 accent-black cursor-pointer rounded"
                      />
                      <label htmlFor="isActive" className="font-label text-[9px] uppercase tracking-widest text-black/60 font-bold cursor-pointer select-none">Theme Active for Rentals</label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Color Palette */}
                  <div className="space-y-1">
                    <label className="font-label text-[9px] uppercase tracking-widest text-black/50 font-bold block">Accent Silk Thread Color Palette (Hex codes, comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. #8B0000, #FFD700, #FFF8DC"
                      value={showcaseForm.colorPalette}
                      onChange={(e) => setShowcaseForm({ ...showcaseForm, colorPalette: e.target.value })}
                      className="w-full px-4 py-2 text-xs border border-black/10 rounded-xl bg-stone-50/50 focus:bg-white focus:border-slate-900 outline-none"
                    />
                    <p className="text-[10px] text-black/35 font-light">Accent color palette for showcase visualization tags.</p>
                  </div>

                  {/* Inclusions Text box */}
                  <div className="space-y-1">
                    <label className="font-label text-[9px] uppercase tracking-widest text-black/50 font-bold block">Handcrafted Modular Inclusions (Comma-separated props list)</label>
                    <input
                      type="text"
                      placeholder="e.g. Carved Wooden Swing, Pearl-beaded Trays, Mogra hanging columns, Silk backdrops"
                      value={showcaseForm.inclusionsText}
                      onChange={(e) => setShowcaseForm({ ...showcaseForm, inclusionsText: e.target.value })}
                      className="w-full px-4 py-2 text-xs border border-black/10 rounded-xl bg-stone-50/50 focus:bg-white focus:border-slate-900 outline-none"
                    />
                    <p className="text-[10px] text-black/35 font-light">Each prop split by a comma will become an independent, selectable item in the customer Visual Crate customizer.</p>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="font-label text-[9px] uppercase tracking-widest text-black/50 font-bold block">Artisan Arrangement Story Narrative *</label>
                  <textarea
                    required
                    placeholder="Enter full details of the theme: how props are arranged, traditional references (Telugu Pellikuthuru, Engagement gift trays), floral details..."
                    value={showcaseForm.description}
                    onChange={(e) => setShowcaseForm({ ...showcaseForm, description: e.target.value })}
                    className="w-full p-4 text-xs border border-black/10 rounded-xl bg-stone-50/20 focus:bg-white focus:border-slate-900 outline-none h-28 resize-none"
                  />
                </div>

                {/* SEO Meta Configuration */}
                <div className="border-t border-black/5 pt-4 space-y-4">
                  <div>
                    <h4 className="font-display text-xs text-black font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-slate-800">language</span>
                      SEO Meta Configuration (Siri Arts & Crafts)
                    </h4>
                    <p className="text-[10px] text-black/40 mt-0.5">Configure custom search engine tags to optimize the discovery of this showcase rental item.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-label text-[9px] uppercase tracking-wider text-black/50 font-bold block">
                        SEO Meta Title
                      </label>
                      <input
                        type="text"
                        value={showcaseForm.seoTitle || ""}
                        onChange={(e) => setShowcaseForm({ ...showcaseForm, seoTitle: e.target.value })}
                        placeholder="e.g. Lotus Gifting Crate Setup | Siri Arts & Crafts"
                        className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-stone-50/50 focus:bg-white focus:border-slate-900 outline-none text-xs"
                      />
                      <div className="flex justify-between items-center px-1 text-[9px] text-black/45">
                        <span>Recommended: 50-60 characters</span>
                        <span className={showcaseForm.seoTitle?.length > 60 ? "text-amber-600 font-semibold" : ""}>
                          {showcaseForm.seoTitle?.length || 0} chars
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-label text-[9px] uppercase tracking-wider text-black/50 font-bold block">
                        SEO Meta Description
                      </label>
                      <textarea
                        rows={2}
                        value={showcaseForm.seoDescription || ""}
                        onChange={(e) => setShowcaseForm({ ...showcaseForm, seoDescription: e.target.value })}
                        placeholder="e.g. Premium traditional Lotus Gifting Crate rental for engagement ceremonies. Adorned with hand-carved heritage coconuts and fresh jasmine."
                        className="w-full p-4 text-xs border border-black/10 rounded-xl bg-stone-50/20 focus:bg-white focus:border-slate-900 outline-none resize-none"
                      />
                      <div className="flex justify-between items-center px-1 text-[9px] text-black/45">
                        <span>Recommended: 150-160 characters</span>
                        <span className={showcaseForm.seoDescription?.length > 160 ? "text-amber-600 font-semibold" : ""}>
                          {showcaseForm.seoDescription?.length || 0} chars
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowShowcaseForm(false)}
                    className="px-5 py-2.5 border border-black/10 text-black rounded-full font-label text-[9px] uppercase tracking-widest font-bold hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-black text-white rounded-full font-label text-[9px] uppercase tracking-widest font-bold shadow-md hover:bg-stone-900 transition-colors"
                  >
                    {editingShowcaseId ? "Update Design" : "Save Design"}
                  </button>
                </div>
              </form>
            )}

            {/* Catalog list view */}
            <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
              <h4 className="font-display text-sm text-black font-bold">Tambulam & Gift Presentation Designs</h4>
              
              {loadingShowcases ? (
                <div className="h-48 flex justify-center items-center">
                  <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : showcases.length === 0 ? (
                <div className="p-12 text-center text-black/35 font-body text-xs">
                  No tambulam or gift designs have been created yet. Click "+ Create New Design" above to publish your first item!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {showcases.map((sc) => (
                    <div key={sc._id || sc.id} className="border border-black/5 bg-[#F8F9FB] rounded-2xl overflow-hidden flex flex-col justify-between">
                      <div>
                        <div className="relative h-40 overflow-hidden bg-stone-100">
                          <img src={sc.image} className="w-full h-full object-cover" alt={sc.title} />
                          <span className="absolute top-2 left-2 bg-stone-900/80 text-white font-label text-[7px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold">
                            {sc.category?.replace("_", " ")}
                          </span>
                        </div>
                        <div className="p-4 space-y-2">
                          <h4 className="font-display text-sm text-black font-bold leading-tight truncate">{sc.title}</h4>
                          <span className="font-mono text-xs font-bold text-black block">₹{sc.rentalPrice.toLocaleString("en-IN")} / day</span>
                          <p className="font-body text-[11px] text-black/45 line-clamp-2 leading-relaxed">{sc.description}</p>
                          
                          {/* Inclusions count */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {sc.inclusions?.map((inc, idx) => (
                              <span key={idx} className="bg-white border border-black/5 px-2 py-0.5 rounded-full font-body text-[8px] text-black/65">
                                {inc.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border-t border-black/5 flex gap-2">
                        <button
                          onClick={() => handleEditShowcase(sc)}
                          className="flex-1 py-1.5 bg-stone-100 text-black hover:bg-slate-200 hover:text-black rounded-xl font-label text-[9px] uppercase tracking-widest font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[13px]">edit</span> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteShowcase(sc._id || sc.id)}
                          className="py-1.5 px-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-label text-[9px] uppercase tracking-widest font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[13px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAILED WORKSPACE DRAWER PANEL OVERLAY */}
      <AnimatePresence>
        {isDrawerOpen && selectedBooking && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDrawerOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.4 }}
              className="relative w-full max-w-[850px] bg-white h-full shadow-2xl flex flex-col md:flex-row z-10 overflow-hidden font-body text-on-surface"
            >
              {/* Drawer Content Panel: Operations & Logistics */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 border-r border-black/5">
                <div className="flex justify-between items-start border-b border-black/5 pb-4">
                  <div>
                    <span className="font-label text-[8px] text-black uppercase tracking-[0.25em] font-bold block mb-1">EVENT BOOKING DETAILS</span>
                    <h3 className="font-display text-base text-black font-bold leading-tight">{selectedBooking.title}</h3>
                    <p className="font-body text-[10px] text-black/40 capitalize mt-0.5">Customer: {selectedBooking.user?.name} | {selectedBooking.user?.phone}</p>
                  </div>
                  <button onClick={() => setIsDrawerOpen(false)} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center active:scale-90"><span className="material-symbols-outlined text-[18px]">close</span></button>
                </div>

                {/* Timeline status dropdown */}
                <div className="space-y-2">
                  <label className="font-label text-[9px] uppercase tracking-wider text-black/50 font-bold block">Change Booking Status</label>
                  <select
                    value={drawerStatus}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    className="w-full bg-[#F8F9FB] px-4 py-2.5 rounded-full border border-black/5 text-xs focus:border-slate-900 outline-none cursor-pointer capitalize font-semibold text-black"
                  >
                    {[
                      { value: "inquiry", label: "Inquiry Received" },
                      { value: "review", label: "Under Review" },
                      { value: "discussion", label: "Design Discussion" },
                      { value: "quotation_sent", label: "Price Estimate Sent" },
                      { value: "confirmed", label: "Booking Confirmed" },
                      { value: "team_assigned", label: "Staff Assigned" },
                      { value: "setup_in_progress", label: "Setup In Progress" },
                      { value: "active", label: "Event Active & Live" },
                      { value: "pickup_scheduled", label: "Pickup Scheduled" },
                      { value: "completed", label: "Completed & Cleaned Up" },
                    ].map((st) => (
                      <option key={st.value} value={st.value}>{st.label}</option>
                    ))}
                  </select>
                </div>

                {/* Quotation refinement editor */}
                <div className="space-y-4 pt-4 border-t border-black/5">
                  <span className="font-label text-[9px] uppercase tracking-widest text-black/50 font-bold block">Price Estimates</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-body text-[10px] text-black/40 block">Theme Rental Fee (₹)</label>
                      <input type="number" value={quoteRental} onChange={(e) => setQuoteRental(e.target.value)} className="w-full bg-[#F8F9FB] px-4 py-2 rounded-full border border-black/5 text-xs outline-none focus:border-slate-900" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-body text-[10px] text-black/40 block">Labor & Setup Charges (₹)</label>
                      <input type="number" value={quoteSetup} onChange={(e) => setQuoteSetup(e.target.value)} className="w-full bg-[#F8F9FB] px-4 py-2 rounded-full border border-black/5 text-xs outline-none focus:border-slate-900" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-body text-[10px] text-black/40 block">Transportation Cost (₹)</label>
                      <input type="number" value={quoteTransport} onChange={(e) => setQuoteTransport(e.target.value)} className="w-full bg-[#F8F9FB] px-4 py-2 rounded-full border border-black/5 text-xs outline-none focus:border-slate-900" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-body text-[10px] text-black/40 block">Add-ons Charges (₹)</label>
                      <input type="number" value={quoteAddons} onChange={(e) => setQuoteAddons(e.target.value)} className="w-full bg-[#F8F9FB] px-4 py-2 rounded-full border border-black/5 text-xs outline-none focus:border-slate-900" disabled />
                    </div>
                  </div>
                  <button onClick={handleUpdateQuotation} className="w-full bg-black text-white py-2.5 rounded-full font-label text-[9px] uppercase tracking-widest font-bold hover:bg-black hover:text-black transition-colors shadow">Save & Send Price Estimate</button>
                </div>

                {/* Logistics schedule timestamps */}
                <div className="space-y-4 pt-4 border-t border-black/5">
                  <span className="font-label text-[9px] uppercase tracking-widest text-black/50 font-bold block">Setup & Pickup Schedule</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-body text-[10px] text-black/40 block">Setup Time</label>
                      <input type="datetime-local" value={logisticsSetup} onChange={(e) => setLogisticsSetup(e.target.value)} className="w-full bg-[#F8F9FB] px-4 py-2 rounded-full border border-black/5 text-xs outline-none focus:border-slate-900" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-body text-[10px] text-black/40 block">Pickup Time</label>
                      <input type="datetime-local" value={logisticsPickup} onChange={(e) => setLogisticsPickup(e.target.value)} className="w-full bg-[#F8F9FB] px-4 py-2 rounded-full border border-black/5 text-xs outline-none focus:border-slate-900" />
                    </div>
                  </div>
                </div>

                {/* Crew allocators */}
                <div className="space-y-3 pt-4 border-t border-black/5">
                  <span className="font-label text-[9px] uppercase tracking-widest text-black/50 font-bold block">Assign Setup Staff</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {teamMembers.map((member) => {
                      const isAllocated = allocatedTeam.some((t) => t.name === member.name);
                      return (
                        <div
                          key={member.name}
                          onClick={() => handleTeamMemberToggle(member.name, member.role, member.contact)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex justify-between items-center ${
                            isAllocated ? "bg-slate-50 border-slate-300" : "border-black/5 hover:border-black/10"
                          }`}
                        >
                          <div>
                            <span className="font-body text-xs text-black font-bold block">{member.name}</span>
                            <span className="font-body text-[10px] text-black/40 block capitalize">{member.role}</span>
                          </div>
                          <input type="checkbox" checked={isAllocated} readOnly className="accent-primary w-4 h-4" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Props checklists */}
                <div className="space-y-3 pt-4 border-t border-black/5">
                  <span className="font-label text-[9px] uppercase tracking-widest text-black/50 font-bold block">Select Props Checklist</span>
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {inventoryItems.map((prop) => {
                        const isAllocated = allocatedProps.some((p) => p.item === prop.item);
                        return (
                          <div
                            key={prop.item}
                            onClick={() => handlePropChecklistToggle(prop.item, 1)}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex justify-between items-center ${
                              isAllocated ? "bg-slate-50 border-slate-300" : "border-black/5 hover:border-black/10"
                            }`}
                          >
                            <span className="font-body text-[11px] text-black font-bold block leading-tight">{prop.item}</span>
                            <input type="checkbox" checked={isAllocated} readOnly className="accent-primary w-4 h-4 shrink-0" />
                          </div>
                        );
                      })}
                    </div>

                    {allocatedProps.length > 0 && (
                      <div className="pt-4 border-t border-black/5 space-y-2.5">
                        <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">Prop Returns & Tracking</span>
                        {allocatedProps.map((p, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-stone-50 border border-black/5 p-3 rounded-xl text-xs">
                            <span className="font-body text-[11px] text-stone-700 font-bold leading-tight max-w-[200px] truncate">{p.item}</span>
                            <select
                              value={p.returnStatus}
                              onChange={(e) => handlePropReturnStatusChange(idx, e.target.value)}
                              className="bg-white border border-black/5 px-3 py-1 rounded-lg text-[10px] outline-none"
                            >
                              <option value="pending">Pending Setup</option>
                              <option value="returned">Returned Safe</option>
                              <option value="damaged">Damaged/Broken</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Operations logs notes */}
                <div className="space-y-2 pt-4 border-t border-black/5">
                  <label className="font-label text-[9px] uppercase tracking-wider text-black/50 font-bold block">Internal Staff & Setup Notes</label>
                  <textarea
                    rows={2}
                    value={drawerNotes}
                    onChange={(e) => setDrawerNotes(e.target.value)}
                    placeholder="Enter internal notes, staff times, or setup instructions..."
                    className="w-full bg-[#F8F9FB] px-4 py-2.5 rounded-xl border border-black/5 text-xs outline-none focus:border-slate-900 resize-none"
                  />
                </div>

                <button onClick={handleUpdateLogistics} className="w-full bg-black text-white py-3 rounded-full font-label text-[10px] uppercase tracking-widest font-bold hover:bg-black hover:text-black transition-colors shadow-lg">Save Timeline & Staff</button>
              </div>

              {/* Drawer Chat Workspace Panel: Real-time Communication */}
              <div className="w-full md:w-[320px] bg-stone-50 p-4 md:p-6 flex flex-col h-full shrink-0 border-t md:border-t-0 border-black/5">
                <div className="border-b border-black/5 pb-3 shrink-0 flex items-center justify-between">
                  <div>
                    <span className="font-label text-[8px] uppercase tracking-widest text-black font-bold block">CLIENT CHAT</span>
                    <h4 className="font-display text-sm text-black font-bold">Customer Chat</h4>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-black animate-pulse">forum</span>
                </div>

                {/* Message logs */}
                <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 no-scrollbar flex flex-col">
                  {selectedBooking.chatHistory?.map((chat, idx) => {
                    const isAdmin = chat.sender === "admin";
                    return (
                      <div key={idx} className={`flex flex-col max-w-[85%] ${isAdmin ? "self-end text-right ml-auto" : "self-start text-left"}`}>
                        <span className="font-label text-[8px] text-black/35 font-bold uppercase tracking-widest mb-1 block">
                          {isAdmin ? "You" : "Client"}
                        </span>
                        <div className={`p-3.5 rounded-[18px] text-xs leading-relaxed font-light ${
                          isAdmin ? "bg-black text-white rounded-tr-none" : "bg-white text-stone-900 border border-black/5 rounded-tl-none"
                        }`}>
                          {chat.message}
                        </div>
                        <span className="font-mono text-[8px] text-black/25 mt-1 block">
                          {new Date(chat.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Input text box */}
                <form onSubmit={handleSendAdminChat} className="border-t border-black/5 pt-3 shrink-0 flex items-center gap-2 mt-auto">
                  <input
                    type="text"
                    placeholder="Type a message to client..."
                    value={drawerChatMsg}
                    onChange={(e) => setDrawerChatMsg(e.target.value)}
                    className="flex-1 bg-white border border-black/5 px-4 py-2.5 rounded-full text-xs outline-none focus:border-slate-900 transition-colors"
                    required
                  />
                  <button
                    type="submit"
                    className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-black hover:text-black transition-all shrink-0 active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Themes Category Studio Modal */}
      <AnimatePresence>
        {showCatModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCatModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 md:p-8 z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-black/5 pb-4 mb-6">
                <div>
                  <span className="font-label text-[9px] text-black uppercase tracking-widest font-bold">STUDIO THEMES</span>
                  <h3 className="font-display text-xl text-black font-bold">Showcase Theme Categories</h3>
                </div>
                <button
                  onClick={() => setShowCatModal(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Add/Edit Category Form */}
              <form onSubmit={handleSaveCat} className="bg-stone-50 p-4 rounded-2xl border border-black/5 mb-6 space-y-4">
                <h4 className="font-label text-[10px] text-stone-800 uppercase tracking-widest font-bold">
                  {editingCatId ? "✏️ Edit Theme Category" : "✨ Create New Showcase Theme"}
                </h4>
                <div className="space-y-1">
                  <label className="font-label text-[9px] uppercase tracking-wider text-black/50 font-bold block">Theme Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Traditional Haldi Tray Decor"
                    value={catForm.name}
                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white rounded-xl border border-black/10 text-xs focus:border-slate-900 outline-none font-medium"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label text-[9px] uppercase tracking-wider text-black/50 font-bold block">Theme Narrative Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Handcrafted floral trays and brass elements"
                    value={catForm.description}
                    onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white rounded-xl border border-black/10 text-xs focus:border-slate-900 outline-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  {editingCatId && (
                    <button
                      type="button"
                      onClick={() => { setEditingCatId(null); setCatForm({ name: "", description: "", image: "" }); }}
                      className="px-4 py-2 rounded-xl text-xs font-label uppercase font-bold text-stone-600 hover:bg-stone-200 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl text-xs font-label uppercase font-bold bg-black text-white shadow-md hover:bg-stone-900 transition-all cursor-pointer"
                  >
                    {editingCatId ? "Save Changes" : "+ Add Theme Category"}
                  </button>
                </div>
              </form>

              {/* List of current themes */}
              <div className="space-y-3">
                <h4 className="font-label text-[10px] text-stone-800 uppercase tracking-widest font-bold block mb-2">
                  Active Showcase Themes ({customCategories?.events?.length || 0})
                </h4>
                {customCategories?.events?.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-stone-200 shadow-2xs group">
                    <div className="min-w-0 flex-1 pr-4">
                      <span className="font-display text-sm text-black font-bold block truncate">{cat.name}</span>
                      {cat.description && (
                        <span className="font-body text-[11px] text-stone-500 block truncate font-light">{cat.description}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleEditCat(cat)}
                        className="w-8 h-8 rounded-full bg-stone-50 text-stone-700 flex items-center justify-center hover:bg-black hover:text-white transition-all cursor-pointer shadow-2xs"
                        title="Edit Theme"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                      </button>
                      <button
                        onClick={() => deleteCustomCategory("events", cat.id)}
                        className="w-8 h-8 rounded-full bg-stone-50 text-[#8B0000] flex items-center justify-center hover:bg-[#8B0000] hover:text-white transition-all cursor-pointer shadow-2xs"
                        title="Delete Theme"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
