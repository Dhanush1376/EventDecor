import React, { useState } from 'react';
import { PhoneCollectionModal } from './PhoneCollectionModal';
import { useCustomerContact } from '../../hooks/useCustomerContact';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * A wrapper component that intercepts an action, ensures the user has a phone number,
 * and then allows the action to proceed.
 */
export function CustomerContactGate({ onAction, children, className }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { resolvePhone, isLoading } = useCustomerContact();
  const { user, openAuthModal } = useAuth();

  const handleIntercept = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!user) {
      toast('Please login to continue');
      openAuthModal();
      return;
    }

    const { phone } = await resolvePhone();
    if (!phone) {
      setIsModalOpen(true);
    } else {
      // Phone exists, proceed
      onAction?.();
    }
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    onAction?.(); // Automatically resume the intended action after collecting phone
  };

  return (
    <>
      <div onClick={handleIntercept} className={`inline-block ${className || ''}`}>
        {/* We disable pointer events on children when loading to prevent double clicks while resolving */}
        <div style={{ pointerEvents: isLoading ? 'none' : 'auto', opacity: isLoading ? 0.7 : 1 }}>
          {children}
        </div>
      </div>

      <PhoneCollectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}
