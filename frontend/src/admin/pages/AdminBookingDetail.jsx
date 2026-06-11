import { useState, useEffect, useRef } from 'react';
import { m as motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingService, userService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import { fadeUp, stagger, SkeletonDashboard } from '../components/AdminUIKit';
import logger from '../../utils/logger';
import { getErrorMessage } from '../../utils/errorHelpers';

export function AdminBookingDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);

  // Advanced States
  const [drawerStatus, setDrawerStatus] = useState('inquiry');
  const [drawerNotes, setDrawerNotes] = useState('');
  const [drawerChatMsg, setDrawerChatMsg] = useState('');
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
      } catch (err) {
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

  if (dataLoading || !selectedBooking) {
    return (
      <div className="max-w-[1280px] mx-auto space-y-6 pb-20 p-6">
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="max-w-[1280px] mx-auto space-y-6 pb-20 p-4 sm:p-0"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/events')}
            className="admin-btn-icon w-10 h-10 min-h-0 bg-[var(--admin-surface)] border border-[var(--admin-border)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
              EVENT BOOKING DETAILS
            </span>
            <h3 className="text-[20px] font-bold text-[var(--admin-text-primary)]">
              {selectedBooking.title}
            </h3>
            <p className="text-[12px] text-[var(--admin-text-secondary)] mt-1">
              Customer: {selectedBooking.user?.name} | {selectedBooking.user?.phone}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={fadeUp} className="lg:col-span-2 space-y-6">
          <div className="admin-card p-6 md:p-8 space-y-8">
            <div className="space-y-2">
              <label className="admin-label">Change Booking Status</label>
              <select
                value={drawerStatus}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                className="admin-input h-10 font-bold capitalize"
              >
                <option value="inquiry">Inquiry Received</option>
                <option value="review">Under Review</option>
                <option value="confirmed">Booking Confirmed</option>
                <option value="team_assigned">Staff Assigned</option>
                <option value="setup_in_progress">Setup In Progress</option>
                <option value="active">Event Active & Live</option>
                <option value="completed">Completed & Cleaned Up</option>
              </select>
            </div>

            <div className="space-y-4 pt-5 border-t border-[var(--admin-border-subtle)]">
              <span className="admin-label mb-0">Price Estimates</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">
                    Theme Rental Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={quoteRental}
                    onChange={(e) => setQuoteRental(e.target.value)}
                    className="admin-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">
                    Labor & Setup Charges (₹)
                  </label>
                  <input
                    type="number"
                    value={quoteSetup}
                    onChange={(e) => setQuoteSetup(e.target.value)}
                    className="admin-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">
                    Transportation (₹)
                  </label>
                  <input
                    type="number"
                    value={quoteTransport}
                    onChange={(e) => setQuoteTransport(e.target.value)}
                    className="admin-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">
                    Add-ons (₹)
                  </label>
                  <input
                    type="number"
                    value={quoteAddons}
                    onChange={(e) => setQuoteAddons(e.target.value)}
                    className="admin-input"
                    disabled
                  />
                </div>
              </div>
              <button
                onClick={handleUpdateQuotation}
                className="admin-btn admin-btn-primary w-full h-10"
              >
                Save & Send Price Estimate
              </button>
            </div>

            <div className="space-y-4 pt-5 border-t border-[var(--admin-border-subtle)]">
              <span className="admin-label mb-0">Setup & Pickup Schedule</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">
                    Setup Time
                  </label>
                  <input
                    type="datetime-local"
                    value={logisticsSetup}
                    onChange={(e) => setLogisticsSetup(e.target.value)}
                    className="admin-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">
                    Pickup Time
                  </label>
                  <input
                    type="datetime-local"
                    value={logisticsPickup}
                    onChange={(e) => setLogisticsPickup(e.target.value)}
                    className="admin-input"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-5 border-t border-[var(--admin-border-subtle)]">
              <div className="flex items-center justify-between">
                <span className="admin-label mb-0">Celebration Venue & Map</span>
                <span className="admin-badge admin-badge-info">Interactive Geocoding</span>
              </div>
              <div className="relative w-full h-[200px] rounded-[var(--admin-radius-xl)] overflow-hidden border border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]">
                <div id="admin-leaflet-map" className="w-full h-full z-10" />
              </div>
              <p className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
                📍 Drag the marker or click on the map to auto-geocode fields!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">
                    Venue Name
                  </label>
                  <input
                    type="text"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    className="admin-input"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">
                    Address
                  </label>
                  <textarea
                    rows={2}
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    className="admin-textarea"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={venueLatitude}
                    onChange={(e) => handleAdminCoordInputChange('lat', e.target.value)}
                    className="admin-input font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={venueLongitude}
                    onChange={(e) => handleAdminCoordInputChange('lng', e.target.value)}
                    className="admin-input font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-5 border-t border-[var(--admin-border-subtle)]">
              <span className="admin-label mb-0">Assign Staff</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teamMembers.map((member) => {
                  const isAllocated = allocatedTeam.some((t) => t.name === member.name);
                  return (
                    <div
                      key={member.name}
                      onClick={() =>
                        handleTeamMemberToggle(member.name, member.role, member.contact)
                      }
                      className={`p-3 rounded-[var(--admin-radius-lg)] border cursor-pointer transition-all flex justify-between items-center ${isAllocated ? 'bg-[var(--admin-surface-muted)] border-[var(--admin-border-strong)]' : 'border-[var(--admin-border-subtle)] hover:border-[var(--admin-border-strong)]'}`}
                    >
                      <div>
                        <span className="text-[12px] font-bold text-[var(--admin-text-primary)] block">
                          {member.name}
                        </span>
                        <span className="text-[10px] text-[var(--admin-text-tertiary)] block capitalize">
                          {member.role}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isAllocated}
                        readOnly
                        className="w-4 h-4 rounded-[4px] border-[var(--admin-border-strong)] accent-[var(--admin-accent)] cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={handleUpdateLogistics} className="admin-btn w-full h-11 text-[12px]">
              Save Timeline & Staff
            </button>
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-xl)] p-6 flex flex-col h-[600px] sticky top-24"
        >
          <div className="border-b border-[var(--admin-border-subtle)] pb-4 shrink-0 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                CLIENT CHAT
              </span>
              <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                Customer Messages
              </h4>
            </div>
            <span className="material-symbols-outlined text-[20px] text-[var(--admin-accent)]">
              forum
            </span>
          </div>

          <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-2 custom-scrollbar flex flex-col">
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
            className="pt-4 shrink-0 flex items-center gap-2 mt-auto"
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
        </motion.div>
      </div>
    </motion.div>
  );
}
