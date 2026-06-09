import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MandalaElement } from '../components/ui/MandalaElement';
import { SEO } from '../components/seo/SEO';
import { customOrderService, uploadService } from '../services/domainServices';
import { useProduct } from '../hooks/useProductQueries';
import {
  ProductSummaryCard,
  ProductCustomizationSection,
  FileUploadZone,
} from '../components/ui/CustomizationFields';
import { DynamicCustomOrderWizard } from '../components/ui/DynamicCustomOrderWizard';
import { useAuth } from '../context/AuthContext';
import { useUserSocket } from '../context/UserSocketProvider';
import toast from 'react-hot-toast';

import logger from '../utils/logger';
import { OptimizedImage } from '../components/ui/OptimizedImage';
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
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);

  // ─── TRACKER PORTAL STATES ───
  const [myOrders, setMyOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatEndRef = useRef(null);

  const isSubmittingRef = useRef(false);
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

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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

  // ─── Socket Events for Tracker ───
  useEffect(() => {
    if (!socket || activeTab !== 'tracker') return;

    const handleStatusChange = (payload) => {
      try {
        toast.success(`Order ${payload.orderId} status updated to ${payload.status}`);
        loadWorkspaceData();
        if (selectedOrder && selectedOrder.orderId === payload.orderId) {
          customOrderService.getById(selectedOrder._id).then((res) => {
            if (res.success) setSelectedOrder(res.data);
          });
        }
      } catch (err) {
        console.error('Socket handleStatusChange error:', err);
      }
    };

    const handleNewMessage = (payload) => {
      try {
        loadWorkspaceData();
        if (selectedOrder && selectedOrder.orderId === payload.orderId) {
          customOrderService.getById(selectedOrder._id).then((res) => {
            if (res.success) setSelectedOrder(res.data);
          });
        } else {
          toast.success(`New message from ${payload.senderName} regarding ${payload.orderId}`);
        }
      } catch (err) {
        console.error('Socket handleNewMessage error:', err);
      }
    };

    const handleQuoteCreated = (payload) => {
      try {
        loadWorkspaceData();
        toast.success(
          `New quotation received for ${payload.orderId} (₹${payload.total.toLocaleString()})`,
        );
        if (selectedOrder && selectedOrder.orderId === payload.orderId) {
          customOrderService.getById(selectedOrder._id).then((res) => {
            if (res.success) setSelectedOrder(res.data);
          });
        }
      } catch (err) {
        console.error('Socket handleQuoteCreated error:', err);
      }
    };

    socket.on('customOrder:statusChange', handleStatusChange);
    socket.on('customOrder:newMessage', handleNewMessage);
    socket.on('customOrder:quoteCreated', handleQuoteCreated);

    return () => {
      socket.off('customOrder:statusChange', handleStatusChange);
      socket.off('customOrder:newMessage', handleNewMessage);
      socket.off('customOrder:quoteCreated', handleQuoteCreated);
    };
  }, [socket, selectedOrder, activeTab]);

  // ─── IMAGE UPLOAD HANDLING ───
  const handleMoodUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Local checks
    const invalidFile = files.find((f) => !f.type.startsWith('image/'));
    if (invalidFile) {
      toast.error('Please upload valid images only');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    // Simulate compression/upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 150);

    try {
      const uploadedUrls = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('images', file);
        const res = await uploadService.uploadImages(formData, 'products');
        if (res.success && res.images && res.images[0]) {
          uploadedUrls.push(res.images[0]);
        }
      }

      const nextUrls = [...wizardDraft.inspirationImages, ...uploadedUrls];
      updateDraft({ inspirationImages: nextUrls });
      toast.success(`${files.length} photos successfully uploaded!`);
    } catch (err) {
      toast.error('Failed to upload photos. Please try again.');
    } finally {
      clearInterval(interval);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // ─── SUBMISSION FLOW ───
  const handleWizardSubmit = async () => {
    if (isSubmittingRef.current) return;
    runProtectedAction(async () => {
      // Validation checks
      if (!wizardDraft.occasion || wizardDraft.occasion === 'Other')
        return toast.error('Please select or specify your occasion');
      if (!wizardDraft.productType || wizardDraft.productType === 'Other')
        return toast.error('Please select or specify your product category');
      if (!wizardDraft.customerName) return toast.error('Please fill in your contact name');
      if (!wizardDraft.customerPhone)
        return toast.error('Please fill in your contact phone number');

      isSubmittingRef.current = true;
      setLoading(true);
      try {
        const payload = {
          ...wizardDraft,
          budget: Number(wizardDraft.budget.replace(/[^0-9]/g, '')) || undefined,
        };

        // If the user context is stale due to a fresh login modal, the backend automatically
        // resolves the email from token claims, but let's pass it if available.
        if (user?.email) {
          payload.customerEmail = user.email;
        }

        if (linkedProduct) {
          payload.productId = linkedProduct._id || linkedProduct.id;
          payload.productSnapshot = {
            productId: linkedProduct._id || linkedProduct.id,
            title: linkedProduct.title,
            imageSrc: linkedProduct.imageSrc,
            category: linkedProduct.category,
            price: linkedProduct.price,
            description: linkedProduct.description,
          };
          payload.customizationData = Object.entries(customizationFields).map(([key, value]) => {
            let fieldType = 'text';
            if (key.toLowerCase().includes('color')) {
              fieldType = 'color';
            } else if (Array.isArray(value)) {
              fieldType = 'multiselect';
            } else if (typeof value === 'number') {
              fieldType = 'number';
            }
            return {
              fieldName: key,
              fieldType,
              value: value,
            };
          });
        }

        const res = await customOrderService.create(payload);
        if (res.success) {
          toast.success('Your custom order request has been submitted successfully!');
          setWizardDraft({
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
          setCustomOccasionText('');
          setCustomProductTypeText('');
          setPastedLink('');
          setCustomizationFields({});
          setCurrentStep(1);
          loadWorkspaceData();
          setActiveTab('tracker');
        } else {
          toast.error(res.message || 'Failed to submit request');
        }
      } catch (err) {
        toast.error('Failed to submit custom order request');
      } finally {
        isSubmittingRef.current = false;
        setLoading(false);
      }
    });
  };

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
          <div className="space-y-4 w-full">
            {/* Elegant Luxury Guest Acknowledgment */}
            {!isAuthenticated && (
              <div className="bg-white border border-[var(--color-gold)]/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px] shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[var(--color-gold)] text-[20px]">
                    info
                  </span>
                  <p className="text-[#685C57] font-light">
                    <strong className="text-[var(--color-on-surface)] font-medium">
                      Guest Session:
                    </strong>{' '}
                    Draft your request now. Sign in later to submit and track quotes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => runProtectedAction(() => {})}
                  className="px-4 py-1.5 bg-[var(--color-on-surface)] text-white rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-[var(--color-gold)] transition-all cursor-pointer text-center shrink-0 self-start sm:self-auto"
                >
                  Sign In / Register
                </button>
              </div>
            )}

            {linkedProduct && (
              <div className="mb-6">
                <ProductSummaryCard
                  product={linkedProduct}
                  onClear={() => setLinkedProduct(null)}
                />
              </div>
            )}

            <DynamicCustomOrderWizard
              onComplete={(order) => {
                setActiveTab('tracker');
                loadWorkspaceData();
              }}
              initialProductPayload={
                linkedProduct
                  ? {
                      productId: linkedProduct._id,
                      productType: linkedProduct.category,
                      productTitle: linkedProduct.title,
                      productSnapshot: {
                        productId: linkedProduct._id,
                        title: linkedProduct.title,
                        imageSrc:
                          linkedProduct.images && linkedProduct.images.length > 0
                            ? linkedProduct.images[0].url || linkedProduct.images[0]
                            : '',
                        price: linkedProduct.price,
                      },
                    }
                  : null
              }
              initialEventType={eventIdQuery ? { eventId: eventIdQuery } : null}
            />
          </div>
        )}

        {/* ─── ACTIVE VIEW: CLIENT WORKSPACE TRACKING PORTAL ─── */}
        {activeTab === 'tracker' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left Box: Active customer order request brief list */}
            <div
              className={`lg:col-span-4 space-y-4 ${selectedOrder ? 'hidden lg:block' : 'block'}`}
            >
              <h3 className="text-[14px] font-bold uppercase tracking-wider text-[#685C57] mb-2 px-1">
                My Custom Orders
              </h3>
              {myOrders.length === 0 ? (
                <div className="bg-white rounded-3xl border border-black/5 p-8 text-center text-[#685C57] flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-[36px] text-black/20 mb-2">
                    search_off
                  </span>
                  <p className="text-[13px] font-bold text-[var(--color-on-surface)]">
                    No Custom Orders Found
                  </p>
                  <p className="text-[11px] text-[#685C57] mt-1 max-w-[200px] mx-auto">
                    Use the request form to submit your custom order request today.
                  </p>
                </div>
              ) : (
                myOrders.map((order) => {
                  const dateVal = new Date(order.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={order._id}
                      onClick={() => setSelectedOrder(order)}
                      className={`p-5 rounded-[2rem] border transition-all duration-300 cursor-pointer shadow-sm ${
                        selectedOrder?._id === order._id
                          ? 'bg-white border-[var(--color-gold)] ring-1 ring-[var(--color-gold)]'
                          : 'bg-white border-black/5 hover:border-black/15'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase ${
                            order.status === 'Pending'
                              ? 'bg-amber-100 text-amber-700'
                              : order.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : order.status === 'Cancelled'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {order.status}
                        </span>
                        <span className="text-[9px] font-mono text-[#685C57]">{dateVal}</span>
                      </div>

                      <h4 className="text-[14px] font-bold text-[var(--color-on-surface)] line-clamp-1">
                        {order.occasion} Setup
                      </h4>
                      <p className="text-[11px] text-[#685C57] mt-0.5">
                        {order.productType} • {order.city || 'Any Location'}
                      </p>

                      {order.quotation?.total > 0 && (
                        <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between text-[11px]">
                          <span className="text-[#685C57]">Estimated Price:</span>
                          <span className="font-bold font-mono text-[var(--color-gold)]">
                            ₹{order.quotation.total.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Box: Master Curation Workspace & chat portal */}
            <div
              className={`lg:col-span-8 bg-white rounded-3xl lg:rounded-[2.5rem] border border-black/5 p-5 md:p-8 min-h-[560px] shadow-sm flex flex-col ${selectedOrder ? 'block' : 'hidden lg:flex'}`}
            >
              {!selectedOrder ? (
                <div className="flex flex-col items-center justify-center flex-1 py-12 md:py-20 text-center text-[#685C57]">
                  <span className="material-symbols-outlined text-[40px] md:text-[48px] text-black/10 mb-2">
                    forum
                  </span>
                  <p className="text-[14px] font-bold text-[var(--color-on-surface)]">
                    Custom Order Tracking
                  </p>
                  <p className="text-[11.5px] max-w-[280px] mx-auto mt-1 leading-relaxed px-4">
                    Select one of your custom orders from the left list to view status updates,
                    pricing, and chat with our team.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col flex-1 gap-5 md:gap-6">
                  {/* Back button on mobile */}
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="lg:hidden flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold)] hover:text-[var(--color-on-surface)] transition-colors pb-1.5 self-start cursor-pointer bg-transparent border-none p-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    Back to All Orders
                  </button>

                  {/* Workspace top profile header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-black/5 pb-4 gap-3">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-gold)]">
                        Custom Order Tracking
                      </span>
                      <h3 className="text-[16px] md:text-[18px] font-bold text-[var(--color-on-surface)] mt-0.5">
                        {selectedOrder.occasion} Custom Order Details
                      </h3>
                      <p className="text-[11px] text-[#685C57] mt-0.5">
                        Category: {selectedOrder.productType} • Number of Setups:{' '}
                        {selectedOrder.quantity}
                      </p>
                    </div>

                    <div className="self-start sm:self-auto text-left sm:text-right">
                      <span className="text-[9px] uppercase tracking-wider text-outline-variant block sm:inline-block">
                        Status
                      </span>
                      <span className="inline-block sm:block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-on-surface)] text-white mt-1">
                        {selectedOrder.status}
                      </span>
                    </div>
                  </div>

                  {/* Mobile-only Workspace Sub-tabs */}
                  <div className="flex lg:hidden bg-[var(--color-surface-ivory)] p-1 rounded-xl border border-black/5 mb-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setMobileSubTab('chat')}
                      className={`flex-1 text-center py-2 rounded-lg text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        mobileSubTab === 'chat'
                          ? 'bg-[var(--color-on-surface)] text-white shadow-sm'
                          : 'text-[#685C57] hover:text-[var(--color-on-surface)]'
                      }`}
                    >
                      Chat & Updates
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileSubTab('summary')}
                      className={`flex-1 text-center py-2 rounded-lg text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        mobileSubTab === 'summary'
                          ? 'bg-[var(--color-on-surface)] text-white shadow-sm'
                          : 'text-[#685C57] hover:text-[var(--color-on-surface)]'
                      }`}
                    >
                      Summary & Pricing
                    </button>
                  </div>

                  {/* Split Curation dashboard info */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
                    {/* Left Grid: Timeline and Quotation Estimate */}
                    <div
                      className={`lg:col-span-5 space-y-4 pr-0 lg:pr-4 lg:border-r border-black/5 ${mobileSubTab === 'summary' ? 'block' : 'hidden lg:block'}`}
                    >
                      {/* Timeline status track */}
                      <div className="bg-[var(--color-surface-ivory)] p-4 rounded-2xl border border-black/5 space-y-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#685C57] block">
                          Order Progress
                        </span>
                        <div className="relative pl-4 border-l border-black/10 space-y-3.5 pt-1 text-[11px]">
                          {[
                            { st: 'Pending', d: 'Request Submitted' },
                            { st: 'Reviewing', d: 'We are checking your request' },
                            { st: 'Quote Sent', d: 'Quotation sent to you' },
                            { st: 'Approved', d: 'Custom order approved' },
                            { st: 'Ready', d: 'Custom decor ready' },
                          ].map((stage, idx) => {
                            const isPast =
                              [
                                'Pending',
                                'Reviewing',
                                'Quote Sent',
                                'Approved',
                                'In Progress',
                                'Ready',
                                'Delivered',
                              ].indexOf(selectedOrder.status) >=
                              [
                                'Pending',
                                'Reviewing',
                                'Quote Sent',
                                'Approved',
                                'In Progress',
                                'Ready',
                                'Delivered',
                              ].indexOf(stage.st);
                            return (
                              <div key={idx} className="relative">
                                <div
                                  className={`absolute -left-[20.5px] top-0.5 w-3 h-3 rounded-full border-2 bg-white transition-all ${isPast ? 'border-[var(--color-gold)] bg-[var(--color-gold)]' : 'border-black/15'}`}
                                />
                                <span
                                  className={`font-bold ${isPast ? 'text-[var(--color-on-surface)]' : 'text-black/35'}`}
                                >
                                  {stage.st}
                                </span>
                                <p className="text-[10px] text-[#685C57]/70 font-light mt-0.5 leading-tight">
                                  {stage.d}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Interactive Quotation Estimate Card */}
                      {selectedOrder.quotation?.items?.length > 0 ? (
                        <div className="bg-white rounded-2xl border-2 border-[var(--color-gold)] p-4 space-y-3 shadow-md">
                          <div className="flex items-center justify-between border-b border-black/5 pb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-gold)]">
                              Your Quotation
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                selectedOrder.quotation.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : selectedOrder.quotation.status === 'rejected'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {selectedOrder.quotation.status}
                            </span>
                          </div>

                          <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                            {selectedOrder.quotation.items.map((it, i) => (
                              <div
                                key={it._id || it.description || i}
                                className="flex justify-between text-[11px] text-[var(--color-on-surface)]/80 font-light"
                              >
                                <span className="truncate pr-2">{it.description}</span>
                                <span className="font-mono font-medium shrink-0">
                                  ₹{it.amount.toLocaleString('en-IN')}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-black/5 text-[11px] space-y-1">
                            <div className="flex justify-between text-[#685C57]/80">
                              <span>Taxes:</span>
                              <span className="font-mono">
                                ₹{selectedOrder.quotation.tax?.toLocaleString('en-IN') || '0'}
                              </span>
                            </div>
                            <div className="flex justify-between text-[#685C57]/80">
                              <span>Shipping & Setup:</span>
                              <span className="font-mono">
                                ₹{selectedOrder.quotation.shipping?.toLocaleString('en-IN') || '0'}
                              </span>
                            </div>
                            <div className="flex justify-between font-bold text-[12px] pt-1.5 border-t border-dashed border-black/10">
                              <span>Grand Total:</span>
                              <span className="font-mono text-[var(--color-gold)]">
                                ₹{selectedOrder.quotation.total?.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          {/* Client quote approval/rejection panel */}
                          {selectedOrder.quotation.status === 'sent' && (
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleQuotationDecision('approved')}
                                className="flex-1 bg-[var(--color-on-surface)] hover:bg-[var(--color-gold)] text-white py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center animate-pulse"
                              >
                                Approve Quote
                              </button>
                              <button
                                onClick={() => handleQuotationDecision('rejected')}
                                className="flex-1 bg-white border border-red-200 hover:bg-red-50 text-red-500 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                              >
                                Decline Quote
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-[var(--color-surface-ivory)] p-4 rounded-2xl border border-black/5 text-center py-6">
                          <span className="material-symbols-outlined text-[24px] text-black/20 block mb-1">
                            payments
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#685C57]">
                            Preparing Quotation
                          </span>
                          <p className="text-[10px] text-[#685C57]/60 mt-1">
                            Our team is checking your design requirements to prepare your custom
                            pricing.
                          </p>
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
                        <div className="bg-[var(--color-surface-ivory)] p-4 rounded-2xl border border-black/5 space-y-3">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#685C57] block">
                            My Inspirations ({selectedOrder.inspirationImages.length}):
                          </span>

                          {/* Direct photos previews */}
                          {selectedOrder.inspirationImages.filter(isDirectImageUrl).length > 0 && (
                            <div className="grid grid-cols-4 gap-1.5">
                              {selectedOrder.inspirationImages
                                .filter(isDirectImageUrl)
                                .map((img, i) => (
                                  <a
                                    key={img}
                                    href={img}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative aspect-square rounded-lg overflow-hidden border border-black/5"
                                  >
                                    <OptimizedImage
                                      src={img}
                                      alt="Thumb"
                                      className="w-full h-full object-cover"
                                    />
                                  </a>
                                ))}
                            </div>
                          )}

                          {/* External reference pasted links */}
                          {selectedOrder.inspirationImages.filter((url) => !isDirectImageUrl(url))
                            .length > 0 && (
                            <div className="flex flex-col gap-1.5 pt-1 border-t border-black/5">
                              {selectedOrder.inspirationImages
                                .filter((url) => !isDirectImageUrl(url))
                                .map((link, i) => (
                                  <a
                                    key={link}
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10.5px] font-bold text-[var(--color-gold)] hover:underline flex items-center gap-1 min-w-0"
                                  >
                                    <span className="material-symbols-outlined text-[13px] shrink-0">
                                      link
                                    </span>
                                    <span className="truncate">{link}</span>
                                  </a>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Grid: Chat feed sanctuary */}
                    <div
                      className={`lg:col-span-7 flex flex-col min-h-[300px] ${mobileSubTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}
                    >
                      {/* Chat messages viewport */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[260px] pb-4 bg-[var(--color-surface-ivory)]/30 p-2.5 rounded-2xl border border-black/5 shadow-inner">
                        {selectedOrder.messages?.map((msg, i) => {
                          const isAdmin = msg.sender === 'admin';
                          const isLog = msg.senderName === 'System';
                          const dateVal = new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          if (isLog) {
                            return (
                              <div key={msg._id || msg.createdAt || i} className="text-center py-1">
                                <span className="px-2 py-0.5 bg-black/5 text-[#685C57] text-[8.5px] font-bold uppercase tracking-wider rounded-lg border border-black/5">
                                  {msg.text}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={msg._id || msg.createdAt || i}
                              className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                            >
                              <span className="text-[8px] font-bold text-[#685C57] mb-0.5 px-1">
                                {msg.senderName} ({dateVal})
                              </span>
                              <div
                                className={`p-3.5 rounded-2xl text-[12px] leading-relaxed shadow-sm ${
                                  isAdmin
                                    ? 'bg-white text-[var(--color-on-surface)] border border-black/5 rounded-tl-none'
                                    : 'bg-[var(--color-on-surface)] text-white rounded-tr-none'
                                }`}
                              >
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
                          className="flex-1 bg-[var(--color-surface-ivory)] border border-black/10 rounded-full px-4 py-2.5 text-[12.5px] outline-none focus:border-[var(--color-gold)] transition-all text-[var(--color-on-surface)]"
                        />
                        <button
                          type="submit"
                          disabled={isSendingMessage || !chatMessage.trim()}
                          className="w-10 h-10 rounded-full bg-[var(--color-on-surface)] hover:bg-[var(--color-gold)] text-white flex items-center justify-center shadow-md cursor-pointer transition-all shrink-0 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
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
