import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export function useAddressForm({ setNewAddress, setIsAddingNewAddress, newAddress }) {
  const [isSelectingList, setIsSelectingList] = useState(false);
  const [mapPosition, setMapPosition] = useState({ lat: 20.5937, lng: 78.9629 }); // Default India

  useEffect(() => {
    if (newAddress?.latitude && newAddress?.longitude) {
      setMapPosition({ lat: newAddress.latitude, lng: newAddress.longitude });
    }
  }, [newAddress?.latitude, newAddress?.longitude]);

  const fetchAddressFromCoords = async (lat, lng) => {
    try {
      toast.loading('Locating address...', { id: 'geocoding' });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'SiriArtsAndCrafts/1.0 (checkout address autofill)',
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
        if (addr.building || addr.name) streetParts.push(addr.building || addr.name);
        if (addr.road || addr.street) streetParts.push(addr.road || addr.street);
        if (addr.suburb) streetParts.push(addr.suburb);
        if (addr.neighbourhood) streetParts.push(addr.neighbourhood);

        const displayParts = data.display_name ? data.display_name.split(',') : [];
        const fullAddress =
          displayParts.length > 4
            ? displayParts.slice(0, -4).join(',').trim()
            : displayParts.join(',').trim() || streetParts.join(', ');

        const newLandmark =
          addr.amenity ||
          addr.shop ||
          addr.office ||
          addr.tourism ||
          addr.leisure ||
          addr.building ||
          '';

        setNewAddress((prev) => ({
          ...prev,
          pincode: newPincode.replace(/\s/g, ''),
          city: newCity,
          state: newState,
          locality: newLocality || prev.locality,
          landmark: newLandmark || prev.landmark || newLocality || newCity,
          address: fullAddress || prev.address,
          latitude: lat,
          longitude: lng,
        }));

        toast.success('Address auto-filled from map!', { id: 'geocoding' });
      } else {
        toast.dismiss('geocoding');
      }
    } catch (_err) {
      toast.error('Failed to auto-fill address from map', { id: 'geocoding' });
    }
  };

  const handleEdit = (addr) => {
    setNewAddress({
      id: addr._id || addr.id,
      name: addr.name || '',
      phone: addr.phone || '',
      alternatePhone: addr.alternatePhone || '',
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
      name: '',
      phone: '',
      alternatePhone: '',
      email: '',
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
    handleEdit,
    handleAddNew,
    deliveryEstimates,
  };
}
