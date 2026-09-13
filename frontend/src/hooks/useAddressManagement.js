import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { sanitizePhoneNumber, isValidPhoneNumber } from '../utils/phoneUtils';
import { reverseGeocodeCoords, detectAndResolveAddress } from '../utils/locationService';

export function useAddressManagement({
  user,
  editingAddressId,
  addresses,
  userService,
  refetchDashboardData,
  setIsAddressModalOpen,
}) {
  const [addressFormData, setAddressFormData] = useState(null);
  const [isAddressSaving, setIsAddressSaving] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [mapPosition, setMapPosition] = useState({ lat: 20.5937, lng: 78.9629 }); // Default India

  useEffect(() => {
    if (editingAddressId === 'new') {
      setAddressFormData({
        id: 'new',
        name: user?.name && user.name !== 'Customer' ? user.name : '',
        phone: user?.phone ? sanitizePhoneNumber(user.phone) : '',
        alternatePhone: '',
        email: user?.email || '',
        pincode: '',
        locality: '',
        addressString: '',
        landmark: '',
        city: '',
        state: '',
        country: 'India',
        tag: 'Home',
        deliveryInstructions: '',
        latitude: null,
        longitude: null,
      });
    } else if (addresses && editingAddressId) {
      const addr = addresses.find((a) => (a._id || a.id) === editingAddressId);
      if (addr) {
        setAddressFormData({
          id: addr._id || addr.id,
          name: addr.name || '',
          phone: sanitizePhoneNumber(addr.phone || ''),
          alternatePhone: sanitizePhoneNumber(addr.alternatePhone || ''),
          email: addr.email || user?.email || '',
          pincode: addr.pincode || '',
          locality: addr.locality || '',
          addressString: addr.addressString || '',
          landmark: addr.landmark || '',
          city: addr.city || '',
          state: addr.state || '',
          country: addr.country || 'India',
          tag: addr.tag || 'Home',
          deliveryInstructions: addr.deliveryInstructions || '',
          latitude: addr.latitude || null,
          longitude: addr.longitude || null,
        });
        if (addr.latitude && addr.longitude) {
          setMapPosition({ lat: addr.latitude, lng: addr.longitude });
        }
      }
    } else {
      setAddressFormData(null);
    }
  }, [editingAddressId, addresses, user]);

  useEffect(() => {
    if (addressFormData?.latitude && addressFormData?.longitude) {
      setMapPosition({ lat: addressFormData.latitude, lng: addressFormData.longitude });
    }
  }, [addressFormData?.latitude, addressFormData?.longitude]);

  const handleAddressSave = async (e) => {
    e?.preventDefault();

    const cleanedPhone = sanitizePhoneNumber(addressFormData.phone);
    const cleanedAltPhone = addressFormData.alternatePhone
      ? sanitizePhoneNumber(addressFormData.alternatePhone)
      : '';

    // Normalize phone values in state
    if (
      cleanedPhone !== addressFormData.phone ||
      cleanedAltPhone !== (addressFormData.alternatePhone || '')
    ) {
      setAddressFormData((prev) => ({
        ...prev,
        phone: cleanedPhone,
        alternatePhone: cleanedAltPhone,
      }));
    }

    if (!addressFormData.name?.trim()) {
      toast.error('Please enter receiver full name');
      return;
    }

    if (!isValidPhoneNumber(cleanedPhone)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    if (addressFormData.alternatePhone && !isValidPhoneNumber(cleanedAltPhone)) {
      toast.error('Please enter a valid 10-digit alternate mobile number');
      return;
    }

    const cleanPincode = String(addressFormData.pincode || '')
      .replace(/\D/g, '')
      .slice(0, 6);
    if (cleanPincode.length !== 6) {
      toast.error('Please enter a valid 6-digit postal pincode');
      return;
    }

    const payload = {
      name: addressFormData.name.trim(),
      phone: cleanedPhone,
      alternatePhone: cleanedAltPhone || undefined,
      email: addressFormData.email?.trim() || undefined,
      pincode: cleanPincode,
      locality: addressFormData.locality?.trim() || '',
      addressString: addressFormData.addressString?.trim() || '',
      landmark: addressFormData.landmark?.trim() || undefined,
      city: addressFormData.city?.trim() || '',
      state: addressFormData.state?.trim() || '',
      country: addressFormData.country || 'India',
      tag: addressFormData.tag || 'Home',
      deliveryInstructions: addressFormData.deliveryInstructions?.trim() || undefined,
      latitude: addressFormData.latitude,
      longitude: addressFormData.longitude,
    };

    setIsAddressSaving(true);
    try {
      if (editingAddressId === 'new') {
        await userService.addAddress(payload);
        toast.success('New address added successfully!');
      } else {
        await userService.updateAddress(editingAddressId, payload);
        toast.success('Address modified successfully!');
      }
      if (refetchDashboardData) await refetchDashboardData();
      if (setIsAddressModalOpen) setIsAddressModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to store address information');
    } finally {
      setIsAddressSaving(false);
    }
  };

  const fetchAddressFromCoords = useCallback(async (lat, lng) => {
    try {
      toast.loading('Locating address...', { id: 'geocoding' });
      setIsDetectingLocation(true);

      const res = await reverseGeocodeCoords(lat, lng);
      if (res.success && res.data) {
        const d = res.data;
        setAddressFormData((prev) => ({
          ...prev,
          pincode: d.pincode || prev.pincode,
          city: d.city || prev.city,
          state: d.state || prev.state,
          locality: d.locality || prev.locality,
          addressString: d.address || prev.addressString,
          landmark: d.landmark || prev.landmark,
          latitude: lat,
          longitude: lng,
        }));
        toast.success('Address auto-filled from map!', { id: 'geocoding' });
      } else {
        toast.dismiss('geocoding');
      }
    } catch (_err) {
      toast.error('Failed to auto-fill address from map', { id: 'geocoding' });
    } finally {
      setIsDetectingLocation(false);
    }
  }, []);

  const handleFetchCurrentLocation = useCallback(async () => {
    toast.loading('Acquiring pinpoint GPS location...', { id: 'gps' });
    setIsDetectingLocation(true);

    try {
      const res = await detectAndResolveAddress();
      if (res.success && res.data) {
        const d = res.data;
        if (d.latitude && d.longitude) {
          setMapPosition({ lat: d.latitude, lng: d.longitude });
        }
        const resolvedAddressLine =
          d.address || [d.locality, d.landmark, d.city].filter(Boolean).join(', ');

        setAddressFormData((prev) => ({
          ...prev,
          latitude: d.latitude ?? prev.latitude,
          longitude: d.longitude ?? prev.longitude,
          pincode: d.pincode || prev.pincode,
          city: d.city || prev.city,
          state: d.state || prev.state,
          locality: d.locality || prev.locality,
          addressString: res.isPinpoint
            ? resolvedAddressLine || prev.addressString
            : prev.addressString || resolvedAddressLine,
          landmark: d.landmark || prev.landmark,
        }));

        if (res.isPinpoint && res.source === 'gps') {
          const accText = res.accuracy ? ` (~${Math.round(res.accuracy)}m)` : '';
          toast.success(`Exact pinpoint GPS locked${accText}!`, { id: 'gps' });
        } else if (res.isApproximate) {
          toast('Approximate region detected from network. Please drag pin to your exact spot.', {
            id: 'gps',
            duration: 5000,
          });
        } else {
          toast.success('Location locked!', { id: 'gps' });
        }
      } else {
        toast.error(res.error || 'Could not detect location. Please fill manually.', {
          id: 'gps',
          duration: 5000,
        });
      }
    } catch (_err) {
      toast.error('Could not detect location. Please fill manually.', { id: 'gps' });
    } finally {
      setIsDetectingLocation(false);
    }
  }, []);

  return {
    addressFormData,
    setAddressFormData,
    isAddressSaving,
    isDetectingLocation,
    mapPosition,
    setMapPosition,
    handleAddressSave,
    fetchAddressFromCoords,
    handleFetchCurrentLocation,
  };
}
