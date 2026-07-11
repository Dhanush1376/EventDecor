import React, { useState, useEffect } from 'react';
import whatsappAutomationService from '../../services/whatsappAutomationService';
import { toast } from 'react-hot-toast';

const RecipientManager = () => {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecipients = async () => {
      try {
        const res = await whatsappAutomationService.getRecipients();
        if (res.data?.data) {
          setRecipients(res.data.data);
        }
      } catch (err) {
        toast.error('Failed to load recipients');
      } finally {
        setLoading(false);
      }
    };
    fetchRecipients();
  }, []);

  if (loading)
    return (
      <div className="p-8 text-center text-[var(--admin-text-secondary)]">
        Loading recipients...
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[18px] font-semibold text-[var(--admin-text-primary)]">
          Recipient Management
        </h2>
        <button className="admin-btn" onClick={() => toast.error('Stub')}>
          <span className="material-symbols-outlined text-[18px] mr-1">person_add</span> Add
          Recipient
        </button>
      </div>

      <div className="admin-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--admin-bg-subtle)] border-b border-[var(--admin-border-subtle)] text-[12px] uppercase text-[var(--admin-text-secondary)] tracking-wider">
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Phone Number</th>
              <th className="p-4 font-semibold">Role</th>
              <th className="p-4 font-semibold text-center">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[14px]">
            {recipients.map((rec) => (
              <tr
                key={rec._id}
                className="border-b border-[var(--admin-border-subtle)] hover:bg-gray-50/50"
              >
                <td className="p-4 font-medium text-[var(--admin-text-primary)]">{rec.name}</td>
                <td className="p-4 text-[var(--admin-text-secondary)]">{rec.phone}</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-[12px] font-medium capitalize">
                    {rec.role}
                  </span>
                </td>
                <td className="p-4 text-center">
                  {rec.isActive ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[12px] font-medium">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-[12px] font-medium">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <button
                    className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors ml-1"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </td>
              </tr>
            ))}
            {recipients.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-[var(--admin-text-tertiary)]">
                  No recipients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecipientManager;
