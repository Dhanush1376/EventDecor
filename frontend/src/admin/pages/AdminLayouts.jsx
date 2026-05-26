import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { SectionHeader, AdminToggle } from '../components/AdminUIKit';

export function AdminLayouts() {
  const [layouts, setLayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLayouts = async () => {
    try {
      const res = await api.get('/layouts');
      if (res.data?.success) setLayouts(res.data.data);
    } catch (err) {
      toast.error('Failed to load layouts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLayouts();
  }, []);

  const handleToggleSection = async (layout, sectionIndex) => {
    const updatedSections = [...layout.sections];
    updatedSections[sectionIndex].isActive = !updatedSections[sectionIndex].isActive;
    
    try {
      await api.post('/layouts', { ...layout, sections: updatedSections });
      toast.success('Section visibility updated');
      fetchLayouts();
    } catch (err) {
      toast.error('Failed to update section visibility');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          icon="view_carousel"
          title="Dynamic Page Layouts"
          description="Control the order, visibility, and properties of UI sections rendered by the dynamic engine."
        />
      </div>

      {loading ? (
        <div className="animate-pulse h-64 bg-surface-container rounded-2xl" />
      ) : (
        <div className="space-y-8">
          {layouts.map((layout) => (
            <div key={layout._id} className="bg-white rounded-2xl shadow-sm border border-outline-variant/10 p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/10">
                <div>
                  <h3 className="text-lg font-bold text-on-surface">{layout.name}</h3>
                  <p className="text-xs text-on-surface-variant font-mono mt-1">Path: {layout.pagePath}</p>
                </div>
                <div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold uppercase rounded-full">
                  {layout.status}
                </div>
              </div>

              <div className="space-y-3">
                {layout.sections.sort((a, b) => a.order - b.order).map((section, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-surface-bright rounded-xl border border-outline-variant/10">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs">
                        {section.order}
                      </div>
                      <div>
                        <span className="font-bold text-sm text-on-surface">{section.componentName}</span>
                        {section.props?.title && (
                          <span className="block text-xs text-stone-500 mt-0.5">"{section.props.title}"</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold text-stone-500 uppercase">Visible</span>
                      <AdminToggle
                        checked={section.isActive}
                        onChange={() => handleToggleSection(layout, idx)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminLayouts;
