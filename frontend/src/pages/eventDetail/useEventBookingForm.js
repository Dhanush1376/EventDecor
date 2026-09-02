import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { bookingService } from '../../services/domainServices';
import logger from '../../utils/core/logger';

import { EXTERNAL_URLS } from '../../config/constants';

export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = EXTERNAL_URLS.RAZORPAY_CHECKOUT;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export function useEventBookingForm(event, isAuthenticated, runProtectedAction, navigate, user) {
  const [customInclusions, setCustomInclusions] = useState([]);
  const [rentalDurationDays, setRentalDurationDays] = useState(1);
  const [selectedPaletteColor, setSelectedPaletteColor] = useState('');
  const [placementPreference, setPlacementPreference] = useState('Side-Stage Showcase Corner');
  const [customNote, setCustomNote] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [venueDetails, setVenueDetails] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isManualLocationInput, setIsManualLocationInput] = useState(false);

  const [manualVenueName, setManualVenueName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [manualState, setManualState] = useState('');
  const [manualPincode, setManualPincode] = useState('');

  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('09:00 PM');
  const [isOutdoor, setIsOutdoor] = useState(false);
  const [customizerStep, setCustomizerStep] = useState(1);
  const [eventType, setEventType] = useState('');
  const [customOccasion, setCustomOccasion] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [contactPhone, setContactPhone] = useState('');

  // Sync Phone Number when user object is loaded
  useEffect(() => {
    if (user && user.phone) {
      setContactPhone(user.phone);
    }
  }, [user]);

  // Initialization & Load Draft
  useEffect(() => {
    if (event) {
      const eventId = event._id || event.id;
      const draftKey = `eventDecor_draft_${eventId}`;
      const savedDraft = localStorage.getItem(draftKey);

      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed.customInclusions) setCustomInclusions(parsed.customInclusions);
          if (parsed.selectedPaletteColor) setSelectedPaletteColor(parsed.selectedPaletteColor);
          if (parsed.placementPreference) setPlacementPreference(parsed.placementPreference);
          if (parsed.customNote) setCustomNote(parsed.customNote);
          if (parsed.bookingDate) setBookingDate(parsed.bookingDate);
          if (parsed.venueDetails) setVenueDetails(parsed.venueDetails);
          if (parsed.isManualLocationInput !== undefined)
            setIsManualLocationInput(parsed.isManualLocationInput);

          if (parsed.startTime) setStartTime(parsed.startTime);
          if (parsed.endTime) setEndTime(parsed.endTime);
          if (parsed.isOutdoor !== undefined) setIsOutdoor(parsed.isOutdoor);
          if (parsed.eventType) setEventType(parsed.eventType);
          if (parsed.customOccasion) setCustomOccasion(parsed.customOccasion);
          if (parsed.contactPhone) setContactPhone(parsed.contactPhone);
          return;
        } catch (e) {
          logger.error('Failed to parse draft', e);
        }
      }

      const defaultInclusions = [
        { name: 'Traditional Backdrop Panel Setup', defaultQty: 1 },
        { name: 'Mysore Brass Urlis & Diyas', defaultQty: 2 },
        { name: 'Fresh Marigold Garland Hangings', defaultQty: 4 },
      ];
      setCustomInclusions(
        event.inclusions?.map((inc) => ({ ...inc, selected: true, qty: inc.defaultQty || 1 })) ||
          defaultInclusions.map((inc) => ({ ...inc, selected: true, qty: inc.defaultQty })),
      );
      setSelectedPaletteColor(event.colorPalette?.[0] || '#8B0000');

      setEventType('');
      setCustomOccasion('');
    }
  }, [event]);

  // Save Draft
  useEffect(() => {
    if (event) {
      const eventId = event._id || event.id;
      const draftKey = `eventDecor_draft_${eventId}`;
      const draft = {
        customInclusions,
        selectedPaletteColor,
        placementPreference,
        customNote,
        bookingDate,
        venueDetails,
        isManualLocationInput,

        startTime,
        endTime,
        isOutdoor,
        eventType,
        customOccasion,
        contactPhone,
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    }
  }, [
    event,
    customInclusions,
    selectedPaletteColor,
    placementPreference,
    customNote,
    bookingDate,
    venueDetails,
    isManualLocationInput,

    startTime,
    endTime,
    isOutdoor,
    eventType,
    customOccasion,
    contactPhone,
  ]);

  // Sync Venue Details
  useEffect(() => {
    if (venueDetails) {
      setManualVenueName(venueDetails.name || '');
      setManualAddress(venueDetails.address || '');
      setManualCity(venueDetails.city || '');
      setManualState(venueDetails.state || '');
      setManualPincode(venueDetails.pincode || '');
    }
  }, [venueDetails]);

  const handleManualFieldChange = (field, value) => {
    const updated = {
      ...(venueDetails || {
        name: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
        latitude: null,
        longitude: null,
        googleMapsLink: '',
      }),
      [field]: value,
    };
    const namePart = updated.name ? updated.name + ', ' : '';
    const fullSearch =
      `${namePart}${updated.address} ${updated.city} ${updated.state} ${updated.pincode}`.trim();
    updated.googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullSearch)}`;
    setVenueDetails(updated);
  };

  const calculateLivePrice = () => {
    if (!event) return 0;
    let basePrice = event.basePrice || 35000;
    if (!event.basePrice) {
      if (event.rentalPrice) basePrice = Number(event.rentalPrice);
      else if (event.pricing) basePrice = parseInt(event.pricing.replace(/[^0-9]/g, '')) || 35000;
    }
    const durationMultiplier =
      rentalDurationDays === 1
        ? 1
        : rentalDurationDays === 2
          ? 1.5
          : 1.5 + (rentalDurationDays - 2) * 0.4;
    return Math.round(basePrice * durationMultiplier);
  };

  const validateStep1 = () => {
    if (eventType === 'other' && !customOccasion.trim()) {
      toast.error('Please specify your custom occasion.');
      return false;
    }
    if (!contactPhone || contactPhone.trim().length < 10) {
      toast.error('Please enter a valid Phone Number.');
      return false;
    }
    if (!bookingDate) {
      toast.error('Please select a Ceremony Date.');
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(bookingDate) < today) {
      toast.error('Ceremony Date cannot be in the past.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const finalAddress = isManualLocationInput
      ? `${manualVenueName ? manualVenueName + ', ' : ''}${manualAddress} ${manualCity} ${manualState} ${manualPincode}`.trim()
      : venueDetails?.address || '';

    if (!finalAddress) {
      toast.error('Please configure your venue location (either by map or manual entry).');
      return false;
    }
    if (isManualLocationInput) {
      if (!manualVenueName.trim()) {
        toast.error('Please enter a Venue Name.');
        return false;
      }
      if (!manualAddress.trim()) {
        toast.error('Please enter the Full Address.');
        return false;
      }
      if (!manualCity.trim()) {
        toast.error('Please enter the City.');
        return false;
      }
      if (!manualState.trim()) {
        toast.error('Please enter the State.');
        return false;
      }
      if (!manualPincode.trim()) {
        toast.error('Please enter the Pincode.');
        return false;
      }
      if (!/^\d{6}$/.test(manualPincode.trim())) {
        toast.error('Pincode must be exactly 6 digits.');
        return false;
      }
    }
    return true;
  };

  const handleReserveOnly = async () => {
    if (!isAuthenticated) {
      runProtectedAction(() => handleReserveOnly());
      return;
    }
    if (!validateStep1()) {
      setCustomizerStep(1);
      return;
    }
    if (!validateStep2()) {
      setCustomizerStep(2);
      return;
    }

    const loadId = toast.loading('Reserving venue securely...');
    try {
      const venuePayload = isManualLocationInput
        ? {
            name: manualVenueName,
            address: manualAddress,
            city: manualCity,
            state: manualState,
            pincode: manualPincode,
            country: 'India',
            isOutdoor,
            googleMapsLink: venueDetails?.googleMapsLink || '',
          }
        : {
            name: venueDetails?.name,
            address: venueDetails?.address,
            city: venueDetails?.city,
            state: venueDetails?.state,
            pincode: venueDetails?.pincode,
            country: venueDetails?.country || 'India',
            latitude: venueDetails?.latitude,
            longitude: venueDetails?.longitude,
            googleMapsLink: venueDetails?.googleMapsLink,
            isOutdoor,
          };

      const checkoutPayload = {
        eventPackageId: event._id || event.id,
        eventType: eventType === 'other' ? customOccasion : eventType,
        title: `${event.title} Booking`,
        date: bookingDate,
        rentalDurationDays,
        timing: { start: startTime, end: endTime },

        contactPhone,
        venue: venuePayload,
        customization: {
          themeColor: selectedPaletteColor || event.colorPalette?.[0] || 'Standard',
          floralPreference: 'Standard Garlands',
          lightingPreference: 'Standard Lighting',
          stageSize: 'Standard',
          additionalRequests: customNote || '',
        },
        selectedAddons: [],
        inspirationImages: [],
      };

      const res = await bookingService.create(checkoutPayload);
      if (res && res.success) {
        localStorage.removeItem(`eventDecor_draft_${event._id || event.id}`);
        toast.dismiss(loadId);
        toast.success('Venue reserved successfully! Our team will contact you.');
        setIsDrawerOpen(false);
      } else {
        toast.dismiss(loadId);
        toast.error(res.message || 'Failed to reserve the venue.');
      }
    } catch (err) {
      logger.error('Error reserving venue:', err);
      toast.dismiss(loadId);
      toast.error('Something went wrong while reserving.');
    }
  };

  const handleBookRental = async () => {
    if (!isAuthenticated) {
      runProtectedAction(() => handleBookRental());
      return;
    }
    if (!validateStep1()) {
      setCustomizerStep(1);
      return;
    }
    if (!validateStep2()) {
      setCustomizerStep(2);
      return;
    }

    const loadId = toast.loading('Initializing secure checkout...');
    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        toast.dismiss(loadId);
        toast.error('Failed to load payment gateway.');
        return;
      }

      const venuePayload = isManualLocationInput
        ? {
            name: manualVenueName,
            address: manualAddress,
            city: manualCity,
            state: manualState,
            pincode: manualPincode,
            country: 'India',
            isOutdoor,
            googleMapsLink: venueDetails?.googleMapsLink || '',
          }
        : {
            name: venueDetails?.name,
            address: venueDetails?.address,
            city: venueDetails?.city,
            state: venueDetails?.state,
            pincode: venueDetails?.pincode,
            country: venueDetails?.country || 'India',
            latitude: venueDetails?.latitude,
            longitude: venueDetails?.longitude,
            googleMapsLink: venueDetails?.googleMapsLink,
            isOutdoor,
          };

      const checkoutPayload = {
        eventPackageId: event._id || event.id,
        eventType: eventType === 'other' ? customOccasion : eventType,
        title: `${event.title} Booking`,
        date: bookingDate,
        rentalDurationDays,
        timing: { start: startTime, end: endTime },

        contactPhone,
        venue: venuePayload,
        customization: {
          themeColor: selectedPaletteColor || event.colorPalette?.[0] || 'Standard',
          floralPreference: 'Standard Garlands',
          lightingPreference: 'Standard Lighting',
          stageSize: 'Standard',
          additionalRequests: customNote || '',
        },
        selectedAddons: [],
        inspirationImages: [],
      };

      const initRes = await bookingService.initializeCheckout(checkoutPayload);
      if (!initRes.success || !initRes.data) {
        toast.dismiss(loadId);
        toast.error(initRes.message || 'Failed to initialize checkout.');
        return;
      }

      const { bookingId, razorpayOrderId, amount, currency, key } = initRes.data;
      toast.dismiss(loadId);

      const options = {
        key,
        amount: amount * 100,
        currency,
        name: 'Siri Arts & Crafts',
        description: `Advance Deposit for ${event.title}`,
        order_id: razorpayOrderId,
        handler: async function (response) {
          const verifyLoadId = toast.loading('Verifying your payment securely...');
          try {
            const verifyRes = await bookingService.verifyCheckout({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              bookingId,
            });
            toast.dismiss(verifyLoadId);
            if (verifyRes && verifyRes.success) {
              localStorage.removeItem(`eventDecor_draft_${event._id || event.id}`);
              toast.success('Payment successful! Your luxury event is confirmed.');
              setIsDrawerOpen(false);
              navigate(`/booking-success/${bookingId}`);
            } else {
              toast.error(verifyRes.message || 'Payment verification failed.');
            }
          } catch (err) {
            toast.dismiss(verifyLoadId);
            logger.error('Verification Error:', err);
            toast.error('An error occurred during verification. Contact support.');
          }
        },
        prefill: { name: 'Customer', email: 'customer@example.com' },
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
      toast.error(err.response?.data?.message || 'An error occurred.');
    }
  };

  return {
    state: {
      customInclusions,
      rentalDurationDays,
      selectedPaletteColor,
      placementPreference,
      customNote,
      bookingDate,
      venueDetails,
      isLocationModalOpen,
      isManualLocationInput,
      manualVenueName,
      manualAddress,
      manualCity,
      manualState,
      manualPincode,

      startTime,
      endTime,
      isOutdoor,
      customizerStep,
      eventType,
      customOccasion,
      isDrawerOpen,
      contactPhone,
    },
    actions: {
      setCustomInclusions,
      setRentalDurationDays,
      setSelectedPaletteColor,
      setPlacementPreference,
      setCustomNote,
      setBookingDate,
      setVenueDetails,
      setIsLocationModalOpen,
      setIsManualLocationInput,
      setManualVenueName,
      setManualAddress,
      setManualCity,
      setManualState,
      setManualPincode,

      setStartTime,
      setEndTime,
      setIsOutdoor,
      setCustomizerStep,
      setEventType,
      setCustomOccasion,
      setIsDrawerOpen,
      setContactPhone,
      handleManualFieldChange,
      calculateLivePrice,
      handleBookRental,
      handleReserveOnly,
      validateStep1,
      validateStep2,
    },
  };
}
