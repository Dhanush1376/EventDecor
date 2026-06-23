import { useState, useEffect, useRef } from 'react';
import { bookingService } from '../../../services/domainServices';
import toast from 'react-hot-toast';
import logger from '../../../utils/core/logger';
import { STATUS_STEPS } from '../constants';

export function useDashboardData() {
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

  async function fetchBookings() {
    setLoading(true);
    try {
      const res = await bookingService.getMyBookings();
      if (res.success) {
        const list = res.data || [];
        setBookings(list);
        if (list.length > 0) {
          setSelectedBooking(list[0]);
        }
      }
    } catch (err) {
      logger.error(err);
      toast.error('Failed to sync event bookings catalog.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBookings();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

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

    const loadId = toast.loading('Processing milestone transaction...');
    try {
      const res = await bookingService.submitPayment(selectedBooking._id || selectedBooking.id, {
        amount: amt,
        transactionId: `UPI-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        note: paymentNote,
      });
      toast.dismiss(loadId);
      if (res.success) {
        toast.success(`Milestone payment of ₹${amt.toLocaleString('en-IN')} lodged successfully!`);
        setIsPaymentModalOpen(false);
        setPaymentAmount('');
        const updated = await bookingService.getById(selectedBooking._id || selectedBooking.id);
        if (updated.success) {
          setSelectedBooking(updated.data);
          setBookings((prev) => prev.map((b) => (b._id === updated.data._id ? updated.data : b)));
        }
      }
    } catch (err) {
      toast.dismiss(loadId);
      logger.error(err);
      toast.error('Transaction error. Please try again.');
    }
  };

  const handleSelectBooking = async (b) => {
    setLoading(true);
    try {
      const res = await bookingService.getById(b._id || b.id);
      if (res.success) {
        setSelectedBooking(res.data);
      }
    } catch (err) {
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentStatusIndex = selectedBooking
    ? STATUS_STEPS.findIndex((s) => s.id === selectedBooking.status)
    : 0;

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
  };
}
