import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { notificationService } from "../../services/domainServices";
import toast from "react-hot-toast";
import { fadeUp, stagger } from "../components/AdminUIKit";
import logger from '../../utils/logger';
import { getErrorMessage } from '../../utils/errorHelpers';

export function AdminTemplateCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    subjectLine: "",
    htmlContent: "",
    type: "marketing",
  });

  useEffect(() => {
    if (isEditMode) {
      const fetchTemplate = async () => {
        try {
          const res = await notificationService.getTemplates();
          if (res.success) {
            const list = res.data || [];
            const temp = list.find(t => t._id === id);
            if (temp) {
              setTemplateForm({
                name: temp.name || "",
                subjectLine: temp.subjectLine || "",
                htmlContent: temp.htmlContent || "",
                type: temp.type || "marketing",
              });
            } else {
              toast.error("Template not found");
              navigate("/admin/campaigns");
            }
          }
        } catch (err) {
          logger.error("Failed to load template", err);
          toast.error("Failed to load template details");
        }
      };
      fetchTemplate();
    }
  }, [id, navigate]);

  const handleTemplateUpdate = async (e) => {
    e.preventDefault();
    if (!templateForm.name || !templateForm.htmlContent) {
      toast.error("Name and HTML Content are required");
      return;
    }

    setIsSubmitting(true);
    try {
      let res;
      if (isEditMode) {
        res = await notificationService.updateTemplate(id, templateForm);
      } else {
        res = await notificationService.createTemplate(templateForm);
      }

      if (res.success) {
        toast.success(isEditMode ? "Template updated" : "Template created");
        navigate("/admin/campaigns");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save template modifications"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="max-w-[1000px] mx-auto space-y-6 pb-20 p-4 sm:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--admin-border-subtle)] pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/campaigns")}
            className="w-10 h-10 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-accent)] cursor-pointer transition-all active:scale-95 shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h3 className="text-[13px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">brush</span>
              {isEditMode ? "Modify Seeded Layout" : "Seed Design Template"}
            </h3>
            <p className="text-[10.5px] text-[var(--admin-text-tertiary)] mt-0.5">
              Draft rich HTML email templates with core system variables
            </p>
          </div>
        </div>
      </div>

      <motion.div variants={fadeUp} className="bg-[var(--admin-surface)] p-6 md:p-8 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]">
        <form onSubmit={handleTemplateUpdate} className="space-y-6">
          <div>
            <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Template Name *</label>
            <input
              type="text"
              required
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              placeholder="e.g. Festive Urli Launch"
              className="admin-input"
            />
          </div>

          <div>
            <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Subject Fallback</label>
            <input
              type="text"
              value={templateForm.subjectLine}
              onChange={(e) => setTemplateForm({ ...templateForm, subjectLine: e.target.value })}
              placeholder="e.g. ✦ Unveiling Timeless Diya Curations"
              className="admin-input"
            />
          </div>

          <div>
            <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Template Category *</label>
            <select
              value={templateForm.type}
              onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
              className="admin-select"
            >
              <option value="marketing">Marketing Broadcast</option>
              <option value="transactional">Transactional Notification</option>
              <option value="newsletter">Content Newsletter</option>
            </select>
          </div>

          <div>
            <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1 flex items-center justify-between">
              <span>HTML Source Code *</span>
              <button 
                type="button" 
                onClick={() => {
                  const previewWindow = window.open();
                  previewWindow.document.write(templateForm.htmlContent);
                  previewWindow.document.close();
                }}
                className="text-[var(--admin-accent)] hover:underline"
              >
                Preview in new tab
              </button>
            </label>
            <textarea
              rows={15}
              required
              value={templateForm.htmlContent}
              onChange={(e) => setTemplateForm({ ...templateForm, htmlContent: e.target.value })}
              placeholder="<!-- Inline CSS optimized HTML markup here -->"
              className="admin-textarea font-mono text-[11px] leading-relaxed"
            />
          </div>

          <div className="flex gap-3 pt-6 border-t border-[var(--admin-border-subtle)] mt-8">
            <button
              type="button"
              onClick={() => navigate("/admin/campaigns")}
              className="admin-btn admin-btn-outline flex-1 py-3"
            >
              Cancel
            </button>
            <button
              disabled={isSubmitting}
              type="submit"
              className="admin-btn admin-btn-primary flex-[2] py-3 shadow-md"
            >
              {isSubmitting ? "Saving..." : isEditMode ? "Save Changes" : "Create Template"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
