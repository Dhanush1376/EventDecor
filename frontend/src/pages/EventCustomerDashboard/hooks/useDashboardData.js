import { useState, useEffect, useRef, useCallback } from 'react';
import { bookingService } from '../../../services/domainServices';
import toast from 'react-hot-toast';
import logger from '../../../utils/core/logger';
import { loadRazorpayScript } from '../../../pages/eventDetail/useEventBookingForm';

export function useDashboardData(isEmbedded = false) {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chat State
  const [chatMessage, setChatMessage] = useState('');
  const chatEndRef = useRef(null);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('Milestone Deposit');

  // Expandable timeline state
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  // Mobile chat bottom-sheet state
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingService.getMyBookings();
      if (res.success) {
        const list = res.data || [];
        setBookings(list);
        if (list.length > 0 && !isEmbedded) {
          setSelectedBooking(list[0]);
        }
      }
    } catch (err) {
      logger.error(err);
      toast.error('Failed to sync event bookings catalog.');
    } finally {
      setLoading(false);
    }
  }, [isEmbedded]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBookings();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchBookings]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedBooking?.chatHistory]);

  const handleApproveQuote = async (approved) => {
    if (!selectedBooking) return;
    const loadId = toast.loading('Recording your quotation response...');
    try {
      const res = await bookingService.respondQuote(
        selectedBooking._id || selectedBooking.id,
        approved,
      );
      toast.dismiss(loadId);
      if (res.success) {
        toast.success(approved ? 'Estimate approved successfully!' : 'Quote marked for revision.');
        const updated = await bookingService.getById(selectedBooking._id || selectedBooking.id);
        if (updated.success) {
          setSelectedBooking(updated.data);
          setBookings((prev) => prev.map((b) => (b._id === updated.data._id ? updated.data : b)));
        }
      }
    } catch (err) {
      toast.dismiss(loadId);
      logger.error(err);
      toast.error('Error submitting response.');
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedBooking) return;

    try {
      const res = await bookingService.postChat(
        selectedBooking._id || selectedBooking.id,
        chatMessage,
      );
      if (res.success) {
        setChatMessage('');
        const updated = await bookingService.getById(selectedBooking._id || selectedBooking.id);
        if (updated.success) {
          setSelectedBooking(updated.data);
          setBookings((prev) => prev.map((b) => (b._id === updated.data._id ? updated.data : b)));
        }
      }
    } catch (err) {
      logger.error(err);
      toast.error('Failed to post message.');
    }
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0 || !selectedBooking) {
      toast.error('Please specify a valid transaction amount.');
      return;
    }

    const loadId = toast.loading('Initializing secure payment...');
    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        toast.dismiss(loadId);
        toast.error('Razorpay SDK failed to load. Please check your internet connection.');
        return;
      }

      // Initialize checkout on backend
      const initRes = await bookingService.initializeMilestonePayment(
        selectedBooking._id || selectedBooking.id,
        amt,
      );

      if (!initRes.success || !initRes.data) {
        toast.dismiss(loadId);
        toast.error(initRes.message || 'Failed to initialize checkout.');
        return;
      }

      const { razorpayOrderId, amount, currency, key } = initRes.data;
      toast.dismiss(loadId);

      const options = {
        key,
        amount: amount * 100,
        currency,
        name: 'Siri Arts & Crafts',
        description: `Milestone Payment for Booking ${selectedBooking.bookingId || ''}`,
        order_id: razorpayOrderId,
        handler: async function (response) {
          const verifyLoadId = toast.loading('Verifying your payment securely...');
          try {
            // Use the standard submitPayment endpoint which acts as our verification handler here
            const verifyRes = await bookingService.submitPayment(
              selectedBooking._id || selectedBooking.id,
              {
                amount: amt,
                transactionId: response.razorpay_payment_id,
                note: paymentNote,
              },
            );

            toast.dismiss(verifyLoadId);
            if (verifyRes.success) {
              toast.success(
                `Milestone payment of ₹${amt.toLocaleString('en-IN')} lodged successfully!`,
              );
              setIsPaymentModalOpen(false);
              setPaymentAmount('');

              // Refresh booking data
              const updated = await bookingService.getById(
                selectedBooking._id || selectedBooking.id,
              );
              if (updated.success) {
                setSelectedBooking(updated.data);
                setBookings((prev) =>
                  prev.map((b) => (b._id === updated.data._id ? updated.data : b)),
                );
              }
            } else {
              toast.error(verifyRes.message || 'Payment verification failed.');
            }
          } catch (err) {
            toast.dismiss(verifyLoadId);
            logger.error('Verification Error:', err);
            toast.error('An error occurred during verification. Contact support.');
          }
        },
        prefill: {
          name: selectedBooking.user?.name || 'Customer',
          email: selectedBooking.user?.email || '',
        },
        theme: { color: 'var(--color-gold-dark)' },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function (response) {
        toast.error(`Payment Failed: ${response.error.description}`);
      });
      paymentObject.open();
    } catch (err) {
      toast.dismiss(loadId);
      logger.error(err);
      toast.error('Transaction initialization error. Please try again.');
    }
  };

  const handleSelectBooking = async (b) => {
    setLoading(true);
    try {
      const res = await bookingService.getById(b._id || b.id);
      if (res.success) {
        setSelectedBooking({
          ...res.data,
          eventPackage: res.data.eventPackage || b.eventPackage,
          inspirationImages: res.data.inspirationImages?.length
            ? res.data.inspirationImages
            : b.inspirationImages,
        });
      }
    } catch (err) {
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getPhaseIndex = (status) => {
    switch (status) {
      case 'inquiry':
        return 0;
      case 'booking':
      case 'draft':
      case 'quotation_sent':
      case 'pending_payment':
      case 'advance_payment':
      case 'payment_processing':
        return 1;
      case 'confirmed':
      case 'material_planning':
      case 'production':
      case 'packing':
      case 'dispatch':
        return 2;
      case 'team_assigned':
      case 'setup_in_progress':
      case 'execution':
        return 3;
      case 'final_settlement':
      case 'completed':
        return 4;
      default:
        return 0;
    }
  };

  const currentStatusIndex = selectedBooking ? getPhaseIndex(selectedBooking.status) : 0;

  return {
    bookings,
    selectedBooking,
    loading,
    chatMessage,
    setChatMessage,
    chatEndRef,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    paymentAmount,
    setPaymentAmount,
    paymentNote,
    setPaymentNote,
    isTimelineExpanded,
    setIsTimelineExpanded,
    isMobileChatOpen,
    setIsMobileChatOpen,
    handleApproveQuote,
    handleSendChat,
    handleProcessPayment,
    handleSelectBooking,
    currentStatusIndex,
    setSelectedBooking,
  };
}
