import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

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
        name: '',
        phone: '',
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
          phone: addr.phone || '',
          alternatePhone: addr.alternatePhone || '',
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

    if (!addressFormData.phone || addressFormData.phone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!addressFormData.pincode || addressFormData.pincode.length !== 6) {
      toast.error('Please enter a valid 6-digit postal pincode');
      return;
    }

    const payload = {
      name: addressFormData.name,
      phone: addressFormData.phone,
      alternatePhone: addressFormData.alternatePhone || undefined,
      email: addressFormData.email || user?.email || undefined,
      pincode: addressFormData.pincode,
      locality: addressFormData.locality,
      addressString: addressFormData.addressString,
      landmark: addressFormData.landmark || undefined,
      city: addressFormData.city,
      state: addressFormData.state,
      country: addressFormData.country || 'India',
      tag: addressFormData.tag,
      deliveryInstructions: addressFormData.deliveryInstructions || undefined,
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
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'SiriArtsAndCrafts/1.0 (dashboard address autofill)',
          },
        },
      );
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        const newPincode = addr.postcode || '';
        const newCity =
          addr.city || addr.town || addr.village || addr.county || addr.state_district || '';
        const newState = addr.state || '';
        const newLocality =
          addr.suburb || addr.neighbourhood || addr.road || addr.residential || '';

        const streetParts = [];
        if (addr.house_number) streetParts.push(addr.house_number);
        if (addr.building) streetParts.push(addr.building);
        if (addr.road || addr.street) streetParts.push(addr.road || addr.street);
        if (addr.suburb) streetParts.push(addr.suburb);
        if (addr.neighbourhood) streetParts.push(addr.neighbourhood);
        const addressString =
          streetParts.length > 0
            ? streetParts.join(', ')
            : data.display_name?.split(',').slice(0, 3).join(',').trim() || '';

        const landmark =
          addr.amenity || addr.shop || addr.office || addr.tourism || addr.leisure || '';

        setAddressFormData((prev) => ({
          ...prev,
          pincode: newPincode.replace(/\s/g, ''),
          city: newCity,
          state: newState,
          locality: newLocality || prev.locality,
          addressString: addressString || prev.addressString,
          landmark: landmark || prev.landmark || newLocality || newCity,
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

  const handleFetchCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    toast.loading('Accessing device GPS location...', { id: 'gps' });
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapPosition({ lat: latitude, lng: longitude });
        fetchAddressFromCoords(latitude, longitude);
        toast.success('Location found!', { id: 'gps' });
      },
      (_err) => {
        toast.error('Could not access GPS', { id: 'gps' });
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [fetchAddressFromCoords]);

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
