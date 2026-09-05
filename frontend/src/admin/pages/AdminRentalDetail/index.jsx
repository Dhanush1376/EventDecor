import React, { useEffect, useState } from 'react';
import { m as motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { SkeletonDashboard, stagger } from '../../components/AdminUIKit';
import { RentalHeader } from './RentalHeader';
import { RentalProduct } from './RentalProduct';
import { RentalFinancials } from './RentalFinancials';
import { RentalTimeline } from './RentalTimeline';
import { RentalCustomerAndProof } from './RentalCustomerAndProof';
import rentalService from '../../../services/api/rentalService';
import toast from 'react-hot-toast';

export function AdminRentalDetail() {
  const { rentalId } = useParams();
  const navigate = useNavigate();
  const [rental, setRental] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  const fetchRentalDetail = React.useCallback(async () => {
    try {
      const data = await rentalService.adminGetDetail(rentalId);
      setRental(data.data || data.rental || data);
    } catch (error) {
      toast.error('Failed to load rental details');
      navigate('/admin/rentals');
    } finally {
      setDataLoading(false);
    }
  }, [rentalId, navigate]);

  useEffect(() => {
    if (rentalId) {
      fetchRentalDetail();
    }
  }, [rentalId, fetchRentalDetail]);

  if (dataLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <SkeletonDashboard />
      </div>
    );
  }

  if (!rental) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-[48px] text-[var(--admin-text-tertiary)] mb-4">
          receipt_long
        </span>
        <p className="text-[16px] font-bold text-[var(--admin-text-primary)] mb-4">
          Rental not found
        </p>
        <button onClick={() => navigate('/admin/rentals')} className="admin-btn h-10 px-6">
          Back to Rentals
        </button>
      </div>
    );
  }

  // Derive the next valid action from the backend status
  const getNextValidAction = () => {
    switch (rental.status) {
      case 'pending':
        return { label: 'Confirm Rental', action: 'confirm' };
      case 'confirmed':
        return { label: 'Mark as Active', action: 'activate' };
      case 'active_rental':
      case 'late_return':
      case 'return_requested':
        return { label: 'Mark as Returned', action: 'return' };
      case 'returned':
        if (rental.depositStatus === 'held')
          return { label: 'Refund Security Deposit', action: 'refund_deposit' };
        if (rental.depositStatus === 'processing') return null; // waiting for Razorpay
        return { label: 'Complete Rental', action: 'complete' };
      default:
        return null;
    }
  };

  const nextAction = getNextValidAction();

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6 no-print">
      <RentalHeader rental={rental} navigate={navigate} />

      <div className="max-w-[1400px] mx-auto w-auto">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-6 lg:gap-8 items-start">
          {/* LEFT COLUMN: Operations, Lifecycle & Financials (2/3 Width) */}
          <div className="xl:col-span-2 space-y-3 sm:space-y-6 lg:space-y-8">
            <RentalTimeline
              rental={rental}
              fetchRentalDetail={fetchRentalDetail}
              nextAction={nextAction}
            />
            <RentalProduct rental={rental} />
            <div id="rental-financials">
              <RentalFinancials rental={rental} fetchRentalDetail={fetchRentalDetail} />
            </div>
          </div>

          {/* RIGHT COLUMN: Customer Profile, Proof Documents & Audit Log (1/3 Width Sticky Sidebar) */}
          <div className="xl:col-span-1 space-y-3 sm:space-y-6 lg:space-y-8 sticky top-[88px]">
            <RentalCustomerAndProof rental={rental} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
