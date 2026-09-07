import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { persistentStorage } from '../../utils/storage/persistentStorage';
import { userService } from '../../services/domainServices';
import logger from '../../utils/core/logger';
import { sanitizePhoneNumber, isValidPhoneNumber } from '../../utils/phoneUtils';
import { detectAndResolveAddress } from '../../utils/locationService';

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
        phone: user?.phone ? sanitizePhoneNumber(user.phone) : '',
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
          phone: prev.phone || (user.phone ? sanitizePhoneNumber(user.phone) : ''),
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

  const handleFetchCurrentLocation = async () => {
    setIsDetectingLocation(true);
    const toastId = toast.loading('Detecting your location...');

    try {
      const res = await detectAndResolveAddress();
      if (res.success && res.data) {
        const d = res.data;
        setNewAddress((prev) => ({
          ...prev,
          pincode: d.pincode || prev.pincode,
          address: d.address || prev.address,
          locality: d.locality || prev.locality,
          landmark: d.landmark || prev.landmark || d.locality || d.city,
          city: d.city || prev.city,
          state: d.state || prev.state,
          country: d.country || prev.country || 'India',
          latitude: d.latitude ?? prev.latitude,
          longitude: d.longitude ?? prev.longitude,
        }));
        const successMsg =
          res.source === 'gps'
            ? 'Address auto-filled from GPS location!'
            : 'Address detected from network!';
        toast.success(successMsg, { id: toastId });
      } else {
        toast.error(res.error || 'Could not resolve location. Please fill manually.', {
          id: toastId,
        });
      }
    } catch (err) {
      logger.error('Location detection error:', err);
      toast.error('Location detection failed. Please fill details manually.', { id: toastId });
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSaveNewAddress = async (e) => {
    e.preventDefault();
    const cleanedPhone = sanitizePhoneNumber(newAddress.phone);
    const cleanedAltPhone = newAddress.alternatePhone
      ? sanitizePhoneNumber(newAddress.alternatePhone)
      : '';

    // Normalize phone numbers in state immediately
    if (
      cleanedPhone !== newAddress.phone ||
      cleanedAltPhone !== (newAddress.alternatePhone || '')
    ) {
      setNewAddress((prev) => ({
        ...prev,
        phone: cleanedPhone,
        alternatePhone: cleanedAltPhone,
      }));
    }

    if (
      !newAddress.name?.trim() ||
      !cleanedPhone ||
      !newAddress.address?.trim() ||
      !newAddress.locality?.trim() ||
      !newAddress.pincode?.trim() ||
      !newAddress.city?.trim() ||
      !newAddress.state?.trim()
    ) {
      setAddressError(
        'Please fill in all mandatory address parameters (Name, Phone, Address, Locality, Pincode, City, State).',
      );
      return;
    }
    if (!isValidPhoneNumber(cleanedPhone)) {
      setAddressError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (newAddress.alternatePhone && !isValidPhoneNumber(cleanedAltPhone)) {
      setAddressError('Please enter a valid 10-digit alternate mobile number.');
      return;
    }
    if (newAddress.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAddress.email.trim())) {
      setAddressError('Please enter a valid email address.');
      return;
    }
    const cleanPincode = String(newAddress.pincode || '')
      .replace(/\D/g, '')
      .slice(0, 6);
    if (cleanPincode.length !== 6) {
      setAddressError('Please enter a valid 6-digit pincode.');
      return;
    }
    const payload = {
      name: newAddress.name.trim(),
      phone: cleanedPhone,
      alternatePhone: cleanedAltPhone || undefined,
      email: newAddress.email?.trim() || undefined,
      pincode: cleanPincode,
      locality: newAddress.locality.trim(),
      addressString: newAddress.address.trim(),
      landmark: newAddress.landmark?.trim() || undefined,
      city: newAddress.city.trim(),
      state: newAddress.state.trim(),
      country: newAddress.country || 'India',
      tag: newAddress.tag || 'Home',
      deliveryInstructions: newAddress.deliveryInstructions?.trim() || undefined,
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
