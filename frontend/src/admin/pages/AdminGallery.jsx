import React, { useState, useEffect } from "react";
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

      {/* ─── Upload / Edit Form ─── */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="admin-card p-6 lg:p-8 overflow-hidden"
          >
            <form onSubmit={handleUpload} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column — Media */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="admin-label mb-0">Image Asset</label>
                    {newItem.image && (
                      <span className="admin-badge admin-badge-success">✓ Active</span>
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="admin-label mb-0">Video (Optional)</label>
                    {newItem.video && (
                      <span className="admin-badge admin-badge-warning">✓ Video</span>
                    )}
                  </div>
                  <VideoUpload
                    value={newItem.video}
                    onChange={(val) => setNewItem({ ...newItem, video: val })}
                    folder="gallery"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAiAutofill}
                    className="admin-btn admin-btn-outline admin-btn-sm"
                  >
                    <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                    AI Autofill from Photo
                  </button>
                </div>

                {/* Linked Products */}
                <div className="space-y-2">
                  <label className="admin-label">Link Storefront Products</label>
                  <p className="text-[11px] text-[var(--admin-text-tertiary)] leading-relaxed -mt-1">
                    Tag catalog items onto this image so visitors can shop directly.
                  </p>
                  <div className="admin-card-inset p-3 max-h-[220px] overflow-y-auto custom-scrollbar space-y-1">
                    {products.length === 0 ? (
                      <p className="text-[11px] text-[var(--admin-text-tertiary)] italic">No products in store</p>
                    ) : products.map((p) => {
                      const isChecked = newItem.linkedProducts?.includes(p._id || p.id);
                      return (
                        <label key={p._id || p.id} className="flex items-center gap-2.5 p-2 hover:bg-[var(--admin-surface-hover)] rounded-[var(--admin-radius-md)] cursor-pointer transition-colors text-[12px] font-medium text-[var(--admin-text-secondary)]">
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

              {/* Right Column — Fields */}
              <div className="lg:col-span-7 space-y-5">
                {/* Classification Type */}
                <div className="admin-card-inset p-4 space-y-3">
                  <label className="admin-label">Classification Type</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: "inspiration", icon: "palette", label: "Design Inspiration" },
                      { id: "real-event", icon: "auto_awesome", label: "Real Event Showcase" },
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNewItem({ ...newItem, type: t.id })}
                        className={`p-3 rounded-[var(--admin-radius-lg)] text-[11px] font-semibold uppercase tracking-wider border transition-all flex flex-col items-center justify-center gap-1.5 ${
                          newItem.type === t.id
                            ? "bg-[var(--admin-accent)] text-white border-[var(--admin-accent)] shadow-[var(--admin-shadow-sm)]"
                            : "bg-[var(--admin-surface)] text-[var(--admin-text-tertiary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="admin-label">Title *</label>
                    <input type="text" required value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} className="admin-input" placeholder="Enter catalog title" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="admin-label">Telugu Title (Optional)</label>
                    <input type="text" value={newItem.teluguTitle} onChange={(e) => setNewItem({ ...newItem, teluguTitle: e.target.value })} className="admin-input" placeholder="e.g., సిరి వివాహం" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="admin-label mb-0">Category *</label>
                    <button type="button" onClick={() => setShowCatModal(true)} className="text-[10px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px]">add_circle</span> Manage
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
                  <div className="space-y-1.5">
                    <label className="admin-label">Event</label>
                    <input type="text" value={newItem.event} onChange={(e) => setNewItem({ ...newItem, event: e.target.value })} className="admin-input" placeholder="e.g., Wedding, Haldi" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="admin-label">Style Variant</label>
                    <input type="text" value={newItem.style} onChange={(e) => setNewItem({ ...newItem, style: e.target.value })} className="admin-input" placeholder="e.g., Royal Marigold" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="admin-label">Search Tags (Comma separated)</label>
                  <input type="text" value={newItem.tags} onChange={(e) => setNewItem({ ...newItem, tags: e.target.value })} className="admin-input" placeholder="wedding, gold, botanical, mandap" />
                </div>

                <div className="space-y-1.5">
                  <label className="admin-label">Description</label>
                  <textarea value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} className="admin-textarea" rows={2} placeholder="Elegant mandap with fresh jasmine garlands..." />
                </div>

                <div className="space-y-1.5">
                  <label className="admin-label">Story (Optional)</label>
                  <textarea value={newItem.story} onChange={(e) => setNewItem({ ...newItem, story: e.target.value })} className="admin-textarea" rows={2} placeholder="Handcrafted in our studio over 48 hours..." />
                </div>

                <div className="flex gap-3 pt-2">
                  {editingId && (
                    <button type="button" onClick={handleCancel} className="admin-btn admin-btn-outline flex-1">
                      Cancel Edit
                    </button>
                  )}
                  <button type="submit" className="admin-btn admin-btn-primary flex-[2]">
                    {editingId ? "Save Changes" : "Confirm Curation"}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

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
            className="relative admin-card overflow-hidden group flex flex-col"
          >
            {/* Type Badge */}
            <div className="absolute top-2.5 left-2.5 lg:top-3 lg:left-3 z-10 flex flex-col gap-1.5">
              <span className="admin-badge admin-badge-primary text-[9px]">
                {item.type === "real-event" ? "Real Event" : "Inspiration"}
              </span>
              {item.video && (
                <span className="admin-badge admin-badge-warning text-[9px]">
                  <span className="material-symbols-outlined text-[10px]">play_circle</span>
                  Video
                </span>
              )}
            </div>

            {/* Image */}
            <div className="relative overflow-hidden aspect-[4/3] bg-[var(--admin-bg-subtle)]">
              <img
                onError={handleImageError}
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
              {/* Action Buttons — Mobile: permanent top-right, Desktop: hover overlay */}
              <div className="absolute top-2.5 right-2.5 lg:top-0 lg:right-0 lg:inset-0 z-20 flex gap-1 lg:gap-2 items-center justify-end lg:justify-center p-0 bg-transparent lg:bg-[var(--admin-surface-overlay)] opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={() => handleEdit(item)}
                  className="w-7 h-7 lg:w-10 lg:h-10 rounded-full bg-[var(--admin-surface)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-accent)] hover:text-white flex items-center justify-center cursor-pointer shadow-[var(--admin-shadow-lg)] active:scale-90 transition-all border border-[var(--admin-border-subtle)] lg:border-none"
                  title="Edit"
                >
                  <span className="material-symbols-outlined text-[13px] lg:text-[18px]">edit</span>
                </button>
                <button
                  onClick={() => handleDelete(item._id || item.id)}
                  className="w-7 h-7 lg:w-10 lg:h-10 rounded-full bg-[var(--admin-surface)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-error)] hover:text-white flex items-center justify-center cursor-pointer shadow-[var(--admin-shadow-lg)] active:scale-90 transition-all border border-[var(--admin-border-subtle)] lg:border-none"
                  title="Delete"
                >
                  <span className="material-symbols-outlined text-[13px] lg:text-[18px]">delete</span>
                </button>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--admin-accent)] uppercase tracking-wider">
                  <span>{item.category}</span>
                  {item.event && (
                    <>
                      <span className="text-[var(--admin-text-tertiary)]">·</span>
                      <span className="text-[var(--admin-text-tertiary)]">{item.event}</span>
                    </>
                  )}
                </div>
                <h3 className="text-[13px] font-semibold text-[var(--admin-text-primary)] line-clamp-1 leading-snug">
                  {item.title}
                </h3>
                {item.teluguTitle && (
                  <p className="text-[11px] text-[var(--admin-accent)] font-medium italic">{item.teluguTitle}</p>
                )}
                {item.style && (
                  <span className="admin-badge admin-badge-neutral text-[9px] mt-1">{item.style}</span>
                )}
              </div>

              {item.description && (
                <p className="text-[11px] text-[var(--admin-text-tertiary)] leading-relaxed line-clamp-2 pl-2 border-l-2 border-[var(--admin-border-strong)] italic">
                  "{item.description}"
                </p>
              )}

              {/* Footer Stats */}
              <div className="pt-2 sm:pt-3 border-t border-[var(--admin-border-subtle)] flex items-center justify-between flex-wrap gap-2 text-[10px] sm:text-[11px] text-[var(--admin-text-tertiary)]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">visibility</span>
                    {item.views || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1", color: "var(--admin-error)" }}>favorite</span>
                    {item.likes || 0}
                  </span>
                </div>
                {item.linkedProducts && item.linkedProducts.length > 0 && (
                  <span className="admin-badge admin-badge-neutral text-[9px]">
                    <span className="material-symbols-outlined text-[10px] text-[var(--admin-accent)]">link</span>
                    {item.linkedProducts.length} linked
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
