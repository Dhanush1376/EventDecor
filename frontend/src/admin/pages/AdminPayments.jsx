import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAdmin } from '../context/AdminContext';
import { bookingService, customOrderService } from '../../services/domainServices';
import rentalService from '../../services/api/rentalService';
import { returnService } from '../../services/api/returnService';
import logger from '../../utils/core/logger';
import {
  PageHeader,
  ChartTooltip,
  AdminPaymentsSkeleton,
  formatCurrency,
  fadeUp,
  stagger,
  AdminFilterDrawer,
} from '../components/AdminUIKit';
import { isWithinPeriod } from '../utils/dateFilters';

export function AdminPayments() {
  const navigate = useNavigate();
  const { orders = [], dataLoading: ordersLoading, refreshOrders } = useAdmin();

  // Multi-stream data states
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  const [rentals, setRentals] = useState([]);
  const [rentalsLoading, setRentalsLoading] = useState(true);

  const [customOrders, setCustomOrders] = useState([]);
  const [customOrdersLoading, setCustomOrdersLoading] = useState(true);

  const [returns, setReturns] = useState([]);
  const [returnsLoading, setReturnsLoading] = useState(true);

  const [exchanges, setExchanges] = useState([]);
  const [exchangesLoading, setExchangesLoading] = useState(true);

  // Filters & Controls
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [statusFilter, setStatusFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Newest first');
  const [searchQuery, setSearchQuery] = useState('');
  const [showChart, setShowChart] = useState(true);
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);

  // 1. Fetch Event Bookings
  const fetchBookings = useCallback(async () => {
    try {
      setBookingsLoading(true);
      const res = await bookingService.adminGetAll({ limit: 999999 });
      if (res?.success) {
        const payload = res.data;
        const list = Array.isArray(payload)
          ? payload
          : payload?.data || payload?.items || payload?.bookings || [];
        setBookings(list);
      }
    } catch (err) {
      logger.error('Failed to load event bookings in payments:', err);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  // 2. Fetch Rentals
  const fetchRentals = useCallback(async () => {
    try {
      setRentalsLoading(true);
      const res = await rentalService.adminGetAll();
      if (res?.success) {
        const payload = res.data ?? [];
        const list = Array.isArray(payload) ? payload : payload.rentals || payload.data || [];
        setRentals(list);
      }
    } catch (err) {
      logger.error('Failed to load rentals in payments:', err);
    } finally {
      setRentalsLoading(false);
    }
  }, []);

  // 3. Fetch Custom Orders
  const fetchCustomOrders = useCallback(async () => {
    try {
      setCustomOrdersLoading(true);
      const res = await customOrderService.adminGetAll({ limit: 999999, archived: 'false' });
      const payload = res?.data ?? res ?? [];
      const list = Array.isArray(payload)
        ? payload
        : payload.items || payload.orders || payload.data || [];
      setCustomOrders(list);
    } catch (err) {
      logger.error('Failed to load custom orders in payments:', err);
    } finally {
      setCustomOrdersLoading(false);
    }
  }, []);

  // 4. Fetch Returns
  const fetchReturns = useCallback(async () => {
    try {
      setReturnsLoading(true);
      const res = await returnService.getAllReturns({ page: 1, limit: 999999 });
      const payload = res?.data?.data || res?.data || res;
      const list = Array.isArray(payload)
        ? payload
        : payload.returns || payload.items || payload.data || [];
      setReturns(list);
    } catch (err) {
      logger.error('Failed to load returns in payments:', err);
    } finally {
      setReturnsLoading(false);
    }
  }, []);

  // 5. Fetch Exchanges
  const fetchExchanges = useCallback(async () => {
    try {
      setExchangesLoading(true);
      const res = await returnService.getAllExchanges({ page: 1, limit: 999999 });
      const payload = res?.data?.data || res?.data || res;
      const list = Array.isArray(payload)
        ? payload
        : payload.exchanges || payload.items || payload.data || [];
      setExchanges(list);
    } catch (err) {
      logger.error('Failed to load exchanges in payments:', err);
    } finally {
      setExchangesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchRentals();
    fetchCustomOrders();
    fetchReturns();
    fetchExchanges();
  }, [fetchBookings, fetchRentals, fetchCustomOrders, fetchReturns, fetchExchanges]);

  // Auto-refresh all sources every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshOrders();
      fetchBookings();
      fetchRentals();
      fetchCustomOrders();
      fetchReturns();
      fetchExchanges();
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshOrders, fetchBookings, fetchRentals, fetchCustomOrders, fetchReturns, fetchExchanges]);

  const initialLoading = ordersLoading && bookingsLoading && rentalsLoading && customOrdersLoading;

  // ─── AGGREGATE ALL STREAMS INTO UNIFIED TRANSACTIONS & METRICS ───
  const metrics = useMemo(() => {
    let totalCollected = 0;
    let thisMonth = 0;
    let pending = 0; // Customer owes store
    let refunded = 0; // Money cut / settled refunds
    let pendingRefunds = 0; // Admin owes customer

    const monthlyMap = {};
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const currentMonthIndex = new Date().getMonth();
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonthIndex - i + 12) % 12;
      monthlyMap[monthNames[idx]] = 0;
    }

    const currentMonthName = monthNames[currentMonthIndex];
    const transactions = [];

    const recordRevenue = (amt, date) => {
      if (!amt || isNaN(amt)) return;
      const validDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
      const monthLabel = monthNames[validDate.getMonth()];
      const withinFilter = isWithinPeriod(validDate, dateFilter);

      if (withinFilter) totalCollected += amt;
      if (monthlyMap[monthLabel] !== undefined) {
        monthlyMap[monthLabel] += amt;
      } else {
        monthlyMap[monthLabel] = amt;
      }
      if (monthLabel === currentMonthName) {
        thisMonth += amt;
      }
    };

    // ──────────────────────────────────────────────
    // 1. PRODUCT ORDERS
    // ──────────────────────────────────────────────
    orders.forEach((o) => {
      const amount = Number(o.total) || 0;
      const orderDate = o.date ? new Date(o.date) : new Date();
      const withinFilter = isWithinPeriod(orderDate, dateFilter);

      const paymentStatusRaw = (o.rawOrder?.paymentStatus || o.payment || '').toLowerCase();
      const orderStatusRaw = (o.status || o.rawOrder?.orderStatus || '').toLowerCase();
      const refundStatus = (o.rawOrder?.refundStatus || '').toLowerCase();

      const isPaid =
        paymentStatusRaw === 'paid' ||
        paymentStatusRaw === 'cod collected' ||
        paymentStatusRaw === 'completed' ||
        paymentStatusRaw === 'settled' ||
        orderStatusRaw === 'delivered' ||
        o.payment === 'Paid' ||
        o.payment === 'COD Collected';

      const isRefunded =
        orderStatusRaw === 'cancelled' ||
        orderStatusRaw === 'refunded' ||
        refundStatus === 'completed';

      let statusLabel = 'Pending';
      let pendingDir = null;
      let pendingAmt = 0;

      if (isRefunded) {
        statusLabel = 'Refunded';
        if (withinFilter) refunded += amount;
      } else if (isPaid) {
        statusLabel = 'Completed';
        recordRevenue(amount, orderDate);
      } else {
        statusLabel = 'Pending';
        pendingDir = 'customer_owes';
        pendingAmt = amount;
        if (withinFilter) pending += amount;
      }

      const orderNum =
        o.rawOrder?.orderNumber ||
        (o.id && o.id.length > 8 ? o.id.slice(-6).toUpperCase() : o.id || 'ORDER');

      const razorpayId =
        o.rawOrder?.paymentInfo?.razorpayPaymentId ||
        o.rawOrder?.paymentDetails?.razorpay_payment_id ||
        o.rawOrder?.razorpayPaymentId;

      const paymentMethod =
        o.rawOrder?.paymentMethod?.toUpperCase() ||
        (o.payment && o.payment.includes('COD') ? 'COD' : 'UPI');

      transactions.push({
        id: o.id || o._id,
        uniqueKey: `ord-${o.id || o._id}-${orderNum}`,
        type: 'order',
        order: orderNum,
        referenceText: `#ORD-${orderNum}`,
        txnId: razorpayId ? `TXN-${razorpayId.slice(-8).toUpperCase()}` : null,
        isOnline: Boolean(razorpayId),
        customer: o.customer || o.shippingAddress?.name || 'Customer',
        amount: amount,
        method: paymentMethod,
        status: statusLabel,
        pendingDirection: pendingDir,
        pendingAmount: pendingAmt,
        date: orderDate.toISOString().split('T')[0],
        rawDate: orderDate,
        targetUrl: `/admin/orders/${o.id || o._id}`,
        subtitle: 'Product Order',
      });
    });

    // ──────────────────────────────────────────────
    // 2. EVENT BOOKINGS
    // ──────────────────────────────────────────────
    bookings.forEach((b) => {
      const bId = b._id || b.id || b.bookingId;
      const bookingRef =
        b.bookingId || (bId && bId.length > 8 ? bId.slice(-6).toUpperCase() : bId || 'EVENT');
      const customerName = b.user?.name || b.customerName || b.customer || 'Customer';
      const isCancelled = b.status === 'cancelled' || b.status === 'failed';

      const successfulPayments = (b.payments || []).filter((p) => p.status === 'success');
      const totalPaid = successfulPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalPrice = Number(b.pricing?.totalPrice || b.amount || 0);
      const balanceDue = Math.max(0, totalPrice - totalPaid);

      if (successfulPayments.length > 0) {
        successfulPayments.forEach((p, idx) => {
          const pAmount = Number(p.amount) || 0;
          const pDate = p.date
            ? new Date(p.date)
            : b.createdAt
              ? new Date(b.createdAt)
              : new Date();

          recordRevenue(pAmount, pDate);

          const rawTxn = p.transactionId || b.razorpayPaymentId;
          const txnId = rawTxn
            ? rawTxn.startsWith('TXN-')
              ? rawTxn
              : `TXN-${rawTxn.slice(-8).toUpperCase()}`
            : null;

          const method = (p.paymentMethod || 'UPI').toUpperCase();

          transactions.push({
            id: bId,
            uniqueKey: `evt-${bId}-pmt-${p.transactionId || idx}`,
            type: 'booking',
            order: bookingRef,
            referenceText: `#EVT-${bookingRef}`,
            txnId,
            isOnline: p.source !== 'manual' && Boolean(txnId),
            customer: customerName,
            amount: pAmount,
            method: method.includes('CASH') ? 'CASH' : method,
            status: 'Completed',
            pendingDirection: null,
            pendingAmount: 0,
            date: pDate.toISOString().split('T')[0],
            rawDate: pDate,
            targetUrl: `/admin/events/${bId}`,
            subtitle: p.note || b.eventType || b.title || 'Event Decor',
          });
        });

        if (balanceDue > 0 && !isCancelled) {
          const bDate = b.date
            ? new Date(b.date)
            : b.createdAt
              ? new Date(b.createdAt)
              : new Date();
          const withinFilter = isWithinPeriod(bDate, dateFilter);
          if (withinFilter) pending += balanceDue;

          transactions.push({
            id: bId,
            uniqueKey: `evt-${bId}-bal`,
            type: 'booking',
            order: bookingRef,
            referenceText: `#EVT-${bookingRef}`,
            txnId: null,
            isOnline: false,
            customer: customerName,
            amount: balanceDue,
            method: 'PENDING',
            status: 'Pending',
            pendingDirection: 'customer_owes',
            pendingAmount: balanceDue,
            date: bDate.toISOString().split('T')[0],
            rawDate: bDate,
            targetUrl: `/admin/events/${bId}`,
            subtitle: `Balance Due • ${b.eventType || b.title || 'Event Decor'}`,
          });
        }
      } else {
        const bDate = b.date ? new Date(b.date) : b.createdAt ? new Date(b.createdAt) : new Date();
        const withinFilter = isWithinPeriod(bDate, dateFilter);

        let statusLabel = 'Pending';
        let pendingDir = null;
        let pendingAmt = 0;

        if (isCancelled) {
          statusLabel = 'Refunded';
          if (withinFilter) refunded += totalPrice;
        } else if (b.pricing?.paymentStatus === 'paid' || b.status === 'completed') {
          statusLabel = 'Completed';
          recordRevenue(totalPrice, bDate);
        } else {
          statusLabel = 'Pending';
          pendingDir = 'customer_owes';
          pendingAmt = totalPrice;
          if (withinFilter) pending += totalPrice;
        }

        const rawTxn = b.razorpayPaymentId;
        const txnId = rawTxn
          ? rawTxn.startsWith('TXN-')
            ? rawTxn
            : `TXN-${rawTxn.slice(-8).toUpperCase()}`
          : null;

        transactions.push({
          id: bId,
          uniqueKey: `evt-${bId}-initial`,
          type: 'booking',
          order: bookingRef,
          referenceText: `#EVT-${bookingRef}`,
          txnId,
          isOnline: Boolean(txnId),
          customer: customerName,
          amount: totalPrice,
          method: (b.pricing?.paymentMethod || 'UPI').toUpperCase(),
          status: statusLabel,
          pendingDirection: pendingDir,
          pendingAmount: pendingAmt,
          date: bDate.toISOString().split('T')[0],
          rawDate: bDate,
          targetUrl: `/admin/events/${bId}`,
          subtitle: b.eventType || b.title || 'Event Decor',
        });
      }
    });

    // ──────────────────────────────────────────────
    // 3. RENTALS (Rental Charges, Security Deposits & Returns)
    // ──────────────────────────────────────────────
    rentals.forEach((r) => {
      const rId = r._id || r.id;
      const rentalRef =
        r.rentalNumber || (rId && rId.length > 8 ? rId.slice(-6).toUpperCase() : rId || 'RENT');
      const customerName =
        r.customer?.name ||
        r.customerName ||
        r.shippingAddress?.fullName ||
        r.user?.name ||
        'Customer';
      const rentalCharge = Number(r.rentalCharge || r.totalAmount || 0);
      const securityDeposit = Number(r.securityDeposit || 0);
      const totalAmount = Number(r.totalAmount || rentalCharge + securityDeposit);
      const rDate = r.createdAt
        ? new Date(r.createdAt)
        : r.startDate
          ? new Date(r.startDate)
          : new Date();
      const withinFilter = isWithinPeriod(rDate, dateFilter);

      const isPaid =
        r.paymentStatus === 'paid' || r.paymentStatus === 'completed' || r.status === 'active';
      const isCancelled = r.status === 'cancelled';
      const isReturned = r.status === 'returned' || r.status === 'completed';
      const depositHeld = r.depositStatus === 'held' || r.depositStatus === 'pending_refund';
      const depositRefunded = r.depositStatus === 'refunded';

      let statusLabel = 'Pending';
      let pendingDir = null;
      let pendingAmt = 0;
      let subtitleText = `Rental Fee (₹${rentalCharge}) + Deposit (₹${securityDeposit})`;

      if (isCancelled) {
        statusLabel = 'Refunded';
        if (withinFilter) refunded += totalAmount;
      } else if (isPaid) {
        statusLabel = 'Completed';
        recordRevenue(rentalCharge, rDate);

        // Check if admin owes customer the security deposit
        if (isReturned && depositHeld && securityDeposit > 0) {
          statusLabel = 'Refund Due';
          pendingDir = 'admin_owes';
          pendingAmt = securityDeposit;
          if (withinFilter) pendingRefunds += securityDeposit;
          subtitleText = `Rental Settled • Security Deposit Refund Due to Customer (₹${securityDeposit})`;
        } else if (depositRefunded && securityDeposit > 0) {
          if (withinFilter) refunded += securityDeposit;
          subtitleText = `Rental Settled • Deposit Refunded to Customer (₹${securityDeposit})`;
        } else {
          subtitleText = `Rental Settled • Security Deposit Held (₹${securityDeposit})`;
        }
      } else {
        statusLabel = 'Pending';
        pendingDir = 'customer_owes';
        pendingAmt = totalAmount;
        if (withinFilter) pending += totalAmount;
        subtitleText = `Payment Due • Rental Charges (₹${rentalCharge}) + Deposit`;
      }

      transactions.push({
        id: rId,
        uniqueKey: `rnt-${rId}-${rentalRef}`,
        type: 'rental',
        order: rentalRef,
        referenceText: `#RNT-${rentalRef}`,
        txnId: r.razorpayPaymentId
          ? `TXN-${r.razorpayPaymentId.slice(-8).toUpperCase()}`
          : r.paymentId || null,
        isOnline: Boolean(r.razorpayPaymentId),
        customer: customerName,
        amount: totalAmount,
        method: (r.paymentMethod || 'UPI').toUpperCase(),
        status: statusLabel,
        pendingDirection: pendingDir,
        pendingAmount: pendingAmt,
        date: rDate.toISOString().split('T')[0],
        rawDate: rDate,
        targetUrl: `/admin/rentals/detail/${rId}`,
        subtitle: subtitleText,
      });
    });

    // ──────────────────────────────────────────────
    // 4. CUSTOM ORDERS (Milestones & Quotations)
    // ──────────────────────────────────────────────
    customOrders.forEach((co) => {
      const coId = co._id || co.id;
      const orderRef =
        co.customOrderNumber ||
        (coId && coId.length > 8 ? coId.slice(-6).toUpperCase() : coId || 'CUSTOM');
      const customerName =
        co.user?.name || co.customerName || co.contact?.name || co.contact?.phone || 'Customer';
      const totalQuote = Number(co.quotation?.total || co.totalAmount || 0);
      const totalPaid = Number(
        co.paymentSchedule?.totalPaid ?? (co.status === 'completed' ? totalQuote : 0),
      );
      const remainingBalance = Math.max(
        0,
        Number(co.paymentSchedule?.remainingBalance ?? totalQuote - totalPaid),
      );
      const coDate = co.createdAt ? new Date(co.createdAt) : new Date();
      const withinFilter = isWithinPeriod(coDate, dateFilter);

      let statusLabel = 'Pending';
      let pendingDir = null;
      let pendingAmt = 0;
      let subtitleText = co.title || co.category || 'Custom Commission';

      if (co.status === 'cancelled') {
        statusLabel = 'Refunded';
        if (withinFilter) refunded += totalPaid > 0 ? totalPaid : totalQuote;
      } else if (totalPaid > 0) {
        recordRevenue(totalPaid, coDate);
        if (remainingBalance > 0) {
          statusLabel = 'Pending';
          pendingDir = 'customer_owes';
          pendingAmt = remainingBalance;
          if (withinFilter) pending += remainingBalance;
          subtitleText = `Paid: ₹${totalPaid} • Remaining Balance Due: ₹${remainingBalance}`;
        } else {
          statusLabel = 'Completed';
          subtitleText = `Fully Paid • ${co.title || 'Custom Commission'}`;
        }
      } else if (totalQuote > 0) {
        statusLabel = 'Pending';
        pendingDir = 'customer_owes';
        pendingAmt = totalQuote;
        if (withinFilter) pending += totalQuote;
        subtitleText = `Quotation Total Due • ${co.title || 'Custom Commission'}`;
      } else {
        subtitleText = `Inquiry / Draft • ${co.status || 'Pending Quotation'}`;
      }

      transactions.push({
        id: coId,
        uniqueKey: `cust-${coId}-${orderRef}`,
        type: 'custom_order',
        order: orderRef,
        referenceText: `#CUST-${orderRef}`,
        txnId: co.paymentInfo?.razorpayPaymentId
          ? `TXN-${co.paymentInfo.razorpayPaymentId.slice(-8).toUpperCase()}`
          : null,
        isOnline: Boolean(co.paymentInfo?.razorpayPaymentId),
        customer: customerName,
        amount: totalQuote || totalPaid || 0,
        method: (co.paymentMethod || 'UPI').toUpperCase(),
        status: statusLabel,
        pendingDirection: pendingDir,
        pendingAmount: pendingAmt,
        date: coDate.toISOString().split('T')[0],
        rawDate: coDate,
        targetUrl: `/admin/inquiries?orderId=${coId}`,
        subtitle: subtitleText,
      });
    });

    // ──────────────────────────────────────────────
    // 5. RETURNS (Deductions & Money Cuts)
    // ──────────────────────────────────────────────
    returns.forEach((ret) => {
      const retId = ret._id || ret.id;
      const returnRef =
        ret.returnNumber ||
        (retId && retId.length > 8 ? retId.slice(-6).toUpperCase() : retId || 'RET');
      const customerName = ret.user?.name || ret.customer?.name || ret.customerName || 'Customer';
      const refundAmount = Number(
        ret.refundBreakdown?.grandTotal ??
          (ret.refundAmount || ret.totalRefundAmount || ret.refundBreakdown?.amount || 0),
      );
      const retDate = ret.createdAt ? new Date(ret.createdAt) : new Date();
      const withinFilter = isWithinPeriod(retDate, dateFilter);

      const refundStatus = (ret.refundStatus || '').toLowerCase();
      const isSettled =
        refundStatus === 'settled' || refundStatus === 'refunded' || refundStatus === 'completed';
      const isApprovedOrPending =
        ret.status === 'approved' ||
        ret.status === 'inspected' ||
        ret.status === 'item_received' ||
        refundStatus === 'pending' ||
        refundStatus === 'approved';

      let statusLabel = 'Pending';
      let pendingDir = null;
      let pendingAmt = 0;
      let subtitleText = `Return Deductions • ${ret.reason || 'Item Return'}`;

      if (isSettled) {
        statusLabel = 'Refunded';
        if (withinFilter) refunded += refundAmount;
        subtitleText = `Money Deducted / Refund Settled (₹${refundAmount}) • ${ret.reason || 'Return'}`;
      } else if (isApprovedOrPending) {
        statusLabel = 'Refund Due';
        pendingDir = 'admin_owes';
        pendingAmt = refundAmount;
        if (withinFilter) pendingRefunds += refundAmount;
        subtitleText = `Admin Refund Due to Customer (₹${refundAmount}) • ${ret.reason || 'Return'}`;
      } else {
        statusLabel = 'Pending';
        subtitleText = `Return Pending Inspection • ${ret.reason || 'Return'}`;
      }

      transactions.push({
        id: retId,
        uniqueKey: `ret-${retId}-${returnRef}`,
        type: 'return',
        order: returnRef,
        referenceText: `#RET-${returnRef}`,
        txnId: ret.refundTransactionId
          ? `TXN-${ret.refundTransactionId.slice(-8).toUpperCase()}`
          : null,
        isOnline: Boolean(ret.refundTransactionId),
        customer: customerName,
        amount: refundAmount,
        method: (ret.refundMethod || 'Original Method').toUpperCase(),
        status: statusLabel,
        pendingDirection: pendingDir,
        pendingAmount: pendingAmt,
        date: retDate.toISOString().split('T')[0],
        rawDate: retDate,
        targetUrl: `/admin/returns?returnId=${retId}`,
        subtitle: subtitleText,
      });
    });

    // ──────────────────────────────────────────────
    // 6. EXCHANGES (Price Differences & Replacements)
    // ──────────────────────────────────────────────
    exchanges.forEach((ex) => {
      const exId = ex._id || ex.id;
      const exRef =
        ex.exchangeNumber ||
        (exId && exId.length > 8 ? exId.slice(-6).toUpperCase() : exId || 'EXCH');
      const customerName = ex.user?.name || ex.customer?.name || ex.customerName || 'Customer';
      const diff = Number(ex.priceDifference || 0);
      const absDiff = Math.abs(diff);
      const exDate = ex.createdAt ? new Date(ex.createdAt) : new Date();
      const withinFilter = isWithinPeriod(exDate, dateFilter);

      let statusLabel = 'Completed';
      let pendingDir = null;
      let pendingAmt = 0;
      let subtitleText = `Item Exchange • ${ex.replacementItem?.title || 'Replacement'}`;

      if (diff > 0) {
        // Customer upgrades -> pays difference
        const isPaid = ex.paymentStatus === 'paid' || ex.status === 'completed';
        if (isPaid) {
          statusLabel = 'Completed';
          recordRevenue(diff, exDate);
          subtitleText = `Upgrade Difference Settled (+₹${diff}) • ${ex.replacementItem?.title || 'Exchange'}`;
        } else {
          statusLabel = 'Pending';
          pendingDir = 'customer_owes';
          pendingAmt = diff;
          if (withinFilter) pending += diff;
          subtitleText = `Customer Owes Upgrade Diff (+₹${diff}) • ${ex.replacementItem?.title || 'Exchange'}`;
        }
      } else if (diff < 0) {
        // Customer downgrades -> store owes customer refund
        const isSettled = ex.refundStatus === 'settled' || ex.refundStatus === 'refunded';
        if (isSettled) {
          statusLabel = 'Refunded';
          if (withinFilter) refunded += absDiff;
          subtitleText = `Downgrade Refund Settled (-₹${absDiff}) • ${ex.replacementItem?.title || 'Exchange'}`;
        } else {
          statusLabel = 'Refund Due';
          pendingDir = 'admin_owes';
          pendingAmt = absDiff;
          if (withinFilter) pendingRefunds += absDiff;
          subtitleText = `Admin Owes Refund to Customer (-₹${absDiff}) • ${ex.replacementItem?.title || 'Exchange'}`;
        }
      } else {
        // Even exchange
        statusLabel = 'Completed';
        subtitleText = `Even Exchange (₹0 Diff) • ${ex.replacementItem?.title || 'Replacement'}`;
      }

      transactions.push({
        id: exId,
        uniqueKey: `exch-${exId}-${exRef}`,
        type: 'exchange',
        order: exRef,
        referenceText: `#EXCH-${exRef}`,
        txnId: ex.paymentInfo?.razorpayPaymentId
          ? `TXN-${ex.paymentInfo.razorpayPaymentId.slice(-8).toUpperCase()}`
          : null,
        isOnline: Boolean(ex.paymentInfo?.razorpayPaymentId),
        customer: customerName,
        amount: absDiff,
        method: (ex.paymentMethod || 'UPI').toUpperCase(),
        status: statusLabel,
        pendingDirection: pendingDir,
        pendingAmount: pendingAmt,
        date: exDate.toISOString().split('T')[0],
        rawDate: exDate,
        targetUrl: `/admin/returns?tab=exchanges&exchangeId=${exId}`,
        subtitle: subtitleText,
      });
    });

    const chartData = Object.keys(monthlyMap).map((m) => ({
      month: m,
      amount: monthlyMap[m],
    }));

    return {
      totalCollected,
      thisMonth,
      pending,
      refunded,
      pendingRefunds,
      chartData,
      transactions,
    };
  }, [orders, bookings, rentals, customOrders, returns, exchanges, dateFilter]);

  // ─── FILTERED & SORTED TRANSACTIONS ───
  const filteredTransactions = useMemo(() => {
    let list = metrics.transactions.filter((t) => {
      // Type Filter
      if (typeFilter !== 'All') {
        if (typeFilter !== t.type) return false;
      }

      // Status Filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Completed' && t.status !== 'Completed') return false;
        if (statusFilter === 'Pending' && t.status !== 'Pending') return false;
        if (statusFilter === 'Refund Due' && t.status !== 'Refund Due') return false;
        if (statusFilter === 'Refunded' && t.status !== 'Refunded') return false;
      }

      // Date Period
      if (!isWithinPeriod(t.rawDate, dateFilter)) return false;

      // Payment Method
      if (methodFilter !== 'All' && t.method.toLowerCase() !== methodFilter.toLowerCase()) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          t.order.toLowerCase().includes(q) ||
          t.referenceText.toLowerCase().includes(q) ||
          (t.txnId && t.txnId.toLowerCase().includes(q)) ||
          t.customer.toLowerCase().includes(q) ||
          t.method.toLowerCase().includes(q) ||
          t.status.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q) ||
          (t.subtitle && t.subtitle.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'Newest first') return new Date(b.rawDate) - new Date(a.rawDate);
      if (sortBy === 'Oldest first') return new Date(a.rawDate) - new Date(b.rawDate);
      if (sortBy === 'Amount ↑') return Number(a.amount) - Number(b.amount);
      if (sortBy === 'Amount ↓') return Number(b.amount) - Number(a.amount);
      return 0;
    });

    return list;
  }, [
    metrics.transactions,
    typeFilter,
    statusFilter,
    dateFilter,
    methodFilter,
    searchQuery,
    sortBy,
  ]);

  // ─── COUNTS FOR TYPE TABS ───
  const typeCounts = useMemo(() => {
    return {
      All: metrics.transactions.length,
      Orders: metrics.transactions.filter((t) => t.type === 'order').length,
      Rentals: metrics.transactions.filter((t) => t.type === 'rental').length,
      Custom: metrics.transactions.filter((t) => t.type === 'custom_order').length,
      Events: metrics.transactions.filter((t) => t.type === 'booking').length,
      Returns: metrics.transactions.filter((t) => t.type === 'return').length,
      Exchanges: metrics.transactions.filter((t) => t.type === 'exchange').length,
    };
  }, [metrics.transactions]);

  // ─── COUNTS FOR STATUS FILTERBAR ───
  const statusCounts = useMemo(() => {
    const pool =
      typeFilter === 'All'
        ? metrics.transactions
        : metrics.transactions.filter((t) => t.type === typeFilter);

    return {
      All: pool.length,
      Completed: pool.filter((t) => t.status === 'Completed').length,
      Pending: pool.filter((t) => t.status === 'Pending').length,
      'Refund Due': pool.filter((t) => t.status === 'Refund Due').length,
      Refunded: pool.filter((t) => t.status === 'Refunded').length,
    };
  }, [metrics.transactions, typeFilter]);

  // Active filters count for dropdown badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'All') count++;
    if (statusFilter !== 'All') count++;
    if (dateFilter !== 'All Time') count++;
    if (methodFilter !== 'All') count++;
    if (sortBy !== 'Newest first') count++;
    return count;
  }, [typeFilter, statusFilter, dateFilter, methodFilter, sortBy]);

  // ─── EXPORT CSV ───
  const handleExportCSV = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const headers = [
      'Type',
      'Reference',
      'Gateway TXN ID',
      'Customer',
      'Amount (INR)',
      'Payment Method',
      'Status',
      'Pending Obligation',
      'Date',
      'Details',
    ];

    const rows = filteredTransactions.map((t) => {
      let pendingNote = 'None';
      if (t.pendingDirection === 'customer_owes') {
        pendingNote = `Customer Owes ₹${t.pendingAmount || t.amount}`;
      } else if (t.pendingDirection === 'admin_owes') {
        pendingNote = `Admin Owes Refund ₹${t.pendingAmount || t.amount}`;
      }

      return [
        `"${t.type.toUpperCase()}"`,
        `"${t.referenceText}"`,
        `"${t.txnId || 'N/A'}"`,
        `"${(t.customer || '').replace(/"/g, '""')}"`,
        t.amount,
        `"${t.method}"`,
        `"${t.status}"`,
        `"${pendingNote}"`,
        `"${t.date}"`,
        `"${(t.subtitle || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payments_master_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Payments exported to CSV');
  };

  // ─── STATUS BADGES ───
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10.5px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 shrink-0 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10.5px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 shrink-0 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Pending Due
          </span>
        );
      case 'Refund Due':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10.5px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 shrink-0 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Refund Due
          </span>
        );
      case 'Refunded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10.5px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60 shrink-0 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10.5px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200 shrink-0">
            {status}
          </span>
        );
    }
  };

  // ─── TYPE BADGE ───
  const getTypeBadge = (type) => {
    switch (type) {
      case 'order':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300">
            <span className="material-symbols-outlined text-[12px]">shopping_bag</span>
            Order
          </span>
        );
      case 'rental':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300">
            <span className="material-symbols-outlined text-[12px]">event_available</span>
            Rental
          </span>
        );
      case 'custom_order':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300">
            <span className="material-symbols-outlined text-[12px]">palette</span>
            Custom
          </span>
        );
      case 'booking':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300">
            <span className="material-symbols-outlined text-[12px]">celebration</span>
            Event
          </span>
        );
      case 'return':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300">
            <span className="material-symbols-outlined text-[12px]">assignment_return</span>
            Return
          </span>
        );
      case 'exchange':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="material-symbols-outlined text-[12px]">sync_alt</span>
            Exchange
          </span>
        );
      default:
        return null;
    }
  };

  // ─── DEBT / PENDING DIRECTION MARKER ───
  const renderDebtMarker = (p) => {
    if (p.pendingDirection === 'customer_owes') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0"
          title="Customer payment pending"
        >
          <span className="material-symbols-outlined text-[12px] text-rose-600 animate-pulse">
            call_made
          </span>
          Customer Due: {formatCurrency(p.pendingAmount || p.amount)}
        </span>
      );
    }
    if (p.pendingDirection === 'admin_owes') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0"
          title="Store refund liability due to customer"
        >
          <span className="material-symbols-outlined text-[12px] text-amber-600 animate-pulse">
            currency_exchange
          </span>
          Refund Due: {formatCurrency(p.pendingAmount || p.amount)}
        </span>
      );
    }
    return null;
  };

  // ─── VERY LIGHT, ELEGANT STATUS SHADES (Airy & Clean) ───
  const getCardStyle = (p) => {
    if (p.status === 'Completed') {
      return 'bg-gradient-to-r from-emerald-500/[0.035] via-emerald-500/[0.01] to-white dark:to-[#26241f] border-emerald-500/25 hover:border-emerald-500/45 shadow-xs';
    }
    if (p.pendingDirection === 'admin_owes' || p.status === 'Refund Due') {
      return 'bg-gradient-to-r from-amber-500/[0.045] via-amber-500/[0.015] to-white dark:to-[#26241f] border-amber-500/30 hover:border-amber-500/50 shadow-xs';
    }
    if (p.pendingDirection === 'customer_owes' || p.status === 'Pending') {
      return 'bg-gradient-to-r from-rose-500/[0.035] via-rose-500/[0.01] to-white dark:to-[#26241f] border-rose-500/25 hover:border-rose-500/45 shadow-xs';
    }
    if (p.status === 'Refunded') {
      return 'bg-gradient-to-r from-purple-500/[0.035] via-purple-500/[0.01] to-white dark:to-[#26241f] border-purple-500/25 hover:border-purple-500/40 shadow-xs';
    }
    return 'bg-[var(--admin-surface)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] shadow-xs';
  };

  const getTableRowBorder = (p) => {
    if (p.status === 'Completed') return 'border-l-[3px] border-l-emerald-500';
    if (p.pendingDirection === 'admin_owes' || p.status === 'Refund Due')
      return 'border-l-[3px] border-l-amber-500';
    if (p.pendingDirection === 'customer_owes' || p.status === 'Pending')
      return 'border-l-[3px] border-l-rose-500';
    if (p.status === 'Refunded') return 'border-l-[3px] border-l-purple-500';
    return '';
  };

  if (initialLoading) {
    return <AdminPaymentsSkeleton />;
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6 pb-12 sm:pb-8 text-left"
    >
      {/* ─── PAGE HEADER (Clean & minimal) ─── */}
      <PageHeader
        title="Payments Hub"
        subtitle={
          <div className="flex items-center gap-2 text-[12.5px] text-[var(--admin-text-secondary)]">
            <span className="font-semibold text-[var(--admin-text-primary)]">
              {metrics.transactions.length} Transactions
            </span>
            <span>&bull;</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {formatCurrency(metrics.totalCollected)} Settled
            </span>
            {metrics.pending > 0 && (
              <>
                <span>&bull;</span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  {formatCurrency(metrics.pending)} Due
                </span>
              </>
            )}
          </div>
        }
      />

      {/* ─── OPERATIONAL 4-CARD LEDGER STRIP (Clean, no text clutter) ─── */}
      <motion.div
        variants={fadeUp}
        className="admin-card overflow-hidden text-left relative p-0 !rounded-[4px] border border-[var(--admin-border)] shadow-xs"
      >
        <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />
        <div className="grid grid-cols-2 lg:grid-cols-4 bg-[var(--admin-surface)]">
          {/* Total Collected */}
          <div className="p-3.5 sm:p-4 border-r border-b lg:border-b-0 border-[var(--admin-border-subtle)]">
            <span className="text-[10px] sm:text-[10.5px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider block">
              Collected
            </span>
            <p className="text-[17px] sm:text-[19px] font-bold text-[var(--admin-text-primary)] tracking-tight mt-0.5">
              {formatCurrency(metrics.totalCollected)}
            </p>
          </div>

          {/* This Month */}
          <div className="p-3.5 sm:p-4 border-b lg:border-b-0 lg:border-r border-[var(--admin-border-subtle)]">
            <span className="text-[10px] sm:text-[10.5px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              This Month
            </span>
            <p className="text-[17px] sm:text-[19px] font-bold text-[var(--admin-text-primary)] tracking-tight mt-0.5">
              {formatCurrency(metrics.thisMonth)}
            </p>
          </div>

          {/* Customer Due */}
          <div className="p-3.5 sm:p-4 border-r border-[var(--admin-border-subtle)]">
            <span className="text-[10px] sm:text-[10.5px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              Customer Due
            </span>
            <p className="text-[17px] sm:text-[19px] font-bold text-[var(--admin-text-primary)] tracking-tight mt-0.5">
              {formatCurrency(metrics.pending)}
            </p>
          </div>

          {/* Refunds & Deductions */}
          <div className="p-3.5 sm:p-4 bg-[var(--admin-surface)]">
            <span className="text-[10px] sm:text-[10.5px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
              Refunds & Cuts
            </span>
            <p className="text-[17px] sm:text-[19px] font-bold text-[var(--admin-text-primary)] tracking-tight mt-0.5">
              {formatCurrency(metrics.refunded)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ─── STICKY SEARCH, ACTIONS & STATUS BAR ─── */}
      <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md space-y-2.5">
        <motion.div variants={fadeUp} className="flex flex-row items-center gap-2 w-full">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-2.5 sm:px-3 h-[42px] min-h-[42px] max-h-[42px]">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order #, rental, return, customer..."
              className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full min-w-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer p-1 flex items-center justify-center shrink-0"
                title="Clear search"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Toggle Analytics Button */}
          <button
            type="button"
            onClick={() => setShowChart(!showChart)}
            className={`h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-[4px] border transition-colors shrink-0 cursor-pointer ${
              showChart
                ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] border-[var(--admin-border-strong)] shadow-xs font-semibold'
                : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border-[var(--admin-border)]'
            }`}
            title={showChart ? 'Hide Revenue Chart' : 'Show Revenue Chart'}
          >
            <span className="material-symbols-outlined text-[18px]">bar_chart</span>
            <span className="text-[13px] font-semibold hidden md:inline">Analytics</span>
          </button>

          {/* Action Controls Group: Filters & Export */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Filters Drawer Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                className={`h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-[4px] border transition-colors shrink-0 cursor-pointer ${
                  showFiltersMenu || activeFilterCount > 0
                    ? 'bg-[var(--admin-accent)] text-white border-transparent shadow-xs'
                    : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]'
                }`}
                title="Filter Transactions"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span className="font-semibold text-[13px] hidden sm:inline">
                  {activeFilterCount > 0 ? `${activeFilterCount} Filters` : 'Filters'}
                </span>
                {activeFilterCount > 0 && (
                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-white text-[var(--admin-accent)] text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <AdminFilterDrawer
                isOpen={showFiltersMenu}
                onClose={() => setShowFiltersMenu(false)}
                title="Filter Transactions"
                icon="tune"
                activeCount={activeFilterCount}
                onClearAll={() => {
                  setDateFilter('All Time');
                  setMethodFilter('All');
                  setSortBy('Newest first');
                  setTypeFilter('All');
                  setStatusFilter('All');
                }}
                clearAllLabel="Reset"
                onApply={() => setShowFiltersMenu(false)}
              >
                {/* Payment Status Filter (Moved into drawer) */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Payment Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="All">All Statuses ({statusCounts.All})</option>
                    <option value="Completed">Completed ({statusCounts.Completed})</option>
                    <option value="Pending">Pending / Customer Due ({statusCounts.Pending})</option>
                    <option value="Refund Due">Refund Due ({statusCounts['Refund Due']})</option>
                    <option value="Refunded">Refunded ({statusCounts.Refunded})</option>
                  </select>
                </div>

                {/* Category / Stream Filter (Moved into drawer) */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Transaction Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="All">All Types ({typeCounts.All})</option>
                    <option value="order">Product Orders ({typeCounts.Orders})</option>
                    <option value="rental">Rentals & Deposits ({typeCounts.Rentals})</option>
                    <option value="custom_order">Custom Orders ({typeCounts.Custom})</option>
                    <option value="booking">Event Bookings ({typeCounts.Events})</option>
                    <option value="return">Returns & Deductions ({typeCounts.Returns})</option>
                    <option value="exchange">
                      Exchanges & Differences ({typeCounts.Exchanges})
                    </option>
                  </select>
                </div>

                {/* Time Period */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Time Period
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="All Time">All Time</option>
                    <option value="Today">Today</option>
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="This Month">This Month</option>
                    <option value="This Year">This Year</option>
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Payment Method
                  </label>
                  <select
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="All">All Methods</option>
                    <option value="UPI">UPI</option>
                    <option value="COD">Cash On Delivery (COD)</option>
                    <option value="Card">Credit/Debit Card</option>
                    <option value="NetBanking">Net Banking</option>
                    <option value="Cash">Cash / Counter</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Sort Order
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="Newest first">Newest first</option>
                    <option value="Oldest first">Oldest first</option>
                    <option value="Amount ↑">Amount (Low to High)</option>
                    <option value="Amount ↓">Amount (High to Low)</option>
                  </select>
                </div>
              </AdminFilterDrawer>
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-[42px] min-h-[42px] max-h-[42px] w-[42px] sm:w-auto px-0 sm:px-3.5 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] rounded-[4px] flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-[var(--admin-border)] shrink-0 gap-1.5 font-semibold text-[13px]"
              title="Export CSV"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </motion.div>

        {/* Minimal Results & Active Tag Line (Zero bulky buttons!) */}
        <div className="flex items-center justify-between px-0.5 text-[12px] text-[var(--admin-text-secondary)]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>
              Showing{' '}
              <strong className="text-[var(--admin-text-primary)]">
                {filteredTransactions.length}
              </strong>{' '}
              of {metrics.transactions.length}
            </span>
            {typeFilter !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] text-[10.5px] font-bold">
                {typeFilter}
                <button
                  type="button"
                  onClick={() => setTypeFilter('All')}
                  className="cursor-pointer hover:opacity-75"
                >
                  ✕
                </button>
              </span>
            )}
            {statusFilter !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] text-[10.5px] font-bold">
                {statusFilter}
                <button
                  type="button"
                  onClick={() => setStatusFilter('All')}
                  className="cursor-pointer hover:opacity-75"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setTypeFilter('All');
                setStatusFilter('All');
                setDateFilter('All Time');
                setMethodFilter('All');
                setSortBy('Newest first');
              }}
              className="text-[11.5px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* ─── MONTHLY REVENUE BAR CHART (Collapsible) ─── */}
      <AnimatePresence>
        {showChart && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="admin-card !rounded-[4px] p-4 sm:p-5 border border-[var(--admin-border)] shadow-xs text-left">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-[14px] text-[var(--admin-text-primary)]">
                    Revenue Trends
                  </h3>
                  <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                    Gross settled volume (past 6 months)
                  </p>
                </div>
                <span className="text-[10.5px] font-bold text-[var(--admin-accent)] uppercase tracking-wider bg-[var(--admin-accent-muted)] px-2 py-0.5 rounded-[3px]">
                  {dateFilter}
                </span>
              </div>

              <div className="h-[220px] w-full mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metrics.chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--admin-border-subtle)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        `₹${v >= 100000 ? `${(v / 100000).toFixed(1)}L` : `${Math.round(v / 1000)}K`}`
                      }
                      dx={-10}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: 'var(--admin-surface-muted)' }}
                    />
                    <Bar
                      dataKey="amount"
                      fill="var(--admin-accent)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={45}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── TRANSACTIONS LIST (Desktop Table + Dedicated Mobile Gradient Cards) ─── */}
      {filteredTransactions.length === 0 ? (
        <div className="admin-card !rounded-[4px] p-16 text-center flex flex-col items-center justify-center border border-[var(--admin-border)] shadow-xs">
          <span className="material-symbols-outlined text-[42px] text-[var(--admin-text-tertiary)] mb-2">
            search_off
          </span>
          <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
            No matching transactions found
          </p>
          <p className="text-[12px] text-[var(--admin-text-secondary)] mt-1">
            Try adjusting your search query, type category, or status filter.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View (md and above) */}
          <motion.div
            variants={fadeUp}
            className="hidden md:block admin-card overflow-hidden p-0 !rounded-[4px] border border-[var(--admin-border)] shadow-xs"
          >
            <div className="overflow-x-auto">
              <table className="admin-table w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-muted)]">
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      Reference & Stream
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      Type
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      Gateway TXN ID
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      Customer
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      Amount
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      Method
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      Status & Obligation
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] text-right">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--admin-border-subtle)]">
                  {filteredTransactions.map((p) => (
                    <tr
                      key={p.uniqueKey}
                      className={`hover:bg-[var(--admin-surface-muted)] transition-colors cursor-pointer group ${getTableRowBorder(
                        p,
                      )}`}
                      onClick={() => navigate(p.targetUrl)}
                      title={`Open ${p.referenceText} Detail`}
                    >
                      {/* Reference & Subtitle */}
                      <td className="py-3.5 px-4">
                        <span
                          className="font-mono font-bold text-[12.5px] text-[var(--admin-accent)] group-hover:underline flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(p.targetUrl);
                          }}
                        >
                          <span>{p.referenceText}</span>
                          <span className="material-symbols-outlined text-[13px] opacity-70 group-hover:opacity-100">
                            open_in_new
                          </span>
                        </span>
                        {p.subtitle && (
                          <span className="text-[10.5px] text-[var(--admin-text-tertiary)] block truncate max-w-[220px]">
                            {p.subtitle}
                          </span>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4">{getTypeBadge(p.type)}</td>

                      {/* Gateway TXN ID */}
                      <td className="py-3.5 px-4 font-mono text-[11.5px] text-[var(--admin-text-secondary)]">
                        {p.txnId ? (
                          <span className="font-semibold text-[var(--admin-text-primary)]">
                            {p.txnId}
                          </span>
                        ) : (
                          <span className="text-[var(--admin-text-tertiary)] italic text-[11px]">
                            {p.method === 'COD'
                              ? 'Cash on Delivery'
                              : p.method === 'PENDING'
                                ? 'Pending Payment'
                                : 'Direct / Counter'}
                          </span>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4 text-[12.5px] font-semibold text-[var(--admin-text-primary)]">
                        {p.customer}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-bold text-[13px] text-[var(--admin-text-primary)]">
                        {formatCurrency(p.amount)}
                      </td>

                      {/* Method */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border border-[var(--admin-border-subtle)]">
                          {p.method}
                        </span>
                      </td>

                      {/* Status & Debt Marker */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1">
                          {getStatusBadge(p.status)}
                          {renderDebtMarker(p)}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-right text-[12px] text-[var(--admin-text-tertiary)] font-medium">
                        {new Date(p.rawDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Mobile View Standalone Cards (Below md) with User-Requested Status Gradients */}
          <div className="md:hidden flex flex-col gap-3">
            {filteredTransactions.map((p) => (
              <motion.div
                key={p.uniqueKey}
                variants={fadeUp}
                onClick={() => navigate(p.targetUrl)}
                className={`rounded-[6px] p-3.5 border shadow-xs flex flex-col gap-2.5 cursor-pointer transition-all text-left ${getCardStyle(
                  p,
                )}`}
              >
                {/* Header Row: Customer Name + Status Badge & Stream Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full border border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)] text-[var(--admin-accent)] text-center font-bold text-[11px] flex items-center justify-center shrink-0">
                      {(p.customer || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[13.5px] text-[var(--admin-text-primary)] block truncate leading-tight">
                          {p.customer || 'Customer'}
                        </span>
                        {getTypeBadge(p.type)}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="font-mono text-[11px] font-semibold text-[var(--admin-accent)]">
                          {p.referenceText}
                        </span>
                        <span className="material-symbols-outlined text-[12px] text-[var(--admin-text-tertiary)]">
                          open_in_new
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {getStatusBadge(p.status)}
                    <span className="text-[10.5px] text-[var(--admin-text-tertiary)] font-medium">
                      {new Date(p.rawDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Subtitle / Details Note (Clean text without heavy box) */}
                {p.subtitle && (
                  <p className="text-[12px] text-[var(--admin-text-secondary)] font-normal truncate">
                    {p.subtitle}
                  </p>
                )}

                {/* Debt Obligation Marker on Mobile Card */}
                {renderDebtMarker(p) && (
                  <div className="flex items-center">{renderDebtMarker(p)}</div>
                )}

                {/* Payment Details Row (Clean divider, no heavy boxes) */}
                <div className="pt-2 border-t border-[var(--admin-border-subtle)] flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border border-[var(--admin-border-subtle)] shrink-0">
                      {p.method}
                    </span>
                    {p.txnId ? (
                      <span className="font-mono text-[11px] text-[var(--admin-text-secondary)] truncate">
                        {p.txnId}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[var(--admin-text-tertiary)] italic truncate">
                        {p.method === 'COD'
                          ? 'Cash on Delivery'
                          : p.method === 'PENDING'
                            ? 'Payment Pending'
                            : 'Direct / Counter'}
                      </span>
                    )}
                  </div>
                  <span className="text-[15px] font-bold text-[var(--admin-text-primary)] shrink-0">
                    {formatCurrency(p.amount)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}

export default AdminPayments;
