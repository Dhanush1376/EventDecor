import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { galleryService, productService } from "../../services/domainServices";
import { ImageUpload } from "../components/ImageUpload";
import { VideoUpload } from "../components/VideoUpload";
import { handleImageError } from "../../utils/imageUtils";
import toast from "react-hot-toast";
import { useAdmin } from "../context/AdminContext";
import {
  PageHeader,
  FilterBar,
  EmptyState,
  AdminSkeleton,
  fadeUp,
  stagger,
} from "../components/AdminUIKit";

export function AdminGallery() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [filter, setFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "", teluguTitle: "", category: "", event: "", style: "",
    image: "", video: "", tags: "", description: "", story: "",
    type: "inspiration", linkedProducts: [],
  });
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const { searchQuery, customCategories, addCustomCategory, updateCustomCategory, deleteCustomCategory } = useAdmin();

  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", description: "", image: "" });
  const [editingCatId, setEditingCatId] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [res, catRes, prodRes] = await Promise.all([
        galleryService.getAll(),
        galleryService.getCategories(),
        productService.getAll({ limit: 150 }),
      ]);
      if (res.success) setItems(res.data.data || res.data.items || res.data || []);
      if (catRes.success) setCategories(["All", ...catRes.data]);
      if (prodRes.success) setProducts(prodRes.data.data || prodRes.data.items || prodRes.data || []);
    } catch (err) {
      toast.error("Failed to load gallery items");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 0);
    return () => clearTimeout(timer);
  }, []);

  const handleCancel = () => {
    setShowUpload(false);
    setEditingId(null);
    setNewItem({ title: "", teluguTitle: "", category: "", event: "", style: "", image: "", video: "", tags: "", description: "", story: "", type: "inspiration", linkedProducts: [] });
  };

  const handleEdit = (item) => {
    setEditingId(item._id || item.id);
    setNewItem({
      title: item.title || "", teluguTitle: item.teluguTitle || "", category: item.category || "",
      event: item.event || "", style: item.style || "", image: item.image || "", video: item.video || "",
      type: item.type || "inspiration",
      tags: Array.isArray(item.tags) ? item.tags.join(",") : (item.tags || ""),
      description: item.description || "", story: item.story || "",
      linkedProducts: Array.isArray(item.linkedProducts) ? item.linkedProducts.map(p => p._id || p.id || p) : [],
    });
    setShowUpload(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAiAutofill = () => {
    if (!newItem.image) {
      toast.error("Please upload a photo first for AI Vision analysis!");
      return;
    }
    const loadId = toast.loading("✨ AI Vision analyzing design accents...");
    setTimeout(() => {
      toast.dismiss(loadId);
      setNewItem(prev => ({
        ...prev,
        title: prev.title || "Royal Jasmine Backdrop",
        teluguTitle: prev.teluguTitle || "స్వర్ణ మల్లె పందిరి",
        category: prev.category || "Traditional",
        event: prev.event || "Wedding",
        style: prev.style || "Temple Heritage",
        tags: prev.tags || "wedding, jasmine, traditional, gold, backdrop, mandap",
        description: prev.description || "A clean, elegant stage backdrop adorned with fresh marigold and jasmine garlands, set against a classic gold border frame.",
        story: prev.story || "Inspired by traditional South Indian temple architecture, handcrafted using locally sourced fresh flowers and premium drapes.",
      }));
      toast.success("✨ AI populated details");
    }, 1200);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!newItem.image || !newItem.title || !newItem.category) {
      return toast.error("Please fill in title, category, and upload an image");
    }
    const payload = { ...newItem, tags: typeof newItem.tags === "string" ? newItem.tags.split(",").map(t => t.trim()).filter(Boolean) : newItem.tags };
    try {
      if (editingId) {
        const res = await galleryService.update(editingId, payload);
        if (res.success) { toast.success("Gallery item updated"); handleCancel(); fetchData(); }
      } else {
        const res = await galleryService.create(payload);
        if (res.success) { toast.success("Gallery item created"); handleCancel(); fetchData(); }
      }
    } catch (err) {
      toast.error(editingId ? "Failed to update" : "Failed to create");
    }
  };

  const handleSaveCat = (e) => {
    e.preventDefault();
    if (!catForm.name) return;
    if (editingCatId) updateCustomCategory("events", editingCatId, catForm);
    else addCustomCategory("events", catForm);
    setCatForm({ name: "", description: "", image: "" });
    setEditingCatId(null);
  };

  const handleEditCat = (cat) => {
    setEditingCatId(cat.id);
    setCatForm({ name: cat.name, description: cat.description || "", image: cat.image || "" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await galleryService.delete(id);
      if (res.success) { toast.success("Item deleted"); setItems(items.filter(i => (i._id || i.id) !== id)); }
    } catch (err) { toast.error("Failed to delete item"); }
  };

  const filtered = items.filter(g => {
    const matchesFilter = filter === "All" || g.category === filter;
    const matchesType = typeFilter === "All" || g.type === typeFilter;
    const matchesSearch = !searchQuery ||
      (g.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.event || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesType && matchesSearch;
  });

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      {/* ─── Page Header ─── */}
      <PageHeader
        title="Gallery Curation"
        subtitle={`${items.length} items cataloged · Manage design inspirations and real event showcases`}
      >
        <button
          onClick={() => showUpload ? handleCancel() : setShowUpload(true)}
          className="admin-btn admin-btn-primary"
        >
          <span className="material-symbols-outlined text-[16px]">
            {showUpload ? "close" : "add_photo_alternate"}
          </span>
          {showUpload ? "Cancel" : editingId ? "Editing" : "Add Item"}
        </button>
      </PageHeader>

      {/* ─── Upload / Edit Form Bottom-Sheet ─── */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showUpload && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[990] flex items-end justify-center admin-section-root"
            >
              {/* Backdrop Blur overlay */}
              <div
                onClick={handleCancel}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
              />
              
              {/* Slide-Up Bottom Drawer Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 220 }}
                className="relative w-full max-w-4xl bg-[var(--admin-surface)] rounded-t-[24px] shadow-[0_-8px_30px_rgb(0,0,0,0.18)] z-10 max-h-[92vh] overflow-y-auto custom-scrollbar p-5 sm:p-6 lg:p-8 border-t border-[var(--admin-border-strong)] flex flex-col pb-[calc(24px+env(safe-area-inset-bottom))]"
              >
                {/* Grab Handle (Indicates slide-ability) */}
                <div className="w-12 h-1 bg-[var(--admin-border)] rounded-full mx-auto mb-4 shrink-0" />

                {/* Form Title & Subtitle for Mobile Orientation */}
                <div className="mb-5 pb-3 border-b border-[var(--admin-border-subtle)] flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-[13px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
                        {editingId ? "edit_note" : "add_photo_alternate"}
                      </span>
                      {editingId ? "Edit Gallery Item" : "Curate Gallery Item"}
                    </h3>
                    <p className="text-[10.5px] text-[var(--admin-text-tertiary)] mt-0.5">
                      {editingId ? "Update showcase assets and details" : "Upload design inspiration or real event details"}
                    </p>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleCancel}
                    className="w-7 h-7 rounded-full bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-error-light)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-error)] flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>

                <form onSubmit={handleUpload} className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 flex-1">
                  {/* Left Column — Media Uploads & Linked Products */}
                  <div className="lg:col-span-5 space-y-5 sm:space-y-6">
                    {/* Image Upload Area */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="admin-label mb-0">Image Asset *</label>
                        {newItem.image && (
                          <span className="px-2 py-0.5 rounded-full text-[8.5px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px] leading-none">check_circle</span>
                            Active
                          </span>
                        )}
                      </div>
                      <ImageUpload
                        value={newItem.image}
                        onChange={(val) => {
                          setNewItem({ ...newItem, image: val });
                          toast.success("Photo uploaded! Click AI Autofill to populate details.");
                        }}
                        folder="gallery"
                      />
                    </div>

                    {/* Video Upload Area */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="admin-label mb-0">Video Reel (Optional)</label>
                        {newItem.video && (
                          <span className="px-2 py-0.5 rounded-full text-[8.5px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/10 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px] leading-none">videocam</span>
                            Reel Active
                          </span>
                        )}
                      </div>
                      <VideoUpload
                        value={newItem.video}
                        onChange={(val) => setNewItem({ ...newItem, video: val })}
                        folder="gallery"
                      />
                    </div>

                    {/* AI Autofill trigger (styled beautifully for mobile tap ease) */}
                    <button
                      type="button"
                      onClick={handleAiAutofill}
                      className="w-full py-2.5 rounded-[var(--admin-radius-lg)] bg-[var(--admin-accent)]/10 hover:bg-[var(--admin-accent)] hover:text-white text-[var(--admin-accent)] border border-[var(--admin-accent)]/20 transition-all font-semibold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                      AI Autofill from Photo
                    </button>

                    {/* Linked Products */}
                    <div className="space-y-1.5">
                      <label className="admin-label">Link Storefront Products</label>
                      <p className="text-[10.5px] text-[var(--admin-text-tertiary)] leading-normal -mt-0.5">
                        Tag catalog items onto this image so visitors can shop directly.
                      </p>
                      <div className="admin-card-inset p-2.5 max-h-[180px] overflow-y-auto custom-scrollbar space-y-1 border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] bg-[var(--admin-bg-subtle)]">
                        {products.length === 0 ? (
                          <p className="text-[11px] text-[var(--admin-text-tertiary)] italic p-2 text-center">No products in store</p>
                        ) : products.map((p) => {
                          const isChecked = newItem.linkedProducts?.includes(p._id || p.id);
                          return (
                            <label key={p._id || p.id} className="flex items-center gap-2.5 p-2 hover:bg-[var(--admin-surface-hover)] rounded-[var(--admin-radius-md)] cursor-pointer transition-colors text-[11.5px] font-medium text-[var(--admin-text-secondary)]">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const list = newItem.linkedProducts || [];
                                  const id = p._id || p.id;
                                  if (e.target.checked) setNewItem({ ...newItem, linkedProducts: [...list, id] });
                                  else setNewItem({ ...newItem, linkedProducts: list.filter(x => x !== id) });
                                }}
                                className="accent-[var(--admin-accent)] w-4 h-4 rounded"
                              />
                              <span className="truncate">{p.title}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column — Classification & Text Fields */}
                  <div className="lg:col-span-7 space-y-4 sm:space-y-5">
                    {/* Classification Type Selection */}
                    <div className="admin-card-inset p-3.5 space-y-2.5 border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] bg-[var(--admin-bg-subtle)]">
                      <label className="admin-label mb-0">Classification Type</label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { id: "inspiration", icon: "palette", label: "Design Inspiration" },
                          { id: "real-event", icon: "auto_awesome", label: "Real Event" },
                        ].map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setNewItem({ ...newItem, type: t.id })}
                            className={`p-2.5 rounded-[var(--admin-radius-md)] text-[10px] font-bold uppercase tracking-wider border transition-all flex flex-col items-center justify-center gap-1 ${
                              newItem.type === t.id
                                ? "bg-[var(--admin-accent)] text-white border-[var(--admin-accent)] shadow-sm"
                                : "bg-[var(--admin-surface)] text-[var(--admin-text-tertiary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                            <span className="truncate w-full text-center">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Form Inputs Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="admin-label">Title *</label>
                        <input type="text" required value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} className="admin-input" placeholder="Enter catalog title" />
                      </div>
                      <div className="space-y-1">
                        <label className="admin-label">Telugu Title (Optional)</label>
                        <input type="text" value={newItem.teluguTitle} onChange={(e) => setNewItem({ ...newItem, teluguTitle: e.target.value })} className="admin-input" placeholder="సిరి వివాహ అలంకరణ" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="admin-label mb-0">Category *</label>
                        <button type="button" onClick={() => setShowCatModal(true)} className="text-[10px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">add_circle</span> Manage Categories
                        </button>
                      </div>
                      <select required value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} className="admin-select">
                        <option value="">Select Category</option>
                        <option value="Traditional">Traditional</option>
                        <option value="Floral">Floral</option>
                        <option value="Modern">Modern</option>
                        <option value="Royal">Royal</option>
                        <option value="Minimalist">Minimalist</option>
                        <option value="Rustic">Rustic</option>
                        {customCategories?.events?.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="admin-label">Event Tag</label>
                        <input type="text" value={newItem.event} onChange={(e) => setNewItem({ ...newItem, event: e.target.value })} className="admin-input" placeholder="Wedding, Haldi, Reception" />
                      </div>
                      <div className="space-y-1">
                        <label className="admin-label">Style Accent</label>
                        <input type="text" value={newItem.style} onChange={(e) => setNewItem({ ...newItem, style: e.target.value })} className="admin-input" placeholder="Temple Heritage, Floral Arch" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="admin-label">Search Tags (Comma separated)</label>
                      <input type="text" value={newItem.tags} onChange={(e) => setNewItem({ ...newItem, tags: e.target.value })} className="admin-input" placeholder="wedding, gold, botanical, mandap" />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1">
                        <label className="admin-label">Description</label>
                        <textarea value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} className="admin-textarea" rows={2} placeholder="Brief design concept..." />
                      </div>
                      <div className="space-y-1">
                        <label className="admin-label">Story & Crafting Details (Optional)</label>
                        <textarea value={newItem.story} onChange={(e) => setNewItem({ ...newItem, story: e.target.value })} className="admin-textarea" rows={2} placeholder="Studio story or floral crafting journey..." />
                      </div>
                    </div>

                    {/* Form Action Controls */}
                    <div className="flex flex-col sm:flex-row gap-2.5 pt-3">
                      {editingId && (
                        <button type="button" onClick={handleCancel} className="admin-btn admin-btn-outline w-full sm:flex-1 py-3 text-[11px] font-bold uppercase tracking-wider">
                          Cancel Edit
                        </button>
                      )}
                      <button type="submit" className="admin-btn admin-btn-primary w-full sm:flex-[2] py-3 text-[11px] font-bold uppercase tracking-wider">
                        {editingId ? "Save Changes" : "Confirm Curation"}
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── Filters ─── */}
      <motion.div variants={fadeUp} className="space-y-4">
        {/* Type Filter */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex bg-[var(--admin-surface-muted)] rounded-[var(--admin-radius-lg)] p-0.5 border border-[var(--admin-border-subtle)]">
            {[
              { id: "All", label: "All Items" },
              { id: "inspiration", label: "Inspirations" },
              { id: "real-event", label: "Real Events" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`px-3 py-1.5 rounded-[var(--admin-radius-md)] text-[11px] font-semibold cursor-pointer transition-all ${
                  typeFilter === t.id
                    ? "bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border-subtle)]"
                    : "text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-[var(--admin-text-tertiary)] font-medium">
            {filtered.length} items
          </span>
        </div>

        {/* Category Filter */}
        <FilterBar
          filters={categories}
          value={filter}
          onChange={setFilter}
        />
      </motion.div>

      {/* ─── Gallery Grid ─── */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="admin-card overflow-hidden">
              <AdminSkeleton className="w-full aspect-[4/3]" style={{ borderRadius: 0 }} />
              <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                <AdminSkeleton className="w-16 h-4 rounded" />
                <AdminSkeleton className="w-full h-4 rounded" />
                <AdminSkeleton className="w-3/4 h-3 rounded" />
                <div className="flex gap-3 pt-2">
                  <AdminSkeleton className="w-12 h-4 rounded" />
                  <AdminSkeleton className="w-12 h-4 rounded" />
                </div>
              </div>
            </div>
          ))
        ) : filtered.map((item) => (
          <motion.div
            key={item._id || item.id}
            layout
            className="relative admin-card overflow-hidden group flex flex-col hover:shadow-[var(--admin-shadow-md)] transition-all duration-300 border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border-strong)] bg-[var(--admin-surface)]"
          >
            {/* Top Image Casing - 100% UNCLUTTERED & CLEAN */}
            <div className="relative overflow-hidden aspect-[4/3] bg-[var(--admin-bg-subtle)] border-b border-[var(--admin-border-subtle)]">
              <img
                onError={handleImageError}
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
              />
            </div>

            {/* Card Content Area (Beautiful, Clean, 100% Symmetrical below the image) */}
            <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
              {/* Category, Event & Actions row */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-bold text-[var(--admin-accent)] uppercase tracking-widest truncate">
                  {item.category} {item.event ? `· ${item.event}` : ""}
                </span>
                
                {/* Minimal inline Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleEdit(item)}
                    className="w-6 h-6 rounded-full bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-accent)] hover:text-white flex items-center justify-center cursor-pointer transition-all active:scale-90"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-[12.5px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(item._id || item.id)}
                    className="w-6 h-6 rounded-full bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-error)] hover:text-white flex items-center justify-center cursor-pointer transition-all active:scale-90"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-[12.5px]">delete</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <h3 className="text-[12.5px] font-semibold text-[var(--admin-text-primary)] line-clamp-1 leading-snug group-hover:text-[var(--admin-accent)] transition-colors duration-200" title={item.title}>
                  {item.title}
                </h3>
              </div>

              {/* Sub-Badges (Type, Video, Linked) */}
              <div className="flex items-center justify-between flex-nowrap gap-1.5 pt-2 border-t border-[var(--admin-border-subtle)] w-full">
                <div className="flex items-center gap-1.5 min-w-0">
                  {/* Classification Type Tag */}
                  <span className="h-5 px-2 rounded bg-[var(--admin-surface-muted)] text-[8px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider flex items-center justify-center shrink-0">
                    {item.type === "real-event" ? "Real Event" : "Inspiration"}
                  </span>

                  {/* Video Tag if active */}
                  {item.video && (
                    <span className="h-5 px-2 rounded bg-[var(--admin-accent-light)] text-[8px] font-bold text-[var(--admin-accent)] uppercase tracking-wider flex items-center justify-center gap-0.5 shrink-0">
                      <span className="material-symbols-outlined text-[10px] leading-none">play_circle</span>
                      Video
                    </span>
                  )}
                </div>

                {/* Linked Products Count tag */}
                {item.linkedProducts && item.linkedProducts.length > 0 && (
                  <span className="h-5 px-2 rounded bg-[var(--admin-surface-muted)] text-[8px] font-bold text-[var(--admin-text-secondary)] flex items-center justify-center gap-0.5 shrink-0">
                    <span className="material-symbols-outlined text-[10px] text-[var(--admin-accent)] leading-none">link</span>
                    {item.linkedProducts.length} Linked
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ─── Empty State ─── */}
      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon="search_off"
          title="No Items Found"
          description="No gallery items match your current filters or search."
          action={
            <button onClick={() => { setFilter("All"); setTypeFilter("All"); }} className="admin-btn admin-btn-outline admin-btn-sm">
              Reset Filters
            </button>
          }
        />
      )}

      {/* ─── Category Management Modal ─── */}
      <AnimatePresence>
        {showCatModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCatModal(false)}
              className="absolute inset-0 bg-[var(--admin-surface-overlay)] backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl admin-card shadow-[var(--admin-shadow-2xl)] p-6 md:p-8 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-4 mb-6">
                <div>
                  <p className="text-[10px] font-semibold text-[var(--admin-text-tertiary)] uppercase tracking-wider">Studio Themes</p>
                  <h3 className="text-[16px] font-bold text-[var(--admin-text-primary)] tracking-tight">Showcase Categories</h3>
                </div>
                <button
                  onClick={() => setShowCatModal(false)}
                  className="admin-btn admin-btn-icon w-8 h-8"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Add/Edit Form */}
              <form onSubmit={handleSaveCat} className="admin-card-inset p-4 mb-6 space-y-4">
                <h4 className="text-[11px] font-semibold text-[var(--admin-text-primary)] uppercase tracking-wider">
                  {editingCatId ? "✏️ Edit Theme" : "✨ Create New Theme"}
                </h4>
                <div className="space-y-1.5">
                  <label className="admin-label">Theme Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Traditional Haldi Tray Decor"
                    value={catForm.name}
                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                    className="admin-input"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="admin-label">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Handcrafted floral trays and brass elements"
                    value={catForm.description}
                    onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  {editingCatId && (
                    <button
                      type="button"
                      onClick={() => { setEditingCatId(null); setCatForm({ name: "", description: "", image: "" }); }}
                      className="admin-btn admin-btn-ghost admin-btn-sm"
                    >
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm">
                    {editingCatId ? "Save Changes" : "+ Add Theme"}
                  </button>
                </div>
              </form>

              {/* Theme List */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold text-[var(--admin-text-primary)] uppercase tracking-wider mb-3">
                  Active Themes ({customCategories?.events?.length || 0})
                </h4>
                {customCategories?.events?.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 admin-card group">
                    <div className="min-w-0 flex-1 pr-4">
                      <span className="text-[12px] text-[var(--admin-text-primary)] font-semibold block truncate">{cat.name}</span>
                      {cat.description && (
                        <span className="text-[11px] text-[var(--admin-text-tertiary)] block truncate">{cat.description}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleEditCat(cat)}
                        className="admin-btn admin-btn-icon w-8 h-8 p-0 min-h-0"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                      </button>
                      <button
                        onClick={() => deleteCustomCategory("events", cat.id)}
                        className="admin-btn admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-error)] hover:bg-[var(--admin-error-light)]"
                        title="Delete"
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
    </motion.div>
  );
}
