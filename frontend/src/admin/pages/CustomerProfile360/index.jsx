import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { customerIntelligenceService } from '../../../services/domainServices';
import { useAuth } from '../../../context/AuthContext';
import { Mail, Phone, MapPin, Award, ArrowLeft } from 'lucide-react';
import { io as socketIO } from 'socket.io-client';
import { getAccessToken } from '../../../services/api';
import { getApiRootUrl } from '../../../config/apiConfig';

import OverviewTab from './OverviewTab';
import JourneyTab from './JourneyTab';
import BehaviourTab from './BehaviourTab';
import CommunicationsTab from './CommunicationsTab';
import NotesTab from './NotesTab';
import PredictionsTab from './PredictionsTab';
import RiskTab from './RiskTab';
import OrdersTab from './OrdersTab';
import TimelineTab from './TimelineTab';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'orders', label: 'Orders' },
  { id: 'journey', label: 'Shopping Journey' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'behaviour', label: 'Activity & Searches' },
  { id: 'notes', label: 'Notes' },
  { id: 'communications', label: 'Messages' },
  { id: 'predictions', label: 'Predictions' },
  { id: 'risk', label: 'Account Security' },
];

export default function CustomerProfile360() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await customerIntelligenceService.getCustomer360(customerId);
        setProfile(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();

    const token = getAccessToken();
    if (!token) return;
    const rawApiUrl = getApiRootUrl();
    let socketServerUrl = rawApiUrl;
    if (socketServerUrl.endsWith('/api/v1')) socketServerUrl = socketServerUrl.slice(0, -7);
    else if (socketServerUrl.endsWith('/api')) socketServerUrl = socketServerUrl.slice(0, -4);

    const socket = socketIO(`${socketServerUrl}/admin`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('customer_updated', (data) => {
      if (data?.customerId === customerId) fetchProfile();
      else fetchProfile(); // Fallback update
    });

    socket.on('order_update', () => {
      fetchProfile();
    });

    return () => socket.disconnect();
  }, [customerId]);

  if (loading) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="admin-skeleton w-10 h-10 rounded-lg shrink-0"></div>
          <div className="space-y-2">
            <div className="admin-skeleton w-48 h-6 rounded"></div>
            <div className="admin-skeleton w-64 h-4 rounded hidden sm:block"></div>
          </div>
        </div>
        <div className="admin-card p-6 h-32 admin-skeleton w-full"></div>
        <div className="admin-card min-h-[800px] flex flex-col">
          <div className="border-b border-[var(--admin-border-subtle)] p-4 flex gap-4 overflow-x-auto no-scrollbar">
            <div className="admin-skeleton min-w-[100px] h-8 rounded"></div>
            <div className="admin-skeleton min-w-[100px] h-8 rounded"></div>
            <div className="admin-skeleton min-w-[100px] h-8 rounded"></div>
          </div>
          <div className="p-6 space-y-6">
            <div className="admin-skeleton w-full h-32 rounded-xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="admin-skeleton h-32 rounded-xl"></div>
              <div className="admin-skeleton h-32 rounded-xl"></div>
              <div className="admin-skeleton h-32 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center mt-20">
        <h2 className="text-xl font-semibold mb-2">Customer Not Found</h2>
        <button
          onClick={() => navigate('/admin/customers')}
          className="text-indigo-600 hover:underline"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  const { identity, overview } = profile;
  const getInitials = (name) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'CU';

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/customers')}
          className="admin-btn admin-btn-outline p-2 h-10 w-10 shrink-0 flex items-center justify-center"
        >
          <ArrowLeft size={24} strokeWidth={2.5} className="text-[var(--admin-text-primary)]" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Customer Profile</h1>
          <p className="text-sm text-gray-500">Everything you need to know about this customer.</p>
        </div>
      </div>

      {/* HORIZONTAL HEADER */}
      <div className="admin-card p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-4 sm:gap-6">
          <div className="w-20 h-20 rounded-full bg-[var(--admin-bg-subtle)] text-[var(--admin-accent)] flex items-center justify-center border-4 border-white shadow-sm text-2xl font-bold flex-shrink-0">
            {identity.avatar ? (
              <img
                src={identity.avatar}
                alt={identity.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(identity.name)
            )}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold text-[var(--admin-text-primary)]">
              {identity.name || 'Anonymous Customer'}
            </h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 mt-2 text-sm text-[var(--admin-text-secondary)]">
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 shrink-0" /> {identity.email || 'No email'}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 shrink-0" /> {identity.phone || 'No phone'}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 shrink-0" /> {identity.location || 'Unknown location'}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border border-[var(--admin-border-strong)] uppercase tracking-wider">
                {profile.segment || 'Unsegmented'}
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--admin-success-light)] text-[var(--admin-success)] border border-[var(--admin-success-light)] flex items-center gap-1 uppercase tracking-wider">
                <Award className="w-3.5 h-3.5" /> Tier: {identity.loyaltyTier || 'Standard'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center sm:items-start lg:items-end justify-center gap-4 border-t lg:border-t-0 lg:border-l border-[var(--admin-border-subtle)] pt-4 lg:pt-0 lg:pl-8">
          <div className="text-center lg:text-right">
            <p className="text-xs font-medium text-[var(--admin-text-tertiary)] uppercase tracking-wider">
              Total Spent
            </p>
            <p className="text-3xl font-bold text-[var(--admin-text-primary)]">
              ₹{Math.round(overview?.totalSpent || 0).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
            <button className="admin-btn flex-1 sm:flex-none justify-center">Send Email</button>
            <button className="admin-btn admin-btn-outline flex-1 sm:flex-none justify-center">
              View Cart
            </button>
            <button className="admin-btn admin-btn-outline flex-1 sm:flex-none justify-center">
              Add Note
            </button>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="admin-card overflow-hidden min-h-[800px] flex flex-col">
        <div className="border-b border-[var(--admin-border-subtle)] overflow-x-auto no-scrollbar bg-[var(--admin-surface-muted)]">
          <nav className="flex px-2" aria-label="Tabs">
            {TABS.map((tab) => {
              if (tab.id === 'risk' && !['super_admin', 'manager'].includes(user?.role)) {
                return null;
              }
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    whitespace-nowrap py-4 px-5 border-b-2 font-semibold text-sm transition-colors focus:outline-none
                    ${
                      activeTab === tab.id
                        ? 'border-[var(--admin-accent)] text-[var(--admin-accent)] bg-white'
                        : 'border-transparent text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-gray-100/50'
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6 flex-1 bg-white">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'overview' && <OverviewTab profile={profile} />}
              {activeTab === 'orders' && <OrdersTab customerId={customerId} />}
              {activeTab === 'journey' && <JourneyTab customerId={customerId} />}
              {activeTab === 'timeline' && <TimelineTab customerId={customerId} />}
              {activeTab === 'behaviour' && (
                <BehaviourTab customerId={customerId} profile={profile} />
              )}
              {activeTab === 'communications' && <CommunicationsTab customerId={customerId} />}
              {activeTab === 'notes' && <NotesTab customerId={customerId} />}
              {activeTab === 'predictions' && (
                <PredictionsTab predictions={profile.predictions} overview={profile.overview} />
              )}
              {activeTab === 'risk' && ['super_admin', 'manager'].includes(user?.role) && (
                <RiskTab fraudSignals={profile.scores?.fraudRisk} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
