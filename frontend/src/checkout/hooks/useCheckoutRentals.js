import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { persistentStorage } from '../../utils/storage/persistentStorage';
import rentalService from '../../services/api/rentalService';
import logger from '../../utils/core/logger';

export function useCheckoutRentals() {
  const [rentalStartDate, setRentalStartDate] = useState(() => {
    return persistentStorage.getItem('siri_checkout_rental_start', {
      session: true,
      fallback: null,
    });
  });
  const [rentalEndDate, setRentalEndDate] = useState(() => {
    return persistentStorage.getItem('siri_checkout_rental_end', { session: true, fallback: null });
  });

  useEffect(() => {
    persistentStorage.setItem('siri_checkout_rental_start', rentalStartDate, { session: true });
  }, [rentalStartDate]);

  useEffect(() => {
    persistentStorage.setItem('siri_checkout_rental_end', rentalEndDate, { session: true });
  }, [rentalEndDate]);

  const [rentalCostBreakdown, setRentalCostBreakdown] = useState(null);
  const [rentalAvailability, setRentalAvailability] = useState(null);
  const [identityDocuments, setIdentityDocuments] = useState([]);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  const handleRentalCostCalculation = useCallback(async (productId, startDate, endDate) => {
    if (!productId || !startDate || !endDate) return null;
    try {
      setIsCheckingAvailability(true);
      const [costRes, availRes] = await Promise.all([
        rentalService.calculateCost(productId, startDate, endDate),
        rentalService.checkAvailability(productId, startDate, endDate),
      ]);
      if (costRes.success) setRentalCostBreakdown(costRes.data);
      if (availRes.success) setRentalAvailability(availRes.data);
      return { cost: costRes.data, availability: availRes.data };
    } catch (err) {
      logger.error('Rental cost/availability check failed:', err);
      toast.error(err.response?.data?.message || 'Failed to check rental availability');
      return null;
    } finally {
      setIsCheckingAvailability(false);
    }
  }, []);

  return {
    rentalStartDate,
    setRentalStartDate,
    rentalEndDate,
    setRentalEndDate,
    rentalCostBreakdown,
    setRentalCostBreakdown,
    rentalAvailability,
    setRentalAvailability,
    identityDocuments,
    setIdentityDocuments,
    aadhaarNumber,
    setAadhaarNumber,
    agreementAccepted,
    setAgreementAccepted,
    isCheckingAvailability,
    handleRentalCostCalculation,
  };
}
