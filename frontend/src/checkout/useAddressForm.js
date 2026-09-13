import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { reverseGeocodeCoords, detectAndResolveAddress } from '../utils/locationService';
import { sanitizePhoneNumber } from '../utils/phoneUtils';

export function useAddressForm({ setNewAddress, setIsAddingNewAddress, newAddress, user }) {
  const [isSelectingList, setIsSelectingList] = useState(false);
  const [mapPosition, setMapPosition] = useState({ lat: 20.5937, lng: 78.9629 }); // Default India
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);

  useEffect(() => {
    if (newAddress?.latitude && newAddress?.longitude) {
      setMapPosition({ lat: newAddress.latitude, lng: newAddress.longitude });
    }
  }, [newAddress?.latitude, newAddress?.longitude]);

  /**
   * Reverse geocodes coordinates (e.g. from map click/drag) and populates address fields.
   * Preserves user-typed fields where new values are absent.
   */
  const fetchAddressFromCoords = async (lat, lng) => {
    try {
      setIsResolvingLocation(true);
      toast.loading('Locating address from pin...', { id: 'geocoding' });

      const res = await reverseGeocodeCoords(lat, lng);

      if (res.success && res.data) {
        const d = res.data;
        const resolvedAddressLine =
          d.address || [d.locality, d.landmark, d.city].filter(Boolean).join(', ');

        setNewAddress((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          pincode: d.pincode || prev.pincode,
          city: d.city || prev.city,
          state: d.state || prev.state,
          locality: d.locality || prev.locality,
          address: resolvedAddressLine || prev.address,
          landmark: d.landmark || prev.landmark,
        }));

        toast.success('Address updated from map!', { id: 'geocoding' });
      } else {
        toast.dismiss('geocoding');
      }
    } catch (_err) {
      toast.error('Could not resolve address from map pin', { id: 'geocoding' });
    } finally {
      setIsResolvingLocation(false);
    }
  };

  /**
   * Detects location via pinpoint GPS with approximate network fallback and autofills available fields.
   */
  const handleAutofillLocation = async () => {
    try {
      setIsResolvingLocation(true);
      toast.loading('Acquiring pinpoint GPS location...', { id: 'location-detect' });

      const res = await detectAndResolveAddress();

      if (res.success && res.data) {
        const d = res.data;

        if (d.latitude && d.longitude) {
          setMapPosition({ lat: d.latitude, lng: d.longitude });
        }

        const resolvedAddressLine =
          d.address || [d.locality, d.landmark, d.city].filter(Boolean).join(', ');

        setNewAddress((prev) => ({
          ...prev,
          latitude: d.latitude ?? prev.latitude,
          longitude: d.longitude ?? prev.longitude,
          pincode: d.pincode || prev.pincode,
          city: d.city || prev.city,
          state: d.state || prev.state,
          locality: d.locality || prev.locality,
          // If pinpoint GPS, set the auto-detected address line; if approximate IP, preserve existing input
          address: res.isPinpoint
            ? resolvedAddressLine || prev.address
            : prev.address || resolvedAddressLine,
          landmark: d.landmark || prev.landmark,
        }));

        if (res.isPinpoint && res.source === 'gps') {
          const accText = res.accuracy ? ` (~${Math.round(res.accuracy)}m)` : '';
          toast.success(`Exact pinpoint GPS location locked${accText}!`, { id: 'location-detect' });
        } else if (res.isApproximate) {
          toast(
            'Approximate region detected from network. Please drag the pin on the map or search your exact address!',
            { id: 'location-detect', duration: 5000 },
          );
        } else {
          toast.success('Location detected!', { id: 'location-detect' });
        }
      } else {
        toast.error(res.error || 'Could not detect location. Please fill manually.', {
          id: 'location-detect',
          duration: 5000,
        });
      }
    } catch (_err) {
      toast.error('Location detection failed. Please fill manually.', {
        id: 'location-detect',
      });
    } finally {
      setIsResolvingLocation(false);
    }
  };

  const handleEdit = (addr) => {
    setNewAddress({
      id: addr._id || addr.id,
      name: addr.name || '',
      phone: sanitizePhoneNumber(addr.phone || ''),
      alternatePhone: sanitizePhoneNumber(addr.alternatePhone || ''),
      email: addr.email || '',
      pincode: addr.pincode || '',
      locality: addr.locality || '',
      address: addr.addressString || addr.address || '',
      landmark: addr.landmark || '',
      city: addr.city || '',
      state: addr.state || '',
      country: addr.country || 'India',
      tag: addr.tag || addr.type || 'Home',
      deliveryInstructions: addr.deliveryInstructions || '',
      latitude: addr.latitude || null,
      longitude: addr.longitude || null,
    });
    setIsAddingNewAddress(true);
    setIsSelectingList(false);
  };

  const handleAddNew = () => {
    setNewAddress({
      name: user?.name && user.name !== 'Customer' ? user.name : '',
      phone: sanitizePhoneNumber(user?.phone || ''),
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
    });
    setIsAddingNewAddress(true);
    setIsSelectingList(false);
  };

  const getDeliveryEstimates = () => {
    const start = new Date();
    start.setDate(start.getDate() + 3);
    const end = new Date();
    end.setDate(end.getDate() + 5);

    const options = { day: 'numeric', month: 'short' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const deliveryEstimates = getDeliveryEstimates();

  return {
    isSelectingList,
    setIsSelectingList,
    mapPosition,
    setMapPosition,
    fetchAddressFromCoords,
    handleAutofillLocation,
    isResolvingLocation,
    handleEdit,
    handleAddNew,
    deliveryEstimates,
  };
}
