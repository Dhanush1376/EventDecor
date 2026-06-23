import { Link } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/seo/SEO';
import { Skeleton } from '../components/ui/Skeleton';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useUserSocket } from '../context/UserSocketProvider';
import { customOrderService, uploadService } from '../services/domainServices';
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
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'drafts'
  const [chatMessage, setChatMessage] = useState('');
  const [chatFiles, setChatFiles] = useState([]);
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
    <div className="space-y-4">
      {ordersLoading ? (
        Array(3)
          .fill(0)
          .map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-black/5 shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-black/10 mb-3">
            inventory_2
          </span>
          <h3 className="text-[16px] font-bold">No Custom Orders Yet</h3>
          <p className="text-[12px] text-black/40 mt-1 mb-4">
            Start by customizing a product or requesting a bespoke design.
          </p>
          <Link to="/collections" className="btn-primary">
            Browse Collections
          </Link>
        </div>
      ) : (
        orders.map((order, i) => (
          <motion.div
            key={order._id}
            variants={slideIn}
            initial="hidden"
            animate="show"
            transition={{ delay: i * 0.05 }}
            onClick={() => {
              customOrderService.getById(order._id).then((res) => {
                if (res.success) setSelectedOrder(res.data);
              });
            }}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${selectedOrder?._id === order._id ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/5 shadow-md' : 'border-black/5 bg-white hover:border-black/20 hover:shadow-sm'}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-black/40 block mb-0.5">
                  {order.orderId}
                </span>
                <h4 className="text-[15px] font-bold text-black">
                  {order.productSnapshot?.title || order.occasion}
                </h4>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}
              >
                {order.status}
              </span>
            </div>
            <p className="text-[12px] text-black/50 line-clamp-2 mb-3">
              {order.customRequirements || 'No requirements specified.'}
            </p>
            <div className="flex justify-between items-end border-t border-black/5 pt-3">
              <span className="text-[10px] font-bold text-black/30 uppercase tracking-wider">
                {formatDate(order.createdAt)}
              </span>
              {order.quotation?.status === 'sent' && order.status === 'Quote Sent' && (
                <span className="text-[10px] font-bold text-[var(--color-gold)] uppercase flex items-center gap-1 animate-pulse">
                  <span className="material-symbols-outlined text-[14px]">
                    notifications_active
                  </span>{' '}
                  Action Required
                </span>
              )}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );

  const renderDraftList = () => (
    <div className="space-y-4">
      {draftsLoading ? (
        Array(2)
          .fill(0)
          .map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
      ) : drafts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-black/5 shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-black/10 mb-3">drafts</span>
          <h3 className="text-[16px] font-bold">No Saved Drafts</h3>
          <p className="text-[12px] text-black/40 mt-1">
            Your saved customization drafts will appear here.
          </p>
        </div>
      ) : (
        drafts.map((draft, i) => (
          <motion.div
            key={draft._id}
            variants={slideIn}
            initial="hidden"
            animate="show"
            transition={{ delay: i * 0.05 }}
            className="p-5 rounded-2xl border border-black/5 bg-white shadow-sm flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-black/40 block mb-0.5">
                Saved Draft
              </span>
              <h4 className="text-[15px] font-bold text-black">
                {draft.productSnapshot?.title || draft.occasion}
              </h4>
              <span className="text-[10px] font-bold text-black/30 uppercase tracking-wider block mt-1">
                Last saved: {formatDate(draft.updatedAt)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => deleteDraftMutation.mutate(draft._id)}
                className="w-10 h-10 rounded-full border border-red-100 text-red-500 flex items-center justify-center hover:bg-red-50 transition-colors"
                title="Delete Draft"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
              <Link
                to={
                  draft.productId ? `/custom-orders?product=${draft.productId}` : '/custom-orders'
                }
                className="px-4 py-2 rounded-full bg-black text-white text-[11px] font-bold uppercase tracking-wider hover:bg-black/80 transition-colors"
              >
                Resume
              </Link>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );

  const renderOrderDetails = () => {
    if (!selectedOrder) return null;

    const { productSnapshot, customizationData, files, quotation, messages, statusHistory } =
      selectedOrder;

    return (
      <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-160px)] lg:sticky lg:top-24">
        {/* Header */}
        <div className="p-5 border-b border-black/5 flex justify-between items-center bg-[var(--color-surface-ivory)] shrink-0">
          <div>
            <button
              onClick={() => setSelectedOrder(null)}
              className="lg:hidden flex items-center gap-1 text-[10px] font-bold uppercase text-black/40 mb-2"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_back</span> Back
            </button>
            <h2 className="text-[20px] font-body font-semibold">Order: {selectedOrder.orderId}</h2>
            <p className="text-[11px] text-black/50 font-bold uppercase tracking-wider">
              {productSnapshot?.title || selectedOrder.occasion}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[selectedOrder.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}
          >
            {selectedOrder.status}
          </span>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Quote Section (If Sent) */}
          {quotation?.status === 'sent' && selectedOrder.status === 'Quote Sent' && (
            <div className="bg-[#fcf8f0] border border-[var(--color-gold)]/30 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-bold uppercase tracking-widest text-[var(--color-gold)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">request_quote</span>
                  Quotation Available
                </h3>
                <span className="text-[18px] font-mono font-bold">
                  ₹{quotation.total.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[12px] text-black/60 mb-4">
                The design team has reviewed your requirements and prepared an estimate. Please
                review and approve to proceed to production.
              </p>

              <div className="space-y-2 mb-5">
                {quotation.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-[12px] pb-2 border-b border-black/5 last:border-0"
                  >
                    <span>{item.description}</span>
                    <span className="font-mono font-bold">₹{item.amount.toLocaleString()}</span>
                  </div>
                ))}
                {(quotation.tax > 0 || quotation.shipping > 0) && (
                  <div className="pt-2 border-t border-black/10">
                    {quotation.tax > 0 && (
                      <div className="flex justify-between text-[11px] text-black/50 mb-1">
                        <span>Tax</span>
                        <span className="font-mono">₹{quotation.tax.toLocaleString()}</span>
                      </div>
                    )}
                    {quotation.shipping > 0 && (
                      <div className="flex justify-between text-[11px] text-black/50">
                        <span>Shipping</span>
                        <span className="font-mono">₹{quotation.shipping.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to request changes?')) {
                      respondQuoteMutation.mutate({ id: selectedOrder._id, status: 'rejected' });
                    }
                  }}
                  disabled={respondQuoteMutation.isPending}
                  className="flex-1 py-2.5 rounded-full border border-red-200 text-red-600 text-[10px] font-bold uppercase tracking-wider hover:bg-red-50 transition-colors"
                >
                  Request Changes
                </button>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        'Are you sure you want to approve this quote? This action cannot be undone.',
                      )
                    ) {
                      respondQuoteMutation.mutate({ id: selectedOrder._id, status: 'approved' });
                    }
                  }}
                  disabled={respondQuoteMutation.isPending}
                  className="flex-1 py-2.5 rounded-full bg-green-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-green-700 transition-colors shadow-md"
                >
                  Approve Quote
                </button>
              </div>
            </div>
          )}

          {/* Details Tabs equivalent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Col: Specs & Requirements */}
            <div className="space-y-5">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30 mb-3 border-b border-black/5 pb-2">
                  Custom Requirements
                </h4>
                <p className="text-[12px] text-black/70 whitespace-pre-wrap leading-relaxed">
                  {selectedOrder.customRequirements || 'None provided.'}
                </p>
              </div>

              {customizationData && customizationData.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30 mb-3 border-b border-black/5 pb-2">
                    Specifications
                  </h4>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                    {customizationData.map((field, i) => (
                      <div key={i}>
                        <span className="text-[9px] font-bold text-black/40 uppercase block mb-0.5">
                          {field.fieldName}
                        </span>
                        {field.fieldType === 'color' ? (
                          <div className="flex gap-1">
                            {field.value.map((c, ci) => (
                              <div
                                key={ci}
                                className="w-4 h-4 rounded-full border border-black/10"
                                style={{ background: c }}
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-[12px] font-medium text-black">{field.value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {files && files.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30 mb-3 border-b border-black/5 pb-2">
                    Files & Attachments
                  </h4>
                  <div className="space-y-2">
                    {files.map((file, i) => (
                      <a
                        key={i}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg border border-black/5 hover:bg-black/5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px] text-black/40">
                          attach_file
                        </span>
                        <span className="text-[11px] truncate flex-1">
                          {file.originalName || `File ${i + 1}`}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Timeline */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30 mb-3 border-b border-black/5 pb-2">
                Order Timeline
              </h4>
              <div className="space-y-4">
                {statusHistory
                  ?.map((hist, i) => (
                    <div key={i} className="flex gap-3 relative">
                      {i !== statusHistory.length - 1 && (
                        <div className="absolute left-[9px] top-6 bottom-[-16px] w-[2px] bg-black/5" />
                      )}
                      <div className="w-5 h-5 rounded-full bg-[var(--color-surface-ivory)] border-2 border-[var(--color-gold)] shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-[12px] font-bold text-black">{hist.to}</h5>
                        <span className="text-[10px] text-black/40 block mb-1">
                          {formatDate(hist.changedAt)}
                        </span>
                        {hist.note && (
                          <p className="text-[11px] text-black/60 italic">{hist.note}</p>
                        )}
                      </div>
                    </div>
                  ))
                  .reverse()}
              </div>
            </div>
          </div>

          <div className="border-t border-black/5 my-4" />

          {/* Chat / Messages Section */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">forum</span> Messages
            </h4>
            <div className="bg-[var(--color-surface-ivory)] rounded-2xl p-4 h-[300px] flex flex-col border border-black/5">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {messages?.map((msg, i) => {
                  const isCustomer = msg.sender === 'customer';
                  return (
                    <div key={i} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl ${isCustomer ? 'bg-[var(--color-gold)] text-white rounded-tr-sm' : 'bg-white text-black border border-black/5 rounded-tl-sm shadow-sm'}`}
                      >
                        <div className="flex justify-between items-end gap-4 mb-1">
                          <span
                            className={`text-[10px] font-bold ${isCustomer ? 'text-white/80' : 'text-black/50'}`}
                          >
                            {msg.senderName}
                          </span>
                          <span
                            className={`text-[8px] ${isCustomer ? 'text-white/60' : 'text-black/30'}`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[12px] whitespace-pre-wrap leading-relaxed">
                          {msg.text}
                        </p>
                        {msg.attachments?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {msg.attachments.map((att, idx) => (
                              <a
                                key={idx}
                                href={att}
                                target="_blank"
                                rel="noreferrer"
                                className={`text-[10px] underline flex items-center gap-1 ${isCustomer ? 'text-white' : 'text-[var(--color-gold)]'}`}
                              >
                                <span className="material-symbols-outlined text-[12px]">
                                  attachment
                                </span>{' '}
                                View
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="mt-4 flex flex-col gap-2">
                {chatFiles.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-1">
                    {chatFiles.map((f, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-black/5 px-2 py-1 rounded flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[12px]">attachment</span>
                        {f.name}
                        <button
                          type="button"
                          onClick={() => setChatFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-red-500 hover:text-red-700 ml-1 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="file"
                    multiple
                    accept=".png,.jpg,.jpeg,.pdf"
                    className="hidden"
                    id="chat-file-upload"
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      if (files.length > 0) {
                        setChatFiles((prev) => [...prev, ...files]);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('chat-file-upload').click()}
                    className="w-10 h-10 shrink-0 rounded-full text-black/50 hover:text-[var(--color-gold)] bg-white border border-black/10 flex items-center justify-center transition-colors shadow-sm"
                    title="Attach Files"
                  >
                    <span className="material-symbols-outlined text-[18px]">attach_file</span>
                  </button>
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 min-w-0 bg-white border border-black/10 rounded-full px-4 py-2 text-[13px] outline-none focus:border-[var(--color-gold)] transition-colors shadow-sm"
                  />
                  <button
                    type="submit"
                    disabled={
                      sendMessageMutation.isPending ||
                      (!chatMessage.trim() && chatFiles.length === 0)
                    }
                    className="w-10 h-10 shrink-0 rounded-full bg-black text-white flex items-center justify-center hover:bg-black/80 transition-colors shadow-md disabled:opacity-50"
                  >
                    {sendMessageMutation.isPending ? (
                      <span className="material-symbols-outlined text-[16px] animate-spin">
                        sync
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">send</span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface-ivory)] pt-24 pb-20">
      <SEO title="My Custom Orders | Siri Arts & Crafts" />

      <div className="max-w-[1440px] mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="mb-8 border-b border-black/5 pb-6">
          <h1 className="text-[28px] md:text-[36px] font-display font-light text-black">
            My Custom Orders
          </h1>
          <p className="text-[13px] text-black/50 mt-2">
            Track your bespoke designs, respond to quotes, and message our artisans.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: List */}
          <div className={`lg:col-span-4 space-y-6 ${selectedOrder ? 'hidden lg:block' : 'block'}`}>
            {/* Tabs */}
            <div className="flex bg-black/5 p-1 rounded-full w-fit">
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'orders' ? 'bg-white shadow-sm text-black' : 'text-black/40 hover:text-black/60'}`}
              >
                Active Orders
              </button>
              <button
                onClick={() => setActiveTab('drafts')}
                className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'drafts' ? 'bg-white shadow-sm text-black' : 'text-black/40 hover:text-black/60'}`}
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
          <div className={`lg:col-span-8 ${!selectedOrder ? 'hidden lg:block' : 'block'}`}>
            {selectedOrder ? (
              renderOrderDetails()
            ) : (
              <div className="h-[calc(100vh-250px)] rounded-3xl border-2 border-dashed border-black/5 flex flex-col items-center justify-center text-center p-8">
                <span className="material-symbols-outlined text-[64px] text-black/10 mb-4">
                  touch_app
                </span>
                <h3 className="text-[18px] font-display font-light">Select an Order</h3>
                <p className="text-[13px] text-black/40 mt-2 max-w-sm">
                  Click on any order from the list to view its timeline, details, and message
                  history.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
