import { useState } from 'react';
import toast from 'react-hot-toast';

export function useCustomOrderAI({ wizardDraft, updateDraft }) {
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

  return {
    isAnalyzing,
    aiAnalysisResult,
    aiStep,
    isAiPanelOpen,
    setIsAiPanelOpen,
    aiMessages,
    aiUserQuery,
    setAiUserQuery,
    handleAIAnalysis,
    handleApplyAiSuggestions,
    handleAiChatSubmit,
  };
}
