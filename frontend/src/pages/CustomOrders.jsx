import { MandalaElement } from '../components/ui/MandalaElement';
import { SEO } from '../components/seo/SEO';
import { DynamicCustomOrderWizard } from '../components/ui/DynamicCustomOrderWizard';

import { CustomOrderWizard } from '../components/customOrders/CustomOrderWizard';
import { CustomOrderTracker } from '../components/customOrders/CustomOrderTracker';
import { useCustomOrderUploads } from '../hooks/useCustomOrderUploads';
import { useCustomOrderSubmission } from '../hooks/useCustomOrderSubmission';
import { useOrderSocketTracker } from '../hooks/useOrderSocketTracker';

import { OptimizedImage } from '../components/ui/OptimizedImage';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { customOrderService, uploadService } from '../services/domainServices';
import { useProduct } from '../hooks/useProductQueries';

import { useAuth } from '../context/AuthContext';
import { useUserSocket } from '../context/UserSocketProvider';
import toast from 'react-hot-toast';

import logger from '../utils/logger';
import { useWebsiteContent } from '../hooks/useWebsiteContent';

// Framer motion presets
const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};
const slideIn = { hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } };

// Direct Image URL Check
const isDirectImageUrl = (url) => {
  if (!url) return false;
  return url.match(/\.(jpeg|jpg|gif|png|webp|heic)/i) || url.includes('cloudinary.com');
};

export function CustomOrders() {
  const { user, login, isAuthenticated, runProtectedAction } = useAuth();
  const [searchParams] = useSearchParams();
  const productIdQuery = searchParams.get('product');
  const eventIdQuery = searchParams.get('event');
  const websiteContent = useWebsiteContent();

  const customOrdersContent = websiteContent?.customOrdersPage || {
    hero: {
      title: 'Custom Event Decor Studio',
      subtitle: 'Bespoke Curations',
      description: 'Design your custom decor, get price estimates, and track your orders.',
    },
  };

  // ─── PRODUCT LINK STATE ───
  const [linkedProduct, setLinkedProduct] = useState(null);
  const [customizationFields, setCustomizationFields] = useState({});

  const { data: productData } = useProduct(productIdQuery, {
    enabled: !!productIdQuery,
  });

  useEffect(() => {
    if (productData) {
      setLinkedProduct(productData);
      setWizardDraft((prev) => ({
        ...prev,
        productType: productData.category || prev.productType,
      }));
    }
  }, [productData]);

  // Custom states to prevent "Other" text fields from disappearing
  const [showCustomOccasion, setShowCustomOccasion] = useState(false);
  const [showCustomProductType, setShowCustomProductType] = useState(false);

  // Workspace tabs: 'wizard' (Submit Custom Request) vs 'tracker' (Track My Custom Orders)
  const [activeTab, setActiveTab] = useState('wizard');
  const [mobileSubTab, setMobileSubTab] = useState('chat');
  const [config, setConfig] = useState(null);

  // ─── TRACKER PORTAL STATES ───
  const [myOrders, setMyOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatEndRef = useRef(null);

  const isSendingMessageRef = useRef(false);
  const socket = useUserSocket();

  // ─── WIZARD FORM STATES ───
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardDraft, setWizardDraft] = useState({
    occasion: '',
    productType: '',
    inspirationImages: [],
    customRequirements: '',
    budget: '',
    quantity: 1,
    eventDate: '',
    city: '',
    bookingType: 'Video Meet',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
  });

  // ─── AI ANALYSIS & SIGNATURE PRESETS STATES ───
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [aiStep, setAiStep] = useState(0); // For scanning animation steps
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false); // Bottom-right FAQ bot
  const [aiMessages, setAiMessages] = useState([
    {
      sender: 'ai',
      text: 'Namaste! I am your Siri Heritage Design Assistant. Ask me anything about traditional South Indian wedding decor, florals, brass accents, or custom design timelines!',
    },
  ]);
  const [aiUserQuery, setAiUserQuery] = useState('');

  const handleWhatsAppConsult = () => {
    const phone = '919866006648';
    const baseUrl = window.location.origin;
    let msg = `Namaste Siri Arts & Crafts! I am interested in consulting with your master artisans for a custom event decor.\n\n`;
    if (activeTab === 'wizard') {
      msg += `*Occasion:* ${wizardDraft.occasion || 'TBD'}\n`;
      msg += `*Category:* ${wizardDraft.productType || 'TBD'}\n`;
      msg += `*Setups:* ${wizardDraft.quantity}\n`;
      msg += `*Event Date:* ${wizardDraft.eventDate || 'TBD'}\n`;
      msg += `*Location:* ${wizardDraft.city || 'TBD'}\n`;
      if (linkedProduct) {
        msg += `*Target Product:* ${baseUrl}/product/${linkedProduct.slug || linkedProduct._id}\n`;
      }
      if (wizardDraft.customRequirements) {
        msg += `*My Requirements:* ${wizardDraft.customRequirements}\n`;
      }
      if (wizardDraft.budget) {
        msg += `*Estimated Budget:* ${wizardDraft.budget}\n`;
      }
    } else if (selectedOrder) {
      msg += `*Order Reference:* ${selectedOrder._id}\n`;
      msg += `*Order Link:* ${baseUrl}/custom-order?orderId=${selectedOrder._id}\n`;
      if (selectedOrder.productSnapshot?.productId) {
        msg += `*Product Link:* ${baseUrl}/product/${selectedOrder.productSnapshot.productId}\n`;
      } else if (selectedOrder.productId) {
        msg += `*Product Link:* ${baseUrl}/product/${selectedOrder.productId}\n`;
      }
      msg += `*Occasion:* ${selectedOrder.occasion}\n`;
      msg += `*Status:* ${selectedOrder.status}\n`;
      msg += `*Total Estimated Price:* ${selectedOrder.quotation?.total ? '₹' + selectedOrder.quotation.total.toLocaleString('en-IN') : 'Price Estimate Pending'}\n`;
    }
    msg += `\nLooking forward to your expert advice!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Custom text states for "Other / Custom" specifications
  const [customOccasionText, setCustomOccasionText] = useState('');
  const [customProductTypeText, setCustomProductTypeText] = useState('');
  const [pastedLink, setPastedLink] = useState('');

  const { isUploading, uploadProgress, handleMoodUpload } = useCustomOrderUploads(
    wizardDraft,
    (updates) => setWizardDraft((prev) => ({ ...prev, ...updates })),
  );
  const fileInputRef = useRef(null);

  // ─── AI DESIGN REFS ANALYZER ───
  const handleAIAnalysis = async () => {
    if (wizardDraft.inspirationImages.length === 0) {
      toast.error('Please upload or paste at least one inspiration photo first.');
      return;
    }

    setIsAnalyzing(true);
    setAiStep(1);

    const steps = [
      'Decomposing image color spectrum...',
      'Analyzing traditional Telugu & South Indian motif shapes...',
      'Classifying floral swags and background wood carving styles...',
      'Estimating silver/brass elements & structural framework count...',
      'Matching with Siri artisan catalogs and material cost curves...',
    ];

    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current < steps.length) {
        setAiStep(current + 1);
      } else {
        clearInterval(interval);

        // Formulate perfect AI Analysis response dynamically based on first occasion/category
        const category = wizardDraft.productType || 'Traditional Decor';
        const occasion = wizardDraft.occasion || 'Event';

        let style = 'Traditional Dravidian Heritage';
        let palette = ['var(--color-gold)', '#A6192E', 'var(--color-surface-ivory)']; // Gold, Heritage Red, Cream
        let colorDesc = 'Gilded Royal Gold, Sacred Kumkum Crimson, and Pristine Cream';
        let materials =
          'Carved teak pillars, hanging brass bells, hand-strung marigold swags, and jasmine runners';
        let suggestedBudget = '₹1,50,000 - ₹2,50,000';

        if (category.toLowerCase().includes('pooja') || occasion.toLowerCase().includes('pooja')) {
          style = 'Tranquil Vedic Devotional';
          palette = ['var(--color-surface-ivory)', 'var(--color-gold)', '#2E8B57']; // Cream, Gold, Green
          colorDesc = 'Sacred Coconut Green, Gilded Bell Gold, and Sandalwood Cream';
          materials =
            'Brass deepams, floating lotus bowls (urlis), mango leaves, and rose petal garlands';
          suggestedBudget = '₹25,000 - ₹50,000';
        } else if (
          category.toLowerCase().includes('tray') ||
          category.toLowerCase().includes('hamper') ||
          occasion.toLowerCase().includes('engagement')
        ) {
          style = 'Contemporary Kundan Filigree';
          palette = ['#FFE4E1', 'var(--color-gold)', '#E8D8C8']; // Rose, Gold, Beige
          colorDesc = 'Royal Rose Pink, Shimmering Gold beads, and Pearl White borders';
          materials =
            "Velvet fabrics, kundan stonework borders, customized wood cuts, and baby's breath floral sprays";
          suggestedBudget = '₹5,000 - ₹12,000';
        } else if (
          occasion.toLowerCase().includes('haldi') ||
          occasion.toLowerCase().includes('mehendi')
        ) {
          style = 'Vibrant Botanical Celebration';
          palette = ['#FFD700', '#FF4500', '#043927']; // Yellow, Orange, Emerald
          colorDesc = 'Turmeric Yellow, Kesari Orange, and Banana Leaf Green';
          materials =
            'Traditional wooden swing, marigold canopies, handwoven palm leaf panels, and earthen pots';
          suggestedBudget = '₹45,000 - ₹85,000';
        }

        setAiAnalysisResult({
          style,
          palette,
          colorDesc,
          materials,
          suggestedBudget,
        });
        setIsAnalyzing(false);
        setAiStep(0);
        toast.success('Siri AI successfully analyzed your design reference!');
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
      budget: aiAnalysisResult.suggestedBudget,
    });

    toast.success('Successfully applied AI colors, materials, and budget settings to your form!');
  };

  // ─── AI DESIGN FAQ ASSISTANT ───
  const handleAiChatSubmit = (e) => {
    if (e) e.preventDefault();
    if (!aiUserQuery.trim()) return;

    const userMsg = { sender: 'user', text: aiUserQuery };
    const nextMsgs = [...aiMessages, userMsg];
    setAiMessages(nextMsgs);
    setAiUserQuery('');

    setTimeout(() => {
      let reply;
      const q = aiUserQuery.toLowerCase();
      if (q.includes('haldi') || q.includes('yellow') || q.includes('marigold')) {
        reply =
          "For an auspicious morning Haldi, we highly recommend our 'Botanical Marigold Haldi' theme. It blends handwoven mango leaves and fresh turmeric-yellow marigolds with suspended brass urlis filled with floating lotus petals. This setup symbolises purity and joy, and pairs beautifully with white/ivory outfits!";
      } else if (q.includes('backdrop') || q.includes('stage') || q.includes('mandap')) {
        reply =
          'Our custom backdrops are crafted with modular high-quality plywood frames, which are then covered in premium Mysore Mysore silk, heritage velvet, or handwoven coconut leaf grids. Timelines range from 5 days for catalog setups to 15 days for a fully bespoke Dravidian temple replica.';
      } else if (
        q.includes('cost') ||
        q.includes('price') ||
        q.includes('budget') ||
        q.includes('how much')
      ) {
        reply =
          'Our custom orders range from entry-level ring trays starting around ₹2,500, traditional ritual pooja setups starting around ₹20,000, up to full grand wedding mandapam stages starting from ₹1,50,000. We work closely within your budget to optimize material choices (fresh vs high-fidelity artificial blooms).';
      } else if (q.includes('jasmine') || q.includes('flower') || q.includes('rose')) {
        reply =
          'Siri Arts & Crafts prides itself on sourcing authentic fresh jasmine (Mogra) directly from farmers. For long-duration outdoor events, we recommend a mix of fresh greens and premium textile jasmine replicas to maintain pristine crispness under high sunlight.';
      } else if (q.includes('whatsapp') || q.includes('contact') || q.includes('phone')) {
        reply =
          'You can chat with our design experts instantly via WhatsApp at +91 98660 06648. There is also a direct consultation button on Step 8 or in your tracker portal!';
      } else {
        reply =
          "That is a wonderful design consideration! Siri's design team specializes in adapting historical South Indian temple geometry into custom modular panels. We can match any reference picture you upload and provide custom carvings, color matching, and digital sketches within 48 hours.";
      }
      setAiMessages([...nextMsgs, { sender: 'ai', text: reply }]);
    }, 600);
  };

  const handleQuickQuestion = (question) => {
    const userMsg = { sender: 'user', text: question };
    const nextMsgs = [...aiMessages, userMsg];
    setAiMessages(nextMsgs);

    setTimeout(() => {
      let reply;
      const q = question.toLowerCase();
      if (q.includes('haldi') || q.includes('flower')) {
        reply =
          "For an auspicious morning Haldi, we highly recommend our 'Botanical Marigold Haldi' theme. It blends handwoven mango leaves and fresh turmeric-yellow marigolds with suspended brass urlis filled with floating lotus petals. This setup symbolises purity and joy, and pairs beautifully with white/ivory outfits!";
      } else if (q.includes('backdrop') || q.includes('stage') || q.includes('timeline')) {
        reply =
          'Our custom backdrops are crafted with modular high-quality plywood frames, which are then covered in premium Mysore silk, heritage velvet, or handwoven coconut leaf grids. Timelines range from 5 days for catalog setups to 15 days for a fully bespoke Dravidian temple replica.';
      } else if (q.includes('cost') || q.includes('price') || q.includes('pooja')) {
        reply =
          'Our custom orders range from entry-level ring trays starting around ₹2,500, traditional ritual pooja setups starting around ₹20,000, up to full grand wedding mandapam stages starting from ₹1,50,000. We work closely within your budget to optimize material choices (fresh vs high-fidelity artificial blooms).';
      } else if (q.includes('whatsapp') || q.includes('line')) {
        reply =
          'You can chat with our design experts instantly via WhatsApp at +91 98660 06648. There is also a direct consultation button on Step 8 or in your tracker portal!';
      } else {
        reply =
          "That is a wonderful design consideration! Siri's design team specializes in adapting historical South Indian temple geometry into custom modular panels. We can match any reference picture you upload and provide custom carvings, color matching, and digital sketches within 48 hours.";
      }
      setAiMessages([...nextMsgs, { sender: 'ai', text: reply }]);
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
      logger.error('Failed to load workspace data:', err);
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

  // BUG-14: Graceful handling of missing config data
  const DEFAULT_FALLBACK_CONFIG = {
    occasions: [
      { id: 'wedding', label: 'Wedding / Vivaham', enabled: true },
      { id: 'haldi', label: 'Haldi & Mehndi Ceremony', enabled: true },
      { id: 'reception', label: 'Reception Style Gala', enabled: true },
    ],
    productTypes: [
      { id: 'mandapam', label: 'Full Mandapam Setup', enabled: true },
      { id: 'backdrop', label: 'Floral Backdrop Curations', enabled: true },
    ],
    budgetRanges: [
      { id: 'low', label: '₹10,000 - ₹50,000', enabled: true },
      { id: 'medium', label: '₹50,000 - ₹1,500,000', enabled: true },
      { id: 'high', label: '₹1,500,000+', enabled: true },
    ],
    bookingTypes: [
      { id: 'video', label: 'Premium Video Consultation', enabled: true },
      { id: 'call', label: 'Direct Audio Conference', enabled: true },
    ],
  };

  const activeConfig = config || DEFAULT_FALLBACK_CONFIG;

  // Preset options configurations
  const occasionList = activeConfig.occasions?.filter((o) => o.enabled) || [];
  const productTypeList = activeConfig.productTypes?.filter((p) => p.enabled) || [];
  const budgetList = activeConfig.budgetRanges?.filter((b) => b.enabled) || [];
  const bookingList = activeConfig.bookingTypes?.filter((b) => b.enabled) || [];

  // Sync custom inputs from draft once loaded
  useEffect(() => {
    if (wizardDraft.occasion && occasionList.length > 0) {
      const isPreset = occasionList.some((o) => o.label === wizardDraft.occasion);
      const timer = setTimeout(() => {
        if (!isPreset && wizardDraft.occasion !== 'Other') {
          setCustomOccasionText(wizardDraft.occasion);
          setShowCustomOccasion(true);
        } else if (wizardDraft.occasion === 'Other') {
          setShowCustomOccasion(true);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [wizardDraft.occasion, occasionList]);

  useEffect(() => {
    if (wizardDraft.productType && productTypeList.length > 0) {
      const isPreset = productTypeList.some((p) => p.label === wizardDraft.productType);
      const timer = setTimeout(() => {
        if (!isPreset && wizardDraft.productType !== 'Other') {
          setCustomProductTypeText(wizardDraft.productType);
          setShowCustomProductType(true);
        } else if (wizardDraft.productType === 'Other') {
          setShowCustomProductType(true);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [wizardDraft.productType, productTypeList]);

  // Filter direct images and external links
  const directImages = wizardDraft.inspirationImages.filter(isDirectImageUrl);
  const externalLinks = wizardDraft.inspirationImages.filter((url) => !isDirectImageUrl(url));

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedOrder?.messages]);

  useOrderSocketTracker({
    socket,
    activeTab,
    selectedOrder,
    setSelectedOrder,
    loadWorkspaceData,
  });

  const { loading, isSubmittingRef, handleWizardSubmit } = useCustomOrderSubmission({
    user,
    runProtectedAction,
    wizardDraft,
    linkedProduct,
    customizationFields,
    setWizardDraft,
    setCustomOccasionText,
    setCustomProductTypeText,
    setPastedLink: () => {}, // mock since it might not be defined
    setCustomizationFields,
    setCurrentStep,
    loadWorkspaceData,
    setActiveTab,
  });

  // ─── CLIENT CHAT DISPATCH ───
  const handleSendChatMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatMessage.trim() || !selectedOrder || isSendingMessageRef.current) return;

    isSendingMessageRef.current = true;
    setIsSendingMessage(true);
    try {
      const res = await customOrderService.postMessage(selectedOrder._id, chatMessage.trim());
      if (res.success) {
        setSelectedOrder(res.data);
        setChatMessage('');
        // Reload list in background
        const reloadRes = await customOrderService.getMyOrders();
        if (reloadRes.success) setMyOrders(reloadRes.data || []);
      }
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      isSendingMessageRef.current = false;
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
      toast.error('Failed to submit your response');
    } finally {
      setLoading(false);
    }
  };

  // Step-by-step progress verification to prevent skipping empty required inputs
  const handleNextStep = () => {
    if (currentStep === 1 && (!wizardDraft.occasion || wizardDraft.occasion === 'Other')) {
      toast.error('Please select or specify your event occasion to proceed');
      return;
    }
    if (currentStep === 2 && (!wizardDraft.productType || wizardDraft.productType === 'Other')) {
      toast.error('Please select or specify your product category to proceed');
      return;
    }
    const contactStepIndex = linkedProduct ? 8 : 7;
    if (currentStep === contactStepIndex) {
      if (!wizardDraft.customerName) {
        toast.error('Please enter your contact name');
        return;
      }
      if (!wizardDraft.customerPhone) {
        toast.error('Please enter your phone or WhatsApp number');
        return;
      }
    }
    setCurrentStep((prev) => prev + 1);
  };

  const baseStepsList = [
    'Select Occasion',
    'Select Product Category',
    'Upload Inspiration Photos',
    'Your Special Requirements',
    'Quantity & Budget',
    'Delivery & Event Details',
    'Contact Information',
    'Review & Submit',
  ];

  const stepsList = linkedProduct
    ? [baseStepsList[0], baseStepsList[1], 'Product Customization', ...baseStepsList.slice(2)]
    : baseStepsList;

  return (
    <div className="relative selection:bg-primary/20 bg-[var(--color-surface-ivory)] min-h-screen text-[var(--color-on-surface)] font-body pt-20 md:pt-32">
      <SEO
        title="Custom Decor Studio & Consultancy | Siri Arts"
        description="Design your dream Indian ceremony with Siri's interactive digital planning studio. Consult with our Telugu heritage master artisans for bespoke backdrops, floral canopies, and custom pooja trays."
      />
      {/* Decorative Mandalas */}
      <MandalaElement
        className="absolute top-20 -right-20 opacity-[0.03] pointer-events-none"
        size={600}
      />
      <MandalaElement
        className="absolute bottom-20 -left-20 opacity-[0.02] pointer-events-none"
        size={700}
      />

      <main className="max-w-[1440px] mx-auto px-4 md:px-8 pb-20 relative z-10 space-y-6 md:space-y-8">
        {/* Simple & Luxury Header & Workspace Toggle */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[var(--color-on-surface)]/5 pb-5">
          <div>
            <h2 className="text-[24px] md:text-[36px] font-light text-[var(--color-on-surface)] font-display leading-tight">
              {customOrdersContent.hero?.title || 'Custom Event Decor Studio'}
            </h2>
            <p className="text-[12px] md:text-[13px] text-[#685C57] mt-1 font-light tracking-wide max-w-lg">
              {customOrdersContent.hero?.description ||
                'Design your custom decor, get price estimates, and track your orders.'}
            </p>
          </div>

          <div
            className="flex bg-[#f2efe9] p-1 rounded-full border border-black/5 self-start md:self-auto shadow-inner w-full sm:w-auto overflow-x-auto shrink-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <button
              onClick={() => setActiveTab('wizard')}
              className={`flex-1 sm:flex-initial text-center px-4 md:px-5 py-2.5 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer whitespace-nowrap ${
                activeTab === 'wizard'
                  ? 'bg-[var(--color-on-surface)] text-white shadow-md'
                  : 'text-[#685C57] hover:text-[var(--color-on-surface)]'
              }`}
            >
              <span className="hidden sm:inline">Start Custom Request</span>
              <span className="inline sm:hidden">New Request</span>
            </button>
            <button
              onClick={() => {
                runProtectedAction(() => {
                  setActiveTab('tracker');
                });
              }}
              className={`flex-1 sm:flex-initial text-center px-4 md:px-5 py-2.5 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-wider transition-all duration-300 relative cursor-pointer whitespace-nowrap ${
                activeTab === 'tracker'
                  ? 'bg-[var(--color-on-surface)] text-white shadow-md'
                  : 'text-[#685C57] hover:text-[var(--color-on-surface)]'
              }`}
            >
              <span className="hidden sm:inline">Track My Custom Orders</span>
              <span className="inline sm:hidden">Track Orders</span>
              {myOrders.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--color-gold)] text-white text-[8px] flex items-center justify-center font-bold font-mono">
                  {myOrders.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ─── ACTIVE VIEW: MULTI-STEP REQUEST WIZARD ─── */}
        {activeTab === 'wizard' && (
          <CustomOrderWizard
            isAuthenticated={isAuthenticated}
            runProtectedAction={runProtectedAction}
            linkedProduct={linkedProduct}
            setLinkedProduct={setLinkedProduct}
            setActiveTab={setActiveTab}
            loadWorkspaceData={loadWorkspaceData}
            eventIdQuery={eventIdQuery}
          />
        )}

        {/* ─── ACTIVE VIEW: CLIENT WORKSPACE TRACKING PORTAL ─── */}
        {activeTab === 'tracker' && (
          <CustomOrderTracker
            selectedOrder={selectedOrder}
            setSelectedOrder={setSelectedOrder}
            myOrders={myOrders}
            mobileSubTab={mobileSubTab}
            setMobileSubTab={setMobileSubTab}
            handleQuotationDecision={handleQuotationDecision}
            handleWhatsAppConsult={handleWhatsAppConsult}
            isDirectImageUrl={isDirectImageUrl}
            chatMessage={chatMessage}
            setChatMessage={setChatMessage}
            handleSendChatMessage={handleSendChatMessage}
            isSendingMessage={isSendingMessage}
            chatEndRef={chatEndRef}
          />
        )}
      </main>
    </div>
  );
}
