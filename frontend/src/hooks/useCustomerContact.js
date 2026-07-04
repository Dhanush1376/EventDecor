import { useState, useCallback } from 'react';
import { contactService } from '../services/domainServices';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export function useCustomerContact() {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const resolvePhone = useCallback(async () => {
    if (!user) return { phone: null, isNew: true };
    try {
      setIsLoading(true);
      const res = await contactService.resolveContact();
      return res.data;
    } catch (err) {
      console.error('Failed to resolve contact:', err);
      return { phone: null, isNew: true };
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updatePhone = useCallback(
    async (phone) => {
      if (!user) return false;
      try {
        setIsLoading(true);
        await contactService.updateContact(phone);
        toast.success('Contact number updated successfully');
        return true;
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to update contact number');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [user],
  );

  return { resolvePhone, updatePhone, isLoading };
}
