import React, { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingService, userService } from '../../../services/domainServices';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../../utils/core/errorHelpers';
import { AdminBookingDetailSkeleton, stagger } from '../../components/AdminUIKit';
import { ManualPaymentModal } from '../../components/ui/ManualPaymentModal';

import { BookingHeader } from './BookingHeader';
import { BookingStatusTimeline } from './BookingStatusTimeline';
import { BookingPackageCard } from './BookingPackageCard';
import { BookingVenueLocationCard } from './BookingVenueLocationCard';
import { BookingCustomerCard } from './BookingCustomerCard';
import { BookingFinancialsCard } from './BookingFinancialsCard';

export function AdminBookingDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUnpaidModal, setShowUnpaidModal] = useState(false);

  // Logistics and Venue state
  const [drawerNotes, setDrawerNotes] = useState('');
  const [logisticsSetup, setLogisticsSetup] = useState('');
  const [logisticsPickup, setLogisticsPickup] = useState('');
  const [allocatedTeam, setAllocatedTeam] = useState([]);
  const [allocatedProps, setAllocatedProps] = useState([]);

  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [venueCity, setVenueCity] = useState('');
  const [venueState, setVenueState] = useState('');
  const [venueCountry, setVenueCountry] = useState('');
  const [venuePincode, setVenuePincode] = useState('');
  const [venueLatitude, setVenueLatitude] = useState('');
  const [venueLongitude, setVenueLongitude] = useState('');
  const [venueGoogleMapsLink, setVenueGoogleMapsLink] = useState('');
  const [venueIsOutdoor, setVenueIsOutdoor] = useState(false);

  const [quoteRental, setQuoteRental] = useState('');
  const [quoteSetup, setQuoteSetup] = useState('');
  const [quoteTransport, setQuoteTransport] = useState('');
  const [quoteAddons, setQuoteAddons] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      try {
        const [bookingRes, teamRes] = await Promise.all([
          bookingService.adminGetAll(),
          userService.getTeam(),
        ]);

        if (bookingRes.success) {
          const allBookings = Array.isArray(bookingRes.data)
            ? bookingRes.data
            : bookingRes.data?.data || [];
          const found = allBookings.find((b) => (b._id || b.id) === bookingId);
          if (found) setSelectedBooking(found);
          else {
            toast.error('Booking not found');
            navigate('/admin/events?tab=bookings');
          }
        }

        const teamPayload = teamRes?.data || teamRes;
        const userItems =
          teamPayload?.members ||
          teamPayload?.items ||
          teamPayload?.users ||
          teamPayload?.data ||
          [];
        const staff = (Array.isArray(userItems) ? userItems : [])
          .filter((member) => ['admin', 'manager', 'coordinator'].includes(member.role))
          .map((member) => ({
            name: member.name || member.email,
            role: member.role || 'staff',
            contact: member.phone || member.email || 'Not provided',
          }));
        setTeamMembers(staff);
      } catch (_err) {
        toast.error('Failed to load booking details');
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, [bookingId, navigate]);

  useEffect(() => {
    if (selectedBooking) {
      setDrawerNotes(selectedBooking.adminNotes || '');
      setLogisticsSetup(
        selectedBooking.setupTiming ? selectedBooking.setupTiming.substring(0, 16) : '',
      );
      setLogisticsPickup(
        selectedBooking.pickupTiming ? selectedBooking.pickupTiming.substring(0, 16) : '',
      );
      setAllocatedTeam(selectedBooking.assignedTeam || []);
      setAllocatedProps(selectedBooking.rentedInventory || []);
      setQuoteRental(selectedBooking.pricing?.rentalFee || 0);
      setQuoteSetup(selectedBooking.pricing?.setupCharges || 0);
      setQuoteTransport(selectedBooking.pricing?.transportationCost || 0);
      setQuoteAddons(selectedBooking.pricing?.addOnCharges || 0);

      const v = selectedBooking.venue || {};
      setVenueName(v.name || '');
      setVenueAddress(v.address || '');
      setVenueCity(v.city || '');
      setVenueState(v.state || '');
      setVenueCountry(v.country || '');
      setVenuePincode(v.pincode || '');
      setVenueLatitude(v.latitude || '');
      setVenueLongitude(v.longitude || '');
      setVenueGoogleMapsLink(v.googleMapsLink || '');
    }
  }, [selectedBooking]);

  const handleUpdateStatus = async (status) => {
    if (!selectedBooking) return;
    try {
      const res = await bookingService.adminUpdateStatus(
        selectedBooking._id || selectedBooking.id,
        status,
      );
      if (res.success) {
        toast.success(`Booking status changed to: ${status.toUpperCase()}`);
        setSelectedBooking(res.data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to change status.'));
    }
  };

  const handleUpdateQuotation = async () => {
    if (!selectedBooking) return;
    const loadId = toast.loading('Updating price estimate...');
    try {
      const res = await bookingService.adminUpdateQuotation(
        selectedBooking._id || selectedBooking.id,
        {
          rentalFee: Number(quoteRental),
          setupCharges: Number(quoteSetup),
          transportationCost: Number(quoteTransport),
          addOnCharges: Number(quoteAddons),
        },
      );
      toast.dismiss(loadId);
      if (res.success) {
        toast.success('Estimate updated & saved');
        setSelectedBooking(res.data);
      }
    } catch (err) {
      toast.dismiss(loadId);
      toast.error(getErrorMessage(err, 'Failed to update price estimate.'));
    }
  };

  const handleUpdateLogistics = async () => {
    if (!selectedBooking) return;
    const loadId = toast.loading('Saving staff lists, times, & venue logistics...');
    try {
      const res = await bookingService.adminUpdateLogistics(
        selectedBooking._id || selectedBooking.id,
        {
          setupTiming: logisticsSetup ? new Date(logisticsSetup) : undefined,
          pickupTiming: logisticsPickup ? new Date(logisticsPickup) : undefined,
          assignedTeam: allocatedTeam,
          rentedInventory: allocatedProps,
          adminNotes: drawerNotes,
          venue: {
            name: venueName,
            address: venueAddress,
            city: venueCity,
            state: venueState,
            country: venueCountry,
            pincode: venuePincode,
            latitude: venueLatitude ? Number(venueLatitude) : undefined,
            longitude: venueLongitude ? Number(venueLongitude) : undefined,
            googleMapsLink: venueGoogleMapsLink,
            isOutdoor: venueIsOutdoor,
          },
        },
      );
      toast.dismiss(loadId);
      if (res.success) {
        toast.success('Rosters, checklists, timelines, and venue saved!');
        setSelectedBooking(res.data);
      }
    } catch (err) {
      toast.dismiss(loadId);
      toast.error(getErrorMessage(err, 'Failed to save setup logistics.'));
    }
  };

  const handleSaveVenue = async () => {
    if (!selectedBooking) return;
    const loadId = toast.loading('Saving venue & location details...');
    try {
      const res = await bookingService.adminUpdateLogistics(
        selectedBooking._id || selectedBooking.id,
        {
          venue: {
            name: venueName,
            address: venueAddress,
            city: venueCity,
            state: venueState,
            country: venueCountry,
            pincode: venuePincode,
            latitude: venueLatitude ? Number(venueLatitude) : undefined,
            longitude: venueLongitude ? Number(venueLongitude) : undefined,
            googleMapsLink: venueGoogleMapsLink,
            isOutdoor: venueIsOutdoor,
          },
        },
      );
      toast.dismiss(loadId);
      if (res.success) {
        toast.success('Venue location details saved!');
        setSelectedBooking(res.data);
      }
    } catch (err) {
      toast.dismiss(loadId);
      toast.error(getErrorMessage(err, 'Failed to save venue details.'));
    }
  };

  const handleTeamMemberToggle = (name, role, contact) => {
    setAllocatedTeam((prev) => {
      const exists = prev.some((t) => t.name === name);
      if (exists) return prev.filter((t) => t.name !== name);
      return [...prev, { name, role, contact }];
    });
  };

  const handleDeletePayment = async (transactionId) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this payment record? This action cannot be undone.',
      )
    )
      return;

    try {
      const res = await bookingService.adminDeletePayment(
        selectedBooking._id || selectedBooking.id,
        transactionId,
      );
      if (res.success) {
        toast.success('Payment successfully deleted.');
        setSelectedBooking(res.data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete payment.'));
    }
  };

  if (dataLoading) {
    return <AdminBookingDetailSkeleton />;
  }

  if (!selectedBooking) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-[48px] text-[var(--admin-text-tertiary)] mb-4">
          event_busy
        </span>
        <p className="text-[16px] font-bold text-[var(--admin-text-primary)] mb-4">
          Booking not found
        </p>
        <button
          onClick={() => navigate('/admin/events?tab=bookings')}
          className="admin-btn h-10 px-6 cursor-pointer"
        >
          Back to Bookings
        </button>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger}
        className="space-y-6 no-print"
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Top Header Card (Matches OrderHeader) */}
        <BookingHeader
          booking={selectedBooking}
          navigate={navigate}
          onUpdateStatus={handleUpdateStatus}
          setShowUnpaidModal={setShowUnpaidModal}
        />

        <div className="max-w-[1400px] mx-auto w-auto">
          {/* 2-Column Responsive Grid (Matches AdminOrderDetail layout: 2/3 Left, 1/3 Right Sticky) */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-6 lg:gap-8 items-start">
            {/* LEFT COLUMN: Lifecycle Progression, Package & Experience, Logistics (2/3 Width) */}
            <div className="xl:col-span-2 flex flex-col gap-3 sm:gap-6 lg:gap-8">
              {/* Status Timeline Stepper */}
              <BookingStatusTimeline
                booking={selectedBooking}
                onUpdateStatus={handleUpdateStatus}
                setShowUnpaidModal={setShowUnpaidModal}
              />

              {/* Event Package & Schedule */}
              <BookingPackageCard booking={selectedBooking} />

              {/* Event Venue & Setup Destination (Read-only presentation with interactive map) */}
              <BookingVenueLocationCard
                booking={selectedBooking}
                venueName={venueName}
                venueAddress={venueAddress}
                venueCity={venueCity}
                venueState={venueState}
                venuePincode={venuePincode}
                venueLatitude={venueLatitude}
                venueLongitude={venueLongitude}
                venueIsOutdoor={venueIsOutdoor}
                venueGoogleMapsLink={venueGoogleMapsLink}
              />
            </div>

            {/* RIGHT COLUMN: Customer Profile & Financials (1/3 Width Sticky Sidebar, Matches OrderDetail) */}
            <div className="xl:col-span-1 flex flex-col gap-3 sm:gap-6 lg:gap-8 sticky top-[88px]">
              {/* Customer Profile Card */}
              <BookingCustomerCard booking={selectedBooking} />

              {/* Financial Ledger & Manual Payments */}
              <BookingFinancialsCard
                booking={selectedBooking}
                onOpenPaymentModal={() => setShowPaymentModal(true)}
                onDeletePayment={handleDeletePayment}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Manual Payment Modal (Standardized) */}
      {showPaymentModal && (
        <ManualPaymentModal
          booking={selectedBooking}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(updatedBooking) => {
            setSelectedBooking(updatedBooking);
            setShowPaymentModal(false);
          }}
        />
      )}

      {/* Unpaid Warning Modal */}
      <AnimatePresence>
        {showUnpaidModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--admin-surface)] rounded-[4px] shadow-2xl border border-[var(--admin-border)] w-full max-w-sm overflow-hidden"
            >
              <div className="p-5 text-center">
                <div className="w-11 h-11 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-[24px]">error</span>
                </div>
                <h3 className="text-[15px] font-bold text-[var(--admin-text-primary)] mb-1">
                  Payment Required
                </h3>
                <p className="text-[12.5px] text-[var(--admin-text-secondary)] mb-5 leading-relaxed">
                  This booking has not received any payment yet. Please record a manual or online
                  payment before moving to the Confirmed stage.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUnpaidModal(false)}
                    className="flex-1 h-9 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] font-bold text-[12px] hover:bg-[var(--admin-surface-muted)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUnpaidModal(false);
                      setShowPaymentModal(true);
                    }}
                    className="flex-1 h-9 rounded-[4px] bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white font-bold text-[12px] shadow-xs transition-colors cursor-pointer"
                  >
                    Record Payment
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
export default AdminBookingDetail;
