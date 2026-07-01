const setWizardDraft = () => {};
import { MandalaElement } from '../components/ui/MandalaElement';
import { SEO } from '../components/seo/SEO';

import { CustomOrderWizard } from '../components/customOrders/CustomOrderWizard';
import { CustomOrderTracker } from '../components/customOrders/CustomOrderTracker';
import { useCustomOrderWorkspace } from '../hooks/useCustomOrderWorkspace';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProduct } from '../hooks/useProductQueries';

import { useAuth } from '../context/AuthContext';
import { useUserSocket } from '../context/UserSocketProvider';
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

  const co = websiteContent?.customOrdersPage || {};
  const customOrdersContent = {
    hero: {
      title: co.hero?.title || 'Custom Order',
      subtitle: co.hero?.subtitle || 'Bespoke Event Curation',
      description:
        co.hero?.description ||
        'Design your custom decor, get price estimates, and track your orders.',
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

  const handleWhatsAppConsult = () => {
    const phone = '919866006648';
    const baseUrl = window.location.origin;
    let msg = `Namaste Siri Arts & Crafts! I am interested in consulting with your master artisans for a custom event decor.\n\n`;
    if (selectedOrder) {
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

  const { loading, loadWorkspaceData, handleSendChatMessage, handleQuotationDecision } =
    useCustomOrderWorkspace({
      user,
      setConfig,
      setMyOrders,
      selectedOrder,
      setSelectedOrder,
      chatMessage,
      setChatMessage,
      isSendingMessageRef,
      setIsSendingMessage,
    });

  return (
    <div className="relative selection:bg-primary/20 bg-[var(--color-surface-ivory)] min-h-screen text-[var(--color-on-surface)] font-body pt-20 lg:pt-32">
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

      <main className="max-w-[1440px] mx-auto px-4 lg:px-8 pb-20 relative z-10 space-y-6 lg:space-y-8">
        {/* Simple & Luxury Header & Workspace Toggle */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[var(--color-on-surface)]/5 pb-5">
          <div>
            <h2 className="text-[24px] lg:text-[36px] font-light text-[var(--color-on-surface)] font-display leading-tight">
              {customOrdersContent.hero?.title || 'Custom Event Decor Studio'}
            </h2>
            <p className="text-[12px] lg:text-[13px] text-[#685C57] mt-1 font-light tracking-wide max-w-lg">
              {customOrdersContent.hero?.description ||
                'Design your custom decor, get price estimates, and track your orders.'}
            </p>
          </div>

          <div
            className="flex bg-[#f2efe9] p-1 rounded-full border border-black/5 self-start lg:self-auto shadow-inner w-full sm:w-auto overflow-x-auto shrink-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <button
              onClick={() => setActiveTab('wizard')}
              className={`flex-1 sm:flex-initial text-center px-4 lg:px-5 py-2.5 rounded-full text-[10px] lg:text-[11px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer whitespace-nowrap ${
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
              className={`flex-1 sm:flex-initial text-center px-4 lg:px-5 py-2.5 rounded-full text-[10px] lg:text-[11px] font-bold uppercase tracking-wider transition-all duration-300 relative cursor-pointer whitespace-nowrap ${
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
