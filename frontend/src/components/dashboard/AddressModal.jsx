import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useDashboard } from '../../context/DashboardContext';
import { userService } from '../../services/domainServices';
import { sanitizePhoneNumber, isValidPhoneNumber } from '../../utils/phoneUtils';
import { AddAddressModal } from '../../checkout/CheckoutAddressStep/components/AddAddressModal';

export function AddressModal() {
  const {
    user,
    isAddressModalOpen,
    setIsAddressModalOpen,
    editingAddressId,
    addresses,
    refetchDashboardData,
  } = useDashboard();

  const [newAddress, setNewAddress] = useState({
    id: '',
    name: '',
    phone: '',
    alternatePhone: '',
    email: '',
    address: '',
    locality: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    tag: 'Home',
    deliveryInstructions: '',
    isDefault: false,
    latitude: null,
    longitude: null,
  });

  const [addressError, setAddressError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mapPosition, setMapPosition] = useState({ lat: 20.5937, lng: 78.9629 });

  useEffect(() => {
    if (!isAddressModalOpen) {
      setAddressError(null);
      return;
    }

    if (editingAddressId === 'new' || !editingAddressId) {
      setNewAddress({
        id: '',
        name: user?.name && user.name !== 'Customer' ? user.name : '',
        phone: user?.phone ? sanitizePhoneNumber(user.phone) : '',
        alternatePhone: '',
        email: user?.email || '',
        address: '',
        locality: '',
        landmark: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        tag: 'Home',
        deliveryInstructions: '',
        isDefault: !addresses || addresses.length === 0,
        latitude: null,
        longitude: null,
      });
      setMapPosition({ lat: 20.5937, lng: 78.9629 });
    } else if (addresses && editingAddressId) {
      const addr = addresses.find((a) => (a._id || a.id) === editingAddressId);
      if (addr) {
        setNewAddress({
          id: addr._id || addr.id,
          name: addr.name || '',
          phone: sanitizePhoneNumber(addr.phone || ''),
          alternatePhone: sanitizePhoneNumber(addr.alternatePhone || ''),
          email: addr.email || user?.email || '',
          address: addr.addressString || addr.address || '',
          locality: addr.locality || '',
          landmark: addr.landmark || '',
          city: addr.city || '',
          state: addr.state || '',
          pincode: addr.pincode || '',
          country: addr.country || 'India',
          tag: addr.tag || 'Home',
          deliveryInstructions: addr.deliveryInstructions || '',
          isDefault: Boolean(addr.isDefault),
          latitude: addr.latitude || null,
          longitude: addr.longitude || null,
        });
        if (addr.latitude && addr.longitude) {
          setMapPosition({ lat: addr.latitude, lng: addr.longitude });
        }
      }
    }
  }, [isAddressModalOpen, editingAddressId, addresses, user]);

  const handleSaveNewAddress = async (e) => {
    e?.preventDefault();
    setAddressError(null);

    const cleanedPhone = sanitizePhoneNumber(newAddress.phone);
    const cleanedAltPhone = newAddress.alternatePhone
      ? sanitizePhoneNumber(newAddress.alternatePhone)
      : '';

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
      setAddressError('Please enter a valid 6-digit postal pincode.');
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
      isDefault: Boolean(newAddress.isDefault),
      latitude: newAddress.latitude,
      longitude: newAddress.longitude,
    };

    setIsProcessing(true);
    try {
      let savedId = null;
      if (editingAddressId && editingAddressId !== 'new') {
        await userService.updateAddress(editingAddressId, payload);
        savedId = editingAddressId;
        toast.success('Address updated successfully!');
      } else {
        const res = await userService.addAddress(payload);
        savedId = res?.data?._id || res?.data?.id || res?._id || res?.id;
        toast.success('New address added successfully!');
      }

      if (newAddress.isDefault && savedId) {
        try {
          await userService.setDefaultAddress(savedId);
        } catch {
          // Handled silently
        }
      }

      if (refetchDashboardData) await refetchDashboardData();
      setIsAddressModalOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save address';
      setAddressError(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AddAddressModal
      isAddingNewAddress={isAddressModalOpen}
      setIsAddingNewAddress={setIsAddressModalOpen}
      newAddress={newAddress}
      setNewAddress={setNewAddress}
      addressError={addressError}
      isProcessing={isProcessing}
      handleSaveNewAddress={handleSaveNewAddress}
      mapPosition={mapPosition}
      setMapPosition={setMapPosition}
    />
  );
}

export default AddressModal;
