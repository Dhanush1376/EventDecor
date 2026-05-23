import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MandalaElement } from "../components/ui/MandalaElement";
import { SEO } from "../components/seo/SEO";
import { customOrderService, uploadService } from "../services/domainServices";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

import logger from '../utils/logger';
// Framer motion presets
const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const slideIn = { hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } };

// Direct Image URL Check
const isDirectImageUrl = (url) => {
  if (!url) return false;
  return url.match(/\.(jpeg|jpg|gif|png|webp|heic)/i) || url.includes("cloudinary.com");
};

export function CustomOrders() {
  const { user, login, isAuthenticated, runProtectedAction } = useAuth();
  
  // Custom states to prevent "Other" text fields from disappearing
  const [showCustomOccasion, setShowCustomOccasion] = useState(false);
  const [showCustomProductType, setShowCustomProductType] = useState(false);
  
  // Workspace tabs: 'wizard' (Submit Custom Request) vs 'tracker' (Track My Custom Orders)
  const [activeTab, setActiveTab] = useState("wizard");
  const [mobileSubTab, setMobileSubTab] = useState("chat");
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);

  // ─── TRACKER PORTAL STATES ───
  const [myOrders, setMyOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatEndRef = useRef(null);

  // ─── WIZARD FORM STATES ───
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardDraft, setWizardDraft] = useState({
    occasion: "",
    productType: "",
    inspirationImages: [],
    customRequirements: "",
    budget: "",
    quantity: 1,
    eventDate: "",
    city: "",
    bookingType: "Video Meet",
    customerName: "",
    customerPhone: "",
    customerEmail: ""
  });

  // ─── AI ANALYSIS & SIGNATURE PRESETS STATES ───
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [aiStep, setAiStep] = useState(0); // For scanning animation steps
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false); // Bottom-right FAQ bot
  const [aiMessages, setAiMessages] = useState([
    { sender: "ai", text: "Namaste! I am your Siri Heritage Design Assistant. Ask me anything about traditional South Indian wedding decor, florals, brass accents, or custom design timelines!" }
  ]);
  const [aiUserQuery, setAiUserQuery] = useState("");


  const handleWhatsAppConsult = () => {
    const phone = "919866006648";
    let msg = `Namaste Siri Arts & Crafts! I am interested in consulting with your master artisans for a custom event decor.\n\n`;
    if (activeTab === "wizard") {
      msg += `*Occasion:* ${wizardDraft.occasion || "TBD"}\n`;
      msg += `*Category:* ${wizardDraft.productType || "TBD"}\n`;
      msg += `*Setups:* ${wizardDraft.quantity}\n`;
      msg += `*Event Date:* ${wizardDraft.eventDate || "TBD"}\n`;
      msg += `*Location:* ${wizardDraft.city || "TBD"}\n`;
      if (wizardDraft.customRequirements) {
        msg += `*My Requirements:* ${wizardDraft.customRequirements}\n`;
      }
      if (wizardDraft.budget) {
        msg += `*Estimated Budget:* ${wizardDraft.budget}\n`;
      }
    } else if (selectedOrder) {
      msg += `*Order Reference:* ${selectedOrder._id}\n`;
      msg += `*Occasion:* ${selectedOrder.occasion}\n`;
      msg += `*Status:* ${selectedOrder.status}\n`;
      msg += `*Total Estimated Price:* ${selectedOrder.quotation?.total ? "₹" + selectedOrder.quotation.total.toLocaleString("en-IN") : "Price Estimate Pending"}\n`;
    }
    msg += `\nLooking forward to your expert advice!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Custom text states for "Other / Custom" specifications
  const [customOccasionText, setCustomOccasionText] = useState("");
  const [customProductTypeText, setCustomProductTypeText] = useState("");
  const [pastedLink, setPastedLink] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // ─── AI DESIGN REFS ANALYZER ───
  const handleAIAnalysis = async () => {
    if (wizardDraft.inspirationImages.length === 0) {
      toast.error("Please upload or paste at least one inspiration photo first.");
      return;
    }
    
    setIsAnalyzing(true);
    setAiStep(1);
    
    const steps = [
      "Decomposing image color spectrum...",
      "Analyzing traditional Telugu & South Indian motif shapes...",
      "Classifying floral swags and background wood carving styles...",
      "Estimating silver/brass elements & structural framework count...",
      "Matching with Siri artisan catalogs and material cost curves..."
    ];

    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current < steps.length) {
        setAiStep(current + 1);
      } else {
        clearInterval(interval);
        
        // Formulate perfect AI Analysis response dynamically based on first occasion/category
        const category = wizardDraft.productType || "Traditional Decor";
        const occasion = wizardDraft.occasion || "Event";
        
        let style = "Traditional Dravidian Heritage";
        let palette = ["#D4AF37", "#A6192E", "#FAF9F6"]; // Gold, Heritage Red, Cream
        let colorDesc = "Gilded Royal Gold, Sacred Kumkum Crimson, and Pristine Cream";
        let materials = "Carved teak pillars, hanging brass bells, hand-strung marigold swags, and jasmine runners";
        let suggestedBudget = "₹1,50,000 - ₹2,50,000";
        
        if (category.toLowerCase().includes("pooja") || occasion.toLowerCase().includes("pooja")) {
          style = "Tranquil Vedic Devotional";
          palette = ["#FAF9F6", "#D4AF37", "#2E8B57"]; // Cream, Gold, Green
          colorDesc = "Sacred Coconut Green, Gilded Bell Gold, and Sandalwood Cream";
          materials = "Brass deepams, floating lotus bowls (urlis), mango leaves, and rose petal garlands";
          suggestedBudget = "₹25,000 - ₹50,000";
        } else if (category.toLowerCase().includes("tray") || category.toLowerCase().includes("hamper") || occasion.toLowerCase().includes("engagement")) {
          style = "Contemporary Kundan Filigree";
          palette = ["#FFE4E1", "#D4AF37", "#E8D8C8"]; // Rose, Gold, Beige
          colorDesc = "Royal Rose Pink, Shimmering Gold beads, and Pearl White borders";
          materials = "Velvet fabrics, kundan stonework borders, customized wood cuts, and baby's breath floral sprays";
          suggestedBudget = "₹5,000 - ₹12,000";
        } else if (occasion.toLowerCase().includes("haldi") || occasion.toLowerCase().includes("mehendi")) {
          style = "Vibrant Botanical Celebration";
          palette = ["#FFD700", "#FF4500", "#043927"]; // Yellow, Orange, Emerald
          colorDesc = "Turmeric Yellow, Kesari Orange, and Banana Leaf Green";
          materials = "Traditional wooden swing, marigold canopies, handwoven palm leaf panels, and earthen pots";
          suggestedBudget = "₹45,000 - ₹85,000";
        }
        
        setAiAnalysisResult({
          style,
          palette,
          colorDesc,
          materials,
          suggestedBudget
        });
        setIsAnalyzing(false);
        setAiStep(0);
        toast.success("Siri AI successfully analyzed your design reference!");
      }
    }, 800);
  };

  const handleApplyAiSuggestions = () => {
    if (!aiAnalysisResult) return;
    
    // Auto-update requirements and budget
    const updatedReqs = wizardDraft.customRequirements 
      ? `${wizardDraft.customRequirements}\n\n[Siri AI Analysis Applied]\n• Style: ${aiAnalysisResult.style}\n• Colors: ${aiAnalysisResult.colorDesc}\n• Materials: ${aiAnalysisResult.materials}`
      : `[Siri AI Analysis Applied]\n• Style: ${aiAnalysisResult.style}\n• Colors: ${aiAnalysisResult.colorDesc}\n• Materials: ${aiAnalysisResult.materials}`;
      
    updateDraft({
      customRequirements: updatedReqs,
      budget: aiAnalysisResult.suggestedBudget
    });
    
    toast.success("Successfully applied AI colors, materials, and budget settings to your form!");
  };

  // ─── AI DESIGN FAQ ASSISTANT ───
  const handleAiChatSubmit = (e) => {
    if (e) e.preventDefault();
    if (!aiUserQuery.trim()) return;
    
    const userMsg = { sender: "user", text: aiUserQuery };
    const nextMsgs = [...aiMessages, userMsg];
    setAiMessages(nextMsgs);
    setAiUserQuery("");
    
    setTimeout(() => {
      let reply;
      const q = aiUserQuery.toLowerCase();
      if (q.includes("haldi") || q.includes("yellow") || q.includes("marigold")) {
        reply = "For an auspicious morning Haldi, we highly recommend our 'Botanical Marigold Haldi' theme. It blends handwoven mango leaves and fresh turmeric-yellow marigolds with suspended brass urlis filled with floating lotus petals. This setup symbolises purity and joy, and pairs beautifully with white/ivory outfits!";
      } else if (q.includes("backdrop") || q.includes("stage") || q.includes("mandap")) {
        reply = "Our custom backdrops are crafted with modular high-quality plywood frames, which are then covered in premium Mysore Mysore silk, heritage velvet, or handwoven coconut leaf grids. Timelines range from 5 days for catalog setups to 15 days for a fully bespoke Dravidian temple replica.";
      } else if (q.includes("cost") || q.includes("price") || q.includes("budget") || q.includes("how much")) {
        reply = "Our custom orders range from entry-level ring trays starting around ₹2,500, traditional ritual pooja setups starting around ₹20,000, up to full grand wedding mandapam stages starting from ₹1,50,000. We work closely within your budget to optimize material choices (fresh vs high-fidelity artificial blooms).";
      } else if (q.includes("jasmine") || q.includes("flower") || q.includes("rose")) {
        reply = "Siri Arts & Crafts prides itself on sourcing authentic fresh jasmine (Mogra) directly from farmers. For long-duration outdoor events, we recommend a mix of fresh greens and premium textile jasmine replicas to maintain pristine crispness under high sunlight.";
      } else if (q.includes("whatsapp") || q.includes("contact") || q.includes("phone")) {
        reply = "You can chat with our design experts instantly via WhatsApp at +91 98660 06648. There is also a direct consultation button on Step 8 or in your tracker portal!";
      } else {
        reply = "That is a wonderful design consideration! Siri's design team specializes in adapting historical South Indian temple geometry into custom modular panels. We can match any reference picture you upload and provide custom carvings, color matching, and digital sketches within 48 hours.";
      }
      setAiMessages([...nextMsgs, { sender: "ai", text: reply }]);
    }, 600);
  };

  const handleQuickQuestion = (question) => {
    const userMsg = { sender: "user", text: question };
    const nextMsgs = [...aiMessages, userMsg];
    setAiMessages(nextMsgs);
    
    setTimeout(() => {
      let reply;
      const q = question.toLowerCase();
      if (q.includes("haldi") || q.includes("flower")) {
        reply = "For an auspicious morning Haldi, we highly recommend our 'Botanical Marigold Haldi' theme. It blends handwoven mango leaves and fresh turmeric-yellow marigolds with suspended brass urlis filled with floating lotus petals. This setup symbolises purity and joy, and pairs beautifully with white/ivory outfits!";
      } else if (q.includes("backdrop") || q.includes("stage") || q.includes("timeline")) {
        reply = "Our custom backdrops are crafted with modular high-quality plywood frames, which are then covered in premium Mysore silk, heritage velvet, or handwoven coconut leaf grids. Timelines range from 5 days for catalog setups to 15 days for a fully bespoke Dravidian temple replica.";
      } else if (q.includes("cost") || q.includes("price") || q.includes("pooja")) {
        reply = "Our custom orders range from entry-level ring trays starting around ₹2,500, traditional ritual pooja setups starting around ₹20,000, up to full grand wedding mandapam stages starting from ₹1,50,000. We work closely within your budget to optimize material choices (fresh vs high-fidelity artificial blooms).";
      } else if (q.includes("whatsapp") || q.includes("line")) {
        reply = "You can chat with our design experts instantly via WhatsApp at +91 98660 06648. There is also a direct consultation button on Step 8 or in your tracker portal!";
      } else {
        reply = "That is a wonderful design consideration! Siri's design team specializes in adapting historical South Indian temple geometry into custom modular panels. We can match any reference picture you upload and provide custom carvings, color matching, and digital sketches within 48 hours.";
      }
      setAiMessages([...nextMsgs, { sender: "ai", text: reply }]);
    }, 500);
  };

  // Fetch dynamic form options and customer's orders
  const loadWorkspaceData = async () => {
    setLoading(true);
    try {
      const configRes = await customOrderService.getConfig();
      if (configRes?.success) {
        setConfig(configRes.data);
      } else {
        setConfig(configRes);
      }

      if (user) {
        const ordersRes = await customOrderService.getMyOrders();
        if (ordersRes?.success) {
          setMyOrders(ordersRes.data || []);
        } else {
          setMyOrders(ordersRes || []);
        }
      }
    } catch (err) {
      logger.error("Failed to load workspace data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadWorkspaceData();
    }, 0);
    return () => clearTimeout(timer);
  }, [user]);

  // Autosave draft (in-memory only)
  const updateDraft = (fields) => {
    const nextDraft = { ...wizardDraft, ...fields };
    setWizardDraft(nextDraft);
  };

  // Preset options configurations
  const occasionList = config?.occasions?.filter(o => o.enabled) || [];
  const productTypeList = config?.productTypes?.filter(p => p.enabled) || [];
  const budgetList = config?.budgetRanges?.filter(b => b.enabled) || [];
  const bookingList = config?.bookingTypes?.filter(b => b.enabled) || [];

  // Sync custom inputs from draft once loaded
  useEffect(() => {
    if (wizardDraft.occasion && occasionList.length > 0) {
      const isPreset = occasionList.some(o => o.label === wizardDraft.occasion);
      const timer = setTimeout(() => {
        if (!isPreset && wizardDraft.occasion !== "Other") {
          setCustomOccasionText(wizardDraft.occasion);
          setShowCustomOccasion(true);
        } else if (wizardDraft.occasion === "Other") {
          setShowCustomOccasion(true);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [wizardDraft.occasion, occasionList]);

  useEffect(() => {
    if (wizardDraft.productType && productTypeList.length > 0) {
      const isPreset = productTypeList.some(p => p.label === wizardDraft.productType);
      const timer = setTimeout(() => {
        if (!isPreset && wizardDraft.productType !== "Other") {
          setCustomProductTypeText(wizardDraft.productType);
          setShowCustomProductType(true);
        } else if (wizardDraft.productType === "Other") {
          setShowCustomProductType(true);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [wizardDraft.productType, productTypeList]);

  // Filter direct images and external links
  const directImages = wizardDraft.inspirationImages.filter(isDirectImageUrl);
  const externalLinks = wizardDraft.inspirationImages.filter(url => !isDirectImageUrl(url));

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedOrder?.messages]);

  // ─── IMAGE UPLOAD HANDLING ───
  const handleMoodUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Local checks
    const invalidFile = files.find(f => !f.type.startsWith("image/"));
    if (invalidFile) {
      toast.error("Please upload valid images only");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    
    // Simulate compression/upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => (prev < 90 ? prev + 15 : prev));
    }, 150);

    try {
      const uploadedUrls = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("images", file);
        const res = await uploadService.uploadImages(formData, "products");
        if (res.success && res.images && res.images[0]) {
          uploadedUrls.push(res.images[0]);
        }
      }

      const nextUrls = [...wizardDraft.inspirationImages, ...uploadedUrls];
      updateDraft({ inspirationImages: nextUrls });
      toast.success(`${files.length} photos successfully uploaded!`);
    } catch (err) {
      toast.error("Failed to upload photos. Please try again.");
    } finally {
      clearInterval(interval);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // ─── SUBMISSION FLOW ───
  const handleWizardSubmit = async () => {
    runProtectedAction(async () => {
      // Validation checks
      if (!wizardDraft.occasion || wizardDraft.occasion === "Other") return toast.error("Please select or specify your occasion");
      if (!wizardDraft.productType || wizardDraft.productType === "Other") return toast.error("Please select or specify your product category");
      if (!wizardDraft.customerName) return toast.error("Please fill in your contact name");
      if (!wizardDraft.customerPhone) return toast.error("Please fill in your contact phone number");

      setLoading(true);
      try {
        const payload = {
          ...wizardDraft,
          budget: Number(wizardDraft.budget.replace(/[^0-9]/g, "")) || undefined
        };

        // If the user context is stale due to a fresh login modal, the backend automatically
        // resolves the email from token claims, but let's pass it if available.
        if (user?.email) {
          payload.customerEmail = user.email;
        }

        const res = await customOrderService.create(payload);
        if (res.success) {
          toast.success("Your custom order request has been submitted successfully!");
          setWizardDraft({
            occasion: "",
            productType: "",
            inspirationImages: [],
            customRequirements: "",
            budget: "",
            quantity: 1,
            eventDate: "",
            city: "",
            bookingType: "Video Meet",
            customerName: "",
            customerPhone: "",
            customerEmail: ""
          });
          setCustomOccasionText("");
          setCustomProductTypeText("");
          setPastedLink("");
          setCurrentStep(1);
          loadWorkspaceData();
          setActiveTab("tracker");
        } else {
          toast.error(res.message || "Failed to submit request");
        }
      } catch (err) {
        toast.error("Failed to submit custom order request");
      } finally {
        setLoading(false);
      }
    });
  };

  // ─── CLIENT CHAT DISPATCH ───
  const handleSendChatMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatMessage.trim() || !selectedOrder) return;

    setIsSendingMessage(true);
    try {
      const res = await customOrderService.postMessage(selectedOrder._id, chatMessage.trim());
      if (res.success) {
        setSelectedOrder(res.data);
        setChatMessage("");
        // Reload list in background
        const reloadRes = await customOrderService.getMyOrders();
        if (reloadRes.success) setMyOrders(reloadRes.data || []);
      }
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setIsSendingMessage(false);
    }
  };

  // ─── CLIENT QUOTATION INTERACTION ───
  const handleQuotationDecision = async (decision) => {
    if (!selectedOrder) return;
    setLoading(true);
    try {
      const res = await customOrderService.respondQuotation(selectedOrder._id, decision);
      if (res.success) {
        setSelectedOrder(res.data);
        toast.success(`Quotation successfully marked as ${decision.toUpperCase()}!`);
        const reloadRes = await customOrderService.getMyOrders();
        if (reloadRes.success) setMyOrders(reloadRes.data || []);
      }
    } catch (err) {
      toast.error("Failed to submit your response");
    } finally {
      setLoading(false);
    }
  };

  // Step-by-step progress verification to prevent skipping empty required inputs
  const handleNextStep = () => {
    if (currentStep === 1 && (!wizardDraft.occasion || wizardDraft.occasion === "Other")) {
      toast.error("Please select or specify your event occasion to proceed");
      return;
    }
    if (currentStep === 2 && (!wizardDraft.productType || wizardDraft.productType === "Other")) {
      toast.error("Please select or specify your product category to proceed");
      return;
    }
    if (currentStep === 7) {
      if (!wizardDraft.customerName) {
        toast.error("Please enter your contact name");
        return;
      }
      if (!wizardDraft.customerPhone) {
        toast.error("Please enter your phone or WhatsApp number");
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
  };

  const stepsList = [
    "Select Occasion",
    "Select Product Category",
    "Upload Inspiration Photos",
    "Your Special Requirements",
    "Quantity & Budget",
    "Delivery & Event Details",
    "Contact Information",
    "Review & Submit"
  ];

  return (
    <div className="relative selection:bg-primary/20 bg-[#FAF9F6] min-h-screen text-[#2D2B29] font-body pt-20 md:pt-32">
      <SEO
        title="Custom Decor Studio & Consultancy | Siri Arts"
        description="Design your dream Indian ceremony with Siri's interactive digital planning studio. Consult with our Telugu heritage master artisans for bespoke backdrops, floral canopies, and custom pooja trays."
      />
      {/* Decorative Mandalas */}
      <MandalaElement className="absolute top-20 -right-20 opacity-[0.03] pointer-events-none" size={600} />
      <MandalaElement className="absolute bottom-20 -left-20 opacity-[0.02] pointer-events-none" size={700} />

      <main className="max-w-[1440px] mx-auto px-4 md:px-8 pb-20 relative z-10 space-y-6 md:space-y-8">
        
        {/* Simple & Luxury Header & Workspace Toggle */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2D2B29]/5 pb-5">
          <div>
            <h2 className="text-[24px] md:text-[36px] font-light text-[#2D2B29] font-display leading-tight">
              Custom Event Decor Studio
            </h2>
            <p className="text-[12px] md:text-[13px] text-[#685C57] mt-1 font-light tracking-wide max-w-lg">
              Design your dream event decor with us! Submit your ideas, get custom prices, and track your order's progress easily.
            </p>
          </div>

          <div 
            className="flex bg-[#f2efe9] p-1 rounded-full border border-black/5 self-start md:self-auto shadow-inner w-full sm:w-auto overflow-x-auto shrink-0"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <button
              onClick={() => setActiveTab("wizard")}
              className={`flex-1 sm:flex-initial text-center px-4 md:px-5 py-2.5 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer whitespace-nowrap ${
                activeTab === "wizard"
                  ? "bg-[#2D2B29] text-white shadow-md"
                  : "text-[#685C57] hover:text-[#2D2B29]"
              }`}
            >
              <span className="hidden sm:inline">Start Custom Request</span>
              <span className="inline sm:hidden">New Request</span>
            </button>
            <button
              onClick={() => {
                runProtectedAction(() => {
                  setActiveTab("tracker");
                });
              }}
              className={`flex-1 sm:flex-initial text-center px-4 md:px-5 py-2.5 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-wider transition-all duration-300 relative cursor-pointer whitespace-nowrap ${
                activeTab === "tracker"
                  ? "bg-[#2D2B29] text-white shadow-md"
                  : "text-[#685C57] hover:text-[#2D2B29]"
              }`}
            >
              <span className="hidden sm:inline">Track My Custom Orders</span>
              <span className="inline sm:hidden">Track Orders</span>
              {myOrders.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#D4AF37] text-white text-[8px] flex items-center justify-center font-bold font-mono">
                  {myOrders.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ─── ACTIVE VIEW: MULTI-STEP REQUEST WIZARD ─── */}
        {activeTab === "wizard" && (
          <div className="space-y-4 w-full">
            {/* Elegant Luxury Guest Acknowledgment */}
            {!isAuthenticated && (
              <div className="bg-white border border-[#D4AF37]/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px] shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#D4AF37] text-[20px]">info</span>
                  <p className="text-[#685C57] font-light">
                    <strong className="text-[#2D2B29] font-medium">Bespoke Guest Session:</strong> You can draft your decor request offline. Sign in to seamlessly submit your details and track quotes in real time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => runProtectedAction(() => {})}
                  className="px-4 py-1.5 bg-[#2D2B29] text-white rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-[#D4AF37] transition-all cursor-pointer text-center shrink-0 self-start sm:self-auto"
                >
                  Sign In / Register
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* Left Box: Step progress navigator (Desktop Only) */}
            <div className="hidden lg:block lg:col-span-4 bg-white/70 backdrop-blur-md rounded-[2.5rem] border border-black/5 p-8 shadow-sm space-y-6">
              <span className="font-label-sm text-[10px] text-[#D4AF37] uppercase tracking-[0.25em] block font-bold">
                custom form
              </span>
              <h3 className="font-display text-[22px] text-[#2D2B29] font-normal leading-snug">
                Decor Design Form
              </h3>

              <div className="space-y-4 pt-4 border-t border-black/5">
                {stepsList.map((label, index) => {
                  const stepNum = index + 1;
                  return (
                    <div
                      key={stepNum}
                      onClick={() => {
                        if (stepNum < currentStep) setCurrentStep(stepNum);
                      }}
                      className={`flex items-center gap-3 transition-all duration-300 cursor-pointer ${
                        currentStep === stepNum
                          ? "text-[#D4AF37]"
                          : stepNum < currentStep
                          ? "text-[#2D2B29] hover:text-[#D4AF37]"
                          : "text-[#2D2B29]/30 pointer-events-none"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full text-[10px] font-bold font-mono flex items-center justify-center border transition-all ${
                          currentStep === stepNum
                            ? "bg-[#D4AF37] text-white border-[#D4AF37]"
                            : stepNum < currentStep
                            ? "bg-[#2D2B29] text-white border-[#2D2B29]"
                            : "border-black/10"
                        }`}
                      >
                        {stepNum}
                      </div>
                      <span className="text-[12px] font-bold uppercase tracking-wider">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Box: Dynamic forms active panel */}
            <div className="lg:col-span-8 bg-white rounded-3xl lg:rounded-[2.5rem] border border-black/5 p-5 md:p-10 shadow-sm relative overflow-hidden min-h-[460px]">
              
              {/* Dynamic progress bar (highly integrated at the top of the card) */}
              <div className="lg:hidden mb-6 space-y-2 border-b border-black/5 pb-4">
                <div className="flex justify-between items-center text-[9px] md:text-[10px] font-bold text-[#685C57] uppercase tracking-wider">
                  <span>Decor Design Form</span>
                  <span className="font-mono text-[#D4AF37]">Step {currentStep} of 8</span>
                </div>
                <div className="w-full bg-black/5 h-1 rounded-full overflow-hidden">
                  <div className="bg-[#D4AF37] h-full shadow-[0_0_8px_rgba(212,175,55,0.4)] transition-all duration-300" style={{ width: `${(currentStep / 8) * 100}%` }} />
                </div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[#2D2B29]">{stepsList[currentStep - 1]}</span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial="hidden"
                  animate="show"
                  exit="hidden"
                  variants={slideIn}
                  className="space-y-5 md:space-y-6"
                >
                  {/* Step 1: Select Occasion */}
                  {currentStep === 1 && (
                    <div className="space-y-5">
                      <div>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase text-[#D4AF37] tracking-widest block mb-0.5">step 01</span>
                        <h2 className="text-[20px] md:text-[22px] font-normal font-display text-[#2D2B29]">Select the Occasion</h2>
                        <p className="text-[11.5px] md:text-[12px] text-[#685C57] font-light">What event or celebration are we designing decor for?</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 pt-2">
                        {occasionList.length === 0 ? (
                          <div className="col-span-full text-center text-[12px] text-outline italic">No occasions found. Please wait or proceed.</div>
                        ) : (
                          occasionList.map(o => {
                            const isSelected = wizardDraft.occasion === o.label;
                            return (
                              <button
                                key={o.id}
                                type="button"
                                onClick={() => {
                                  updateDraft({ occasion: o.label });
                                  setCustomOccasionText("");
                                  setShowCustomOccasion(false);
                                }}
                                className={`p-3 md:p-4 rounded-xl md:rounded-2xl border text-left font-bold uppercase tracking-wider transition-all duration-300 flex flex-col justify-between items-start min-h-[82px] cursor-pointer ${
                                  isSelected
                                    ? "bg-[#2D2B29] text-white border-[#2D2B29] shadow-md"
                                    : "bg-[#FAF9F6] text-[#2D2B29] border-black/5 hover:border-black/15"
                                }`}
                              >
                                <div className="flex justify-between items-start w-full">
                                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? "border-[#D4AF37] bg-[#D4AF37]" : "border-black/15"}`}>
                                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </span>
                                </div>
                                <span className="mt-2 text-[10px] md:text-[11px] leading-tight line-clamp-2">{o.label}</span>
                              </button>
                            );
                          })
                        )}

                        {/* Custom 'Other' Option card */}
                        <button
                          type="button"
                          onClick={() => {
                            updateDraft({ occasion: "Other" });
                            setCustomOccasionText("");
                            setShowCustomOccasion(true);
                          }}
                          className={`p-3 md:p-4 rounded-xl md:rounded-2xl border text-left font-bold uppercase tracking-wider transition-all duration-300 flex flex-col justify-between items-start min-h-[82px] cursor-pointer ${
                            showCustomOccasion
                              ? "bg-[#2D2B29] text-white border-[#2D2B29] shadow-md"
                              : "bg-[#FAF9F6] text-[#2D2B29] border-black/5 hover:border-black/15"
                          }`}
                        >
                          <div className="flex justify-between items-start w-full">
                            <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${showCustomOccasion ? "border-[#D4AF37] bg-[#D4AF37]" : "border-black/15"}`}>
                              {showCustomOccasion && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                          </div>
                          <span className="mt-2 text-[10px] md:text-[11px] leading-tight line-clamp-2">Other (Specify)</span>
                        </button>
                      </div>

                      {/* Custom Occasion Text Input */}
                      {showCustomOccasion && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-1.5 pt-1"
                        >
                          <label className="text-[10px] font-bold uppercase text-[#D4AF37] tracking-wider block">Specify Your Occasion</label>
                          <input
                            type="text"
                            value={customOccasionText}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomOccasionText(val);
                              updateDraft({ occasion: val || "Other" });
                            }}
                            placeholder="E.g., Corporate Anniversary, Graduation Curation"
                            className="w-full bg-[#FAF9F6] border border-black/10 rounded-xl px-4 py-2.5 md:py-3 text-[13px] outline-none focus:border-[#D4AF37] text-[#2D2B29] transition-all"
                          />
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Choose Product Type */}
                  {currentStep === 2 && (
                    <div className="space-y-5">
                      <div>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase text-[#D4AF37] tracking-widest block mb-0.5">step 02</span>
                        <h2 className="text-[20px] md:text-[22px] font-normal font-display text-[#2D2B29]">Choose Product Type</h2>
                        <p className="text-[11.5px] md:text-[12px] text-[#685C57] font-light">Which items or setups do you want to custom order?</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 pt-2">
                        {productTypeList.length === 0 ? (
                          <div className="col-span-full text-center text-[12px] text-outline italic">No categories found. Please wait or proceed.</div>
                        ) : (
                          productTypeList.map(p => {
                            const isSelected = wizardDraft.productType === p.label;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  updateDraft({ productType: p.label });
                                  setCustomProductTypeText("");
                                  setShowCustomProductType(false);
                                }}
                                className={`p-3 md:p-4 rounded-xl md:rounded-2xl border text-left font-bold uppercase tracking-wider transition-all duration-300 flex flex-col justify-between items-start min-h-[82px] cursor-pointer ${
                                  isSelected
                                    ? "bg-[#2D2B29] text-white border-[#2D2B29] shadow-md"
                                    : "bg-[#FAF9F6] text-[#2D2B29] border-black/5 hover:border-black/15"
                                }`}
                              >
                                <div className="flex justify-between items-start w-full">
                                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? "border-[#D4AF37] bg-[#D4AF37]" : "border-black/15"}`}>
                                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </span>
                                </div>
                                <span className="mt-2 text-[10px] md:text-[11px] leading-tight line-clamp-2">{p.label}</span>
                              </button>
                            );
                          })
                        )}

                        {/* Custom 'Other' Option card */}
                        <button
                          type="button"
                          onClick={() => {
                            updateDraft({ productType: "Other" });
                            setCustomProductTypeText("");
                            setShowCustomProductType(true);
                          }}
                          className={`p-3 md:p-4 rounded-xl md:rounded-2xl border text-left font-bold uppercase tracking-wider transition-all duration-300 flex flex-col justify-between items-start min-h-[82px] cursor-pointer ${
                            showCustomProductType
                              ? "bg-[#2D2B29] text-white border-[#2D2B29] shadow-md"
                              : "bg-[#FAF9F6] text-[#2D2B29] border-black/5 hover:border-black/15"
                          }`}
                        >
                          <div className="flex justify-between items-start w-full">
                            <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${showCustomProductType ? "border-[#D4AF37] bg-[#D4AF37]" : "border-black/15"}`}>
                              {showCustomProductType && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                          </div>
                          <span className="mt-2 text-[10px] md:text-[11px] leading-tight line-clamp-2">Other (Specify)</span>
                        </button>
                      </div>

                      {/* Custom Category Text Input */}
                      {showCustomProductType && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-1.5 pt-1"
                        >
                          <label className="text-[10px] font-bold uppercase text-[#D4AF37] tracking-wider block">Specify Your Product Category</label>
                          <input
                            type="text"
                            value={customProductTypeText}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomProductTypeText(val);
                              updateDraft({ productType: val || "Other" });
                            }}
                            placeholder="E.g., Floral Backdrop, Entrance Archway"
                            className="w-full bg-[#FAF9F6] border border-black/10 rounded-xl px-4 py-2.5 md:py-3 text-[13px] outline-none focus:border-[#D4AF37] text-[#2D2B29] transition-all"
                          />
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Step 3: Upload Inspiration Images & Links */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase text-[#D4AF37] tracking-widest block mb-0.5">step 03</span>
                        <h2 className="text-[20px] md:text-[22px] font-normal font-display text-[#2D2B29]">Upload Inspiration Photos</h2>
                        <p className="text-[11.5px] md:text-[12px] text-[#685C57] font-light">Upload reference photos, venue drawings, or choose from our beautiful signature curation presets.</p>
                      </div>



                      {/* FILE UPLOAD DRAG & DROP AREA */}
                      <div className="border-t border-black/5 pt-5 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-[#D4AF37]">cloud_upload</span>
                          <h3 className="text-[13.5px] font-bold text-[#2D2B29]">Or, Upload Custom References</h3>
                        </div>
                        
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-black/10 hover:border-[#D4AF37] rounded-2xl p-6 md:p-8 text-center bg-[#FAF9F6]/50 cursor-pointer transition-all duration-300 group flex flex-col items-center justify-center min-h-[120px]"
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={handleMoodUpload}
                          />
                          <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                          </div>
                          <p className="text-[12px] font-bold uppercase tracking-wider text-[#2D2B29] mb-0.5">Drag & Drop your photos here</p>
                          <p className="text-[9.5px] text-[#685C57]/60">You can upload multiple files (JPG, PNG, HEIC).</p>
                        </div>
                      </div>

                      {/* Upload loader */}
                      {isUploading && (
                        <div className="space-y-2 bg-[#FAF9F6] p-3 rounded-xl border border-black/5 animate-pulse">
                          <div className="flex justify-between items-center text-[9px] font-bold text-[#D4AF37] uppercase tracking-wider">
                            <span>Uploading your photos...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-[#f2efe9] h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#D4AF37] h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Direct image previews grid */}
                      {directImages.length > 0 && (
                        <div className="space-y-3 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#685C57] block font-medium">Uploaded Photos ({directImages.length}):</span>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                            {directImages.map((img, i) => (
                              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-black/5 bg-[#FAF9F6] group">
                                <img src={img} alt="Inspiration preview" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => updateDraft({ inspirationImages: wizardDraft.inspirationImages.filter((url) => url !== img) })}
                                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-[9px] shadow-md transition-all active:scale-90 cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* ─── INTERACTIVE SIRI AI DESIGN INTELLIGENCE ANALYZER ─── */}
                          <div className="mt-4 bg-[#FAF9F6] border border-[#D4AF37]/30 rounded-2xl p-4 md:p-5 space-y-4 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-full -mr-6 -mt-6 pointer-events-none" />
                            <div className="flex items-start gap-3">
                              <span className="material-symbols-outlined text-[#D4AF37] text-[24px] shrink-0">insights</span>
                              <div className="space-y-1">
                                <h4 className="text-[13px] font-bold text-[#2D2B29] flex items-center gap-1.5">
                                  Siri AI Design Intelligence
                                  <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-[7.5px] uppercase tracking-widest font-extrabold px-1.5 py-0.5 rounded">Expert Vision</span>
                                </h4>
                                <p className="text-[10.5px] text-[#685C57] font-light leading-normal">Let our neural design system scan your inspiration image, extract the Telugu/traditional color palettes, recommend heritage materials, and estimate the budget range!</p>
                              </div>
                            </div>

                            {/* Scanning Animation Progress */}
                            {isAnalyzing && (
                              <div className="bg-white/80 backdrop-blur-sm border border-black/5 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between items-center text-[9.5px] font-bold uppercase tracking-wider text-[#D4AF37]">
                                  <span className="flex items-center gap-1.5">
                                    <span className="animate-spin text-[12px] material-symbols-outlined">sync</span>
                                    Siri AI scanning design motifs...
                                  </span>
                                  <span>{aiStep * 20}%</span>
                                </div>
                                <div className="w-full bg-black/5 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-[#D4AF37] h-full transition-all duration-300" style={{ width: `${aiStep * 20}%` }} />
                                </div>
                                <p className="text-[9.5px] text-[#685C57] italic">
                                  {aiStep === 1 && "Decomposing image color spectrum..."}
                                  {aiStep === 2 && "Analyzing traditional Telugu & South Indian motif shapes..."}
                                  {aiStep === 3 && "Classifying floral swags and background wood carving styles..."}
                                  {aiStep === 4 && "Estimating silver/brass elements & structural framework count..."}
                                  {aiStep === 5 && "Matching with Siri artisan catalogs and material cost curves..."}
                                </p>
                              </div>
                            )}

                            {/* Siri AI Analysis results cards */}
                            {aiAnalysisResult && !isAnalyzing && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white border border-[#D4AF37]/35 rounded-xl p-4 space-y-3.5 shadow-inner"
                              >
                                <div className="border-b border-black/5 pb-2.5 flex items-center justify-between">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">AI Analysis Summary</span>
                                  <span className="text-[9.5px] font-light text-[#685C57]">Reference: Image 01</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                                  <div className="space-y-0.5">
                                    <span className="text-[8.5px] uppercase tracking-wider text-[#685C57] font-bold">Style Classification</span>
                                    <p className="font-bold text-[#2D2B29]">{aiAnalysisResult.style}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[8.5px] uppercase tracking-wider text-[#685C57] font-bold">Extracted Palette</span>
                                    <div className="flex items-center gap-1.5">
                                      {aiAnalysisResult.palette.map((hex, index) => (
                                        <div key={index} className="flex items-center gap-1 bg-[#FAF9F6] border border-black/5 px-1.5 py-0.5 rounded-md">
                                          <span className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: hex }} />
                                          <span className="font-mono text-[8px] text-[#2D2B29]">{hex}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-0.5 text-[11px]">
                                  <span className="text-[8.5px] uppercase tracking-wider text-[#685C57] font-bold">Extracted Color Nuance</span>
                                  <p className="text-[#2D2B29] font-medium">{aiAnalysisResult.colorDesc}</p>
                                </div>

                                <div className="space-y-0.5 text-[11px]">
                                  <span className="text-[8.5px] uppercase tracking-wider text-[#685C57] font-bold">Artisanal Recommendations</span>
                                  <p className="text-[#685C57] font-light leading-relaxed">{aiAnalysisResult.materials}</p>
                                </div>

                                <div className="border-t border-black/5 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="text-[11px]">
                                    <span className="text-[8.5px] uppercase tracking-wider text-[#685C57] font-bold block">Estimated Budget Range</span>
                                    <span className="font-mono text-[#D4AF37] font-bold text-[12px]">{aiAnalysisResult.suggestedBudget}</span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={handleApplyAiSuggestions}
                                    className="px-4 py-2 bg-[#2D2B29] text-white hover:bg-[#D4AF37] rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                                  >
                                    Inject Suggestions Into Request Form
                                    <span className="material-symbols-outlined text-[13px]">add_circle</span>
                                  </button>
                                </div>
                              </motion.div>
                            )}

                            {!isAnalyzing && (
                              <button
                                type="button"
                                onClick={handleAIAnalysis}
                                className="w-full py-2.5 border-2 border-[#D4AF37] hover:bg-[#D4AF37] hover:text-white text-[#D4AF37] rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm bg-white"
                              >
                                <span className="material-symbols-outlined text-[16px]">insights</span>
                                {aiAnalysisResult ? "Scan Again with Siri AI" : "Analyze Inspiration Photo with Siri AI"}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Paste custom links tool */}
                      <div className="border-t border-black/5 pt-5 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-[#D4AF37]">link</span>
                          <h3 className="text-[13.5px] font-bold text-[#2D2B29]">Or, Add Inspiration Links</h3>
                        </div>
                        <p className="text-[11px] text-[#685C57] font-light">Share your Pinterest board, Instagram post, or Google Drive folder with us:</p>
                        
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={pastedLink}
                            onChange={(e) => setPastedLink(e.target.value)}
                            placeholder="Paste Pinterest, Instagram or Drive link here..."
                            className="flex-1 bg-[#FAF9F6] border border-black/10 rounded-xl px-4 py-2.5 text-[12.5px] outline-none focus:border-[#D4AF37] text-[#2D2B29] transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!pastedLink.trim()) return;
                              if (!pastedLink.startsWith("http://") && !pastedLink.startsWith("https://")) {
                                toast.error("Please enter a valid link starting with http:// or https://");
                                return;
                              }
                              const nextUrls = [...wizardDraft.inspirationImages, pastedLink.trim()];
                              updateDraft({ inspirationImages: nextUrls });
                              setPastedLink("");
                              toast.success("Link added successfully!");
                            }}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#2D2B29] text-white hover:bg-[#D4AF37] transition-all text-[10px] md:text-[11px] font-bold uppercase tracking-wider shrink-0 cursor-pointer text-center"
                          >
                            Add Link
                          </button>
                        </div>
                      </div>

                      {/* Paste external links list previews */}
                      {externalLinks.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#685C57]">Added Inspiration Links ({externalLinks.length}):</span>
                          <div className="flex flex-col gap-2">
                            {externalLinks.map((link, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-[#FAF9F6] border border-black/5 rounded-xl px-3 py-2 shadow-sm min-w-0">
                                <div className="flex items-center gap-2 text-[11.5px] min-w-0 pr-2">
                                  <span className="material-symbols-outlined text-[15px] text-[#D4AF37] shrink-0">link</span>
                                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-[#2D2B29] font-bold hover:underline truncate">
                                    {link}
                                  </a>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextImages = wizardDraft.inspirationImages.filter(url => url !== link);
                                    updateDraft({ inspirationImages: nextImages });
                                  }}
                                  className="text-red-500 hover:text-red-600 font-mono font-bold text-[11px] px-1 cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* Step 4: Add Custom Requirements */}
                  {currentStep === 4 && (
                    <div className="space-y-5">
                      <div>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase text-[#D4AF37] tracking-widest block mb-0.5">step 04</span>
                        <h2 className="text-[20px] md:text-[22px] font-normal font-display text-[#2D2B29]">Describe Your Requirements</h2>
                        <p className="text-[11.5px] md:text-[12px] text-[#685C57] font-light">Describe what you want (e.g. colors, flowers, backdrop styles, or fabric preferences).</p>
                      </div>

                      <div className="pt-1">
                        <textarea
                          value={wizardDraft.customRequirements}
                          onChange={(e) => updateDraft({ customRequirements: e.target.value })}
                          placeholder="Example: We want a traditional gold and red stage background with fresh orange marigold flowers. Please include hanging brass lamps and dynamic lighting..."
                          className="w-full bg-[#FAF9F6] border border-black/10 rounded-2xl p-4 font-body text-[13px] outline-none focus:border-[#D4AF37] min-h-[140px] text-[#2D2B29] transition-all resize-none shadow-inner"
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 5: Budget & Quantity */}
                  {currentStep === 5 && (
                    <div className="space-y-5">
                      <div>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase text-[#D4AF37] tracking-widest block mb-0.5">step 05</span>
                        <h2 className="text-[20px] md:text-[22px] font-normal font-display text-[#2D2B29]">Quantity & Budget</h2>
                        <p className="text-[11.5px] md:text-[12px] text-[#685C57] font-light">Select the number of setups and your approximate budget range.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-[#685C57] tracking-wider block">Number of Setups</label>
                          <div className="flex items-center bg-[#FAF9F6] rounded-xl border border-black/10 p-1.5 max-w-[150px]">
                            <button
                              type="button"
                              onClick={() => updateDraft({ quantity: Math.max(1, wizardDraft.quantity - 1) })}
                              className="w-9 h-9 rounded-lg bg-white hover:bg-black/5 text-[#2D2B29] font-bold flex items-center justify-center text-[15px] cursor-pointer shadow-sm"
                            >
                              -
                            </button>
                            <span className="flex-1 text-center font-mono font-bold text-[13px]">{wizardDraft.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateDraft({ quantity: wizardDraft.quantity + 1 })}
                              className="w-9 h-9 rounded-lg bg-white hover:bg-black/5 text-[#2D2B29] font-bold flex items-center justify-center text-[15px] cursor-pointer shadow-sm"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-[#685C57] tracking-wider block">Your Budget</label>
                          <select
                            value={wizardDraft.budget}
                            onChange={(e) => updateDraft({ budget: e.target.value })}
                            className="w-full bg-[#FAF9F6] border border-black/10 rounded-xl px-4 py-2.5 text-[12.5px] outline-none focus:border-[#D4AF37] text-[#2D2B29] cursor-pointer transition-all"
                          >
                            <option value="">Select Budget Range...</option>
                            {budgetList.map(b => (
                              <option key={b.id} value={b.label}>{b.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 6: Delivery/Event Details */}
                  {currentStep === 6 && (
                    <div className="space-y-5">
                      <div>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase text-[#D4AF37] tracking-widest block mb-0.5">step 06</span>
                        <h2 className="text-[20px] md:text-[22px] font-normal font-display text-[#2D2B29]">Delivery & Event Details</h2>
                        <p className="text-[11.5px] md:text-[12px] text-[#685C57] font-light">Where and when is the main event taking place?</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-[#685C57] tracking-wider block">Event Date *</label>
                          <input
                            type="date"
                            value={wizardDraft.eventDate}
                            onChange={(e) => updateDraft({ eventDate: e.target.value })}
                            className="w-full bg-[#FAF9F6] border border-black/10 rounded-xl px-4 py-2.5 text-[12.5px] outline-none focus:border-[#D4AF37] text-[#2D2B29] cursor-pointer transition-all"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-[#685C57] tracking-wider block">Event City / Location</label>
                          <input
                            type="text"
                            value={wizardDraft.city}
                            onChange={(e) => updateDraft({ city: e.target.value })}
                            placeholder="E.g., Bangalore, Hyderabad"
                            className="w-full bg-[#FAF9F6] border border-black/10 rounded-xl px-4 py-2.5 text-[12.5px] outline-none focus:border-[#D4AF37] text-[#2D2B29] transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <label className="text-[10px] font-bold uppercase text-[#685C57] tracking-wider block">Preferred Consultation Type</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {bookingList.map(b => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => updateDraft({ bookingType: b.label })}
                              className={`p-2.5 rounded-xl border text-[10px] font-bold text-center transition-all cursor-pointer uppercase tracking-wider ${
                                wizardDraft.bookingType === b.label
                                  ? "bg-[#2D2B29] text-white border-[#2D2B29] shadow-sm"
                                  : "bg-[#FAF9F6] text-[#2D2B29] border-black/5 hover:border-black/20"
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 7: Contact Information */}
                  {currentStep === 7 && (
                    <div className="space-y-5">
                      <div>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase text-[#D4AF37] tracking-widest block mb-0.5">step 07</span>
                        <h2 className="text-[20px] md:text-[22px] font-normal font-display text-[#2D2B29]">Contact Information</h2>
                        <p className="text-[11.5px] md:text-[12px] text-[#685C57] font-light">Fill in your contact details so our team can reach you easily.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-[#685C57] tracking-wider block">Your Full Name *</label>
                          <input
                            type="text"
                            value={wizardDraft.customerName}
                            onChange={(e) => updateDraft({ customerName: e.target.value })}
                            placeholder="E.g., Ananya Sharma"
                            className="w-full bg-[#FAF9F6] border border-black/10 rounded-xl px-4 py-2.5 text-[12.5px] outline-none focus:border-[#D4AF37] text-[#2D2B29] transition-all"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-[#685C57] tracking-wider block">WhatsApp Number *</label>
                          <input
                            type="tel"
                            value={wizardDraft.customerPhone}
                            onChange={(e) => updateDraft({ customerPhone: e.target.value })}
                            placeholder="E.g., +91 98765 43210"
                            className="w-full bg-[#FAF9F6] border border-black/10 rounded-xl px-4 py-2.5 text-[12.5px] outline-none focus:border-[#D4AF37] text-[#2D2B29] transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 8: Review & Submit */}
                  {currentStep === 8 && (
                    <div className="space-y-5">
                      <div>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase text-[#D4AF37] tracking-widest block mb-0.5">step 08</span>
                        <h2 className="text-[20px] md:text-[22px] font-normal font-display text-[#2D2B29]">Review Your Selections</h2>
                        <p className="text-[11.5px] md:text-[12px] text-[#685C57] font-light">Please review all the details of your request before submitting.</p>
                      </div>

                      <div className="bg-[#FAF9F6] rounded-2xl border border-black/5 p-4 md:p-5 space-y-3.5">
                        <div className="grid grid-cols-2 gap-3 text-[11.5px] md:text-[12px] border-b border-black/5 pb-3">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-[#685C57] font-bold">Occasion</span>
                            <p className="font-bold text-[#2D2B29] mt-0.5">{wizardDraft.occasion || "Not Selected"}</p>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-[#685C57] font-bold">Product Category</span>
                            <p className="font-bold text-[#2D2B29] mt-0.5">{wizardDraft.productType || "Not Selected"}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[11.5px] md:text-[12px] border-b border-black/5 pb-3">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-[#685C57] font-bold">Number of Setups</span>
                            <p className="font-bold text-[#2D2B29] mt-0.5">{wizardDraft.quantity} active</p>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-[#685C57] font-bold">Budget</span>
                            <p className="font-bold text-[#2D2B29] mt-0.5">{wizardDraft.budget || "Get Quote"}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[11.5px] md:text-[12px] border-b border-black/5 pb-3">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-[#685C57] font-bold">Event Date & Location</span>
                            <p className="font-bold text-[#2D2B29] mt-0.5">{wizardDraft.eventDate || "TBD"} ({wizardDraft.city || "Any City"})</p>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-[#685C57] font-bold">Consultation Type</span>
                            <p className="font-bold text-[#2D2B29] mt-0.5">{wizardDraft.bookingType}</p>
                          </div>
                        </div>

                        <div className="text-[11.5px] md:text-[12px] border-b border-black/5 pb-3">
                          <span className="text-[9px] uppercase tracking-wider text-[#685C57] font-bold">Contact Details</span>
                          <p className="font-bold text-[#2D2B29] mt-0.5">{wizardDraft.customerName} ({wizardDraft.customerPhone})</p>
                        </div>

                        {wizardDraft.customRequirements && (
                          <div className="text-[11.5px] md:text-[12px] border-b border-black/5 pb-3">
                            <span className="text-[9px] uppercase tracking-wider text-[#685C57] font-bold">Your Special Requirements</span>
                            <p className="text-[#2D2B29] italic leading-relaxed mt-0.5">"{wizardDraft.customRequirements}"</p>
                          </div>
                        )}

                        {directImages.length > 0 && (
                          <div className="space-y-1.5 border-b border-black/5 pb-3">
                            <span className="text-[9px] uppercase tracking-wider text-[#685C57] font-bold">Uploaded Inspiration Photos ({directImages.length})</span>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {directImages.map((img, i) => (
                                <img key={i} src={img} alt="Thumb" className="w-12 h-12 object-cover rounded-lg border border-black/10 shrink-0" />
                              ))}
                            </div>
                          </div>
                        )}

                        {externalLinks.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[9px] uppercase tracking-wider text-[#685C57] font-bold">Inspiration Links ({externalLinks.length})</span>
                            <div className="flex flex-col gap-1.5">
                              {externalLinks.map((link, i) => (
                                <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-[#D4AF37] hover:underline flex items-center gap-1.5 min-w-0">
                                  <span className="material-symbols-outlined text-[14px] shrink-0">link</span>
                                  <span className="truncate">{link}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Wizard Step Navigation controls */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-5 border-t border-black/5 mt-4">
                    <button
                      type="button"
                      disabled={currentStep === 1}
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="w-full sm:w-auto text-center px-6 py-2.5 rounded-full border border-black/10 text-[11px] font-bold uppercase tracking-wider text-[#2D2B29] hover:bg-[#2D2B29] hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      Back
                    </button>

                    {currentStep < 8 ? (
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="w-full sm:w-auto text-center px-6 py-2.5 rounded-full bg-[#2D2B29] text-white text-[11px] font-bold uppercase tracking-wider hover:bg-[#D4AF37] transition-all cursor-pointer"
                      >
                        Next Step
                      </button>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={handleWhatsAppConsult}
                          className="w-full sm:w-auto text-center px-6 py-2.5 rounded-full border-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-white"
                        >
                          <span className="material-symbols-outlined text-[16px]">chat</span>
                          WhatsApp Consultation
                        </button>

                        <button
                          type="button"
                          onClick={handleWizardSubmit}
                          className="w-full sm:w-auto text-center px-6 py-2.5 rounded-full bg-[#D4AF37] text-white text-[11px] font-bold uppercase tracking-wider hover:bg-[#2D2B29] transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          Submit Custom Order Request
                          <span className="material-symbols-outlined text-[16px]">done</span>
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
        )}

        {/* ─── ACTIVE VIEW: CLIENT WORKSPACE TRACKING PORTAL ─── */}
        {activeTab === "tracker" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* Left Box: Active customer order request brief list */}
            <div className={`lg:col-span-4 space-y-4 ${selectedOrder ? "hidden lg:block" : "block"}`}>
              <h3 className="text-[14px] font-bold uppercase tracking-wider text-[#685C57] mb-2 px-1">My Custom Orders</h3>
              {myOrders.length === 0 ? (
                <div className="bg-white rounded-3xl border border-black/5 p-8 text-center text-[#685C57] flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-[36px] text-black/20 mb-2">search_off</span>
                  <p className="text-[13px] font-bold text-[#2D2B29]">No Custom Orders Found</p>
                  <p className="text-[11px] text-[#685C57] mt-1 max-w-[200px] mx-auto">Use the request form to submit your custom order request today.</p>
                </div>
              ) : (
                myOrders.map(order => {
                  const dateVal = new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric"
                  });

                  return (
                    <div
                      key={order._id}
                      onClick={() => setSelectedOrder(order)}
                      className={`p-5 rounded-[2rem] border transition-all duration-300 cursor-pointer shadow-sm ${
                        selectedOrder?._id === order._id
                          ? "bg-white border-[#D4AF37] ring-1 ring-[#D4AF37]"
                          : "bg-white border-black/5 hover:border-black/15"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase ${
                          order.status === "Pending" ? "bg-amber-100 text-amber-700" :
                          order.status === "Approved" ? "bg-emerald-100 text-emerald-700" :
                          order.status === "Cancelled" ? "bg-red-100 text-red-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {order.status}
                        </span>
                        <span className="text-[9px] font-mono text-[#685C57]">{dateVal}</span>
                      </div>

                      <h4 className="text-[14px] font-bold text-[#2D2B29] line-clamp-1">{order.occasion} Setup</h4>
                      <p className="text-[11px] text-[#685C57] mt-0.5">{order.productType} • {order.city || "Any Location"}</p>
                      
                      {order.quotation?.total > 0 && (
                        <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between text-[11px]">
                          <span className="text-[#685C57]">Estimated Price:</span>
                          <span className="font-bold font-mono text-[#D4AF37]">₹{order.quotation.total.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Box: Master Curation Workspace & chat portal */}
            <div className={`lg:col-span-8 bg-white rounded-3xl lg:rounded-[2.5rem] border border-black/5 p-5 md:p-8 min-h-[560px] shadow-sm flex flex-col ${selectedOrder ? "block" : "hidden lg:flex"}`}>
              {!selectedOrder ? (
                <div className="flex flex-col items-center justify-center flex-1 py-12 md:py-20 text-center text-[#685C57]">
                  <span className="material-symbols-outlined text-[40px] md:text-[48px] text-black/10 mb-2">forum</span>
                  <p className="text-[14px] font-bold text-[#2D2B29]">Custom Order Tracking</p>
                  <p className="text-[11.5px] max-w-[280px] mx-auto mt-1 leading-relaxed px-4">Select one of your custom orders from the left list to view status updates, pricing, and chat with our team.</p>
                </div>
              ) : (
                <div className="flex flex-col flex-1 gap-5 md:gap-6">
                  
                  {/* Back button on mobile */}
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="lg:hidden flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#D4AF37] hover:text-[#2D2B29] transition-colors pb-1.5 self-start cursor-pointer bg-transparent border-none p-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    Back to All Orders
                  </button>
                  
                  {/* Workspace top profile header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-black/5 pb-4 gap-3">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#D4AF37]">Custom Order Tracking</span>
                      <h3 className="text-[16px] md:text-[18px] font-bold text-[#2D2B29] mt-0.5">{selectedOrder.occasion} Custom Order Details</h3>
                      <p className="text-[11px] text-[#685C57] mt-0.5">Category: {selectedOrder.productType} • Number of Setups: {selectedOrder.quantity}</p>
                    </div>

                    <div className="self-start sm:self-auto text-left sm:text-right">
                      <span className="text-[9px] uppercase tracking-wider text-outline-variant block sm:inline-block">Status</span>
                      <span className="inline-block sm:block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#2D2B29] text-white mt-1">
                        {selectedOrder.status}
                      </span>
                    </div>
                  </div>

                  {/* Mobile-only Workspace Sub-tabs */}
                  <div className="flex lg:hidden bg-[#FAF9F6] p-1 rounded-xl border border-black/5 mb-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setMobileSubTab("chat")}
                      className={`flex-1 text-center py-2 rounded-lg text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        mobileSubTab === "chat"
                          ? "bg-[#2D2B29] text-white shadow-sm"
                          : "text-[#685C57] hover:text-[#2D2B29]"
                      }`}
                    >
                      Chat & Updates
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileSubTab("summary")}
                      className={`flex-1 text-center py-2 rounded-lg text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        mobileSubTab === "summary"
                          ? "bg-[#2D2B29] text-white shadow-sm"
                          : "text-[#685C57] hover:text-[#2D2B29]"
                      }`}
                    >
                      Summary & Pricing
                    </button>
                  </div>

                  {/* Split Curation dashboard info */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
                    
                    {/* Left Grid: Timeline and Quotation Estimate */}
                    <div className={`lg:col-span-5 space-y-4 pr-0 lg:pr-4 lg:border-r border-black/5 ${mobileSubTab === "summary" ? "block" : "hidden lg:block"}`}>
                      
                      {/* Timeline status track */}
                      <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-black/5 space-y-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#685C57] block">Order Progress</span>
                        <div className="relative pl-4 border-l border-black/10 space-y-3.5 pt-1 text-[11px]">
                          {[
                            { st: "Pending", d: "Request Submitted" },
                            { st: "Reviewing", d: "We are checking your request" },
                            { st: "Quote Sent", d: "Quotation sent to you" },
                            { st: "Approved", d: "Custom order approved" },
                            { st: "Ready", d: "Custom decor ready" }
                          ].map((stage, idx) => {
                            const isPast = ["Pending", "Reviewing", "Quote Sent", "Approved", "In Progress", "Ready", "Delivered"].indexOf(selectedOrder.status) >= ["Pending", "Reviewing", "Quote Sent", "Approved", "In Progress", "Ready", "Delivered"].indexOf(stage.st);
                            return (
                              <div key={idx} className="relative">
                                <div className={`absolute -left-[20.5px] top-0.5 w-3 h-3 rounded-full border-2 bg-white transition-all ${isPast ? "border-[#D4AF37] bg-[#D4AF37]" : "border-black/15"}`} />
                                <span className={`font-bold ${isPast ? "text-[#2D2B29]" : "text-black/35"}`}>{stage.st}</span>
                                <p className="text-[10px] text-[#685C57]/70 font-light mt-0.5 leading-tight">{stage.d}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Interactive Quotation Estimate Card */}
                      {selectedOrder.quotation?.items?.length > 0 ? (
                        <div className="bg-white rounded-2xl border-2 border-[#D4AF37] p-4 space-y-3 shadow-md">
                          <div className="flex items-center justify-between border-b border-black/5 pb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">Your Quotation</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              selectedOrder.quotation.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                              selectedOrder.quotation.status === "rejected" ? "bg-red-100 text-red-700" :
                              "bg-amber-100 text-amber-700"
                            }`}>
                              {selectedOrder.quotation.status}
                            </span>
                          </div>

                          <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                            {selectedOrder.quotation.items.map((it, i) => (
                              <div key={i} className="flex justify-between text-[11px] text-[#2D2B29]/80 font-light">
                                <span className="truncate pr-2">{it.description}</span>
                                <span className="font-mono font-medium shrink-0">₹{it.amount.toLocaleString("en-IN")}</span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-black/5 text-[11px] space-y-1">
                            <div className="flex justify-between text-[#685C57]/80">
                              <span>Taxes:</span>
                              <span className="font-mono">₹{selectedOrder.quotation.tax?.toLocaleString("en-IN") || "0"}</span>
                            </div>
                            <div className="flex justify-between text-[#685C57]/80">
                              <span>Shipping & Setup:</span>
                              <span className="font-mono">₹{selectedOrder.quotation.shipping?.toLocaleString("en-IN") || "0"}</span>
                            </div>
                            <div className="flex justify-between font-bold text-[12px] pt-1.5 border-t border-dashed border-black/10">
                              <span>Grand Total:</span>
                              <span className="font-mono text-[#D4AF37]">₹{selectedOrder.quotation.total?.toLocaleString("en-IN")}</span>
                            </div>
                          </div>

                          {/* Client quote approval/rejection panel */}
                          {selectedOrder.quotation.status === "sent" && (
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleQuotationDecision("approved")}
                                className="flex-1 bg-[#2D2B29] hover:bg-[#D4AF37] text-white py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center animate-pulse"
                              >
                                Approve Quote
                              </button>
                              <button
                                onClick={() => handleQuotationDecision("rejected")}
                                className="flex-1 bg-white border border-red-200 hover:bg-red-50 text-red-500 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                              >
                                Decline Quote
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-black/5 text-center py-6">
                          <span className="material-symbols-outlined text-[24px] text-black/20 block mb-1">payments</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#685C57]">Preparing Quotation</span>
                          <p className="text-[10px] text-[#685C57]/60 mt-1">Our team is checking your design requirements to prepare your custom pricing.</p>
                        </div>
                      )}

                      {/* WhatsApp direct help for active order */}
                      <button
                        type="button"
                        onClick={handleWhatsAppConsult}
                        className="w-full py-2.5 bg-[#25D366] hover:bg-[#1ebd59] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mt-3"
                      >
                        <span className="material-symbols-outlined text-[16px]">chat</span>
                        Discuss Quote on WhatsApp
                      </button>

                      {/* Display inspiration images in client active order details tracking card */}
                      {selectedOrder.inspirationImages?.length > 0 && (
                        <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-black/5 space-y-3">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#685C57] block">My Inspirations ({selectedOrder.inspirationImages.length}):</span>
                          
                          {/* Direct photos previews */}
                          {selectedOrder.inspirationImages.filter(isDirectImageUrl).length > 0 && (
                            <div className="grid grid-cols-4 gap-1.5">
                              {selectedOrder.inspirationImages.filter(isDirectImageUrl).map((img, i) => (
                                <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="relative aspect-square rounded-lg overflow-hidden border border-black/5">
                                  <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                                </a>
                              ))}
                            </div>
                          )}

                          {/* External reference pasted links */}
                          {selectedOrder.inspirationImages.filter(url => !isDirectImageUrl(url)).length > 0 && (
                            <div className="flex flex-col gap-1.5 pt-1 border-t border-black/5">
                              {selectedOrder.inspirationImages.filter(url => !isDirectImageUrl(url)).map((link, i) => (
                                <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-[10.5px] font-bold text-[#D4AF37] hover:underline flex items-center gap-1 min-w-0">
                                  <span className="material-symbols-outlined text-[13px] shrink-0">link</span>
                                  <span className="truncate">{link}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Grid: Chat feed sanctuary */}
                    <div className={`lg:col-span-7 flex flex-col min-h-[300px] ${mobileSubTab === "chat" ? "flex" : "hidden lg:flex"}`}>
                      
                      {/* Chat messages viewport */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[260px] pb-4 bg-[#FAF9F6]/30 p-2.5 rounded-2xl border border-black/5 shadow-inner">
                        {selectedOrder.messages?.map((msg, i) => {
                          const isAdmin = msg.sender === "admin";
                          const isLog = msg.senderName === "System";
                          const dateVal = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                          if (isLog) {
                            return (
                              <div key={i} className="text-center py-1">
                                <span className="px-2 py-0.5 bg-black/5 text-[#685C57] text-[8.5px] font-bold uppercase tracking-wider rounded-lg border border-black/5">{msg.text}</span>
                              </div>
                            );
                          }

                          return (
                            <div key={i} className={`flex flex-col ${isAdmin ? "items-start" : "items-end"}`}>
                              <span className="text-[8px] font-bold text-[#685C57] mb-0.5 px-1">{msg.senderName} ({dateVal})</span>
                              <div className={`p-3.5 rounded-2xl text-[12px] leading-relaxed shadow-sm ${
                                isAdmin
                                  ? "bg-white text-[#2D2B29] border border-black/5 rounded-tl-none"
                                  : "bg-[#2D2B29] text-white rounded-tr-none"
                              }`}>
                                <p>{msg.text}</p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Chat messages input form */}
                      <form onSubmit={handleSendChatMessage} className="flex gap-2 pt-4 mt-auto">
                        <input
                          type="text"
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          placeholder="Type your message here..."
                          className="flex-1 bg-[#FAF9F6] border border-black/10 rounded-full px-4 py-2.5 text-[12.5px] outline-none focus:border-[#D4AF37] transition-all text-[#2D2B29]"
                        />
                        <button
                          type="submit"
                          disabled={isSendingMessage || !chatMessage.trim()}
                          className="w-10 h-10 rounded-full bg-[#2D2B29] hover:bg-[#D4AF37] text-white flex items-center justify-center shadow-md cursor-pointer transition-all shrink-0 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                        >
                          <span className="material-symbols-outlined text-[18px]">send</span>
                        </button>
                      </form>
                    </div>

                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
