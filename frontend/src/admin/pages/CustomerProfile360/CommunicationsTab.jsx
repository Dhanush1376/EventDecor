import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, Phone } from 'lucide-react';
import { customerIntelligenceService } from '../../../services/domainServices';

export default function CommunicationsTab({ customerId }) {
  const [communications, setCommunications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommunications = async () => {
      try {
        const data = await customerIntelligenceService.getCustomerCommunications(customerId);
        setCommunications(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCommunications();
  }, [customerId]);

  if (loading)
    return (
      <div className="p-12 text-center animate-pulse text-gray-500">Loading communications...</div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Communication History</h3>
        <button className="admin-btn">Send Message</button>
      </div>

      {communications.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {communications.map((comm, idx) => (
            <div key={idx} className="p-4 flex gap-4 hover:bg-gray-50 transition-colors">
              <div className="p-2 bg-[var(--admin-bg-subtle)] text-[var(--admin-accent)] rounded-full h-fit">
                {comm.type === 'email' ? (
                  <Mail className="w-5 h-5" />
                ) : comm.type === 'sms' ? (
                  <MessageSquare className="w-5 h-5" />
                ) : (
                  <Phone className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-gray-900">{comm.subject}</h4>
                  <span className="text-xs text-gray-500">
                    {new Date(comm.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{comm.message}</p>
                {comm.status && (
                  <span
                    className={`text-xs mt-2 inline-block px-2 py-0.5 rounded-full ${comm.status === 'sent' || comm.status === 'delivered' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {comm.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <Mail className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No communications logged yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Emails and SMS messages sent to this customer will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
