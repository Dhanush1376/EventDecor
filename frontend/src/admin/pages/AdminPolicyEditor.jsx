import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { policyService } from '../../services/domainServices';
import { createSafeHtml } from '../../utils/sanitize';
import { toast } from 'react-hot-toast';

export function AdminPolicyEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('write'); // 'write' or 'preview'
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    status: 'draft',
    seoMetadata: { title: '', description: '' }
  });

  useEffect(() => {
    if (!isNew) {
      fetchPolicy();
    }
  }, [id]);

  const fetchPolicy = async () => {
    try {
      const data = await policyService.getById(id);
      if (data.data) {
        setFormData(data.data);
      }
    } catch (error) {
      toast.error('Failed to load policy');
      navigate('/admin/policies');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        await policyService.create(formData);
        toast.success("Policy created");
      } else {
        await policyService.update(id, formData);
        toast.success("Policy updated");
      }
      navigate('/admin/policies');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading editor...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-surface z-10 py-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/policies')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <span className="material-symbols-outlined text-gray-500">arrow_back</span>
          </button>
          <div>
            <h1 className="text-2xl font-body font-semibold text-[#1a1c1a]">
              {isNew ? 'New Policy' : 'Edit Policy'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value })}
            className="border-gray-200 border rounded text-sm py-2 px-3 outline-none focus:border-[#c29b38]"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#1a1c1a] text-white px-6 py-2 rounded hover:bg-[#2d302d] transition-colors text-sm font-bold tracking-wider uppercase disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Policy'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Policy Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Privacy Policy"
                className="w-full text-xl font-body border-b border-gray-200 py-2 outline-none focus:border-[#c29b38] transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">URL Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                placeholder="e.g. privacy-policy"
                className="w-full text-xl font-body border-b border-gray-200 py-2 outline-none focus:border-[#c29b38] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <div className="flex items-center border-b border-gray-200">
              <button
                onClick={() => setActiveTab('write')}
                className={`px-4 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'write' ? 'border-[#1a1c1a] text-[#1a1c1a]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                Write (HTML)
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'preview' ? 'border-[#1a1c1a] text-[#1a1c1a]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                Preview
              </button>
            </div>

            <div className="mt-4 min-h-[400px]">
              {activeTab === 'write' ? (
                <textarea
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder="<p>Enter your policy content here using HTML tags...</p>"
                  className="w-full h-[400px] p-4 font-mono text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c29b38] focus:ring-1 focus:ring-[#c29b38] bg-gray-50"
                />
              ) : (
                <div 
                  className="prose prose-sm max-w-none prose-headings:font-body prose-headings:font-semibold prose-headings:text-on-surface prose-p:text-on-surface/80 prose-p:leading-relaxed p-6 border border-gray-200 rounded-lg bg-white"
                  dangerouslySetInnerHTML={createSafeHtml(formData.content || '<p class="text-gray-400">No content provided yet.</p>')}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SEO Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Search Engine Optimization</h3>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Meta Title</label>
            <input
              type="text"
              value={formData.seoMetadata?.title || ''}
              onChange={e => setFormData({ ...formData, seoMetadata: { ...formData.seoMetadata, title: e.target.value } })}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-[#c29b38]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Meta Description</label>
            <textarea
              value={formData.seoMetadata?.description || ''}
              onChange={e => setFormData({ ...formData, seoMetadata: { ...formData.seoMetadata, description: e.target.value } })}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-[#c29b38] h-24"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
