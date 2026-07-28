import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { persistentStorage } from '../../utils/storage/persistentStorage';
import { userService } from '../../services/domainServices';
import logger from '../../utils/core/logger';

export function useCheckoutShipping({ isAuthenticated, user, setActiveStep, setIsProcessing }) {
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    return persistentStorage.getItem('siri_checkout_selected_address_id', {
      session: true,
      fallback: null,
    });
  });
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(() => {
    return persistentStorage.getItem('siri_checkout_is_adding_address', {
      session: true,
      fallback: false,
    });
  });

  useEffect(() => {
    if (selectedAddressId) {
      persistentStorage.setItem('siri_checkout_selected_address_id', selectedAddressId, {
        session: true,
      });
    } else {
      persistentStorage.removeItem('siri_checkout_selected_address_id', { session: true });
    }
  }, [selectedAddressId]);

  useEffect(() => {
    persistentStorage.setItem('siri_checkout_is_adding_address', isAddingNewAddress, {
      session: true,
    });
  }, [isAddingNewAddress]);

  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [addressError, setAddressError] = useState('');

  const [newAddress, setNewAddress] = useState(() => {
    return persistentStorage.getItem('siri_checkout_new_address', {
      session: true,
      fallback: {
        name: user?.name || '',
        phone: user?.phone || '',
        alternatePhone: '',
        email: user?.email || '',
        pincode: '',
        locality: '',
        address: '',
        landmark: '',
        city: '',
        state: '',
        country: 'India',
        tag: 'Home',
        deliveryInstructions: '',
        latitude: null,
        longitude: null,
      },
    });
  });

  useEffect(() => {
    persistentStorage.setItem('siri_checkout_new_address', newAddress, { session: true });
  }, [newAddress]);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setNewAddress((prev) => ({
          ...prev,
          name: prev.name || user.name || '',
          phone: prev.phone || user.phone || '',
          email: prev.email || user.email || '',
        }));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const [isAddressesLoading, setIsAddressesLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      setIsAddressesLoading(true);
      userService
        .getAddresses()
        .then((res) => {
          if (res.success && res.data) {
            setSavedAddresses(res.data);
            const savedAddrId = persistentStorage.getItem('siri_checkout_selected_address_id', {
              session: true,
            });
            const savedIsAdding = persistentStorage.getItem('siri_checkout_is_adding_address', {
              session: true,
            });

            if (
              savedAddrId &&
              res.data.some((a) => String(a._id || a.id) === String(savedAddrId))
            ) {
              setSelectedAddressId(savedAddrId);
              setIsAddingNewAddress(savedIsAdding === true);
            } else {
              const defaultAddr = res.data.find((a) => a.isDefault) || res.data[0];
              if (defaultAddr) {
                setSelectedAddressId(defaultAddr._id || defaultAddr.id);
                setIsAddingNewAddress(false);
              } else {
                setIsAddingNewAddress(false);
              }
            }
          }
        })
        .catch((err) => {
          logger.error('Failed to load addresses:', err);
        })
        .finally(() => {
          setIsAddressesLoading(false);
        });
    } else {
      setIsAddressesLoading(false);
    }
  }, [isAuthenticated]);

  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsDetectingLocation(true);
    const toastId = toast.loading('Accessing device GPS location...');

    const reverseGeocode = async (latitude, longitude) => {
      toast.loading('Resolving coordinates to address...', { id: toastId });
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 12000);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`,
          {
            signal: controller.signal,
            headers: {
              Accept: 'application/json',
              'Accept-Language': 'en',
              'User-Agent': 'Siri Arts & CraftsAndCrafts/1.0 (checkout address autofill)',
            },
          },
        );
        clearTimeout(fetchTimeout);

        if (!res.ok) throw new Error(`Geocoding API returned ${res.status}`);

        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          const rawPincode = addr.postcode || '';
          const pincode = rawPincode.replace(/\D/g, '').slice(0, 6);
          const city =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.municipality ||
            addr.county ||
            addr.state_district ||
            '';
          const state = addr.state || '';
          const country = addr.country || 'India';

          const streetParts = [];
          if (addr.house_number) streetParts.push(addr.house_number);
          if (addr.building) streetParts.push(addr.building);
          if (addr.road || addr.street) streetParts.push(addr.road || addr.street);
          if (addr.suburb) streetParts.push(addr.suburb);
          if (addr.neighbourhood) streetParts.push(addr.neighbourhood);
          const addressString =
            streetParts.length > 0
              ? streetParts.join(', ')
              : data.display_name?.split(',').slice(0, 4).join(',').trim() || '';

          const locality =
            addr.suburb ||
            addr.neighbourhood ||
            addr.subdistrict ||
            addr.locality ||
            addr.city_district ||
            city ||
            '';

          const landmark =
            addr.amenity || addr.shop || addr.office || addr.tourism || addr.leisure || '';

          setNewAddress((prev) => ({
            ...prev,
            pincode,
            address: addressString,
            locality,
            landmark: landmark || prev.landmark || locality || city,
            city,
            state,
            country,
            latitude,
            longitude,
          }));

          toast.success('Address auto-filled from your location!', { id: toastId });
        } else {
          throw new Error('Geocoding API returned no address data for this coordinate');
        }
      } catch (err) {
        clearTimeout(fetchTimeout);
        if (err.name === 'AbortError') {
          toast.error('Address lookup timed out. Please fill in manually.', { id: toastId });
        } else {
          logger.error('Reverse geocode failed:', err);
          toast.error('Could not resolve address. Check your connection or fill manually.', {
            id: toastId,
          });
        }
      } finally {
        setIsDetectingLocation(false);
      }
    };

    const getPosition = (highAccuracy = true) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          reverseGeocode(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          if (
            highAccuracy &&
            (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)
          ) {
            logger.warn('High accuracy GPS timed out. Retrying with standard accuracy...');
            toast.loading('Retrying with standard accuracy...', { id: toastId });
            getPosition(false);
          } else {
            setIsDetectingLocation(false);
            let errorMsg = 'Failed to access your location. Please fill details manually.';
            if (error.code === error.PERMISSION_DENIED) {
              errorMsg =
                'Location permission denied. Please allow browser location access and try again.';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              errorMsg = 'Location unavailable. Please check GPS/network and try again.';
            } else if (error.code === error.TIMEOUT) {
              errorMsg = 'Location request timed out. Please try again or fill manually.';
            }
            logger.error('Geolocation error:', error.code, error.message);
            toast.error(errorMsg, { id: toastId });
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 10000 : 20000,
          maximumAge: highAccuracy ? 0 : 60000,
        },
      );
    };

    getPosition(true);
  };

  const handleSaveNewAddress = async (e) => {
    e.preventDefault();
    if (
      !newAddress.name ||
      !newAddress.phone ||
      !newAddress.address ||
      !newAddress.locality ||
      !newAddress.pincode ||
      !newAddress.city ||
      !newAddress.state
    ) {
      setAddressError(
        'Please fill in all mandatory address parameters (Name, Phone, Address, Locality, Pincode, City, State).',
      );
      return;
    }
    if (!/^\d{10}$/.test(newAddress.phone)) {
      setAddressError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (newAddress.alternatePhone && !/^\d{10}$/.test(newAddress.alternatePhone)) {
      setAddressError('Please enter a valid 10-digit alternate mobile number.');
      return;
    }
    if (newAddress.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAddress.email)) {
      setAddressError('Please enter a valid email address.');
      return;
    }
    if (!/^\d{6}$/.test(newAddress.pincode)) {
      setAddressError('Please enter a valid 6-digit pincode.');
      return;
    }
    const payload = {
      name: newAddress.name,
      phone: newAddress.phone,
      alternatePhone: newAddress.alternatePhone || undefined,
      email: newAddress.email || undefined,
      pincode: newAddress.pincode,
      locality: newAddress.locality,
      addressString: newAddress.address,
      landmark: newAddress.landmark || undefined,
      city: newAddress.city,
      state: newAddress.state,
      country: newAddress.country || 'India',
      tag: newAddress.tag || 'Home',
      deliveryInstructions: newAddress.deliveryInstructions || undefined,
      latitude: newAddress.latitude,
      longitude: newAddress.longitude,
    };
    try {
      setIsProcessing(true);
      let res;
      if (newAddress.id) {
        res = await userService.updateAddress(newAddress.id, payload);
      } else {
        res = await userService.addAddress(payload);
      }
      if (res.success && res.data) {
        setSavedAddresses(res.data);
        const newlyCreated = res.data[res.data.length - 1];
        setSelectedAddressId(newlyCreated._id || newlyCreated.id);
        setIsAddingNewAddress(false);
        setAddressError('');
        setActiveStep(2);
        toast.success('Delivery address saved successfully!');
      }
    } catch (err) {
      setAddressError(err.response?.data?.message || 'Failed to save address. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const activeSelectedAddress = useMemo(() => {
    return (
      savedAddresses.find((a) => String(a._id || a.id) === String(selectedAddressId)) ||
      savedAddresses[0]
    );
  }, [savedAddresses, selectedAddressId]);

  return {
    savedAddresses,
    setSavedAddresses,
    selectedAddressId,
    setSelectedAddressId,
    isAddingNewAddress,
    setIsAddingNewAddress,
    isDetectingLocation,
    isAddressesLoading,
    newAddress,
    setNewAddress,
    addressError,
    setAddressError,
    handleFetchCurrentLocation,
    handleSaveNewAddress,
    activeSelectedAddress,
  };
}
