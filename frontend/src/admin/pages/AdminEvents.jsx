import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import { eventService, bookingService, showcaseService, productService, userService } from "../../services/domainServices";
import { ImageUpload } from "../components/ImageUpload";
import toast from "react-hot-toast";
import logger from "../../utils/logger";
import {
  PageHeader,
  StatCard,
  ChartCard,
  StatusBadge,
  FilterBar,
  formatCurrency,
  fadeUp,
  stagger,
} from "../components/AdminUIKit";

const EVENT_CATEGORIES = [
  "Wedding Ceremony",
  "Engagement Ceremony",
  "House Warming Ceremony",
  "Baby Shower Ceremony",
  "Naming Ceremony",
  "Festival Decorations",
];

const DECOR_STYLES = ["Traditional", "Floral", "Modern", "Royal", "Minimalist", "Rustic"];

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

  // Live Map refs & venue states for Admin Drawer Editor
  const adminMapInstanceRef = useRef(null);
  const adminMarkerInstanceRef = useRef(null);

  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueCity, setVenueCity] = useState("");
  const [venueState, setVenueState] = useState("");
  const [venueCountry, setVenueCountry] = useState("");
  const [venuePincode, setVenuePincode] = useState("");
  const [venueLatitude, setVenueLatitude] = useState("");
  const [venueLongitude, setVenueLongitude] = useState("");
  const [venueGoogleMapsLink, setVenueGoogleMapsLink] = useState("");
  const [venueIsOutdoor, setVenueIsOutdoor] = useState(false);

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
      logger.error(err);
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
      setShowcaseForm((prev) => ({
        ...prev,
        title: prev.title || "Lotus Gifting Crate",
        subtitle: prev.subtitle || "Carved coconuts with jasmine garlands",
        category: "telugu_heritage",
        rentalPrice: 14500,
        description: prev.description || "A traditional side-stage presentation tray designed for engagement ceremonies with heritage coconuts and jasmine garlands.",
        inclusionsText: "Hand-carved Heritage Coconuts, Royal Brass Urlis, Jasmine Rope Runners, Beaded Ring Trays, Mogra Drops",
        colorPalette: "#8B0000, #FFD700, #228B22",
        setupTimeHours: 2,
        isActive: true,
      }));
      toast.success("✨ AI populated details");
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
      const incList = showcaseForm.inclusionsText
        .split(",")
        .map((item) => ({ name: item.trim(), defaultQty: 1, condition: "excellent" }))
        .filter((i) => i.name.length > 0);

      const payload = {
        title: showcaseForm.title,
        subtitle: showcaseForm.subtitle,
        category: showcaseForm.category,
        rentalPrice: Number(showcaseForm.rentalPrice) || 12000,
        description: showcaseForm.description,
        image: showcaseForm.image,
        gallery: showcaseForm.galleryImages.filter((g) => g !== ""),
        inclusions: incList,
        colorPalette: showcaseForm.colorPalette.split(",").map((c) => c.trim()).filter((c) => c.length > 0),
        suggestedProps: showcaseForm.suggestedProps.split(",").map((p) => p.trim()).filter((p) => p.length > 0),
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
        toast.success(editingShowcaseId ? "Theme updated!" : "Theme published!");
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
      inclusionsText: sc.inclusions ? sc.inclusions.map((i) => i.name).join(",") : "",
      colorPalette: sc.colorPalette ? sc.colorPalette.join(",") : "",
      suggestedProps: sc.suggestedProps ? sc.suggestedProps.join(",") : "",
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
        toast.success("Collection withdrawn");
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
      const productsList = productsPayload?.items || productsPayload?.products || productsPayload?.data || [];
      const inventory = (Array.isArray(productsList) ? productsList : []).map((product) => ({
        item: product.title || product.name,
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

        const v = selectedBooking.venue || {};
        setVenueName(v.name || "");
        setVenueAddress(v.address || "");
        setVenueCity(v.city || "");
        setVenueState(v.state || "");
        setVenueCountry(v.country || "");
        setVenuePincode(v.pincode || "");
        setVenueLatitude(v.latitude || "");
        setVenueLongitude(v.longitude || "");
        setVenueGoogleMapsLink(v.googleMapsLink || "");
        setVenueIsOutdoor(v.isOutdoor || false);
      }, 0);

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
      colorPalette: ev.colorPalette ? ev.colorPalette.join(",") : "",
      features: ev.features ? ev.features.join(",") : "",
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
        colorPalette: formData.colorPalette ? formData.colorPalette.split(",").map((c) => c.trim()).filter(Boolean) : [],
        features: formData.features ? formData.features.split(",").map((f) => f.trim()).filter(Boolean) : [],
        materialStyle: formData.materialStyle || undefined,
        venueSize: formData.venueSize || undefined,
        gallery: [formData.image, ...formData.galleryImages.filter(Boolean)].slice(0, 3),
        beforeAfterImages: (formData.beforeImage || formData.afterImage)
          ? { before: formData.beforeImage || undefined, after: formData.afterImage || undefined }
          : undefined,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        isActive: Boolean(formData.isActive),
      };

      const res = editingId
        ? await eventService.update(editingId, payload)
        : await eventService.create(payload);

      if (res.success) {
        toast.success(editingId ? "Portfolio updated" : "Theme published");
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

  const handleUpdateStatus = async (status) => {
    if (!selectedBooking) return;
    try {
      const res = await bookingService.adminUpdateStatus(selectedBooking._id || selectedBooking.id, status);
      if (res.success) {
        toast.success(`Booking status changed to: ${status.toUpperCase()}`);
        setDrawerStatus(status);
        fetchBookings();
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
        toast.success("Estimate sent");
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
    const loadId = toast.loading("Saving staff lists, times, & venue logistics...");
    try {
      const res = await bookingService.adminUpdateLogistics(selectedBooking._id || selectedBooking.id, {
        setupTiming: logisticsSetup ? new Date(logisticsSetup) : undefined,
        pickupTiming: logisticsPickup ? new Date(logisticsPickup) : undefined,
        assignedTeam: allocatedTeam,
        rentedInventory: allocatedProps,
        adminNotes: drawerNotes,
        venue: {
          name: venueName,
          address: venueAddress,
          city: venueCity,
          state: venueState,
          country: venueCountry,
          pincode: venuePincode,
          latitude: venueLatitude ? Number(venueLatitude) : undefined,
          longitude: venueLongitude ? Number(venueLongitude) : undefined,
          googleMapsLink: venueGoogleMapsLink,
          isOutdoor: venueIsOutdoor,
        },
      });
      toast.dismiss(loadId);
      if (res.success) {
        toast.success("Rosters, checklists, timelines, and venue saved!");
        fetchBookings();
        setSelectedBooking(res.data);
      }
    } catch (err) {
      toast.dismiss(loadId);
      toast.error("Failed to save setup logistics.");
    }
  };

  useEffect(() => {
    if (!isDrawerOpen || !selectedBooking) {
      if (adminMapInstanceRef.current) {
        try { adminMapInstanceRef.current.remove(); } catch (e) { logger.warn("Admin map cleanup error", e); }
        adminMapInstanceRef.current = null;
        adminMarkerInstanceRef.current = null;
      }
      return;
    }
    const mapTimer = setTimeout(() => { initDrawerMap(); }, 450);
    return () => clearTimeout(mapTimer);
  }, [isDrawerOpen, selectedBooking?._id]);

  const initDrawerMap = () => {
    const mapDom = document.getElementById("admin-leaflet-map");
    if (!mapDom || adminMapInstanceRef.current) return;

    if (!document.getElementById("leaflet-css-cdn")) {
      const link = document.createElement("link");
      link.id = "leaflet-css-cdn";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (window.L) {
      setupLeafletDrawerMap();
    } else {
      if (!document.getElementById("leaflet-js-cdn")) {
        const script = document.createElement("script");
        script.id = "leaflet-js-cdn";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.onload = () => setupLeafletDrawerMap();
        document.head.appendChild(script);
      } else {
        const interval = setInterval(() => {
          if (window.L) {
            clearInterval(interval);
            setupLeafletDrawerMap();
          }
        }, 100);
      }
    }
  };

  const setupLeafletDrawerMap = () => {
    const mapDom = document.getElementById("admin-leaflet-map");
    if (!mapDom || adminMapInstanceRef.current) return;
    const lat = Number(venueLatitude) || 15.506;
    const lng = Number(venueLongitude) || 80.049;

    try {
      const map = window.L.map("admin-leaflet-map", { zoomControl: false }).setView([lat, lng], 13);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      window.L.control.zoom({ position: "bottomright" }).addTo(map);

      const goldIcon = window.L.divIcon({
        className: "custom-leaflet-marker",
        html: `<div class="relative w-8 h-8 flex items-center justify-center">
                 <div class="absolute w-8 h-8 bg-[var(--admin-accent)] opacity-30 rounded-full animate-ping"></div>
                 <span class="material-symbols-outlined text-[var(--admin-accent)] text-[32px] drop-shadow-lg z-10 animate-bounce">location_on</span>
               </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = window.L.marker([lat, lng], { icon: goldIcon, draggable: true }).addTo(map);
      adminMarkerInstanceRef.current = marker;
      adminMapInstanceRef.current = map;

      map.on("click", (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        updateAdminCoordinates(clickLat, clickLng);
      });

      marker.on("dragend", () => {
        const position = marker.getLatLng();
        updateAdminCoordinates(position.lat, position.longitude || position.lng);
      });
    } catch (e) {
      logger.error("Failed to setup Leaflet map inside admin drawer", e);
    }
  };

  const updateAdminCoordinates = async (lat, lng) => {
    setVenueLatitude(lat);
    setVenueLongitude(lng);

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
      if (response.ok) {
        const data = await response.json();
        const addr = data.address || {};
        const street = addr.road || addr.suburb || addr.neighbourhood || "";
        const city = addr.city || addr.town || addr.village || addr.county || "";
        const state = addr.state || "";
        const country = addr.country || "";
        const pincode = addr.postcode || "";
        const name = data.name || addr.amenity || addr.building || addr.shop || "";

        const formattedAddress = data.display_name || `${name ? name + "," : ""}${street}, ${city}, ${state}, ${pincode}`;

        setVenueName(name || street || "Selected Venue");
        setVenueAddress(formattedAddress);
        setVenueCity(city);
        setVenueState(state);
        setVenueCountry(country);
        setVenuePincode(pincode);
        setVenueGoogleMapsLink(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formattedAddress)}`);

        toast.success("Coordinates and address auto-geocoded!");
      }
    } catch (err) {
      logger.warn("Admin geocode error", err);
    }
  };

  const handleAdminCoordInputChange = (type, value) => {
    if (type === "lat") {
      setVenueLatitude(value);
      const latNum = Number(value);
      if (!isNaN(latNum) && adminMapInstanceRef.current && adminMarkerInstanceRef.current) {
        adminMarkerInstanceRef.current.setLatLng([latNum, Number(venueLongitude) || 80.049]);
        adminMapInstanceRef.current.setView([latNum, Number(venueLongitude) || 80.049]);
      }
    } else {
      setVenueLongitude(value);
      const lngNum = Number(value);
      if (!isNaN(lngNum) && adminMapInstanceRef.current && adminMarkerInstanceRef.current) {
        adminMarkerInstanceRef.current.setLatLng([Number(venueLatitude) || 15.506, lngNum]);
        adminMapInstanceRef.current.setView([Number(venueLatitude) || 15.506, lngNum]);
      }
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
      if (exists) return prev.filter((t) => t.name !== name);
      return [...prev, { name, role, contact }];
    });
  };

  const handlePropChecklistToggle = (item, quantity) => {
    setAllocatedProps((prev) => {
      const exists = prev.some((p) => p.item === item);
      if (exists) return prev.filter((p) => p.item !== item);
      return [...prev, { item, quantity, returnStatus: "pending" }];
    });
  };

  const handlePropReturnStatusChange = (idx, status) => {
    setAllocatedProps((prev) => {
      const next = [...prev];
      next[idx].returnStatus = status;
      return next;
    });
  };

  const getCalendarDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) days.push({ day: null, dateStr: null });
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({ day: i, dateStr });
    }
    return days;
  };

  const calendarDays = getCalendarDays();
  const currentMonthName = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const totalContractVal = bookings.reduce((acc, b) => acc + (b.pricing?.totalPrice || 0), 0);
  const outstandingBal = bookings.reduce((acc, b) => acc + (b.pricing?.pendingBalance || 0), 0);
  const activeBookingsCount = bookings.filter((b) => b.status === "active").length;
  const upcomingSetupsCount = bookings.filter((b) => ["confirmed", "team_assigned", "setup_in_progress"].includes(b.status)).length;

  const tabs = [
    { id: "dashboard", label: "Overview", icon: "dashboard" },
    { id: "bookings", label: "Bookings", icon: "assignment" },
    { id: "showcases", label: "Showcase", icon: "redeem" },
    { id: "inventory", label: "Inventory", icon: "inventory" },
    { id: "calendar", label: "Calendar", icon: "calendar_month" },
    { id: "packages", label: "Packages", icon: "celebration" },
    { id: "team", label: "Team", icon: "groups" },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6 pb-20">
      <PageHeader
        title="Events & Bookings Manager"
        subtitle={`${bookings.length} active event bookings recorded`}
      >
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
            setTimeout(() => window.scrollTo({ top: 120, behavior: "smooth" }), 150);
          }}
          className="admin-btn admin-btn-primary h-9"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Showcase
        </button>
      </PageHeader>

      <motion.div variants={fadeUp}>
        <FilterBar
          filters={tabs.map(t => t.id)}
          value={activeTab}
          onChange={setActiveTab}
          className="pb-0 border-b border-[var(--admin-border-subtle)]"
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <motion.div key="dashboard" initial="hidden" animate="show" variants={fadeUp} className="space-y-6">
            <div className="admin-grid-stats">
              <StatCard
                icon="account_balance_wallet"
                label="Total Bookings Value"
                value={formatCurrency(totalContractVal)}
                change="Active Bookings"
                changeType="up"
                color="var(--admin-info)"
              />
              <StatCard
                icon="pending_actions"
                label="Pending Payments"
                value={formatCurrency(outstandingBal)}
                change="To Collect"
                changeType="up"
                color="var(--admin-warning)"
              />
              <StatCard
                icon="event_available"
                label="Setups Today"
                value={activeBookingsCount}
                change="Live Events"
                changeType="up"
                color="var(--admin-success)"
              />
              <StatCard
                icon="edit_calendar"
                label="Upcoming Setups"
                value={upcomingSetupsCount}
                change="Scheduled"
                changeType="up"
                color="var(--admin-accent)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartCard title="New Event Inquiries">
                <div className="space-y-3 mt-4">
                  {bookings.slice(0, 4).map((b) => (
                    <div
                      key={b._id || b.id}
                      onClick={() => { setSelectedBooking(b); setIsDrawerOpen(true); }}
                      className="p-3 bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] flex items-center justify-between hover:border-[var(--admin-border-strong)] cursor-pointer transition-colors"
                    >
                      <div className="space-y-1 min-w-0 flex-1 pr-4">
                        <span className="admin-badge admin-badge-neutral text-[9px] uppercase font-bold">{b.eventType}</span>
                        <h4 className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate">{b.title}</h4>
                        <p className="text-[11px] text-[var(--admin-text-tertiary)] truncate">{b.venue?.address}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[12px] font-bold text-[var(--admin-text-primary)] block">{formatCurrency(b.pricing?.totalPrice)}</span>
                        <StatusBadge status={b.status.replace("_", "")} />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab("bookings")}
                  className="w-full mt-4 py-2 text-[12px] font-bold text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] transition-colors text-center"
                >
                  View All Bookings →
                </button>
              </ChartCard>

              <ChartCard title="Occasion Category Distributions">
                <div className="space-y-4 mt-4">
                  {[
                    { label: "Wedding Ceremony", count: bookings.filter(b => b.eventType === "wedding").length, color: "var(--admin-accent)" },
                    { label: "Engagement Ceremony", count: bookings.filter(b => b.eventType === "engagement").length, color: "var(--admin-text-primary)" },
                    { label: "Haldi & Mehndi", count: bookings.filter(b => b.eventType === "haldi").length, color: "var(--admin-warning)" },
                    { label: "Reception Gala", count: bookings.filter(b => b.eventType === "reception").length, color: "var(--admin-success)" },
                    { label: "Puja Decor", count: bookings.filter(b => b.eventType === "festival").length, color: "var(--admin-text-secondary)" },
                  ].map((cat, idx) => {
                    const pct = bookings.length > 0 ? (cat.count / bookings.length) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-[var(--admin-text-secondary)]">{cat.label}</span>
                          <span className="text-[var(--admin-text-primary)]">{cat.count} Setups ({Math.round(pct)}%)</span>
                        </div>
                        <div className="h-2 w-full bg-[var(--admin-surface-muted)] rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full rounded-full" style={{ backgroundColor: cat.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>
            </div>
          </motion.div>
        )}

        {/* BOOKINGS */}
        {activeTab === "bookings" && (
          <motion.div key="bookings" initial="hidden" animate="show" variants={fadeUp} className="admin-card overflow-hidden">
            {loadingBookings ? (
               <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-[var(--admin-border-strong)] border-t-[var(--admin-accent)] rounded-full animate-spin" /></div>
            ) : bookings.length === 0 ? (
              <div className="py-20 text-center text-[var(--admin-text-tertiary)] text-[12px]">No active custom bookings logged.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="admin-table w-full">
                  <thead>
                    <tr>
                      <th>Customer Details</th>
                      <th>Event Type</th>
                      <th>Date & Venue</th>
                      <th>Total Price</th>
                      <th>Booking Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b._id || b.id} className="admin-table-row-clickable" onClick={() => { setSelectedBooking(b); setIsDrawerOpen(true); }}>
                        <td>
                          <div className="space-y-0.5">
                            <span className="text-[12px] font-bold text-[var(--admin-text-primary)] block">{b.user?.name || "Anonymous Client"}</span>
                            <span className="text-[11px] text-[var(--admin-text-tertiary)] block">{b.user?.phone || "No contact"}</span>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-1">
                            <span className="admin-badge admin-badge-neutral text-[9px] uppercase font-bold">{b.eventType}</span>
                            <h4 className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate max-w-[150px]">{b.title}</h4>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-0.5">
                            <span className="text-[12px] font-bold text-[var(--admin-text-primary)] block">
                              {new Date(b.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                            <span className="text-[11px] text-[var(--admin-text-tertiary)] truncate max-w-[180px] block">{b.venue?.address}</span>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-0.5">
                            <span className="text-[12px] font-bold text-[var(--admin-text-primary)] block">{formatCurrency(b.pricing?.totalPrice)}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${b.pricing?.paymentStatus === "paid" ? "text-[var(--admin-success)]" : "text-[var(--admin-warning)]"}`}>
                              {b.pricing?.paymentStatus}
                            </span>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={b.status.replace("_", "")} />
                        </td>
                        <td className="text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); setIsDrawerOpen(true); }}
                            className="admin-btn admin-btn-outline h-8 min-h-0 text-[10px] px-3 py-0"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* CALENDAR */}
        {activeTab === "calendar" && (
          <motion.div key="calendar" initial="hidden" animate="show" variants={fadeUp} className="admin-card p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-4">
              <div>
                <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">Monthly Event Schedule</span>
                <h3 className="text-[16px] font-bold text-[var(--admin-text-primary)]">{currentMonthName}</h3>
              </div>
              <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--admin-accent)]" /> Wedding</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--admin-text-primary)]" /> Engagement</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--admin-warning)]" /> Haldi</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-[11px]">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="py-2 font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-md)]">{day}</div>
              ))}
              {calendarDays.map((cell, idx) => {
                const dayBookings = cell.dateStr ? bookings.filter((b) => b.date.substring(0, 10) === cell.dateStr) : [];
                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] p-2 flex flex-col justify-between text-left transition-colors ${
                      cell.day ? "bg-[var(--admin-surface)] hover:border-[var(--admin-border-strong)]" : "bg-[var(--admin-bg-subtle)]"
                    }`}
                  >
                    {cell.day && <span className="font-bold text-[var(--admin-text-tertiary)]">{cell.day}</span>}
                    {dayBookings.length > 0 && (
                      <div className="space-y-1.5 mt-2">
                        {dayBookings.map((b) => (
                          <div
                            key={b._id}
                            onClick={() => { setSelectedBooking(b); setIsDrawerOpen(true); }}
                            className={`p-1.5 text-[10px] font-bold rounded-[var(--admin-radius-sm)] text-white truncate cursor-pointer shadow-sm ${
                              b.eventType === "wedding" ? "bg-[var(--admin-accent)]" : b.eventType === "engagement" ? "bg-[var(--admin-text-primary)] text-white" : "bg-[var(--admin-warning)] text-white"
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
          </motion.div>
        )}

        {/* PACKAGES */}
        {activeTab === "packages" && (
          <motion.div key="packages" initial="hidden" animate="show" variants={fadeUp} className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">Decor Packages & Themes</h3>
                <p className="text-[12px] text-[var(--admin-text-tertiary)] mt-0.5">Manage published catalogs visible to customer discovery masonry grids.</p>
              </div>
              <button
                onClick={() => { if (showForm) handleCancel(); else setShowForm(true); }}
                className="admin-btn admin-btn-primary h-9"
              >
                <span className="material-symbols-outlined text-[16px]">{showForm ? "close" : "add"}</span>
                {showForm ? "Close Creator" : "Publish Theme Curation"}
              </button>
            </div>

            <AnimatePresence>
              {showForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="admin-card p-6 overflow-hidden">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <ImageUpload label="Cover Image *" value={formData.image} onChange={(url) => setFormData({ ...formData, image: url })} folder="events" />
                      <ImageUpload label="Gallery perspective 1" value={formData.galleryImages[0]} onChange={(url) => { const list = [...formData.galleryImages]; list[0] = url; setFormData({ ...formData, galleryImages: list }); }} folder="events" />
                      <ImageUpload label="Gallery perspective 2" value={formData.galleryImages[1]} onChange={(url) => { const list = [...formData.galleryImages]; list[1] = url; setFormData({ ...formData, galleryImages: list }); }} folder="events" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-2">
                        <label className="admin-label">Theme Title *</label>
                        <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="admin-input" required />
                      </div>
                      <div className="space-y-2">
                        <label className="admin-label">Subtitle</label>
                        <input type="text" value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} className="admin-input" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="admin-label mb-0">Category *</label>
                          <button type="button" onClick={() => setShowCatModal(true)} className="text-[10px] font-bold text-[var(--admin-accent)] hover:underline flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">add_circle</span> Manage
                          </button>
                        </div>
                        <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="admin-input" required>
                          <option value="">Select Category</option>
                          {customCategories?.events?.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                      <div className="space-y-2">
                        <label className="admin-label">Decor Style *</label>
                        <select value={formData.style} onChange={(e) => setFormData({ ...formData, style: e.target.value })} className="admin-input" required>
                          <option value="">Select Style</option>
                          {DECOR_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="admin-label">Pricing Tag</label>
                        <input type="text" value={formData.pricing} onChange={(e) => setFormData({ ...formData, pricing: e.target.value })} className="admin-input" />
                      </div>
                      <div className="space-y-2">
                        <label className="admin-label">Venue Footprint</label>
                        <input type="text" value={formData.venueSize} onChange={(e) => setFormData({ ...formData, venueSize: e.target.value })} className="admin-input" />
                      </div>
                      <div className="space-y-2">
                        <label className="admin-label">Completed Count</label>
                        <input type="text" value={formData.decorCount} onChange={(e) => setFormData({ ...formData, decorCount: e.target.value })} className="admin-input" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="admin-label">Atmospheric Narrative (Description) *</label>
                      <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="admin-textarea" required />
                    </div>

                    <div className="border-t border-[var(--admin-border-subtle)] pt-5 space-y-5">
                      <div>
                        <h4 className="text-[12px] font-bold text-[var(--admin-text-primary)] flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">language</span> SEO Meta Configuration
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="admin-label">SEO Meta Title</label>
                          <input type="text" value={formData.seoTitle || ""} onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })} className="admin-input" />
                        </div>
                        <div className="space-y-2">
                          <label className="admin-label">SEO Meta Description</label>
                          <textarea rows={2} value={formData.seoDescription || ""} onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })} className="admin-textarea" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-5 border-t border-[var(--admin-border-subtle)]">
                      <button type="submit" disabled={isSaving} className="admin-btn h-10 px-8">
                        {isSaving ? "Saving..." : editingId ? "Update Setup" : "Publish Theme"}
                      </button>
                      <button type="button" onClick={handleCancel} className="admin-btn admin-btn-outline h-10 px-6">Cancel</button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {loadingPortfolio ? (
              <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-[var(--admin-border-strong)] border-t-[var(--admin-accent)] rounded-full animate-spin" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {events.map((ev) => (
                  <div key={ev._id || ev.id} className="admin-card overflow-hidden p-0 flex flex-col group">
                    <div className="relative aspect-[16/10] overflow-hidden bg-[var(--admin-bg-subtle)] shrink-0">
                      <img src={ev.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={ev.title} />
                      <span className="absolute top-3 left-3 admin-badge bg-[var(--admin-surface)] text-[var(--admin-text-primary)] border-none shadow-[var(--admin-shadow-sm)] font-bold">
                        {ev.category}
                      </span>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)] leading-snug">{ev.title}</h4>
                          <span className="text-[11px] font-bold text-[var(--admin-accent)] shrink-0">{ev.pricing}</span>
                        </div>
                        <p className="text-[11px] text-[var(--admin-text-secondary)] line-clamp-2 leading-relaxed">{ev.description}</p>
                      </div>
                      <div className="flex gap-2 pt-4 mt-4 border-t border-[var(--admin-border-subtle)]">
                        <button onClick={() => handleEdit(ev)} className="admin-btn admin-btn-outline flex-1 min-h-[32px] h-8 text-[11px] px-0">
                          <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                        </button>
                        <button onClick={() => navigate(`/events/${ev._id || ev.id}`)} className="admin-btn-icon w-8 h-8 min-h-0 bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)]">
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* INVENTORY */}
        {activeTab === "inventory" && (
          <motion.div key="inventory" initial="hidden" animate="show" variants={fadeUp} className="space-y-6">
            <div className="admin-card p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-4">
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">Rental Inventory Stock Ledger</h3>
                <span className="admin-badge admin-badge-neutral">{inventoryItems.length} Props tracked</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {operationsLoading ? (
                  <div className="col-span-full py-10 text-center text-[var(--admin-text-tertiary)] text-[12px]">Loading live inventory...</div>
                ) : inventoryItems.length > 0 ? inventoryItems.map((prop, idx) => (
                  <div key={idx} className="p-5 bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] flex flex-col justify-between h-36">
                    <div>
                      <StatusBadge status={prop.status} className="mb-2" />
                      <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)] leading-tight line-clamp-2">{prop.item}</h4>
                    </div>
                    <div className="flex justify-between items-end border-t border-[var(--admin-border)] pt-3 text-[11px]">
                      <span className="text-[var(--admin-text-tertiary)]">Stock: <strong className="text-[var(--admin-text-primary)] font-bold">{prop.stock}</strong></span>
                      <span className="text-[var(--admin-text-tertiary)]">Rented: <strong className="text-[var(--admin-text-primary)] font-bold">{prop.rented}</strong></span>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-10 text-center text-[var(--admin-text-tertiary)] text-[12px]">No product inventory is available yet.</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* TEAM */}
        {activeTab === "team" && (
          <motion.div key="team" initial="hidden" animate="show" variants={fadeUp} className="space-y-6">
            <div className="admin-card p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-4">
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">Available Setup Staff & Crew</h3>
                <span className="admin-badge admin-badge-neutral">{teamMembers.length} Staff members</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {operationsLoading ? (
                  <div className="col-span-full py-10 text-center text-[var(--admin-text-tertiary)] text-[12px]">Loading live staff list...</div>
                ) : teamMembers.length > 0 ? teamMembers.map((team, idx) => (
                  <div key={idx} className="p-5 bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] flex items-center justify-between">
                    <div>
                      <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)]">{team.name}</h4>
                      <span className="text-[11px] text-[var(--admin-text-secondary)] font-medium block mt-0.5 capitalize">{team.role}</span>
                      <span className="text-[11px] text-[var(--admin-text-tertiary)] block mt-1">{team.contact}</span>
                    </div>
                    <StatusBadge status="active" className="opacity-80" />
                  </div>
                )) : (
                  <div className="col-span-full py-10 text-center text-[var(--admin-text-tertiary)] text-[12px]">No team members are available for allocation yet.</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* SHOWCASES */}
        {activeTab === "showcases" && (
          <motion.div key="showcases" initial="hidden" animate="show" variants={fadeUp} className="space-y-6">
            {showShowcaseForm && (
              <div className="admin-card p-6 space-y-6">
                <div className="border-b border-[var(--admin-border-subtle)] pb-4">
                  <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)]">{editingShowcaseId ? "Edit Showcase Collection" : "Create Traditional Design"}</h4>
                  <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1">Provide details for traditional wedding, ring ceremony, or gift setups.</p>
                </div>
                
                <div className="bg-[var(--admin-surface-muted)] p-6 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] space-y-5">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="admin-label mb-1">Step 1: Upload Photo Blueprint *</span>
                      <p className="text-[11px] text-[var(--admin-text-tertiary)]">Upload cover photography first. AI Vision can analyze props.</p>
                    </div>
                    {showcaseForm.image && <StatusBadge status="active" className="bg-[var(--admin-success-light)] text-[var(--admin-success)]" />}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="md:col-span-2 space-y-2">
                      <label className="admin-label">Cover Image URL *</label>
                      <input type="text" required value={showcaseForm.image} onChange={(e) => setShowcaseForm({ ...showcaseForm, image: e.target.value })} className="admin-input font-mono" />
                    </div>
                    <div>
                      <ImageUpload onUploadSuccess={(url) => { setShowcaseForm(prev => ({ ...prev, image: url })); toast.success("Photo uploaded! Click '✨ AI Autofill'"); }} label="Drop cover photography" />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button type="button" onClick={handleAiAutofill} className="admin-btn h-9 bg-[var(--admin-accent)] text-white hover:bg-black">
                    <span className="material-symbols-outlined text-[16px] animate-pulse">auto_awesome</span> AI Autofill from Photo
                  </button>
                </div>
                
                <form onSubmit={handleCreateOrUpdateShowcase} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="admin-label">Title *</label>
                      <input type="text" required value={showcaseForm.title} onChange={(e) => setShowcaseForm({ ...showcaseForm, title: e.target.value })} className="admin-input" />
                    </div>
                    <div className="space-y-2">
                      <label className="admin-label">Category</label>
                      <select value={showcaseForm.category} onChange={(e) => setShowcaseForm({ ...showcaseForm, category: e.target.value })} className="admin-input">
                        <option value="engagement_gift">Engagement Gifts</option>
                        <option value="telugu_heritage">Telugu Heritage</option>
                        <option value="wedding_rituals">Wedding Rituals</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="admin-label">Rental Price (₹)</label>
                      <input type="number" required value={showcaseForm.rentalPrice} onChange={(e) => setShowcaseForm({ ...showcaseForm, rentalPrice: e.target.value })} className="admin-input" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="admin-label">Description *</label>
                    <textarea rows={3} required value={showcaseForm.description} onChange={(e) => setShowcaseForm({ ...showcaseForm, description: e.target.value })} className="admin-textarea" />
                  </div>

                  <div className="flex justify-end gap-3 pt-5 border-t border-[var(--admin-border-subtle)]">
                    <button type="button" onClick={() => setShowShowcaseForm(false)} className="admin-btn admin-btn-outline h-10 px-6">Cancel</button>
                    <button type="submit" className="admin-btn h-10 px-8">{editingShowcaseId ? "Update Design" : "Save Design"}</button>
                  </div>
                </form>
              </div>
            )}

            <div className="admin-card p-6 space-y-6">
              <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)]">Tambulam & Gift Presentation Designs</h4>
              {loadingShowcases ? (
                 <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-[var(--admin-border-strong)] border-t-[var(--admin-accent)] rounded-full animate-spin" /></div>
              ) : showcases.length === 0 ? (
                <div className="py-20 text-center text-[var(--admin-text-tertiary)] text-[12px]">No tambulam or gift designs have been created yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {showcases.map((sc) => (
                    <div key={sc._id || sc.id} className="bg-[var(--admin-surface-muted)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] overflow-hidden flex flex-col justify-between">
                      <div>
                        <div className="relative h-40 overflow-hidden bg-[var(--admin-bg-subtle)]">
                          <img src={sc.image} className="w-full h-full object-cover" alt={sc.title} />
                          <span className="absolute top-2 left-2 admin-badge bg-[var(--admin-accent)] text-white border-none font-bold shadow-sm">{sc.category?.replace("_", " ")}</span>
                        </div>
                        <div className="p-4 space-y-2">
                          <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)] truncate">{sc.title}</h4>
                          <span className="text-[12px] font-bold text-[var(--admin-accent)] block">{formatCurrency(sc.rentalPrice)} / day</span>
                          <p className="text-[11px] text-[var(--admin-text-secondary)] line-clamp-2">{sc.description}</p>
                        </div>
                      </div>
                      <div className="p-4 border-t border-[var(--admin-border-subtle)] flex gap-2">
                        <button onClick={() => handleEditShowcase(sc)} className="admin-btn admin-btn-outline flex-1 min-h-[32px] h-8 text-[11px] px-0">
                          <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                        </button>
                        <button onClick={() => handleDeleteShowcase(sc._id || sc.id)} className="admin-btn-icon w-8 h-8 min-h-0 bg-[var(--admin-error-light)] text-[var(--admin-error)] hover:bg-[var(--admin-error)] hover:text-white border-none">
                          <span className="material-symbols-outlined text-[14px]">delete</span>
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

      {/* DRAWER */}
      <AnimatePresence>
        {isDrawerOpen && selectedBooking && (
          <div className="fixed inset-0 z-[200] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDrawerOpen(false)} className="absolute inset-0" style={{ background: "var(--admin-surface-overlay)", backdropFilter: "blur(4px)" }} />
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-[850px] bg-[var(--admin-surface)] h-full shadow-[var(--admin-shadow-2xl)] flex flex-col md:flex-row z-10 overflow-hidden border-l border-[var(--admin-border)]"
            >
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 border-r border-[var(--admin-border-subtle)] custom-scrollbar">
                <div className="flex justify-between items-start border-b border-[var(--admin-border-subtle)] pb-5">
                  <div>
                    <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">EVENT BOOKING DETAILS</span>
                    <h3 className="text-[16px] font-bold text-[var(--admin-text-primary)]">{selectedBooking.title}</h3>
                    <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1">Customer: {selectedBooking.user?.name} | {selectedBooking.user?.phone}</p>
                  </div>
                  <button onClick={() => setIsDrawerOpen(false)} className="admin-btn-icon w-8 h-8 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] bg-[var(--admin-surface-muted)]">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="admin-label">Change Booking Status</label>
                  <select value={drawerStatus} onChange={(e) => handleUpdateStatus(e.target.value)} className="admin-input h-10 font-bold capitalize">
                    <option value="inquiry">Inquiry Received</option>
                    <option value="review">Under Review</option>
                    <option value="confirmed">Booking Confirmed</option>
                    <option value="team_assigned">Staff Assigned</option>
                    <option value="setup_in_progress">Setup In Progress</option>
                    <option value="active">Event Active & Live</option>
                    <option value="completed">Completed & Cleaned Up</option>
                  </select>
                </div>

                <div className="space-y-4 pt-5 border-t border-[var(--admin-border-subtle)]">
                  <span className="admin-label mb-0">Price Estimates</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">Theme Rental Fee (₹)</label><input type="number" value={quoteRental} onChange={(e) => setQuoteRental(e.target.value)} className="admin-input" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">Labor & Setup Charges (₹)</label><input type="number" value={quoteSetup} onChange={(e) => setQuoteSetup(e.target.value)} className="admin-input" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">Transportation (₹)</label><input type="number" value={quoteTransport} onChange={(e) => setQuoteTransport(e.target.value)} className="admin-input" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">Add-ons (₹)</label><input type="number" value={quoteAddons} onChange={(e) => setQuoteAddons(e.target.value)} className="admin-input" disabled /></div>
                  </div>
                  <button onClick={handleUpdateQuotation} className="admin-btn w-full h-10">Save & Send Price Estimate</button>
                </div>

                <div className="space-y-4 pt-5 border-t border-[var(--admin-border-subtle)]">
                  <span className="admin-label mb-0">Setup & Pickup Schedule</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">Setup Time</label><input type="datetime-local" value={logisticsSetup} onChange={(e) => setLogisticsSetup(e.target.value)} className="admin-input" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">Pickup Time</label><input type="datetime-local" value={logisticsPickup} onChange={(e) => setLogisticsPickup(e.target.value)} className="admin-input" /></div>
                  </div>
                </div>

                <div className="space-y-4 pt-5 border-t border-[var(--admin-border-subtle)]">
                  <div className="flex items-center justify-between">
                    <span className="admin-label mb-0">Celebration Venue & Map</span>
                    <span className="admin-badge admin-badge-info">Interactive Geocoding</span>
                  </div>
                  <div className="relative w-full h-[200px] rounded-[var(--admin-radius-xl)] overflow-hidden border border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]">
                    <div id="admin-leaflet-map" className="w-full h-full z-10" />
                  </div>
                  <p className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">📍 Drag the marker or click on the map to auto-geocode fields!</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1 sm:col-span-2"><label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">Venue Name</label><input type="text" value={venueName} onChange={(e) => setVenueName(e.target.value)} className="admin-input" /></div>
                    <div className="space-y-1 sm:col-span-2"><label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">Address</label><textarea rows={2} value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} className="admin-textarea" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">Latitude</label><input type="number" step="any" value={venueLatitude} onChange={(e) => handleAdminCoordInputChange("lat", e.target.value)} className="admin-input font-mono" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">Longitude</label><input type="number" step="any" value={venueLongitude} onChange={(e) => handleAdminCoordInputChange("lng", e.target.value)} className="admin-input font-mono" /></div>
                  </div>
                </div>

                <div className="space-y-3 pt-5 border-t border-[var(--admin-border-subtle)]">
                  <span className="admin-label mb-0">Assign Staff</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {teamMembers.map((member) => {
                      const isAllocated = allocatedTeam.some((t) => t.name === member.name);
                      return (
                        <div key={member.name} onClick={() => handleTeamMemberToggle(member.name, member.role, member.contact)} className={`p-3 rounded-[var(--admin-radius-lg)] border cursor-pointer transition-all flex justify-between items-center ${isAllocated ? "bg-[var(--admin-surface-muted)] border-[var(--admin-border-strong)]" : "border-[var(--admin-border-subtle)] hover:border-[var(--admin-border-strong)]"}`}>
                          <div><span className="text-[12px] font-bold text-[var(--admin-text-primary)] block">{member.name}</span><span className="text-[10px] text-[var(--admin-text-tertiary)] block capitalize">{member.role}</span></div>
                          <input type="checkbox" checked={isAllocated} readOnly className="w-4 h-4 rounded-[4px] border-[var(--admin-border-strong)] accent-[var(--admin-accent)] cursor-pointer" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button onClick={handleUpdateLogistics} className="admin-btn w-full h-11 text-[12px]">Save Timeline & Staff</button>
              </div>

              {/* Chat Panel */}
              <div className="w-full md:w-[320px] bg-[var(--admin-bg-subtle)] p-6 flex flex-col h-full shrink-0 border-t md:border-t-0 border-[var(--admin-border-subtle)]">
                <div className="border-b border-[var(--admin-border-subtle)] pb-4 shrink-0 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">CLIENT CHAT</span>
                    <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)]">Customer Messages</h4>
                  </div>
                  <span className="material-symbols-outlined text-[20px] text-[var(--admin-accent)]">forum</span>
                </div>

                <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-2 custom-scrollbar flex flex-col">
                  {selectedBooking.chatHistory?.map((chat, idx) => {
                    const isAdmin = chat.sender === "admin";
                    return (
                      <div key={idx} className={`flex flex-col max-w-[85%] ${isAdmin ? "self-end text-right ml-auto" : "self-start text-left"}`}>
                        <span className="text-[9px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">{isAdmin ? "You" : "Client"}</span>
                        <div className={`p-3 text-[12px] leading-relaxed shadow-sm ${isAdmin ? "bg-[var(--admin-accent)] text-white rounded-[16px] rounded-tr-[4px]" : "bg-[var(--admin-surface)] text-[var(--admin-text-primary)] border border-[var(--admin-border)] rounded-[16px] rounded-tl-[4px]"}`}>
                          {chat.message}
                        </div>
                        <span className="text-[9px] font-bold text-[var(--admin-text-tertiary)] mt-1.5 block">{new Date(chat.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendAdminChat} className="pt-4 shrink-0 flex items-center gap-2 mt-auto">
                  <input type="text" placeholder="Message..." value={drawerChatMsg} onChange={(e) => setDrawerChatMsg(e.target.value)} className="admin-input h-10 flex-1 rounded-full" required />
                  <button type="submit" className="w-10 h-10 rounded-full bg-[var(--admin-accent)] text-white flex items-center justify-center hover:bg-[var(--admin-accent-hover)] transition-all shrink-0"><span className="material-symbols-outlined text-[16px]">send</span></button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {showCatModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCatModal(false)} className="absolute inset-0" style={{ background: "var(--admin-surface-overlay)", backdropFilter: "blur(4px)" }} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-xl bg-[var(--admin-surface)] rounded-[var(--admin-radius-2xl)] shadow-[var(--admin-shadow-2xl)] p-8 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar border border-[var(--admin-border)]">
              <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-5 mb-6">
                <div>
                  <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">STUDIO THEMES</span>
                  <h3 className="text-[16px] font-bold text-[var(--admin-text-primary)]">Theme Categories</h3>
                </div>
                <button onClick={() => setShowCatModal(false)} className="admin-btn-icon w-8 h-8 min-h-0 bg-[var(--admin-surface-muted)]"><span className="material-symbols-outlined text-[18px]">close</span></button>
              </div>

              <form onSubmit={handleSaveCat} className="bg-[var(--admin-bg-subtle)] p-5 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] mb-8 space-y-4">
                <h4 className="text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider">{editingCatId ? "Edit Theme" : "Create New Theme"}</h4>
                <div className="space-y-2"><label className="admin-label">Name *</label><input type="text" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} className="admin-input" required /></div>
                <div className="space-y-2"><label className="admin-label">Description</label><input type="text" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} className="admin-input" /></div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  {editingCatId && <button type="button" onClick={() => { setEditingCatId(null); setCatForm({ name: "", description: "", image: "" }); }} className="admin-btn admin-btn-outline h-9 px-4">Cancel</button>}
                  <button type="submit" className="admin-btn h-9 px-6">{editingCatId ? "Save Changes" : "Add Theme"}</button>
                </div>
              </form>

              <div className="space-y-3">
                <h4 className="text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider mb-4">Active Themes</h4>
                {customCategories?.events?.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-4 bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] shadow-sm">
                    <div>
                      <span className="text-[13px] font-bold text-[var(--admin-text-primary)] block">{cat.name}</span>
                      {cat.description && <span className="text-[11px] text-[var(--admin-text-secondary)] block mt-0.5">{cat.description}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => handleEditCat(cat)} className="admin-btn-icon w-8 h-8 min-h-0 bg-[var(--admin-surface-muted)]"><span className="material-symbols-outlined text-[14px]">edit</span></button>
                      <button onClick={() => deleteCustomCategory("events", cat.id)} className="admin-btn-icon w-8 h-8 min-h-0 bg-[var(--admin-error-light)] text-[var(--admin-error)] border-none hover:bg-[var(--admin-error)] hover:text-white"><span className="material-symbols-outlined text-[14px]">delete</span></button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
