import { m as motion, AnimatePresence } from 'framer-motion';
import { SkeletonDashboard, fadeUp, stagger } from '../components/AdminUIKit';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import X from 'lucide-react/dist/esm/icons/x';
import { bookingService, userService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import logger from '../../utils/core/logger';
import { getErrorMessage } from '../../utils/core/errorHelpers';
import { ManualPaymentModal } from '../components/ui/ManualPaymentModal';

export function AdminBookingDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Advanced States
  const [drawerStatus, setDrawerStatus] = useState('inquiry');
  const [drawerNotes, setDrawerNotes] = useState('');
  const [drawerChatMsg, setDrawerChatMsg] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatEndRef = useRef(null);

  const [logisticsSetup, setLogisticsSetup] = useState('');
  const [logisticsPickup, setLogisticsPickup] = useState('');
  const [allocatedTeam, setAllocatedTeam] = useState([]);
  const [allocatedProps, setAllocatedProps] = useState([]);

  const adminMapInstanceRef = useRef(null);
  const adminMarkerInstanceRef = useRef(null);

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
            navigate('/admin/events');
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
      setDrawerStatus(selectedBooking.status || 'inquiry');
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
      setVenueIsOutdoor(v.isOutdoor || false);

      const chatTimer = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      const mapTimer = setTimeout(() => {
        initDrawerMap();
      }, 450);

      return () => {
        clearTimeout(chatTimer);
        clearTimeout(mapTimer);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBooking]);

  const initDrawerMap = () => {
    const mapDom = document.getElementById('admin-leaflet-map');
    if (!mapDom || adminMapInstanceRef.current) return;

    if (!document.getElementById('leaflet-css-cdn')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (window.L) {
      setupLeafletDrawerMap();
    } else {
      if (!document.getElementById('leaflet-js-cdn')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js-cdn';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => setupLeafletDrawerMap();
        document.head.appendChild(script);
      }
    }
  };

  const setupLeafletDrawerMap = () => {
    const mapDom = document.getElementById('admin-leaflet-map');
    if (!mapDom || adminMapInstanceRef.current) return;
    const lat = Number(venueLatitude) || 15.506;
    const lng = Number(venueLongitude) || 80.049;

    try {
      const map = window.L.map('admin-leaflet-map', { zoomControl: false }).setView([lat, lng], 13);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      window.L.control.zoom({ position: 'bottomright' }).addTo(map);

      const goldIcon = window.L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div class="relative w-8 h-8 flex items-center justify-center">
                 <div class="absolute w-8 h-8 bg-[var(--admin-accent)] opacity-30 rounded-full animate-ping"></div>
                 <span class="material-symbols-outlined text-[var(--admin-accent)] text-[32px] drop-shadow-lg z-10 animate-bounce">location_on</span>
               </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = window.L.marker([lat, lng], { icon: goldIcon, draggable: true }).addTo(map);
      adminMarkerInstanceRef.current = marker;
      adminMapInstanceRef.current = map;

      map.on('click', (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        updateAdminCoordinates(clickLat, clickLng);
      });

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        updateAdminCoordinates(position.lat, position.longitude || position.lng);
      });
    } catch (e) {
      logger.error('Failed to setup Leaflet map', e);
    }
  };

  const updateAdminCoordinates = async (lat, lng) => {
    setVenueLatitude(lat);
    setVenueLongitude(lng);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      );
      if (response.ok) {
        const data = await response.json();
        const addr = data.address || {};
        const street = addr.road || addr.suburb || addr.neighbourhood || '';
        const city = addr.city || addr.town || addr.village || addr.county || '';
        const state = addr.state || '';
        const country = addr.country || '';
        const pincode = addr.postcode || '';
        const name = data.name || addr.amenity || addr.building || addr.shop || '';

        const formattedAddress =
          data.display_name || `${name ? name + ',' : ''}${street}, ${city}, ${state}, ${pincode}`;

        setVenueName(name || street || 'Selected Venue');
        setVenueAddress(formattedAddress);
        setVenueCity(city);
        setVenueState(state);
        setVenueCountry(country);
        setVenuePincode(pincode);
        setVenueGoogleMapsLink(
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formattedAddress)}`,
        );

        toast.success('Coordinates and address auto-geocoded!');
      }
    } catch (err) {
      logger.warn('Admin geocode error', err);
    }
  };

  const handleAdminCoordInputChange = (type, value) => {
    if (type === 'lat') {
      setVenueLatitude(value);
      const latNum = Number(value);
      if (!isNaN(latNum) && adminMapInstanceRef.current && adminMarkerInstanceRef.current) {
        adminMarkerInstanceRef.current.setLatLng([latNum, Number(venueLongitude) || 80.049]);
        adminMapInstanceRef.current.setView([latNum, Number(venueLongitude) || 80.049]);
      }
    } else {
      setVenueLongitude(value);
      const lngNum = Number(value);
      if (!isNaN(lngNum) && adminMapInstanceRef.current && adminMarkerInstanceRef.current) {
        adminMarkerInstanceRef.current.setLatLng([Number(venueLatitude) || 15.506, lngNum]);
        adminMapInstanceRef.current.setView([Number(venueLatitude) || 15.506, lngNum]);
      }
    }
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedBooking) return;
    try {
      const res = await bookingService.adminUpdateStatus(
        selectedBooking._id || selectedBooking.id,
        status,
      );
      if (res.success) {
        toast.success(`Booking status changed to: ${status.toUpperCase()}`);
        setDrawerStatus(status);
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
        toast.success('Estimate sent');
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

  const handleSendAdminChat = async (e) => {
    e.preventDefault();
    if (!drawerChatMsg.trim() || !selectedBooking) return;
    try {
      const res = await bookingService.postChat(
        selectedBooking._id || selectedBooking.id,
        drawerChatMsg,
      );
      if (res.success) {
        setDrawerChatMsg('');
        setSelectedBooking(res.data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to post message.'));
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
      !window.confirm('Are you sure you want to delete this payment? This action cannot be undone.')
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

  if (dataLoading || !selectedBooking) {
    return (
      <div className="max-w-[1280px] mx-auto space-y-6 pb-20">
        <SkeletonDashboard />
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
      </div>
    );
  }

  const chatUI = (isDesktop = false) => (
    <>
      <div className="border-b border-[var(--admin-border-subtle)] p-4 shrink-0 flex items-center justify-between bg-[var(--admin-bg-subtle)]">
        <div>
          <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
            CLIENT CHAT
          </span>
          <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
            Customer Messages
          </h4>
        </div>
        {!isDesktop && (
          <button
            onClick={() => setIsChatOpen(false)}
            className="w-8 h-8 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)] flex items-center justify-center hover:bg-[var(--admin-surface-muted)] transition-colors"
          >
            <X className="w-4 h-4 text-[var(--admin-text-secondary)]" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-5 space-y-5 px-4 custom-scrollbar flex flex-col">
        {selectedBooking.chatHistory?.map((chat, idx) => {
          const isAdmin = chat.sender === 'admin';
          return (
            <div
              key={idx}
              className={`flex flex-col max-w-[85%] ${isAdmin ? 'self-end text-right ml-auto' : 'self-start text-left'}`}
            >
              <span className="text-[9px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                {isAdmin ? 'You' : 'Client'}
              </span>
              <div
                className={`p-3 text-[12px] leading-relaxed shadow-sm ${isAdmin ? 'bg-[var(--admin-accent)] text-white rounded-[16px] rounded-tr-[4px]' : 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] border border-[var(--admin-border)] rounded-[16px] rounded-tl-[4px]'}`}
              >
                {chat.message}
              </div>
              <span className="text-[9px] font-bold text-[var(--admin-text-tertiary)] mt-1.5 block">
                {new Date(chat.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <form
        onSubmit={handleSendAdminChat}
        className="p-4 border-t border-[var(--admin-border-subtle)] shrink-0 flex items-center gap-2 mt-auto bg-[var(--admin-surface)]"
      >
        <input
          type="text"
          placeholder="Message..."
          value={drawerChatMsg}
          onChange={(e) => setDrawerChatMsg(e.target.value)}
          className="admin-input h-10 flex-1 rounded-full"
          required
        />
        <button
          type="submit"
          className="w-10 h-10 rounded-full bg-[var(--admin-accent)] text-white flex items-center justify-center hover:bg-[var(--admin-accent-hover)] transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">send</span>
        </button>
      </form>
    </>
  );

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="max-w-[1280px] mx-auto space-y-6 pb-20"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/events?tab=bookings')}
            className="admin-btn-icon w-10 h-10 min-h-0 bg-[var(--admin-surface)] border border-[var(--admin-border)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] transition-colors shadow-sm shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h3 className="text-[20px] font-bold text-[var(--admin-text-primary)] leading-tight">
              Event Details
            </h3>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider hidden sm:block">
            Customer Tracker
          </label>
          <select
            value={drawerStatus}
            onChange={(e) => handleUpdateStatus(e.target.value)}
            className="admin-input h-10 min-w-[220px] text-[13px] border-[var(--admin-border-strong)] bg-[var(--admin-surface)] font-bold text-[var(--admin-text-primary)] shadow-sm"
          >
            <option value="inquiry">Phase 1: Inquiry</option>
            <option value="pending_payment">Phase 2: Booking & Payment</option>
            <option
              value="confirmed"
              disabled={selectedBooking?.pricing?.paymentStatus === 'unpaid'}
            >
              Phase 3: Confirmed & Planning{' '}
              {selectedBooking?.pricing?.paymentStatus === 'unpaid' ? '(Awaiting Payment)' : ''}
            </option>
            <option value="setup_in_progress">Phase 4: Setup & Execution</option>
            <option value="completed">Phase 5: Completed</option>
          </select>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 items-start">
        <motion.div variants={fadeUp} className="flex-1 w-full min-w-0 space-y-6">
          <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl sm:rounded-[var(--admin-radius-xl)] shadow-[var(--admin-shadow-xs)] p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
            <div className="flex flex-col gap-6 items-start">
              <div className="flex-1 space-y-4 w-full">
                <div className="p-3 sm:p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-xl">
                  <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-3 block">
                    Customer Information
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--admin-surface-muted)] border border-[var(--admin-border-strong)] flex items-center justify-center text-[var(--admin-text-secondary)] shrink-0">
                      <span className="material-symbols-outlined text-[20px]">person</span>
                    </div>
                    <div>
                      <span className="text-[14px] font-bold text-[var(--admin-text-primary)] block leading-tight">
                        {selectedBooking.user?.name || 'Unknown Customer'}
                      </span>
                      <span className="text-[12px] text-[var(--admin-text-secondary)] block mt-0.5">
                        {selectedBooking.user?.email || 'No email provided'}
                      </span>
                    </div>
                    <div className="ml-auto text-right">
                      <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-0.5">
                        Account Phone
                      </span>
                      <span className="text-[13px] font-medium text-[var(--admin-text-primary)]">
                        {selectedBooking.user?.phone || 'No phone provided'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 sm:p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-xl">
                  <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-3 block">
                    Event Details
                  </label>

                  {(selectedBooking.eventPackage?.image ||
                    selectedBooking.inspirationImages?.[0]) && (
                    <div className="mb-5 rounded-xl overflow-hidden border border-[var(--admin-border)] h-48 sm:h-64 bg-[var(--admin-surface-muted)] relative group">
                      <img
                        src={
                          selectedBooking.eventPackage?.image ||
                          selectedBooking.inspirationImages?.[0]
                        }
                        alt="Event Showcase"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex justify-between items-end">
                        <div>
                          <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider block">
                            {selectedBooking.eventPackage ? 'Selected Package' : 'Reference Image'}
                          </span>
                          {selectedBooking.eventPackage && (
                            <span className="text-white font-bold text-[15px] block mt-0.5 leading-tight">
                              {selectedBooking.eventPackage.title}
                            </span>
                          )}
                        </div>
                        {selectedBooking.eventPackage && (
                          <button
                            onClick={() =>
                              window.open(`/events/${selectedBooking.eventPackage._id}`, '_blank')
                            }
                            className="text-[10px] bg-white/20 hover:bg-white/30 border border-white/20 text-white px-3 py-1.5 rounded-lg backdrop-blur-md transition-colors font-bold uppercase tracking-wider"
                          >
                            View Package
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                        Event Type
                      </span>
                      <span className="text-[13px] font-medium text-[var(--admin-text-primary)] capitalize">
                        {selectedBooking.eventType}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                        Date
                      </span>
                      <span className="text-[13px] font-medium text-[var(--admin-text-primary)]">
                        {selectedBooking.date
                          ? new Date(selectedBooking.date).toLocaleDateString('en-IN', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Not specified'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                        Timing
                      </span>
                      <span className="text-[13px] font-medium text-[var(--admin-text-primary)]">
                        {selectedBooking.timing?.start || 'N/A'} -{' '}
                        {selectedBooking.timing?.end || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {selectedBooking.customization?.additionalRequests && (
                    <div className="mt-4 pt-4 border-t border-[var(--admin-border)]">
                      <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                        Arrangement Notes & Requests
                      </span>
                      <p className="text-[13px] text-[var(--admin-text-primary)] whitespace-pre-wrap">
                        {selectedBooking.customization.additionalRequests}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-[var(--admin-border)] space-y-1">
                    <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                      Venue Information
                    </span>
                    <span className="text-[13px] font-medium text-[var(--admin-text-primary)] block">
                      {selectedBooking.venue?.name || 'Venue name not specified'}
                    </span>
                    <span className="text-[12px] text-[var(--admin-text-secondary)] block">
                      {selectedBooking.venue?.address || 'Address not specified'}
                    </span>
                    {selectedBooking.venue?.isOutdoor && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider mt-2 inline-block">
                        Outdoor Venue
                      </span>
                    )}
                  </div>
                </div>

                {selectedBooking.pricing && (
                  <>
                    <div className="p-3 sm:p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-xl">
                      <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-3 block">
                        Pricing Summary
                      </label>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[13px]">
                          <span className="text-[var(--admin-text-secondary)]">Rental Fee</span>
                          <span className="font-medium text-[var(--admin-text-primary)]">
                            ₹{selectedBooking.pricing.rentalFee?.toLocaleString('en-IN') || 0}
                          </span>
                        </div>

                        {(selectedBooking.pricing.setupCharges || 0) +
                          (selectedBooking.pricing.transportationCost || 0) >
                          0 && (
                          <div className="flex justify-between items-center text-[13px]">
                            <span className="text-[var(--admin-text-secondary)]">
                              Setup & Transport
                            </span>
                            <span className="font-medium text-[var(--admin-text-primary)]">
                              ₹
                              {(
                                (selectedBooking.pricing.setupCharges || 0) +
                                (selectedBooking.pricing.transportationCost || 0)
                              ).toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}

                        {selectedBooking.pricing.addOnCharges > 0 && (
                          <div className="flex justify-between items-center text-[13px]">
                            <span className="text-[var(--admin-text-secondary)]">Add-Ons</span>
                            <span className="font-medium text-[var(--admin-text-primary)]">
                              ₹{selectedBooking.pricing.addOnCharges.toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}

                        {selectedBooking.pricing.travelExpenseTotal > 0 && (
                          <div className="flex justify-between items-center text-[13px]">
                            <span className="text-[var(--admin-text-secondary)]">
                              Travel Expense
                            </span>
                            <span className="font-medium text-[var(--admin-text-primary)]">
                              ₹{selectedBooking.pricing.travelExpenseTotal.toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}

                        <div className="border-t border-[var(--admin-border)] pt-2 mt-2 flex justify-between items-center text-[14px] font-bold text-[var(--admin-text-primary)]">
                          <span>Total Price</span>
                          <span>
                            ₹
                            {(
                              (selectedBooking.pricing.rentalFee || 0) +
                              (selectedBooking.pricing.setupCharges || 0) +
                              (selectedBooking.pricing.transportationCost || 0) +
                              (selectedBooking.pricing.addOnCharges || 0) +
                              (selectedBooking.pricing.travelExpenseTotal || 0)
                            ).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {selectedBooking.pricing.depositAmount > 0 && (
                          <div className="flex justify-between items-center text-[13px] mt-1">
                            <span className="text-[var(--admin-text-secondary)]">
                              Required Deposit
                            </span>
                            <span className="font-medium text-[var(--admin-text-secondary)]">
                              ₹{selectedBooking.pricing.depositAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-[13px] mt-1">
                          <span className="text-[var(--admin-text-secondary)]">Amount Paid</span>
                          <span
                            className={`font-medium ${
                              (selectedBooking.payments || [])
                                .filter((p) => p.status === 'success')
                                .reduce((sum, p) => sum + (p.amount || 0), 0) > 0
                                ? 'text-green-600'
                                : 'text-[var(--admin-text-tertiary)]'
                            }`}
                          >
                            ₹
                            {(selectedBooking.payments || [])
                              .filter((p) => p.status === 'success')
                              .reduce((sum, p) => sum + (p.amount || 0), 0)
                              .toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-[13px]">
                          <span className="text-[var(--admin-text-secondary)]">
                            Pending Balance
                          </span>
                          <span className="font-medium text-orange-600">
                            ₹
                            {Math.max(
                              0,
                              (selectedBooking.pricing.rentalFee || 0) +
                                (selectedBooking.pricing.setupCharges || 0) +
                                (selectedBooking.pricing.transportationCost || 0) +
                                (selectedBooking.pricing.addOnCharges || 0) -
                                (selectedBooking.payments || [])
                                  .filter((p) => p.status === 'success')
                                  .reduce((sum, p) => sum + (p.amount || 0), 0),
                            ).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment History Ledger */}
                    {selectedBooking.payments && selectedBooking.payments.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-[var(--admin-border)]">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
                          Payment History
                        </label>
                        <div className="space-y-2">
                          {selectedBooking.payments.map((payment, idx) => (
                            <div
                              key={idx}
                              className="bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] rounded p-2 text-[11px]"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <span className="font-bold text-[var(--admin-success)]">
                                    ₹{(payment.amount || 0).toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-[10px] text-[var(--admin-text-tertiary)] ml-2">
                                    {new Date(payment.date).toLocaleString('en-IN', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                {payment.source === 'manual' && (
                                  <button
                                    onClick={() => handleDeletePayment(payment.transactionId)}
                                    className="text-[var(--admin-error)] hover:text-red-700 p-0.5"
                                    title="Undo / Delete Payment"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      delete
                                    </span>
                                  </button>
                                )}
                              </div>
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-[var(--admin-text-secondary)]">
                                  <span className="uppercase font-bold">
                                    {payment.paymentMethod || 'razorpay'}
                                  </span>
                                  {' • '}
                                  {payment.source === 'manual' ? 'Manual' : 'Online'}
                                </span>
                                {payment.recordedBy && (
                                  <span className="text-[var(--admin-text-tertiary)] italic">
                                    by {payment.recordedBy}
                                  </span>
                                )}
                              </div>
                              {payment.note && (
                                <div
                                  className="mt-1 text-[var(--admin-text-tertiary)] text-[9px] truncate"
                                  title={payment.note}
                                >
                                  Note: {payment.note}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Record Payment Action */}
                    {selectedBooking.pricing?.paymentStatus !== 'paid' && (
                      <div className="mt-4 pt-4 border-t border-[var(--admin-border)]">
                        <button
                          onClick={() => setShowPaymentModal(true)}
                          className="w-full admin-btn admin-btn-outline h-9 text-[12px] flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">payments</span>
                          Record Manual Payment
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Desktop Inline Chat Window */}
        <div className="hidden lg:flex w-[400px] shrink-0 h-[calc(100vh-8rem)] sticky top-24 bg-[var(--admin-surface)] rounded-2xl shadow-[var(--admin-shadow-sm)] border border-[var(--admin-border-subtle)] overflow-hidden flex-col">
          {chatUI(true)}
        </div>
      </div>

      {/* Floating Action Button for Mobile/Tablet */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-24 right-4 sm:bottom-10 sm:right-10 w-14 h-14 rounded-full bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white shadow-[var(--admin-shadow-md)] hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center z-40"
        >
          <MessageCircle className="w-6 h-6" />
          {selectedBooking?.chatHistory?.length > 0 && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-[var(--admin-surface)]" />
          )}
        </button>

        {/* Chat Drawer / Modal */}
        <AnimatePresence>
          {isChatOpen && (
            <div className="fixed inset-0 z-50 flex items-end justify-end pointer-events-none sm:p-8 sm:pb-28">
              {/* Mobile Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsChatOpen(false)}
                className="absolute inset-0 bg-black/40 sm:hidden pointer-events-auto backdrop-blur-sm"
              />

              {/* Chat Window */}
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="bg-[var(--admin-surface)] w-full h-[85vh] sm:w-[400px] sm:h-[600px] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col pointer-events-auto border border-[var(--admin-border-subtle)] overflow-hidden relative z-10"
              >
                {chatUI(false)}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

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
    </motion.div>
  );
}
