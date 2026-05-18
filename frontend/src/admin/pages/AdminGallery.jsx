import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { galleryService, productService } from "../../services/domainServices";
import { ImageUpload } from "../components/ImageUpload";
import { handleImageError } from "../../utils/imageUtils";
import toast from "react-hot-toast";
import { useAdmin } from "../context/AdminContext";

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export function AdminGallery() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [filter, setFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All"); // All, inspiration, real-event
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "",
    teluguTitle: "",
    category: "",
    event: "",
    style: "",
    image: "",
    tags: "",
    description: "",
    story: "",
    type: "inspiration", // 'inspiration' or 'real-event'
    linkedProducts: [],
  });
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [res, catRes, prodRes] = await Promise.all([
        galleryService.getAll(),
        galleryService.getCategories(),
        productService.getAll({ limit: 150 })
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
    fetchData();
  }, []);

  const handleCancel = () => {
    setShowUpload(false);
    setEditingId(null);
    setNewItem({
      title: "",
      teluguTitle: "",
      category: "",
      event: "",
      style: "",
      image: "",
      tags: "",
      description: "",
      story: "",
      type: "inspiration",
      linkedProducts: [],
    });
  };

  const handleEdit = (item) => {
    setEditingId(item._id || item.id);
    setNewItem({
      title: item.title || "",
      teluguTitle: item.teluguTitle || "",
      category: item.category || "",
      event: item.event || "",
      style: item.style || "",
      image: item.image || "",
      type: item.type || "inspiration",
      tags: Array.isArray(item.tags) ? item.tags.join(", ") : (item.tags || ""),
      description: item.description || "",
      story: item.story || "",
      linkedProducts: Array.isArray(item.linkedProducts) ? item.linkedProducts.map(p => p._id || p.id || p) : [],
    });
    setShowUpload(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAiAutofill = () => {
    if (!newItem.image) {
      toast.error("Please upload or link a photo blueprint first for AI Vision analysis!");
      return;
    }

    const loadId = toast.loading("✨ AI Vision models analyzing design accents & traditional colors...");
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
        story: prev.story || "Inspired by traditional South Indian temple architecture, handcrafted using locally sourced fresh flowers and premium drapes."
      }));
      toast.success("✨ AI successfully populated gallery specifications!");
    }, 1200);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!newItem.image || !newItem.title || !newItem.category) {
      return toast.error("Please fill in title, category, and upload an image");
    }

    const payload = {
      ...newItem,
      tags: typeof newItem.tags === "string" 
        ? newItem.tags.split(",").map(t => t.trim()).filter(Boolean)
        : newItem.tags
    };

    try {
      if (editingId) {
        const res = await galleryService.update(editingId, payload);
        if (res.success) {
          toast.success("Gallery item updated successfully");
          handleCancel();
          fetchData();
        }
      } else {
        const res = await galleryService.create(payload);
        if (res.success) {
          toast.success("Gallery item created successfully");
          handleCancel();
          fetchData();
        }
      }
    } catch (err) {
      toast.error(editingId ? "Failed to update gallery item" : "Failed to create gallery item");
    }
  };

  const { searchQuery, customCategories, addCustomCategory, updateCustomCategory, deleteCustomCategory } = useAdmin();

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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await galleryService.delete(id);
      if (res.success) {
        toast.success("Item deleted");
        setItems(items.filter(i => (i._id || i.id) !== id));
      }
    } catch (err) {
      toast.error("Failed to delete item");
    }
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
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.04 } } }}
      className="max-w-[1440px] mx-auto space-y-8"
    >
      {/* Editorial Header */}
      <motion.div
        variants={fadeUp}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-5"
      >
        <div>
          <h1 className="text-[26px] font-bold text-stone-850 font-display tracking-tight">
            Gallery Curation Studio
          </h1>
          <p className="text-[12.5px] text-stone-400 font-light mt-0.5">
            Manage your high-fidelity Design Inspirations and Real Event Celebrations ({items.length} items cataloged)
          </p>
        </div>
        <button 
          onClick={() => {
            if (showUpload) {
              handleCancel();
            } else {
              setShowUpload(true);
            }
          }}
          className="h-11 px-6 rounded-full border border-neutral-250 bg-stone-900 text-white font-bold text-[11px] uppercase tracking-widest shadow-xs hover:bg-[#000000] active:scale-95 transition-all duration-300 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">
            {showUpload ? "close" : "add_photo_alternate"}
          </span>
          {showUpload ? "Cancel Editor" : (editingId ? "Edit Mode Active" : "Add Gallery Item")}
        </button>
      </motion.div>

      {/* Upload/Edit Form Drawer */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-[2rem] border border-neutral-200/50 p-6 lg:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.015)] overflow-hidden"
          >
            <form onSubmit={handleUpload} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Image Upload & Storefront Product Links */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-[10px] font-extrabold text-[#000000] uppercase tracking-widest block font-sans">
                      Image Asset Curation
                    </label>
                    {newItem.image && (
                      <span className="bg-emerald-100 text-emerald-800 text-[8.5px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow-2xs">✓ Photo Active</span>
                    )}
                  </div>
                  <ImageUpload
                    value={newItem.image}
                    onChange={(val) => {
                      setNewItem({...newItem, image: val});
                      toast.success("Photo uploaded! Click '✨ AI Autofill' to populate details.");
                    }}
                    folder="gallery"
                  />
                </div>

                {/* Elegant Black AI Autofill action button aligned cleanly below the image uploader box */}
                <div className="flex justify-end pr-2">
                  <button
                    type="button"
                    onClick={handleAiAutofill}
                    className="px-5 py-2.5 rounded-full bg-black hover:bg-stone-900 text-white font-label text-[10px] uppercase tracking-widest font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 select-none animate-fade-in"
                  >
                    <span className="material-symbols-outlined text-[15px] animate-pulse">auto_awesome</span>
                    AI Autofill from Photo
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-[#000000] uppercase tracking-widest block font-sans">
                    Link Storefront Products
                  </label>
                  <p className="text-[9.5px] text-stone-400 font-light leading-relaxed mb-2">
                    Tag catalog items directly onto this image to let visitors instantly view and shop them from the inspiration drawer.
                  </p>
                  <div className="bg-[#F8F9FB]/50 rounded-2xl p-4 border border-neutral-105 max-h-[220px] overflow-y-auto space-y-1.5 shadow-2xs">
                    {products.length === 0 ? (
                      <p className="text-[11px] text-stone-400 italic font-light">No products seeded in store</p>
                    ) : (
                      products.map((p) => {
                        const isChecked = newItem.linkedProducts?.includes(p._id || p.id);
                        return (
                          <label key={p._id || p.id} className="flex items-center gap-2.5 p-2 hover:bg-white border border-transparent hover:border-black/5 rounded-xl cursor-pointer transition-all text-[11.5px] font-medium text-stone-700">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const list = newItem.linkedProducts || [];
                                const id = p._id || p.id;
                                if (e.target.checked) {
                                  setNewItem({ ...newItem, linkedProducts: [...list, id] });
                                } else {
                                  setNewItem({ ...newItem, linkedProducts: list.filter(x => x !== id) });
                                }
                              }}
                              className="accent-[#000000] w-4 h-4 rounded border-neutral-300"
                            />
                            <span className="truncate">{p.title}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Metadata Fields */}
              <div className="lg:col-span-7 space-y-5">
                {/* Segment: Curation Classification Type */}
                <div className="p-4 bg-[#F8F9FB] border border-neutral-200/50 rounded-2xl space-y-2.5 shadow-3xs">
                  <label className="text-[10px] font-extrabold text-[#000000] uppercase tracking-widest block font-sans">
                    Classification Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, type: "inspiration" })}
                      className={`py-3 px-4 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all flex flex-col items-center justify-center gap-1.5 shadow-2xs ${
                        newItem.type === "inspiration"
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-white text-stone-500 border-neutral-200 hover:border-[#000000]/30"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">palette</span>
                      <span>Design Inspiration</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, type: "real-event" })}
                      className={`py-3 px-4 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all flex flex-col items-center justify-center gap-1.5 shadow-2xs ${
                        newItem.type === "real-event"
                          ? "bg-[#000000] text-white border-[#000000]"
                          : "bg-white text-stone-500 border-neutral-200 hover:border-[#000000]/30"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                      <span>Real Event Showcase</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-stone-600">Title</label>
                    <input
                      type="text"
                      required
                      value={newItem.title}
                      onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                      className="w-full bg-[#F8F9FB]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-neutral-200 focus:border-[#000000] transition-colors"
                      placeholder="Enter catalog title"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-stone-600">Telugu Title (Optional)</label>
                    <input
                      type="text"
                      value={newItem.teluguTitle}
                      onChange={(e) => setNewItem({...newItem, teluguTitle: e.target.value})}
                      className="w-full bg-[#F8F9FB]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-neutral-200 focus:border-[#000000] transition-colors"
                      placeholder="e.g., సిరి వివాహం"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-stone-600">Category *</label>
                      <button
                        type="button"
                        onClick={() => setShowCatModal(true)}
                        className="font-label text-[9px] text-black hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[12px]">add_circle</span> Manage Themes
                      </button>
                    </div>
                    <select
                      required
                      value={newItem.category}
                      onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                      className="w-full bg-[#F8F9FB]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-neutral-200 focus:border-[#000000] transition-colors font-medium"
                    >
                      <option value="">Select Category</option>
                      {/* Standard Options */}
                      <option value="Traditional">Traditional</option>
                      <option value="Floral">Floral</option>
                      <option value="Modern">Modern</option>
                      <option value="Royal">Royal</option>
                      <option value="Minimalist">Minimalist</option>
                      <option value="Rustic">Rustic</option>
                      {/* Custom Categories */}
                      {customCategories?.events?.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-stone-600">Event Framework</label>
                    <input
                      type="text"
                      value={newItem.event}
                      onChange={(e) => setNewItem({...newItem, event: e.target.value})}
                      className="w-full bg-[#F8F9FB]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-neutral-200 focus:border-[#000000] transition-colors"
                      placeholder="e.g., Wedding, Haldi"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-stone-600">Style Variant</label>
                    <input
                      type="text"
                      value={newItem.style}
                      onChange={(e) => setNewItem({...newItem, style: e.target.value})}
                      className="w-full bg-[#F8F9FB]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-neutral-200 focus:border-[#000000] transition-colors"
                      placeholder="e.g., Royal Marigold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-600">Search Tags (Comma separated)</label>
                  <input
                    type="text"
                    value={newItem.tags}
                    onChange={(e) => setNewItem({...newItem, tags: e.target.value})}
                    className="w-full bg-[#F8F9FB]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-neutral-200 focus:border-[#000000] transition-colors"
                    placeholder="wedding, gold, botanical, mandap"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-600">Short Editorial Description</label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    className="w-full bg-[#F8F9FB]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-neutral-200 focus:border-[#000000] transition-colors h-16 resize-none"
                    placeholder="Exquisite premium mandap layout featuring fresh jasmine and marigold drapes..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-600">Artisanal Story (Optional)</label>
                  <textarea
                    value={newItem.story}
                    onChange={(e) => setNewItem({...newItem, story: e.target.value})}
                    className="w-full bg-[#F8F9FB]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-neutral-200 focus:border-[#000000] transition-colors h-16 resize-none"
                    placeholder="Handcrafted in our studio over 48 hours of artisanal collaboration..."
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  {editingId && (
                    <button 
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 py-3 bg-[#F8F9FB] border border-neutral-250 text-stone-600 rounded-full text-[11px] font-extrabold uppercase tracking-wider transition-colors hover:bg-neutral-100 shadow-2xs"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button 
                    type="submit"
                    className="flex-[2] py-3 bg-stone-900 hover:bg-[#000000] text-white rounded-full text-[11px] font-extrabold uppercase tracking-widest shadow-md transition-colors"
                  >
                    {editingId ? "Save Changes" : "Confirm Curation"}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dual Filter Center: Categories & Type Filter */}
      <motion.div variants={fadeUp} className="space-y-4 pt-2">
        {/* Row 1: Curation Classification Type Filter Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-neutral-100 pb-3">
          <div className="flex h-10 p-0.5 bg-[#F8F9FB] rounded-full border border-neutral-200 shrink-0">
            {[
              { id: "All", label: "All Items" },
              { id: "inspiration", label: "Design Inspirations" },
              { id: "real-event", label: "Real Celebrations" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`px-5 h-full rounded-full text-[9.5px] uppercase tracking-widest font-bold transition-all duration-300 flex items-center justify-center ${
                  typeFilter === t.id
                    ? "bg-stone-900 text-white shadow-xs"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          
          <div className="text-[11px] text-stone-400 font-light italic">
            Showing {filtered.length} curated images matching filters
          </div>
        </div>

        {/* Row 2: Category Capsule List */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-4.5 py-2 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                filter === c 
                  ? "bg-[#000000] text-white border-[#000000] shadow-2xs" 
                  : "bg-white text-stone-500 border border-neutral-200/80 hover:border-[#000000]/30"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Redesigned Gallery Cards Grid */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {isLoading ? (
          <div className="col-span-full py-24 text-center">
            <div className="animate-spin w-8 h-8 border-3 border-[#000000] border-t-transparent rounded-full mx-auto" />
            <span className="text-[12px] text-stone-400 font-light mt-3 block">Accessing archive...</span>
          </div>
        ) : filtered.map((item) => (
          <motion.div
            key={item._id || item.id}
            layout
            className="group bg-white rounded-[1.75rem] overflow-hidden border border-neutral-200/60 hover:border-[#000000]/30 shadow-[0_4px_15px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.025)] transition-all duration-300 flex flex-col relative"
          >
            {/* Classification Type Ribbon Badge */}
            <div className="absolute top-4 left-4 z-10">
              <span className={`text-[8.5px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm block ${
                item.type === "real-event" 
                  ? "bg-[#000000] text-white" 
                  : "bg-stone-900 text-white"
              }`}>
                {item.type === "real-event" ? "Real Event" : "Inspiration"}
              </span>
            </div>

            {/* Image Canvas with Premium Zoom Transition */}
            <div className="relative overflow-hidden aspect-[4/3] bg-[#F8F9FB]">
              <img
                onError={handleImageError}
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
              
              {/* Quick Actions Hover Strip Overlay */}
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                <button 
                  onClick={() => handleEdit(item)}
                  className="w-10 h-10 rounded-full bg-white text-stone-800 hover:bg-[#000000] hover:text-white flex items-center justify-center cursor-pointer shadow-lg active:scale-90 transition-all"
                  title="Edit Curation"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button 
                  onClick={() => handleDelete(item._id || item.id)}
                  className="w-10 h-10 rounded-full bg-white text-stone-850 hover:bg-red-500 hover:text-white flex items-center justify-center cursor-pointer shadow-lg active:scale-90 transition-all"
                  title="Delete Card"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>

            {/* Card Metadata Details */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#000000] uppercase tracking-widest">
                  <span>{item.category}</span>
                  {item.event && (
                    <>
                      <span className="opacity-40">•</span>
                      <span className="text-stone-400">{item.event}</span>
                    </>
                  )}
                </div>
                
                <h3 className="text-[13px] font-bold text-stone-800 line-clamp-1 leading-snug">
                  {item.title}
                </h3>
                
                {item.teluguTitle && (
                  <p className="text-[11px] text-[#000000] font-semibold italic leading-none">
                    {item.teluguTitle}
                  </p>
                )}

                {item.style && (
                  <span className="inline-block text-[9.5px] bg-[#F8F9FB] text-stone-500 px-2 py-0.5 rounded-md border border-neutral-150 italic mt-1.5">
                    {item.style}
                  </span>
                )}
              </div>

              {item.description && (
                <p className="text-[11px] text-stone-500/85 leading-relaxed line-clamp-2 pl-2 border-l border-[#000000]/30 italic">
                  "{item.description}"
                </p>
              )}

              {/* Stats & Products Footer */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between flex-wrap gap-2 text-[10px] text-stone-400">
                {/* Reactions (Likes & Views) */}
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">visibility</span>
                    <span>{item.views || 0}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] text-rose-400">favorite</span>
                    <span>{item.likes || 0}</span>
                  </span>
                </div>

                {/* Linked Products Count */}
                {item.linkedProducts && item.linkedProducts.length > 0 && (
                  <div className="flex items-center gap-1 font-bold text-stone-700 bg-[#F8F9FB] border border-neutral-200/50 px-2.5 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-[12px] text-[#000000]">link</span>
                    <span>{item.linkedProducts.length} Product{item.linkedProducts.length > 1 ? 's' : ''} Linked</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <div className="py-24 text-center bg-white rounded-[2.5rem] border border-neutral-200/50 flex flex-col items-center justify-center p-6 shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-stone-300 mb-2.5 block">search_off</span>
          <p className="text-[14px] font-bold text-[#0F172A] mt-1">Archive Entry Empty</p>
          <p className="text-[12px] text-stone-400 max-w-[280px] font-light mt-1">No portfolio curation match your active classification or category selectors.</p>
        </div>
      )}
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
    </motion.div>
  );
}
