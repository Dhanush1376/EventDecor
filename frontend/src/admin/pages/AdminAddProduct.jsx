import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { productCategories } from "../data/adminData";
import { productService, uploadService } from "../../services/domainServices";
import { useAdmin } from "../context/AdminContext";
import { ImageUpload } from "../components/ImageUpload";
import toast from "react-hot-toast";
import { AdminToggle } from "../components/AdminUIKit";

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };
const slideIn = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const WIZARD_STEPS = [
  { id: "media", label: "Media & Imagery", icon: "photo_library" },
  { id: "details", label: "Product Info", icon: "info" },
  { id: "variants", label: "Attributes & Variants", icon: "tune" },
  { id: "seo", label: "SEO Settings", icon: "search" },
  { id: "pricing", label: "Pricing & Stock", icon: "payments" },
  { id: "review", label: "Review & Publish", icon: "verified" },
];

export function AdminAddProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshProducts } = useAdmin();
  const isEditMode = Boolean(id);

  const [currentStep, setCurrentStep] = useState(0);
  const [mobileTab, setMobileTab] = useState("form");
  const [isLoading, setIsLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  
  const [categoriesList, setCategoriesList] = useState(productCategories);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [showAIHUD, setShowAIHUD] = useState(false);
  const [isApplyingFields, setIsApplyingFields] = useState(false);
  const [focusedField, setFocusedField] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    teluguTitle: "",
    slug: "",
    category: "",
    material: "",
    tags: "",
    price: "",
    oldPrice: "",
    stock: "",
    imageSrc: "",
    images: [],
    badges: "",
    description: "",
    dimensions: "",
    weight: "",
    seoTitle: "",
    seoDescription: "",
    featured: false,
    isActive: true,
    showInGallery: false,
    variants: [], // Color/Size variants array
  });

  const handleAIAutoFill = async () => {
    if (!formData.title && !formData.imageSrc) {
      return toast.error("Please provide a Title or Image first for the AI to analyze.");
    }
    
    setIsAIGenerating(true);
    const loadingToast = toast.loading("Groq Llama 4 Scout Vision is analyzing product image and details...");
    
    try {
      const res = await productService.aiAutofill(
        formData.title,
        formData.imageSrc,
        categoriesList
      );
      
      if (res.success && res.data) {
        const generatedData = res.data;
        
        // Strict category mapping mapping logic fallback
        if (!generatedData.category && generatedData.detected_object) {
          const lowerObj = generatedData.detected_object.toLowerCase();
          const categoryMap = {
            coconut: "Traditional Wedding Decor",
            tray: "Engagement Tray Decor",
            plate: "Decorative Plates",
            basket: "Gift Hampers",
            garland: "Floral Decorations",
            mandala: "Wall Decor",
            diya: "Festival Decor"
          };
          for (const [key, cat] of Object.entries(categoryMap)) {
            if (lowerObj.includes(key)) {
              generatedData.category = cat;
              break;
            }
          }
        }

        // Save for the Curation HUD
        setAiAnalysisResult(generatedData);
        setShowAIHUD(true);
        
        toast.success("AI successfully curated and extracted product attributes!", { id: loadingToast });
      } else {
        toast.error("Failed to generate details. Please try again.", { id: loadingToast });
      }
    } catch (err) {
      console.error("AI AutoFill Error:", err);
      const errorMessage = err.response?.data?.message || "AI service is offline. Please make sure GROQ_API_KEY is configured in your backend .env file.";
      toast.error(errorMessage, { id: loadingToast, duration: 6000 });
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleApplyAISpecs = () => {
    if (!aiAnalysisResult) return;
    
    setIsApplyingFields(true);
    setShowAIHUD(false);
    
    const fieldsToFill = [
      { key: "title", value: aiAnalysisResult.english_title },
      { key: "teluguTitle", value: aiAnalysisResult.telugu_title },
      { key: "slug", value: aiAnalysisResult.slug },
      { key: "category", value: aiAnalysisResult.category },
      { key: "material", value: (aiAnalysisResult.materials || []).join(", ") },
      { key: "tags", value: (aiAnalysisResult.tags || []).join(", ") },
      { key: "description", value: aiAnalysisResult.description },
      { key: "seoTitle", value: aiAnalysisResult.english_title + " | Siri Arts & Crafts" },
      { key: "seoDescription", value: aiAnalysisResult.description ? aiAnalysisResult.description.substring(0, 155) + "..." : "" }
    ];
    
    let index = 0;
    
    // Jump straight to details step (Step 2) to show the animation visually!
    setCurrentStep(1);

    const interval = setInterval(() => {
      if (index >= fieldsToFill.length) {
        clearInterval(interval);
        setIsApplyingFields(false);
        setFocusedField("");
        toast.success("AI specifications successfully populated with glowing animation!");
        return;
      }
      
      const field = fieldsToFill[index];
      
      // Navigate/Scroll to different steps if they are on a different page for visual polish!
      if (field.key === "tags") {
        setCurrentStep(2); // Attributes step (new index 2)
      } else if (field.key === "seoTitle") {
        setCurrentStep(3); // SEO step (new index 3)
      }
      
      setFocusedField(field.key);
      
      // Dynamic dynamic categories aggregator
      if (field.key === "category" && field.value && !categoriesList.includes(field.value)) {
        setCategoriesList(prev => [...prev, field.value].sort());
      }
      
      setFormData(prev => ({
        ...prev,
        [field.key]: field.value || prev[field.key]
      }));
      
      index++;
    }, 550); // Beautiful, smooth sequential populating delay!
  };

  // Variant input local state
  const [newVariant, setNewVariant] = useState({ name: "", value: "", price: "", stock: "" });

  // Load dynamic categories from database
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await productService.getAll({ limit: 150 });
        if (res.success && res.data && res.data.products) {
          const dbCategories = res.data.products.map(p => p.category).filter(Boolean);
          setCategoriesList(prev => {
            const combined = new Set([...productCategories, ...dbCategories]);
            return Array.from(combined).sort();
          });
        }
      } catch (err) {
        console.error("Failed to load dynamic categories:", err);
      }
    };
    loadCategories();
  }, []);

  // Restoration and Fetching
  useEffect(() => {
    if (isEditMode) {
      const fetchProduct = async () => {
        setIsLoading(true);
        try {
          const res = await productService.getById(id);
          if (res.success) {
            const p = res.data;
            if (p.category && !productCategories.includes(p.category)) {
              setCategoriesList(prev => Array.from(new Set([...prev, p.category])).sort());
            }
            setFormData({
              title: p.title || p.name || "",
              teluguTitle: p.teluguTitle || p.nameTE || "",
              slug: p.slug || "",
              category: p.category || "",
              material: p.material || "",
              tags: p.tags ? p.tags.join(", ") : "",
              price: p.price || "",
              oldPrice: p.oldPrice || "",
              stock: p.stock !== undefined ? p.stock : "",
              imageSrc: p.imageSrc || (p.images && p.images[0]) || "",
              images: p.images || [],
              badges: p.badges ? p.badges.join(", ") : "",
              description: p.description || "",
              dimensions: p.dimensions || "",
              weight: p.weight || "",
              seoTitle: p.seoTitle || "",
              seoDescription: p.seoDescription || "",
              featured: p.featured || false,
              isActive: p.isActive !== undefined ? p.isActive : true,
              showInGallery: p.showInGallery || false,
              variants: p.variants || [],
            });
          }
        } catch (err) {
          toast.error("Failed to load product details");
        } finally {
          setIsLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id, isEditMode]);

  // Auto-save status tracking (in-memory only)
  const [lastDraftSaved, setLastDraftSaved] = useState(null);

  // Local Autosave (in-memory only)
  useEffect(() => {
    if (!isEditMode && formData.title) {
      const timeoutId = setTimeout(() => {
        setLastDraftSaved(new Date());
      }, 1500);
      return () => clearTimeout(timeoutId);
    }
  }, [formData, isEditMode]);

  // Form Validation per step
  const getStepErrors = () => {
    const errors = {};
    if (currentStep === 0 && !formData.imageSrc) {
      errors.imageSrc = "Primary image is required";
    }
    if (currentStep === 1) {
      if (!formData.title.trim()) errors.title = "Product title is required";
      if (!formData.category) errors.category = "Category is required";
    }
    if (currentStep === 4) {
      if (!formData.price || Number(formData.price) <= 0) errors.price = "Enter a valid price";
      if (formData.stock === "" || Number(formData.stock) < 0) errors.stock = "Enter stock quantity";
    }
    return errors;
  };

  const isStepValid = () => {
    return Object.keys(getStepErrors()).length === 0;
  };

  const handleNext = () => {
    const errors = getStepErrors();
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return;
    }
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Keyboard Navigation: Alt + ArrowRight/Left, Ctrl+S to save, Escape to go back
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
      // Ctrl+S / Cmd+S to save draft
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        setLastDraftSaved(new Date());
        toast.success("Draft saved (in-memory)!", { duration: 1500 });
      }
      // Escape to go back
      if (e.key === "Escape" && !showAIHUD) {
        navigate("/admin/products");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, formData, showAIHUD]);

  // Image Helper Actions
  const swapPrimaryImage = (index) => {
    const newImages = [...formData.images];
    const oldPrimary = formData.imageSrc;
    const newPrimary = newImages[index];

    if (newPrimary) {
      newImages[index] = oldPrimary;
      setFormData({
        ...formData,
        imageSrc: newPrimary,
        images: newImages.filter(Boolean),
      });
      toast.success("Updated primary listing image");
    }
  };

  // Add Variants
  const handleAddVariant = () => {
    if (!newVariant.name || !newVariant.value) {
      return toast.error("Please fill in Variant attribute name & value");
    }
    setFormData({
      ...formData,
      variants: [...formData.variants, { ...newVariant, id: Date.now() }],
    });
    setNewVariant({ name: "", value: "", price: "", stock: "" });
    toast.success("Added variant");
  };

  const handleRemoveVariant = (vid) => {
    setFormData({
      ...formData,
      variants: formData.variants.filter((v) => v.id !== vid),
    });
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.title || !formData.price || !formData.category || !formData.imageSrc) {
      return toast.error("Please fill in all mandatory fields before publishing");
    }

    setIsLoading(true);
    try {
      const payload = {
        title: formData.title,
        teluguTitle: formData.teluguTitle || undefined,
        slug: formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        category: formData.category,
        material: formData.material || undefined,
        tags: typeof formData.tags === "string" ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean) : formData.tags,
        price: Number(formData.price),
        oldPrice: formData.oldPrice ? Number(formData.oldPrice) : undefined,
        stock: Number(formData.stock),
        imageSrc: formData.imageSrc,
        images: Array.from(new Set([formData.imageSrc, ...formData.images].filter(Boolean))),
        badges: typeof formData.badges === "string" ? formData.badges.split(",").map((b) => b.trim()).filter(Boolean) : formData.badges,
        description: formData.description,
        dimensions: formData.dimensions || undefined,
        weight: formData.weight || undefined,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        featured: Boolean(formData.featured),
        isActive: Boolean(formData.isActive),
        showInGallery: Boolean(formData.showInGallery),
        variants: formData.variants,
      };

      const res = isEditMode
        ? await productService.update(id, payload)
        : await productService.create(payload);

      if (res.success) {
        toast.success(isEditMode ? "Product updated successfully" : "Product published successfully");
        if (refreshProducts) {
          try {
            await refreshProducts();
          } catch (err) {
            console.error("Failed to refresh products state", err);
          }
        }
        navigate("/admin/products");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save product listing");
    } finally {
      setIsLoading(false);
    }
  };

  // Category Suggesters
  const suggestedCategories = useMemo(() => {
    if (!formData.category) return categoriesList;
    return categoriesList.filter((c) =>
      c.toLowerCase().includes(formData.category.toLowerCase())
    );
  }, [formData.category, categoriesList]);

  return (
    <div className="max-w-[1280px] mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/products")}
            className="w-10 h-10 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:border-[#000000] cursor-pointer transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="text-[24px] font-bold text-[#0F172A] font-display">
              {isEditMode ? "Edit Product Curation" : "New Craft Curation"}
            </h1>
            <p className="text-[12.5px] text-[#64748B]">
              {isEditMode
                ? `Modifying #${id.substring(id.length - 8).toUpperCase()}`
                : "Guided step-by-step product catalog publisher"}
            </p>
          </div>
        </div>

        {/* Keyboard Shortcut Banner + Auto-save */}
        <div className="flex items-center gap-3">
          {lastDraftSaved && !isEditMode && (
            <div className="hidden md:flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-[12px]">cloud_done</span>
              Draft saved {lastDraftSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          <div className="hidden md:flex items-center gap-2 text-[10px] text-[#64748B] font-semibold bg-white border border-[#E5E7EB] px-3 py-1.5 rounded-full uppercase tracking-wider">
            <span className="px-1.5 py-0.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded text-[9px]">Alt + →</span>
            <span>Next</span>
            <span className="text-[#E5E7EB]">|</span>
            <span className="px-1.5 py-0.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded text-[9px]">Ctrl+S</span>
            <span>Save</span>
            <span className="text-[#E5E7EB]">|</span>
            <span className="px-1.5 py-0.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded text-[9px]">Esc</span>
            <span>Back</span>
          </div>
        </div>
      </div>

      {/* Guided Progress Bar (Desktop & Mobile Responsive) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] lg:block hidden overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] px-2">
          {WIZARD_STEPS.map((step, index) => {
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (index <= currentStep || isStepValid()) {
                      setCurrentStep(index);
                    } else {
                      toast.error("Please complete previous steps first");
                    }
                  }}
                  className="flex items-center gap-2 group cursor-pointer text-left outline-none"
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      isActive
                        ? "bg-black text-white scale-105 shadow-sm"
                        : isCompleted
                        ? "bg-slate-100 text-black border border-slate-200"
                        : "bg-slate-50 text-slate-400 border border-slate-150"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {isCompleted ? "check" : step.icon}
                    </span>
                  </div>
                  <div>
                    <p
                      className={`text-[9px] font-bold uppercase tracking-wider ${
                        isActive ? "text-black" : "text-slate-400"
                      }`}
                    >
                      Step {index + 1}
                    </p>
                    <p
                      className={`text-[11px] font-bold ${
                        isActive ? "text-black" : "text-slate-600"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                </button>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-[2px] mx-4 rounded-full ${
                      isCompleted ? "bg-black" : "bg-slate-100"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Guided Progress Bar (Mobile) */}
      <div className="lg:hidden bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[18px]">
              {WIZARD_STEPS[currentStep].icon}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Step {currentStep + 1} of {WIZARD_STEPS.length}</span>
            <h4 className="text-[13px] font-bold text-slate-800">{WIZARD_STEPS[currentStep].label}</h4>
          </div>
        </div>
        <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/40">
          <div className="bg-black h-full transition-all duration-300" style={{ width: `${((currentStep + 1) / WIZARD_STEPS.length) * 100}%` }} />
        </div>
      </div>

      {/* Mobile Form/Preview Tab Switcher */}
      <div className="flex lg:hidden bg-slate-150 p-1 rounded-xl border border-slate-200/60 w-full">
        <button
          type="button"
          onClick={() => setMobileTab("form")}
          className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
            mobileTab === "form"
              ? "bg-white text-black shadow-xs border border-slate-200/40"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Edit Curation
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
            mobileTab === "preview"
              ? "bg-white text-black shadow-xs border border-slate-200/40"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Storefront Preview
        </button>
      </div>

      {/* Main Grid: Form wizard on left, real-time preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Form Wizard Frame */}
        <div className={`bg-white rounded-3xl border border-[#E5E7EB]/60 p-4 sm:p-6 shadow-sm min-h-[480px] flex-col justify-between relative overflow-hidden ${mobileTab === "form" ? "flex" : "hidden lg:flex"}`}>
          {/* Simulated Compression Loading Overlay */}
          <AnimatePresence>
            {isCompressing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="w-16 h-16 rounded-full border-4 border-[#E5E7EB] border-t-[#000000] animate-spin mb-4" />
                <h3 className="font-display text-[16px] font-bold text-[#0F172A]">Optimizing Curation Media</h3>
                <p className="text-[12px] text-[#64748B] mt-1 max-w-[280px]">Simulating advanced lossless compression & Cloudinary upload...</p>
                <div className="w-48 bg-[#E5E7EB] h-1.5 rounded-full mt-4 overflow-hidden">
                  <div className="bg-[#000000] h-full transition-all" style={{ width: `${compressionProgress}%` }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Step Content */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial="hidden"
                animate="show"
                exit="exit"
                variants={slideIn}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* STEP 1: MEDIA */}
                {currentStep === 0 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[16px] font-bold text-[#0F172A]">Curation Assets & Media</h2>
                      <p className="text-[12px] text-[#64748B]">Provide image links directly or upload multiple files at once. The first image acts as the primary cover.</p>
                    </div>

                    <div className="space-y-4">
                      
                      {/* URL Paste Box */}
                      <div className="p-4 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl space-y-3">
                        <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">Option 1: Paste Image URLs</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            id="directUrlInput"
                            placeholder="https://example.com/image.jpg"
                            className="flex-1 bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#000000]/40"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const input = document.getElementById("directUrlInput");
                              if(input.value) {
                                const newImages = [...formData.images, input.value];
                                setFormData({...formData, images: newImages, imageSrc: formData.imageSrc || input.value});
                                input.value = "";
                              }
                            }}
                            className="bg-black text-white hover:bg-slate-900 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-transform active:scale-95 cursor-pointer"
                          >
                            Add URL
                          </button>
                        </div>
                      </div>

                      {/* Multi Upload Box */}
                      <div className="p-4 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl space-y-3">
                        <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest flex justify-between items-center">
                          <span>Option 2: Bulk Upload Files</span>
                          {isCompressing && <span className="text-[#000000] text-[10px] animate-pulse">Uploading to Cloudinary...</span>}
                        </label>
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*,.heic,.heif"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files);
                            if(files.length === 0) return;
                            setIsCompressing(true);
                            try {
                              const uploadData = new FormData();
                              files.forEach(f => uploadData.append('images', f));
                              const res = await uploadService.uploadImages(uploadData, 'products');
                              if(res.success && res.images) {
                                const newImages = [...formData.images, ...res.images];
                                setFormData({...formData, images: newImages, imageSrc: formData.imageSrc || res.images[0]});
                                toast.success(`${res.images.length} photos uploaded!`);
                              }
                            } catch(err) {
                              toast.error("Upload failed");
                            } finally {
                              setIsCompressing(false);
                            }
                          }}
                          className="w-full text-xs text-[#64748B] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:tracking-wider file:bg-black file:text-white hover:file:bg-slate-900 cursor-pointer shadow-sm"
                        />
                      </div>

                      {/* Gallery Grid */}
                      {formData.images.length > 0 && (
                        <div className="pt-2">
                          <h4 className="text-[11px] font-bold text-[#0F172A] uppercase tracking-widest mb-3">Media Gallery ({formData.images.length})</h4>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {formData.images.map((img, idx) => (
                              <div key={idx} className={`relative aspect-square rounded-xl overflow-hidden border-2 ${formData.imageSrc === img ? 'border-[#000000]' : 'border-[#E5E7EB]'} group`}>
                                <img src={img} className="w-full h-full object-cover" alt="Gallery" />
                                {formData.imageSrc === img && (
                                  <div className="absolute top-1 left-1 bg-[#000000] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                    Primary
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  {formData.imageSrc !== img && (
                                    <button
                                      type="button"
                                      onClick={() => setFormData({...formData, imageSrc: img})}
                                      className="w-7 h-7 bg-white text-[#000000] rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                                      title="Make Primary"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">star</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newArr = formData.images.filter((_, i) => i !== idx);
                                      setFormData({
                                        ...formData, 
                                        images: newArr, 
                                        imageSrc: formData.imageSrc === img ? (newArr[0] || "") : formData.imageSrc
                                      });
                                    }}
                                    className="w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                                    title="Delete"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 2: CORE DETAILS */}
                {currentStep === 1 && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h2 className="text-[16px] font-bold text-[#0F172A]">General Specifications</h2>
                        <p className="text-[12px] text-[#64748B]">Detail the craftsmanship elements, Telugu translation title, and materials used.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAIAutoFill}
                        disabled={isAIGenerating}
                        className="bg-black text-white px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-70 cursor-pointer"
                      >
                        {isAIGenerating ? (
                          <div className="w-3.5 h-3.5 border-2 border-[#000000]/30 border-t-[#000000] rounded-full animate-spin" />
                        ) : (
                          <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                        )}
                        {isAIGenerating ? "Analyzing Image & Title..." : "Auto-Fill with AI"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5 block">
                          English Title <span className="text-error">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g. Vintage Teak Jharokha Mirror"
                          className={`w-full bg-[#F8F9FB] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all font-body ${
                            focusedField === "title" 
                              ? "border-2 border-[#000000] shadow-[0_0_15px_rgba(212,175,55,0.6)] scale-[1.01] bg-white" 
                              : "border border-transparent focus:border-[#000000]/40 focus:bg-white"
                          }`}
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5 block">
                          Telugu Title (optional)
                        </label>
                        <input
                          type="text"
                          value={formData.teluguTitle}
                          onChange={(e) => setFormData({ ...formData, teluguTitle: e.target.value })}
                          placeholder="సాంప్రదాయ పూజా పీఠం"
                          className={`w-full bg-[#F8F9FB] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all font-body ${
                            focusedField === "teluguTitle" 
                              ? "border-2 border-[#000000] shadow-[0_0_15px_rgba(212,175,55,0.6)] scale-[1.01] bg-white" 
                              : "border border-transparent focus:border-[#000000]/40 focus:bg-white"
                          }`}
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5 block">
                          Slug (auto-fills if empty)
                        </label>
                        <input
                          type="text"
                          value={formData.slug}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                          placeholder="vintage-teak-jharokha"
                          className={`w-full bg-[#F8F9FB] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all font-body ${
                            focusedField === "slug" 
                              ? "border-2 border-[#000000] shadow-[0_0_15px_rgba(212,175,55,0.6)] scale-[1.01] bg-white" 
                              : "border border-transparent focus:border-[#000000]/40 focus:bg-white"
                          }`}
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5 block">
                          Material
                        </label>
                        <input
                          type="text"
                          value={formData.material}
                          onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                          placeholder="e.g. Teak wood, Pure Brass"
                          className={`w-full bg-[#F8F9FB] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all font-body ${
                            focusedField === "material" 
                              ? "border-2 border-[#000000] shadow-[0_0_15px_rgba(212,175,55,0.6)] scale-[1.01] bg-white" 
                              : "border border-transparent focus:border-[#000000]/40 focus:bg-white"
                          }`}
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                            Category <span className="text-error">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomCategory(!isCustomCategory);
                              setFormData({ ...formData, category: "" });
                            }}
                            className="text-[10px] font-bold text-[#000000] hover:underline cursor-pointer flex items-center gap-0.5"
                          >
                            <span className="material-symbols-outlined text-[12px]">{isCustomCategory ? "list" : "add_circle"}</span>
                            {isCustomCategory ? "Select from list" : "Add Custom"}
                          </button>
                        </div>
                        {isCustomCategory ? (
                          <input
                            type="text"
                            required
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            placeholder="e.g. Traditional Urlis, Brass Lamps"
                            className={`w-full bg-[#F8F9FB] rounded-xl px-4 py-2.5 text-[12.5px] outline-none font-body transition-all ${
                              focusedField === "category" 
                                ? "border-2 border-[#000000] shadow-[0_0_15px_rgba(212,175,55,0.6)] scale-[1.01] bg-white" 
                                : "border border-[#000000]/40 focus:bg-white animate-pulse-subtle"
                            }`}
                          />
                        ) : (
                          <select
                            required
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className={`w-full bg-[#F8F9FB] rounded-xl px-4 py-2.5 text-[12.5px] outline-none cursor-pointer transition-all ${
                              focusedField === "category" 
                                ? "border-2 border-[#000000] shadow-[0_0_15px_rgba(212,175,55,0.6)] scale-[1.01] bg-white" 
                                : "border border-transparent focus:border-[#000000]/40"
                            }`}
                          >
                            <option value="">Select Category</option>
                            {categoriesList.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5 block">
                          Dimensions (L x W x H)
                        </label>
                        <input
                          type="text"
                          value={formData.dimensions}
                          onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                          placeholder='e.g. 18" x 4" x 24"'
                          className={`w-full bg-[#F8F9FB] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all font-body ${
                            focusedField === "dimensions" 
                              ? "border-2 border-[#000000] shadow-[0_0_15px_rgba(212,175,55,0.6)] scale-[1.01] bg-white" 
                              : "border border-transparent focus:border-[#000000]/40 focus:bg-white"
                          }`}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5 block">
                          Product Description
                        </label>
                        <textarea
                          rows={4}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Detail the story, craftsmanship techniques, and ritual significance of this piece..."
                          className={`w-full bg-[#F8F9FB] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all font-body resize-none ${
                            focusedField === "description" 
                              ? "border-2 border-[#000000] shadow-[0_0_15px_rgba(212,175,55,0.6)] scale-[1.01] bg-white" 
                              : "border border-transparent focus:border-[#000000]/40 focus:bg-white"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: VARIANTS & BADGES */}
                {currentStep === 2 && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h2 className="text-[16px] font-bold text-[#0F172A]">Attributes & Custom Variants</h2>
                        <p className="text-[12px] text-[#64748B]">Define custom colors, sizes, or wood variations with their own inventory adjustments.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAIAutoFill}
                        disabled={isAIGenerating}
                        className="bg-black text-white px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-70 cursor-pointer"
                      >
                        {isAIGenerating ? (
                          <div className="w-3.5 h-3.5 border-2 border-[#000000]/30 border-t-[#000000] rounded-full animate-spin" />
                        ) : (
                          <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                        )}
                        {isAIGenerating ? "Analyzing Curation..." : "Auto-Fill with AI"}
                      </button>
                    </div>

                    {/* Badge Pill Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5 block">
                          Storefront Badges (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={formData.badges}
                          onChange={(e) => setFormData({ ...formData, badges: e.target.value })}
                          placeholder="e.g. Best Seller, Heritage Craft"
                          className="w-full bg-[#F8F9FB] rounded-xl px-4 py-2.5 text-[12.5px] outline-none border border-transparent focus:border-[#000000]/40 focus:bg-white transition-all font-body"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5 block">
                          Tags / Collections
                        </label>
                        <input
                          type="text"
                          value={formData.tags}
                          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                          placeholder="e.g. brass, puja, diwali"
                          className={`w-full bg-[#F8F9FB] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all font-body ${
                            focusedField === "tags" 
                              ? "border-2 border-[#000000] shadow-[0_0_15px_rgba(212,175,55,0.6)] scale-[1.01] bg-white" 
                              : "border border-transparent focus:border-[#000000]/40 focus:bg-white"
                          }`}
                        />
                      </div>
                    </div>

                     {/* Dynamic Variant Constructor */}
                    <div className="p-4 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl space-y-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#0F172A]">Add Variation Parameter</p>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <input
                          type="text"
                          placeholder="Attribute (e.g. Wood)"
                          value={newVariant.name}
                          onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                          className="bg-white rounded-lg px-2.5 py-2.5 text-[12px] border border-[#E5E7EB] outline-none w-full"
                        />
                        <input
                          type="text"
                          placeholder="Value (e.g. Rosewood)"
                          value={newVariant.value}
                          onChange={(e) => setNewVariant({ ...newVariant, value: e.target.value })}
                          className="bg-white rounded-lg px-2.5 py-2.5 text-[12px] border border-[#E5E7EB] outline-none w-full"
                        />
                        <input
                          type="number"
                          placeholder="+/- Price (₹)"
                          value={newVariant.price}
                          onChange={(e) => setNewVariant({ ...newVariant, price: e.target.value })}
                          className="bg-white rounded-lg px-2.5 py-2.5 text-[12px] border border-[#E5E7EB] outline-none w-full"
                        />
                        <button
                          type="button"
                          onClick={handleAddVariant}
                          className="bg-black text-white text-[11px] font-bold uppercase py-2.5 rounded-lg hover:brightness-110 cursor-pointer w-full transition-transform active:scale-95 shadow-sm"
                        >
                          Add Option
                        </button>
                      </div>

                      {/* Rendered variants list */}
                      {formData.variants.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {formData.variants.map((v) => (
                            <span
                              key={v.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E5E7EB] text-[11.5px] rounded-lg text-[#0F172A] font-medium"
                            >
                              <span className="text-[#64748B]">{v.name}:</span> {v.value}
                              {v.price && <span className="text-[#000000] font-bold">({Number(v.price) >= 0 ? `+₹${v.price}` : `-₹${Math.abs(v.price)}`})</span>}
                              <button
                                type="button"
                                onClick={() => handleRemoveVariant(v.id)}
                                className="text-red-500 hover:text-red-700 ml-1 flex items-center justify-center cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 5: SEO METADATA */}
                {currentStep === 3 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[16px] font-bold text-[#0F172A]">SEO Meta Configuration</h2>
                      <p className="text-[12px] text-[#64748B]">Perfect your organic reach titles. Renders live search engine preview results below.</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5 block">
                          SEO Page Title
                        </label>
                        <input
                          type="text"
                          value={formData.seoTitle}
                          onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                          placeholder="e.g. Antique Brass Urli Bowl with Bells | Siri Arts & Crafts"
                          className={`w-full bg-[#F8F9FB] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all font-body ${
                            focusedField === "seoTitle" 
                              ? "border-2 border-[#000000] shadow-[0_0_15px_rgba(212,175,55,0.6)] scale-[1.01] bg-white" 
                              : "border border-transparent focus:border-[#000000]/40 focus:bg-white"
                          }`}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5 block">
                          SEO Meta Description
                        </label>
                        <textarea
                          rows={3}
                          value={formData.seoDescription}
                          onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                          placeholder="Exquisite handmade floating flower urli bowl. Ideal for festive entryways, home decor gifts, and pujas. Free shipping across India..."
                          className={`w-full bg-[#F8F9FB] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all font-body resize-none ${
                            focusedField === "seoDescription" 
                              ? "border-2 border-[#000000] shadow-[0_0_15px_rgba(212,175,55,0.6)] scale-[1.01] bg-white" 
                              : "border border-transparent focus:border-[#000000]/40 focus:bg-white"
                          }`}
                        />
                      </div>

                      {/* Google Search Snippet Live Preview */}
                      <div className="p-4 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm space-y-1.5 text-left font-sans">
                        <div className="flex items-center gap-1.5 text-[11px] text-[#202124]">
                          <span>siriartsandcrafts.com</span>
                          <span className="text-[#5f6368]">› products › {formData.slug || "jharokha"}</span>
                        </div>
                        <h4 className="text-[#1a0dab] text-[18px] hover:underline cursor-pointer leading-tight font-medium font-sans">
                          {formData.seoTitle || formData.title || "Buy Luxury Handcrafted Traditional Decor Items Online"}
                        </h4>
                        <p className="text-[#4d5156] text-[12.5px] leading-relaxed font-normal">
                          <span className="text-[#70757a]">17 May 2026 — </span>
                          {formData.seoDescription || formData.description || "Discover organic handcrafted Urli bowls, Rosewood Jharokha mirrors, traditional brass artifacts for wedding backdrops at Siri Arts."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: PRICING & STOCK */}
                {currentStep === 4 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[16px] font-bold text-[#0F172A]">Pricing & Inventory</h2>
                      <p className="text-[12px] text-[#64748B]">Set list price, optional higher old striking price (to show sale discounts), and warehouse stock.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div className="p-4 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl">
                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2 block">
                          Curation Price (₹) <span className="text-error">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] text-[13px] font-bold">₹</span>
                          <input
                            type="number"
                            required
                            min="1"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="w-full bg-white rounded-xl pl-7 pr-3 py-2 text-[13px] outline-none border border-[#E5E7EB] focus:border-[#000000]/40 font-body"
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl">
                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2 block">
                          Old Striking Price (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]/50 text-[13px] font-bold">₹</span>
                          <input
                            type="number"
                            value={formData.oldPrice}
                            onChange={(e) => setFormData({ ...formData, oldPrice: e.target.value })}
                            placeholder="Optional list price"
                            className="w-full bg-white rounded-xl pl-7 pr-3 py-2 text-[13px] outline-none border border-[#E5E7EB] focus:border-[#000000]/40 font-body"
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl">
                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2 block">
                          Available Stock <span className="text-error">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] text-[13px] font-bold">#</span>
                          <input
                            type="number"
                            required
                            min="0"
                            placeholder="Units"
                            value={formData.stock}
                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                            className="w-full bg-white rounded-xl pl-7 pr-3 py-2 text-[13px] outline-none border border-[#E5E7EB] focus:border-[#000000]/40 font-body"
                          />
                        </div>
                      </div>
                    </div>

                    {formData.stock !== "" && Number(formData.stock) <= 5 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-[11.5px] text-amber-700 font-semibold">
                        <span className="material-symbols-outlined text-[18px]">warning</span>
                        <span>Stock is below threshold. A 'Low Stock' badge will trigger automatically in the catalog.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 6: REVIEW & PUBLISH */}
                {currentStep === 5 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[16px] font-bold text-[#0F172A]">Catalog Validation Curation</h2>
                      <p className="text-[12px] text-[#64748B]">Review publishing credentials. Check visibility status and home curation locks.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Visibility Status Toggle */}
                      <div className="p-4 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="text-[12.5px] font-bold text-[#0F172A]">Visibility Status</p>
                          <p className="text-[10px] text-[#64748B]">Controls visible storefront availability</p>
                        </div>
                        <select
                          value={formData.isActive ? "active" : "draft"}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "active" })}
                          className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-[11.5px] font-bold text-[#0F172A] cursor-pointer outline-none"
                        >
                          <option value="active">Active (Visible)</option>
                          <option value="draft">Draft (Private)</option>
                        </select>
                      </div>

                      {/* Curation Highlight Toggle */}
                      <div className="p-4 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="text-[12.5px] font-bold text-[#0F172A]">Featured Collection</p>
                          <p className="text-[10px] text-[#64748B]">Pin to Homepage Hero Carousel</p>
                        </div>
                        <AdminToggle
                          checked={formData.featured}
                          onChange={() => setFormData({ ...formData, featured: !formData.featured })}
                        />
                      </div>

                      {/* Show in Gallery Toggle */}
                      <div className="p-4 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl flex items-center justify-between col-span-1 sm:col-span-2">
                        <div>
                          <p className="text-[12.5px] font-bold text-[#0F172A]">Show in Gallery Also</p>
                          <p className="text-[10px] text-[#64748B]">Automatically sync and display this product in the Inspiration Gallery</p>
                        </div>
                        <AdminToggle
                          checked={formData.showInGallery}
                          onChange={() => setFormData({ ...formData, showInGallery: !formData.showInGallery })}
                        />
                      </div>

                      {/* Summary Data Review list */}
                      <div className="col-span-1 sm:col-span-2 p-5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl space-y-4 text-[12px]">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] border-b border-[#E5E7EB]/60 pb-1.5 mb-2">Curation Credentials Summary</p>
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[#E5E7EB]/40 pb-2 gap-1">
                            <span className="font-semibold text-[#64748B] uppercase tracking-wider text-[10px]">English Title</span>
                            <span className="font-bold text-[#0F172A] sm:text-right">{formData.title}</span>
                          </div>
                          {formData.teluguTitle && (
                            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[#E5E7EB]/40 pb-2 gap-1">
                              <span className="font-semibold text-[#64748B] uppercase tracking-wider text-[10px]">Telugu Title</span>
                              <span className="font-semibold text-[#0F172A] sm:text-right">{formData.teluguTitle}</span>
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[#E5E7EB]/40 pb-2 gap-1">
                            <span className="font-semibold text-[#64748B] uppercase tracking-wider text-[10px]">Category</span>
                            <span className="font-bold text-[#0F172A] sm:text-right">{formData.category || "Unassigned"}</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[#E5E7EB]/40 pb-2 gap-1">
                            <span className="font-semibold text-[#64748B] uppercase tracking-wider text-[10px]">Retail Price</span>
                            <span className="font-bold text-black sm:text-right">₹{Number(formData.price || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[#E5E7EB]/40 pb-2 gap-1">
                            <span className="font-semibold text-[#64748B] uppercase tracking-wider text-[10px]">Stock Quantity</span>
                            <span className="font-bold text-[#0F172A] sm:text-right">{formData.stock || 0} Units</span>
                          </div>
                          {formData.material && (
                            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[#E5E7EB]/40 pb-2 gap-1">
                              <span className="font-semibold text-[#64748B] uppercase tracking-wider text-[10px]">Core Material</span>
                              <span className="font-bold text-[#0F172A] sm:text-right">{formData.material}</span>
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[#E5E7EB]/40 pb-2 gap-1">
                            <span className="font-semibold text-[#64748B] uppercase tracking-wider text-[10px]">Featured</span>
                            <span className="font-bold text-[#0F172A] sm:text-right">{formData.featured ? "Yes" : "No"}</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between pb-1 gap-1">
                            <span className="font-semibold text-[#64748B] uppercase tracking-wider text-[10px]">Show in Gallery</span>
                            <span className="font-bold text-[#0F172A] sm:text-right">{formData.showInGallery ? "Yes" : "No"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Controls: Back & Next / Save */}
          <div className="border-t border-[#E5E7EB]/60 pt-4 mt-6 flex items-center justify-between bg-white">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="px-5 py-2.5 bg-[#F8F9FB] border border-[#E5E7EB] text-[#64748B] rounded-full text-[12px] font-bold hover:bg-[#E5E7EB]/45 cursor-pointer disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
            >
              Back
            </button>

            {currentStep < WIZARD_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-black text-white rounded-full text-[12px] font-bold hover:bg-slate-900 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-md"
              >
                Continue
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-7 py-3 bg-black text-white rounded-full text-[12px] font-bold uppercase tracking-wider hover:bg-slate-900 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving Curation...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px] text-white">done_all</span>
                    {isEditMode ? "Update Curation" : "Publish to Shop"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Live Catalog Preview Card */}
        <div className={`lg:sticky lg:top-24 space-y-6 w-full ${mobileTab === "preview" ? "block" : "hidden lg:block"}`}>
          <div className="text-center lg:text-left">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#64748B]">Storefront Preview</span>
            <p className="text-[11px] text-[#64748B]/75 mt-0.5">Real-time catalog rendition of your craft product</p>
          </div>

          {/* Luxury Card Rendering */}
          <div className="bg-white rounded-3xl overflow-hidden border border-[#E5E7EB]/60 shadow-[0_12px_30px_rgba(45,43,41,0.06)] group relative">
            {/* Badges Overlay */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
              {formData.badges &&
                formData.badges
                  .split(",")
                  .map((b) => b.trim())
                  .filter(Boolean)
                  .map((b, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-black text-white shadow-sm"
                    >
                      {b}
                    </span>
                  ))}
              {formData.featured && (
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-[#000000] text-white shadow-sm flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[10px] fill-current">star</span>
                  Featured
                </span>
              )}
            </div>

            {/* Availability Badges Overlay */}
            <div className="absolute top-3 right-3 z-10">
              {formData.stock !== "" && Number(formData.stock) === 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-wider bg-red-600 text-white shadow-sm">
                  Sold Out
                </span>
              ) : formData.stock !== "" && Number(formData.stock) <= 5 ? (
                <span className="px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-sm">
                  Low Stock
                </span>
              ) : null}
            </div>

            {/* Card Thumbnail */}
            <div className="aspect-[4/3] bg-[#F8F9FB] relative overflow-hidden">
              {formData.imageSrc ? (
                <img
                  src={formData.imageSrc}
                  alt={formData.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#64748B]/40">
                  <span className="material-symbols-outlined text-[36px] mb-2">add_a_photo</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest">Image Preview Canvas</span>
                </div>
              )}
            </div>

            {/* Thumbnail Gallery Indicators (Tiny previews) */}
            {formData.images.length > 0 && (
              <div className="flex gap-1.5 px-4 pt-3 shrink-0">
                {formData.images.filter(Boolean).map((img, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-lg overflow-hidden border border-[#E5E7EB] cursor-pointer hover:border-[#000000]"
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* Product Body */}
            <div className="p-4 space-y-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#000000]">
                {formData.category || "Category Unassigned"}
              </span>

              <div>
                <h3 className="text-[14.5px] font-display font-bold text-[#0F172A] truncate">
                  {formData.title || "Traditional Sanskriti Masterpiece"}
                </h3>
                {formData.teluguTitle && (
                  <p className="text-[11px] font-body text-[#64748B]/90 italic mt-0.5 truncate">
                    {formData.teluguTitle}
                  </p>
                )}
              </div>

              {formData.material && (
                <div className="flex items-center gap-1 text-[10px] text-[#64748B] font-medium bg-[#F8F9FB] px-2 py-1 rounded-lg w-max border border-[#E5E7EB]/40">
                  <span className="material-symbols-outlined text-[12px] text-[#000000]">auto_awesome</span>
                  <span>{formData.material}</span>
                </div>
              )}

              {/* Price Tag Row */}
              <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]/40 mt-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[16px] font-display font-extrabold text-[#0F172A]">
                    ₹{Number(formData.price || 0).toLocaleString()}
                  </span>
                  {formData.oldPrice && (
                    <span className="text-[11.5px] text-[#64748B]/50 line-through">
                      ₹{Number(formData.oldPrice).toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[13px] text-[#000000] fill-current">star</span>
                  <span className="text-[10px] font-bold text-[#0F172A]">4.9</span>
                  <span className="text-[9px] text-[#64748B]">(12 reviews)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SaaS AI Curation HUD Overlay Modal */}
      {showAIHUD && aiAnalysisResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#F8F9FB] border border-[#000000]/40 max-w-xl w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] font-body relative">
            
            {/* Luxury Header */}
            <div className="bg-[#0F172A] p-5 text-white flex justify-between items-center border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white animate-pulse">auto_awesome</span>
                <div className="text-left">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-white">Groq Llama 4 Curation Analysis</h3>
                  <p className="text-[9px] text-slate-300">Rigorous 4-Stage Multimodal Craft Curation</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAIHUD(false)} 
                className="text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Scrollable Dashboard Panel */}
            <div className="p-6 overflow-y-auto space-y-5 text-left text-[#0F172A]">
              
              {/* Top Classification Row: Object + Confidence Score */}
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-sm">
                <div>
                  <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider">Detected Object Class</p>
                  <h4 className="text-[17px] font-bold text-[#0F172A] flex items-center gap-1.5 mt-0.5">
                    <span className="material-symbols-outlined text-[#000000] text-[18px]">workspace_premium</span>
                    {aiAnalysisResult.detected_object || "Unidentified Curation"}
                  </h4>
                </div>
                
                {/* Confidence circular indicator */}
                <div className="flex flex-col items-center">
                  <div className="relative w-14 h-14 flex items-center justify-center rounded-full bg-amber-50 border-2 border-amber-500/30 shadow-inner">
                    <span className="text-[13px] font-extrabold text-amber-600">{aiAnalysisResult.confidence || 85}%</span>
                  </div>
                  <p className="text-[8px] font-bold text-amber-600 uppercase tracking-widest mt-1">Confidence</p>
                </div>
              </div>

              {/* Titles Block */}
              <div className="space-y-3">
                <div className="p-3.5 bg-white border border-[#E5E7EB] rounded-xl space-y-1 shadow-sm">
                  <span className="text-[8.5px] font-extrabold text-[#64748B] uppercase tracking-wider block">Generated English Title</span>
                  <p className="text-[12.5px] font-bold text-[#0F172A]">{aiAnalysisResult.english_title}</p>
                </div>
                <div className="p-3.5 bg-white border border-[#E5E7EB] rounded-xl space-y-1 shadow-sm">
                  <span className="text-[8.5px] font-extrabold text-[#64748B] uppercase tracking-wider block">Natural Telugu Curation</span>
                  <p className="text-[13px] font-bold text-[#0F172A] font-body TeluguScript">{aiAnalysisResult.telugu_title}</p>
                </div>
              </div>

              {/* Attribute Grid */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Category */}
                <div className="p-3.5 bg-white border border-[#E5E7EB] rounded-xl space-y-1.5 shadow-sm">
                  <span className="text-[8.5px] font-extrabold text-[#64748B] uppercase tracking-wider block">Category Mapped</span>
                  <div className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg text-[9.5px] font-bold border border-purple-200">
                    <span className="material-symbols-outlined text-[11px]">category</span>
                    {aiAnalysisResult.category || "General Decor"}
                  </div>
                </div>

                {/* Occasion / Style */}
                <div className="p-3.5 bg-white border border-[#E5E7EB] rounded-xl space-y-1.5 shadow-sm">
                  <span className="text-[8.5px] font-extrabold text-[#64748B] uppercase tracking-wider block">Style & Theme</span>
                  <p className="text-[11px] font-bold text-[#0F172A]">{aiAnalysisResult.style || "Traditional Indian"}</p>
                </div>

                {/* Materials Chips */}
                <div className="col-span-2 p-3.5 bg-white border border-[#E5E7EB] rounded-xl space-y-2 shadow-sm">
                  <span className="text-[8.5px] font-extrabold text-[#64748B] uppercase tracking-wider block">Auto-Detected Craft Materials</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(aiAnalysisResult.materials || []).map((m, idx) => (
                      <span key={idx} className="bg-amber-50 text-[#000000] px-2.5 py-0.5 rounded-full text-[9.5px] font-bold border border-[#000000]/20 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#000000]" />
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Color Palette */}
                <div className="col-span-2 p-3.5 bg-white border border-[#E5E7EB] rounded-xl space-y-2 shadow-sm">
                  <span className="text-[8.5px] font-extrabold text-[#64748B] uppercase tracking-wider block">Color Palette Extracted</span>
                  <div className="flex flex-wrap gap-3">
                    {(aiAnalysisResult.colors || []).map((c, idx) => {
                      const colorMap = {
                        gold: "#FFD700",
                        green: "#1b4d3e",
                        red: "#c62828",
                        maroon: "#5d001e",
                        ivory: "#fbf6eb",
                        yellow: "#fbc02d",
                        pink: "#f06292",
                        brass: "#000000",
                        bronze: "#cd7f32"
                      };
                      const hex = colorMap[c.toLowerCase()] || "#64748B";
                      const isLight = c.toLowerCase() === "ivory";
                      return (
                        <div key={idx} className="flex items-center gap-1.5 bg-[#F8F9FB] border border-[#E5E7EB] px-2.5 py-1 rounded-xl shadow-sm">
                          <span className={`w-3 h-3 rounded-full shadow-inner border ${isLight ? 'border-gray-300' : 'border-transparent'}`} style={{ backgroundColor: hex }} />
                          <span className="text-[9.5px] font-bold text-[#0F172A] capitalize">{c}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tags Generation */}
                <div className="col-span-2 p-3.5 bg-white border border-[#E5E7EB] rounded-xl space-y-2 shadow-sm">
                  <span className="text-[8.5px] font-extrabold text-[#64748B] uppercase tracking-wider block">SEO Collections & Search Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {(aiAnalysisResult.tags || []).map((t, idx) => (
                      <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg text-[9px] font-semibold border border-gray-200">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="col-span-2 p-3.5 bg-white border border-[#E5E7EB] rounded-xl space-y-1.5 shadow-sm">
                  <span className="text-[8.5px] font-extrabold text-[#64748B] uppercase tracking-wider block">Premium Curation Description</span>
                  <p className="text-[11px] text-[#555] leading-relaxed italic">"{aiAnalysisResult.description}"</p>
                </div>

              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-[#F8F9FB] border-t border-[#E5E7EB] flex flex-col sm:flex-row gap-2.5">
              <button 
                type="button"
                onClick={() => setShowAIHUD(false)}
                className="w-full sm:flex-1 border border-[#E5E7EB] text-[#64748B] py-2.5 rounded-xl text-[11.5px] font-bold hover:bg-white transition-colors cursor-pointer"
              >
                Manual Correction / Reject
              </button>
              
              <button 
                type="button"
                onClick={handleApplyAISpecs}
                className="w-full sm:flex-1 bg-black text-white py-2.5 rounded-xl text-[11.5px] font-bold shadow-md hover:bg-slate-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[15px] animate-bounce">published_with_changes</span>
                Apply AI Curation
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
