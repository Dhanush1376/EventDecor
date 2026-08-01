import {
  Compass,
  ArrowRight,
  BellRing,
  Mail,
  Trash2,
  ArrowLeft,
  PackageCheck,
  Check,
  ChevronDown,
  SlidersHorizontal,
  Paperclip,
  FileText,
  MessageSquare,
  MessageCircle,
  X,
  PlusCircle,
  RefreshCw,
  Send,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { OptimizedImage, StatusPill } from '../components/ui';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useUserSocket } from '../context/UserSocketProvider';
import { customOrderService, uploadService } from '../services/domainServices';
import { useConfirm } from '../context/ConfirmProvider';
import toast from 'react-hot-toast';
import logger from '../utils/core/logger';

// ─── Animation Presets ───
const _fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};
const slideIn = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

const STATUS_COLORS = {
  Pending: 'bg-orange-100 text-orange-600 border-orange-200',
  Reviewing: 'bg-blue-100 text-blue-600 border-blue-200',
  'Quote Sent': 'bg-purple-100 text-purple-600 border-purple-200',
  Approved: 'bg-green-100 text-green-600 border-green-200',
  'In Progress': 'bg-indigo-100 text-indigo-600 border-indigo-200',
  'In Production': 'bg-pink-100 text-pink-600 border-pink-200',
  Ready: 'bg-teal-100 text-teal-600 border-teal-200',
  Delivered: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  Cancelled: 'bg-red-100 text-red-600 border-red-200',
};

// ─── HELPER: Format Date ───
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function MyCustomOrders() {
  const { user } = useAuth();
  const socket = useUserSocket();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'drafts'
  const [chatMessage, setChatMessage] = useState('');
  const [chatFiles, setChatFiles] = useState([]);
  const [isQuotationOpen, setIsQuotationOpen] = useState(true);
  const chatEndRef = useRef(null);

  // ─── Fetch Data ───
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['my-custom-orders'],
    queryFn: customOrderService.getMyOrders,
    enabled: !!user,
  });

  const { data: draftsData, isLoading: draftsLoading } = useQuery({
    queryKey: ['my-custom-drafts'],
    queryFn: customOrderService.getDrafts,
    enabled: !!user,
  });

  const orders = ordersData?.data || [];
  const drafts = draftsData?.data || [];

  // ─── Socket Events ───
  useEffect(() => {
    if (!socket) return;

    const handleStatusChange = (payload) => {
      try {
        queryClient.invalidateQueries(['my-custom-orders']);
        toast.success(`Order ${payload.orderId} status updated to ${payload.status}`);
        if (selectedOrder && selectedOrder.orderId === payload.orderId) {
          // Refetch the single order to update view
          customOrderService.getById(selectedOrder._id).then((res) => {
            if (res.success) setSelectedOrder(res.data);
          });
        }
      } catch (err) {
        logger.error('Socket handleStatusChange error: ', err);
      }
    };

    const handleNewMessage = (payload) => {
      try {
        queryClient.invalidateQueries(['my-custom-orders']);
        if (selectedOrder && selectedOrder.orderId === payload.orderId) {
          customOrderService.getById(selectedOrder._id).then((res) => {
            if (res.success) setSelectedOrder(res.data);
          });
        } else {
          toast.success(`New message from ${payload.senderName} regarding ${payload.orderId}`);
        }
      } catch (err) {
        logger.error('Socket handleNewMessage error: ', err);
      }
    };

    const handleQuoteCreated = (payload) => {
      try {
        queryClient.invalidateQueries(['my-custom-orders']);
        toast.success(
          `New quotation received for ${payload.orderId} (₹${payload.total.toLocaleString()})`,
        );
        if (selectedOrder && selectedOrder.orderId === payload.orderId) {
          customOrderService.getById(selectedOrder._id).then((res) => {
            if (res.success) setSelectedOrder(res.data);
          });
        }
      } catch (err) {
        logger.error('Socket handleQuoteCreated error: ', err);
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
  }, [socket, queryClient, selectedOrder]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedOrder?.messages]);

  // ─── Mutations ───
  const deleteDraftMutation = useMutation({
    mutationFn: (id) => customOrderService.deleteDraft(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-custom-drafts']);
      toast.success('Draft deleted');
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ id, text, attachments }) =>
      customOrderService.postMessage(id, text, attachments),
    onSuccess: (res) => {
      setChatMessage('');
      setChatFiles([]);
      setSelectedOrder(res.data);
      queryClient.invalidateQueries(['my-custom-orders']);
    },
  });

  const respondQuoteMutation = useMutation({
    mutationFn: ({ id, status }) => customOrderService.respondQuotation(id, status),
    onSuccess: (res) => {
      setSelectedOrder(res.data);
      queryClient.invalidateQueries(['my-custom-orders']);
      toast.success(`Quotation ${res.data.quotation.status}`);
    },
  });

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() && chatFiles.length === 0) return;

    let uploadedUrls = [];
    if (chatFiles.length > 0) {
      const formData = new FormData();
      chatFiles.forEach((f) => formData.append('images', f));
      const uploadRes = await uploadService.uploadImages(formData, 'custom-order-chat');
      if (uploadRes.success) {
        uploadedUrls = uploadRes.images;
      }
    }

    sendMessageMutation.mutate({
      id: selectedOrder._id,
      text: chatMessage,
      attachments: uploadedUrls,
    });
  };

  // ─── Renders ───

  const renderOrderList = () => (
    <div className="space-y-4 text-[11px]">
      <div className="pb-4 mb-4 border-b border-outline-variant/20">
        <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
          <Compass className="text-[12px]" strokeWidth={1.5} />
          Active Custom Requests
        </h2>
      </div>
      {ordersLoading ? (
        Array(3)
          .fill(0)
          .map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)
      ) : orders.length === 0 ? (
        <div className="bg-surface-bright rounded-lg p-8 text-center shadow-sm flex flex-col items-center justify-center min-h-[35vh] relative overflow-hidden border border-black/5">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#8c7335]/5 rounded-full blur-3xl pointer-events-none" />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-16 h-16 rounded-full bg-[#8c7335]/5 text-[#8c7335] flex items-center justify-center mb-5 relative"
          >
            <div
              className="absolute inset-0 rounded-full border border-[#8c7335]/20 animate-ping"
              style={{ animationDuration: '3s' }}
            />
            <Compass className="text-[24px] relative z-10" strokeWidth={1.5} />
          </motion.div>
          <h3 className="font-display font-medium text-[18px] lg:text-[20px] text-black mb-2">
            No Custom Orders Yet
          </h3>
          <p className="text-[11px] text-black/40 max-w-[280px] mb-6 leading-normal">
            Start by customizing a product or requesting a bespoke design.
          </p>
          <Link
            to="/collections"
            className="group flex items-center gap-2 text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a] pb-2 border-b-[1.5px] border-[#1a1a1a] transition-all hover:opacity-70"
          >
            Explore Collection
            <ArrowRight
              className="text-[16px] transition-transform group-hover:translate-x-1"
              strokeWidth={1.5}
            />
          </Link>
        </div>
      ) : (
        <AnimatePresence>
          {orders.map((order, i) => {
            const isSelected = selectedOrder?._id === order._id;
            return (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                onClick={() => {
                  customOrderService.getById(order._id).then((res) => {
                    if (res.success) {
                      setSelectedOrder(res.data);
                      setIsQuotationOpen(true);
                    }
                  });
                }}
                className={`bg-surface-bright border ${isSelected ? 'border-primary shadow-sm' : 'border-outline-variant/30 hover:border-outline-variant shadow-2xs hover:shadow-xs'} rounded-lg overflow-hidden transition-all text-left cursor-pointer group mb-4`}
              >
                {/* Card Header */}
                <div className="bg-surface-container-low px-4 py-3 flex items-center justify-between border-b border-outline-variant/15">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface">
                      {order.status}
                    </span>
                    <span className="text-[9px] text-secondary font-light">
                      on {formatDate(order.createdAt).split(',')[0]}
                    </span>
                  </div>
                  <StatusPill
                    color={
                      order.status === 'Delivered'
                        ? 'success'
                        : order.status === 'Cancelled'
                          ? 'error'
                          : 'neutral'
                    }
                  >
                    Custom Order
                  </StatusPill>
                </div>
                {/* Card Body */}
                <div className="p-4 flex gap-4 items-center hover:bg-surface-container/10 transition-colors">
                  <OptimizedImage
                    src={
                      order.productSnapshot?.imageSrc ||
                      order.files?.[0]?.url ||
                      'https://res.cloudinary.com/dwy422pzt/image/upload/v1727787498/Siri_Logo_c5a17k.jpg'
                    }
                    alt={order.productSnapshot?.title || order.occasion}
                    containerClassName="w-16 h-20 rounded-lg bg-surface-container border border-outline-variant/20 flex-shrink-0 shadow-3xs"
                    className="w-full h-full object-cover"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <span className="text-[9px] uppercase font-bold text-primary tracking-widest block font-label truncate">
                      {order.orderId}
                    </span>
                    <h4 className="font-display font-medium text-on-surface text-[12px] truncate">
                      {order.productSnapshot?.title || order.occasion || 'Bespoke Design'}
                    </h4>
                    <p className="text-secondary text-[10px] font-light font-body line-clamp-1">
                      {order.customRequirements || 'No specific requirements.'}
                    </p>
                  </div>
                  <svg
                    className={`w-4 h-4 transition-colors pr-1 shrink-0 ${isSelected ? 'text-primary' : 'text-secondary group-hover:text-primary'}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                {/* Action Required Banner */}
                {order.quotation?.status === 'sent' && order.status === 'Quote Sent' && (
                  <div className="px-4 py-2.5 bg-amber-50/50 border-t border-dashed border-[#8c7335]/10 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                    <div className="flex items-center gap-1.5 text-[#8c7335] font-medium">
                      <BellRing className="text-[14px]" strokeWidth={1.5} />
                      <span>Quote available for review</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );

  const renderDraftList = () => (
    <div className="space-y-4 text-[11px]">
      <div className="pb-4 mb-4 border-b border-outline-variant/20">
        <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
          <Mail className="text-[12px]" strokeWidth={1.5} />
          Saved Drafts
        </h2>
      </div>
      {draftsLoading ? (
        Array(2)
          .fill(0)
          .map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)
      ) : drafts.length === 0 ? (
        <div className="bg-surface-bright rounded-lg p-8 text-center shadow-sm flex flex-col items-center justify-center min-h-[35vh] relative overflow-hidden border border-black/5">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#8c7335]/5 rounded-full blur-3xl pointer-events-none" />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-16 h-16 rounded-full bg-[#8c7335]/5 text-[#8c7335] flex items-center justify-center mb-5 relative"
          >
            <div
              className="absolute inset-0 rounded-full border border-[#8c7335]/20 animate-ping"
              style={{ animationDuration: '3s' }}
            />
            <Mail className="text-[24px] relative z-10" strokeWidth={1.5} />
          </motion.div>
          <h3 className="font-display font-medium text-[18px] lg:text-[20px] text-black mb-2">
            No Saved Drafts
          </h3>
          <p className="text-[11px] text-black/40 max-w-[280px] mb-6 leading-normal">
            Your saved customization drafts will appear here.
          </p>
        </div>
      ) : (
        <AnimatePresence>
          {drafts.map((draft, i) => (
            <motion.div
              key={draft._id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className="bg-surface-bright border border-outline-variant/30 rounded-lg overflow-hidden shadow-2xs hover:border-outline-variant hover:shadow-xs transition-all text-left mb-4"
            >
              <div className="bg-surface-container-low px-4 py-3 flex items-center justify-between border-b border-outline-variant/15">
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                  Saved Draft
                </span>
                <span className="text-[9px] text-secondary font-light">
                  Last saved: {formatDate(draft.updatedAt).split(',')[0]}
                </span>
              </div>
              <div className="p-4 flex gap-4 items-center hover:bg-surface-container/10 transition-colors">
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="font-display font-medium text-on-surface text-[12px] truncate">
                    {draft.productSnapshot?.title || draft.occasion || 'Bespoke Design'}
                  </h4>
                  <p className="text-[10px] text-secondary font-light">
                    {draft.customRequirements || 'Draft in progress...'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => deleteDraftMutation.mutate(draft._id)}
                    className="w-8 h-8 rounded-full border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50 transition-colors shrink-0"
                    title="Delete Draft"
                  >
                    <Trash2 className="text-[14px]" strokeWidth={1.5} />
                  </button>
                  <Link
                    to={
                      draft.productId
                        ? `/custom-orders?product=${draft.productId}`
                        : '/custom-orders'
                    }
                    className="px-4 py-1.5 bg-black text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors shrink-0"
                  >
                    Resume
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );

  const renderOrderDetails = () => {
    if (!selectedOrder) return null;

    const { productSnapshot, customizationData, files, quotation, messages, statusHistory } =
      selectedOrder;

    // Timeline mapping
    const reversedHistory = statusHistory ? [...statusHistory].reverse() : [];
    const timeline = reversedHistory.map((s, idx) => {
      const isCurrentStatus = idx === reversedHistory.length - 1;
      return {
        title: s.to,
        description:
          s.note || (isCurrentStatus ? 'Currently active stage' : `Status updated to ${s.to}`),
        timestamp: new Date(s.changedAt),
        status:
          isCurrentStatus &&
          selectedOrder.status !== 'Delivered' &&
          selectedOrder.status !== 'Cancelled'
            ? 'current'
            : 'completed',
        icon: s.to === 'Delivered' ? 'inventory_2' : 'route',
      };
    });

    // Add pending if not delivered
    if (selectedOrder.status !== 'Delivered' && selectedOrder.status !== 'Cancelled') {
      timeline.push({
        title: 'Awaiting Next Stage',
        description: 'Further updates will appear here',
        status: 'future',
        icon: 'hourglass_empty',
      });
    }

    return (
      <div className="space-y-4 text-left font-body">
        {/* Mobile Back Button */}
        <button
          onClick={() => setSelectedOrder(null)}
          className="lg:hidden flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-secondary mb-2 hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="text-[14px]" strokeWidth={1.5} /> Back to List
        </button>

        {/* Product Summary Header */}
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
          <div className="pb-4 mb-4 border-b border-outline-variant/20 flex justify-between items-center">
            <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
              <PackageCheck className="text-[14px]" strokeWidth={1.5} />
              Order Overview
            </h2>
            <span className="text-[9px] text-secondary font-mono tracking-wider">
              ID: {selectedOrder.orderId}
            </span>
          </div>

          <div className="flex flex-row items-center gap-4">
            <div className="w-16 h-16 rounded overflow-hidden bg-surface-container border border-outline-variant/20 shrink-0 shadow-sm">
              <OptimizedImage
                src={
                  productSnapshot?.imageSrc ||
                  files?.[0]?.url ||
                  'https://res.cloudinary.com/dwy422pzt/image/upload/v1727787498/Siri_Logo_c5a17k.jpg'
                }
                alt={productSnapshot?.title || selectedOrder.occasion}
                containerClassName="w-full h-full"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-[12px] truncate text-on-surface">
                {productSnapshot?.title || selectedOrder.occasion || 'Bespoke Design'}
              </h3>
              <p className="text-[10px] text-secondary mt-1 tracking-wider line-clamp-1">
                {selectedOrder.customRequirements || 'No additional requirements'}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Timeline Tracker */}
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="pb-4 mb-2 border-b border-outline-variant/15">
            <h2 className="text-[9px] font-bold uppercase tracking-widest text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-primary">route</span>
              Journey Tracker
            </h2>
          </div>
          <div className="relative pt-3">
            <div className="space-y-0">
              {timeline.map((step, idx) => {
                const isLast = idx === timeline.length - 1;
                const isCompleted = step.status === 'completed';
                const isCurrent = step.status === 'current';

                const solidColors = {
                  Pending: 'bg-orange-500 border-orange-500 text-white',
                  Reviewing: 'bg-blue-500 border-blue-500 text-white',
                  'Quote Sent': 'bg-purple-500 border-purple-500 text-white',
                  Approved: 'bg-green-500 border-green-500 text-white',
                  'In Progress': 'bg-indigo-500 border-indigo-500 text-white',
                  'In Production': 'bg-pink-500 border-pink-500 text-white',
                  Ready: 'bg-teal-500 border-teal-500 text-white',
                  Delivered: 'bg-emerald-500 border-emerald-500 text-white',
                  Cancelled: 'bg-red-500 border-red-500 text-white',
                };

                const ringColors = {
                  Pending: 'shadow-[0_0_15px_rgba(249,115,22,0.4)] ring-4 ring-orange-500/20',
                  Reviewing: 'shadow-[0_0_15px_rgba(59,130,246,0.4)] ring-4 ring-blue-500/20',
                  'Quote Sent': 'shadow-[0_0_15px_rgba(168,85,247,0.4)] ring-4 ring-purple-500/20',
                  Approved: 'shadow-[0_0_15px_rgba(34,197,94,0.4)] ring-4 ring-green-500/20',
                  'In Progress': 'shadow-[0_0_15px_rgba(99,102,241,0.4)] ring-4 ring-indigo-500/20',
                  'In Production': 'shadow-[0_0_15px_rgba(236,72,153,0.4)] ring-4 ring-pink-500/20',
                  Ready: 'shadow-[0_0_15px_rgba(20,184,166,0.4)] ring-4 ring-teal-500/20',
                  Delivered: 'shadow-[0_0_15px_rgba(16,185,129,0.4)] ring-4 ring-emerald-500/20',
                  Cancelled: 'shadow-[0_0_15px_rgba(239,68,68,0.4)] ring-4 ring-red-500/20',
                };

                let colorClass = '';
                if (isCompleted || isCurrent) {
                  colorClass = solidColors[step.title] || 'bg-blue-500 border-blue-500 text-white';
                } else {
                  colorClass = 'bg-surface-container-low border-outline-variant text-secondary';
                }

                if (isCurrent) {
                  colorClass +=
                    ' ' +
                    (ringColors[step.title] ||
                      'shadow-[0_0_15px_rgba(59,130,246,0.4)] ring-4 ring-blue-500/20');
                }

                return (
                  <div key={idx} className="relative pl-8 pb-6 group">
                    {!isLast && (
                      <div
                        className={`absolute left-[11px] top-6 bottom-[-4px] w-[2px] transition-colors duration-500 ${isCompleted ? 'bg-emerald-500' : 'border-l-2 border-dashed border-outline-variant/40'}`}
                      />
                    )}
                    <div
                      className={`absolute left-0 top-1 w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-300 z-10 shrink-0 overflow-hidden ${colorClass}`}
                    >
                      {isCompleted ? (
                        <Check className="font-bold text-[14px]" strokeWidth={1.5} />
                      ) : (
                        <span className="material-symbols-outlined text-[14px]">{step.icon}</span>
                      )}
                    </div>
                    <div
                      className={`transition-all duration-300 ${step.status === 'future' ? 'opacity-50' : 'opacity-100'} pl-2`}
                    >
                      <strong className="text-[11px] block font-bold tracking-wide text-on-surface">
                        {step.title}
                      </strong>
                      <span className="text-[9px] text-secondary block mt-0.5 tracking-wider leading-relaxed">
                        {step.description}
                      </span>
                      {step.timestamp && (
                        <span className="block text-[8px] text-secondary/60 font-mono mt-1 uppercase tracking-wider">
                          {step.timestamp.toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Collapsible Quotation Details Panel */}
        {quotation && (
          <div
            className={`bg-surface-bright border rounded-lg overflow-hidden shadow-xs ${quotation.status === 'sent' && selectedOrder.status === 'Quote Sent' ? 'border-[#8c7335]/50 shadow-[0_0_15px_rgba(140,115,53,0.1)]' : 'border-outline-variant/40'}`}
          >
            <button
              onClick={() => setIsQuotationOpen(!isQuotationOpen)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface-container-low transition-colors font-bold text-[9px] uppercase tracking-widest text-on-surface border-b border-outline-variant/20 text-left cursor-pointer bg-transparent"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={`material-symbols-outlined text-[14px] ${quotation.status === 'sent' && selectedOrder.status === 'Quote Sent' ? 'text-[#8c7335]' : ''}`}
                >
                  request_quote
                </span>
                Quotation Breakdown
              </span>
              <ChevronDown
                className="text-[16px] text-secondary transition-transform duration-200"
                strokeWidth={1.5}
              />
            </button>
            <AnimatePresence initial={false}>
              {isQuotationOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden bg-surface-container-lowest"
                >
                  <div className="p-5 space-y-3 border-b border-outline-variant/20 text-[11px] text-on-surface">
                    {quotation.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between pb-2 border-b border-outline-variant/10 last:border-0"
                      >
                        <span className="text-secondary">{item.description}</span>
                        <span className="font-semibold">₹{item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {(quotation.tax > 0 || quotation.shipping > 0) && (
                      <div className="pt-2 border-t border-dashed border-outline-variant/30">
                        {quotation.tax > 0 && (
                          <div className="flex justify-between text-[11px] text-secondary mb-1">
                            <span>Tax</span>
                            <span>₹{quotation.tax.toLocaleString()}</span>
                          </div>
                        )}
                        {quotation.shipping > 0 && (
                          <div className="flex justify-between text-[11px] text-secondary">
                            <span>Shipping</span>
                            <span>₹{quotation.shipping.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="pt-3 border-t border-dashed border-outline-variant/30 flex justify-between font-bold text-sm text-primary">
                      <span>Total Estimate</span>
                      <span>₹{(quotation.total || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {quotation.status === 'sent' && selectedOrder.status === 'Quote Sent' && (
                    <div className="p-4 bg-amber-50/50 flex flex-col sm:flex-row justify-end items-center gap-3 border-t border-amber-200/50">
                      <button
                        onClick={async () => {
                          if (
                            await confirm({
                              title: 'Request Changes',
                              message: 'Are you sure you want to request changes?',
                              type: 'warning',
                            })
                          ) {
                            respondQuoteMutation.mutate({
                              id: selectedOrder._id,
                              status: 'rejected',
                            });
                          }
                        }}
                        disabled={respondQuoteMutation.isPending}
                        className="w-full sm:w-auto px-6 py-2.5 bg-surface text-secondary hover:text-red-600 font-bold uppercase tracking-widest text-[9px] rounded-lg border border-outline-variant/30 shadow-sm transition-all"
                      >
                        Request Changes
                      </button>
                      <button
                        onClick={async () => {
                          if (
                            await confirm({
                              title: 'Approve Quote',
                              message:
                                'Are you sure you want to approve this quote? This action cannot be undone.',
                              type: 'info',
                            })
                          ) {
                            respondQuoteMutation.mutate({
                              id: selectedOrder._id,
                              status: 'approved',
                            });
                          }
                        }}
                        disabled={respondQuoteMutation.isPending}
                        className="w-full sm:w-auto px-6 py-2.5 bg-black hover:bg-gray-900 text-white font-bold uppercase tracking-widest text-[9px] rounded-lg shadow-sm transition-all"
                      >
                        Approve Quote
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Specifications & Files Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
            <div className="pb-4 mb-4 border-b border-outline-variant/20">
              <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                <SlidersHorizontal className="text-[14px]" strokeWidth={1.5} />
                Specifications
              </h2>
            </div>
            {customizationData && customizationData.length > 0 ? (
              <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                {customizationData.map((field, i) => (
                  <div key={i}>
                    <span className="text-[8px] font-bold text-secondary uppercase block mb-1 tracking-widest">
                      {field.fieldName}
                    </span>
                    {field.fieldType === 'color' ? (
                      <div className="flex gap-1.5">
                        {field.value.map((c, ci) => (
                          <div
                            key={ci}
                            className="w-5 h-5 rounded-full border border-outline-variant/40 shadow-sm"
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] font-medium text-on-surface">{field.value}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[9px] text-secondary italic tracking-wider">
                No specific attributes provided.
              </div>
            )}
          </div>
          <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
            <div className="pb-4 mb-4 border-b border-outline-variant/20">
              <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                <Paperclip className="text-[14px]" strokeWidth={1.5} />
                Reference Files
              </h2>
            </div>
            {files && files.length > 0 ? (
              <div className="space-y-2">
                {files.map((file, i) => (
                  <a
                    key={i}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-outline-variant/20 bg-surface-container-lowest hover:bg-surface-container-low transition-colors text-[10px] text-on-surface"
                  >
                    <FileText className="text-[14px] text-secondary" strokeWidth={1.5} />
                    <span className="truncate flex-1 font-medium">
                      {file.originalName || `Document ${i + 1}`}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-[9px] text-secondary italic tracking-wider">
                No reference files attached.
              </div>
            )}
          </div>
        </div>

        {/* Messages / Chat Box */}
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg overflow-hidden shadow-xs flex flex-col h-[400px]">
          <div className="px-5 py-4 border-b border-outline-variant/20 bg-surface-container-low flex justify-between items-center shrink-0">
            <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
              <MessageSquare className="text-[14px]" strokeWidth={1.5} />
              Artisan Messages
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-surface-container-lowest">
            {messages?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-secondary/50">
                <MessageCircle className="text-[32px] mb-2" strokeWidth={1.5} />
                <p className="text-[10px] uppercase tracking-widest font-bold">No messages yet</p>
              </div>
            ) : (
              messages?.map((msg, i) => {
                const isCustomer = msg.sender === 'customer';
                return (
                  <div key={i} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] p-3.5 rounded-xl ${isCustomer ? 'bg-[#1a1a1a] text-white rounded-tr-sm' : 'bg-surface text-on-surface border border-outline-variant/30 rounded-tl-sm shadow-sm'}`}
                    >
                      <div className="flex justify-between items-baseline gap-4 mb-1 border-b border-current/10 pb-1">
                        <span
                          className={`text-[8px] font-semibold tracking-wide ${isCustomer ? 'text-white/80' : 'text-[#1a1a1a]'}`}
                        >
                          {isCustomer ? 'You' : msg.senderName}
                        </span>
                        <span
                          className={`text-[7px] font-mono tracking-wider ${isCustomer ? 'text-white/50' : 'text-secondary/60'}`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p
                        className={`text-[12px] whitespace-pre-wrap leading-snug font-body ${isCustomer ? 'text-white font-light' : 'text-on-surface font-light'}`}
                      >
                        {msg.text}
                      </p>
                      {msg.attachments?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {msg.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={att}
                              target="_blank"
                              rel="noreferrer"
                              className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${isCustomer ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/20'}`}
                            >
                              <Paperclip className="text-[12px]" strokeWidth={1.5} /> View File
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-surface-container-lowest border-t border-outline-variant/20 shrink-0">
            {chatFiles.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {chatFiles.map((f, i) => (
                  <span
                    key={i}
                    className="text-[9px] bg-surface-container-high px-2 py-1 rounded flex items-center gap-1 font-medium text-on-surface border border-outline-variant/20"
                  >
                    <Paperclip className="text-[12px] text-secondary" strokeWidth={1.5} />
                    <span className="truncate max-w-[150px]">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setChatFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-red-500 hover:text-red-700 ml-1"
                    >
                      <X className="text-[12px]" strokeWidth={1.5} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <form
              onSubmit={handleSendMessage}
              className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/40 rounded-xl p-1.5 shadow-sm focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary/20 transition-all"
            >
              <input
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.pdf"
                className="hidden"
                id="chat-file-upload"
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  if (files.length > 0) setChatFiles((prev) => [...prev, ...files]);
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById('chat-file-upload').click()}
                className="w-8 h-8 shrink-0 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-center"
                title="Attach Files"
              >
                <PlusCircle className="text-[18px]" strokeWidth={1.5} />
              </button>
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 min-w-0 bg-transparent px-2 text-[12px] font-light text-on-surface focus:outline-none placeholder:text-secondary/50"
              />
              <button
                type="submit"
                disabled={
                  sendMessageMutation.isPending || (!chatMessage.trim() && chatFiles.length === 0)
                }
                className="w-8 h-8 shrink-0 rounded-lg bg-[#1a1a1a] text-white flex items-center justify-center hover:bg-black transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendMessageMutation.isPending ? (
                  <RefreshCw className="text-[14px] animate-spin" strokeWidth={1.5} />
                ) : (
                  <Send className="text-[14px] pl-0.5" strokeWidth={1.5} />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      id="panel-custom-orders"
      role="tabpanel"
      key="tab-custom-orders"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 text-left font-body"
    >
      {/* Dashboard Section Header */}
      <div
        className={`pb-4 mb-4 border-b border-outline-variant/20 ${selectedOrder ? 'hidden lg:block' : 'block'}`}
      >
        <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
          <Compass className="text-[12px]" strokeWidth={1.5} />
          My Custom Orders
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: List */}
        <div className={`lg:col-span-5 space-y-6 ${selectedOrder ? 'hidden lg:block' : 'block'}`}>
          {/* Tabs */}
          <div className="flex w-full bg-surface-container-low p-1 rounded-lg border border-outline-variant/20 shadow-2xs mb-4">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 py-2 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-surface shadow-sm text-primary border border-outline-variant/30' : 'text-secondary hover:text-on-surface'}`}
            >
              Active Orders
            </button>
            <button
              onClick={() => setActiveTab('drafts')}
              className={`flex-1 py-2 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all ${activeTab === 'drafts' ? 'bg-surface shadow-sm text-primary border border-outline-variant/30' : 'text-secondary hover:text-on-surface'}`}
            >
              Drafts {drafts.length > 0 && `(${drafts.length})`}
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'orders' ? renderOrderList() : renderDraftList()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Column: Details */}
        <div className={`lg:col-span-7 ${!selectedOrder ? 'hidden lg:block' : 'block'}`}>
          {selectedOrder ? (
            renderOrderDetails()
          ) : (
            <div className="h-[calc(100vh-250px)] rounded-xl border border-dashed border-outline-variant flex flex-col items-center justify-center text-center p-8 bg-surface-container-lowest">
              <span className="material-symbols-outlined text-[48px] text-secondary/30 mb-4">
                touch_app
              </span>
              <h3 className="text-[16px] font-display font-medium text-on-surface">
                Select an Order
              </h3>
              <p className="text-[11px] text-secondary mt-2 max-w-sm">
                Click on any order from the list to view its journey timeline, specifications, and
                message history.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
