import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { customOrderService } from '../../services/domainServices';
import { uploadService } from '../../services/api/uploadService';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmProvider';
import { CustomerContactGate } from '../shared/CustomerContactGate';
import { Skeleton } from './Skeleton';
import Check from 'lucide-react/dist/esm/icons/check';
import { WhatsAppIcon } from './WhatsAppIcon';

export function DynamicCustomOrderWizard({
  onComplete,
  initialProductPayload = null,
  initialEventType = null,
  previewConfig = null,
}) {
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const confirm = useConfirm();

  // Core Wizard States
  const [selectedType, setSelectedType] = useState(() => {
    if (initialProductPayload) return 'product';
    if (initialEventType) return 'event';
    return 'general';
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    dynamicData: {},
    files: [],
  });
  const [draftRestored, setDraftRestored] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize initial payload if passed
  useEffect(() => {
    let newType = 'general';
    if (initialProductPayload) newType = 'product';
    else if (initialEventType) newType = 'event';

    if (selectedType !== newType) {
      setSelectedType(newType);
      setCurrentStep(1);
    }
  }, [initialProductPayload, initialEventType, selectedType]);

  // Auto-Save Draft
  useEffect(() => {
    if (Object.keys(formData.dynamicData).length > 0) {
      const timer = setTimeout(() => {
        const draftKey = `custom_order_draft_${selectedType}`;
        localStorage.setItem(draftKey, JSON.stringify({ currentStep, formData }));
        toast.success('Draft Saved', { id: 'autosave', duration: 1500 });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [formData, currentStep, selectedType]);

  // Load Config & Draft Recovery
  useEffect(() => {
    if (previewConfig) {
      setConfig(previewConfig);
      setLoadingConfig(false);
      return;
    }
    const loadConfig = async () => {
      try {
        const res = await customOrderService.getConfig();
        if (res.success && res.data?.types) {
          setConfig(res.data);
        }
      } catch (_err) {
        toast.error('Failed to load custom order configuration');
      } finally {
        setLoadingConfig(false);
      }
    };
    loadConfig();
  }, [previewConfig]);

  useEffect(() => {
    if (!draftRestored && !loadingConfig && config) {
      const draftKey = `custom_order_draft_${selectedType}`;
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          confirm({
            title: 'Unsaved Draft',
            message: 'You have an unsaved draft. Restore Previous Draft?',
            type: 'info',
          }).then((shouldRestore) => {
            if (shouldRestore) {
              setCurrentStep(parsed.currentStep || 1);
              setFormData(parsed.formData || { dynamicData: {}, files: [] });
            } else {
              localStorage.removeItem(draftKey);
            }
          });
        } catch (_e) {}
      }
      setDraftRestored(true);
    }
  }, [selectedType, config, loadingConfig, draftRestored, confirm]);

  if (loadingConfig) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
        {/* LEFT PANEL SKELETON */}
        <div className="hidden lg:block lg:col-span-4 bg-white/70 backdrop-blur-md rounded-[2.5rem] border border-black/5 p-8 shadow-sm space-y-6">
          <Skeleton className="h-3 w-1/3 mb-2 rounded-full" />
          <Skeleton className="h-6 w-3/4 mb-6 rounded-full" />
          <div className="space-y-4 pt-4 border-t border-black/5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-6 h-6 rounded-full shrink-0" />
                <Skeleton className="h-4 w-2/3 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL SKELETON */}
        <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-black/5 p-6 lg:p-10 shadow-sm relative min-h-[460px] flex flex-col">
          {/* Smart Progress Bar Skeleton */}
          <div className="mb-8 shrink-0">
            <div className="flex justify-between mb-2">
              <Skeleton className="h-3 w-1/4 rounded-full" />
              <Skeleton className="h-3 w-1/12 rounded-full" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>

          {/* Form Fields Skeleton */}
          <div className="space-y-6 flex-1">
            <Skeleton className="h-6 w-1/3 mb-4 rounded-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl lg:col-span-2" />
            </div>
          </div>

          {/* Navigation Buttons Skeleton */}
          <div className="flex justify-between items-center mt-10 pt-6 border-t border-black/5 shrink-0">
            <Skeleton className="h-10 w-24 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!config || !config.types || config.types.length === 0) {
    return (
      <div className="p-20 text-center text-red-500">
        Error: No dynamic configuration found. Please contact an administrator.
      </div>
    );
  }

  const activeConfigType = config.types.find((t) => t.id === selectedType);
  if (!activeConfigType) return <div>Invalid type selected.</div>;

  const totalSteps = activeConfigType.steps?.length || 0;
  // If currentStep > totalSteps, we are on the Review Screen
  const isReviewScreen = currentStep > totalSteps;
  const currentStepConfig = isReviewScreen ? null : activeConfigType.steps?.[currentStep - 1];

  const progressPercentage = Math.round((Math.min(currentStep, totalSteps) / totalSteps) * 100);

  const handleUpdateDynamicField = (fieldId, value) => {
    setFormData((prev) => ({
      ...prev,
      dynamicData: { ...prev.dynamicData, [fieldId]: value },
    }));
  };

  const handleNext = () => {
    // HIGH-03: Step-level validation
    if (currentStepConfig && currentStepConfig.fields) {
      const missingFields = currentStepConfig.fields.filter(
        (f) =>
          f.required &&
          (!formData.dynamicData[f.id] ||
            (Array.isArray(formData.dynamicData[f.id]) && formData.dynamicData[f.id].length === 0)),
      );
      if (missingFields.length > 0) {
        toast.error(
          `Please fill out required fields: ${missingFields.map((f) => f.label).join(', ')}`,
        );
        return;
      }
    }
    if (currentStep <= totalSteps) setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        customOrderType: selectedType,
        configVersion: config.version,
        dynamicData: formData.dynamicData,

        // HIGH-01: Map dynamic fields instead of hardcoding constants
        budget: formData.dynamicData.budget || '0',
        eventDate: formData.dynamicData.eventDate || new Date().toISOString(),
        city: formData.dynamicData.city || 'Online',
        bookingType: formData.dynamicData.bookingType || 'Video Meet',
        occasion: formData.dynamicData.occasion || 'General',
        productType: formData.dynamicData.productType || 'Custom',
        quantity: formData.dynamicData.quantity || 1,

        ...initialProductPayload,
      };

      let res;
      if (initialProductPayload && initialProductPayload.productId) {
        res = await customOrderService.submitProductCustomization(payload);
      } else {
        res = await customOrderService.create(payload);
      }

      if (res.success) {
        // Clear draft on success
        localStorage.removeItem(`custom_order_draft_${selectedType}`);
        toast.success('Your Custom Order has been submitted successfully!');
        if (onComplete) onComplete(res.data);
      } else {
        toast.error(res.message || 'Submission failed');
      }
    } catch (_error) {
      toast.error('An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Condition Checker
  const checkCondition = (field) => {
    const conditions =
      activeConfigType.conditions?.filter((c) => c.targetFieldIds.includes(field.id)) || [];
    if (conditions.length === 0) return true; // No conditions, always show

    for (const c of conditions) {
      const sourceValue = formData.dynamicData[c.fieldId];
      if (c.operator === 'equals' && sourceValue !== c.value) return false;
      if (c.operator === 'not_equals' && sourceValue === c.value) return false;
    }
    return true;
  };

  const getLabelForField = (fieldId) => {
    for (const s of activeConfigType.steps) {
      const f = s.fields.find((x) => x.id === fieldId);
      if (f) return f.label;
    }
    return fieldId;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start animate-in fade-in duration-700">
      {/* LEFT PANEL: Navigator */}
      <div className="hidden lg:block lg:col-span-4 bg-white/70 backdrop-blur-md rounded-[2.5rem] border border-black/5 p-8 shadow-sm space-y-6">
        <span className="font-label-sm text-[10px] text-[var(--color-gold)] uppercase tracking-[0.25em] block font-bold">
          {activeConfigType.name}
        </span>
        <h3 className="font-display text-[22px] text-[var(--color-on-surface)] font-normal leading-snug">
          Custom Order Wizard
        </h3>

        <div className="space-y-4 pt-4 border-t border-black/5">
          {activeConfigType.steps?.map((step, index) => {
            const stepNum = index + 1;
            return (
              <div
                key={step.id}
                onClick={() => {
                  if (stepNum <= currentStep) setCurrentStep(stepNum);
                }}
                className={`flex items-center gap-3 transition-all duration-300 cursor-pointer ${
                  currentStep === stepNum
                    ? 'text-black'
                    : stepNum < currentStep
                      ? 'text-[var(--color-on-surface)] hover:text-black'
                      : 'text-[var(--color-on-surface)]/30 pointer-events-none'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full text-[10px] font-bold font-mono flex items-center justify-center border transition-all ${
                    currentStep === stepNum
                      ? 'bg-black text-white border-black'
                      : stepNum < currentStep
                        ? 'bg-[var(--color-on-surface)] text-white border-[var(--color-on-surface)]'
                        : 'border-black/10'
                  }`}
                >
                  {stepNum}
                </div>
                <span className="text-[12px] font-bold uppercase tracking-wider">{step.title}</span>
              </div>
            );
          })}
          {/* Review Step Node */}
          <div
            onClick={() => setCurrentStep(totalSteps + 1)}
            className={`flex items-center gap-3 transition-all duration-300 cursor-pointer ${
              isReviewScreen
                ? 'text-black'
                : totalSteps < currentStep
                  ? 'text-[var(--color-on-surface)] hover:text-black'
                  : 'text-[var(--color-on-surface)]/30 pointer-events-none'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full text-[10px] font-bold font-mono flex items-center justify-center border transition-all ${
                isReviewScreen ? 'bg-black text-white border-black' : 'border-black/10'
              }`}
            >
              <Check className="w-4 h-4" />
            </div>
            <span className="text-[12px] font-bold uppercase tracking-wider">Review & Submit</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Dynamic Form Renderer */}
      <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-black/5 p-6 lg:p-10 shadow-sm relative overflow-hidden min-h-[460px]">
        {/* Smart Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-[10px] font-mono font-bold uppercase tracking-wider mb-2 text-black/50">
            <span>
              {isReviewScreen ? 'Review & Submit' : `Step ${currentStep} of ${totalSteps}`}
            </span>
            <span>{isReviewScreen ? '100' : progressPercentage}%</span>
          </div>
          <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-500 ease-out"
              style={{ width: `${isReviewScreen ? 100 : progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {isReviewScreen ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-[20px] lg:text-[22px] font-normal font-display text-[var(--color-on-surface)] mb-4">
                  Review Your Request
                </h2>
                <div className="bg-[var(--color-surface-ivory)] border border-black/5 rounded-2xl p-6 space-y-6">
                  {Object.entries(formData.dynamicData).map(([key, val]) => {
                    if (!val || (Array.isArray(val) && val.length === 0)) return null;
                    return (
                      <div
                        key={key}
                        className="border-b border-black/5 pb-4 last:border-0 last:pb-0"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-black/40 block mb-1">
                          {getLabelForField(key)}
                        </span>
                        <p className="text-[14px] text-black font-medium">
                          {Array.isArray(val) ? val.join(', ') : val.toString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          currentStepConfig && (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStepConfig.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-[20px] lg:text-[22px] font-normal font-display text-[var(--color-on-surface)]">
                    {currentStepConfig.title}
                  </h2>
                  {currentStepConfig.description && (
                    <p className="text-[12px] text-[#685C57] font-light mt-1">
                      {currentStepConfig.description}
                    </p>
                  )}
                </div>

                {/* RENDER DYNAMIC FIELDS */}
                <div className="grid grid-cols-12 gap-y-6 gap-x-2 lg:gap-x-4 pt-4 items-start">
                  {currentStepConfig.fields?.filter(checkCondition).map((field) => {
                    let colClass = 'col-span-12';
                    if (field.type === 'number') {
                      colClass = 'col-span-4'; // 3 per row everywhere
                    } else if (['color', 'date'].includes(field.type)) {
                      colClass = 'col-span-12 lg:col-span-6 lg:col-span-4';
                    }
                    return (
                      <div key={field.id} className={`space-y-2 ${colClass}`}>
                        <label className="text-[9px] lg:text-[11px] font-bold uppercase text-[var(--color-on-surface)] tracking-wider flex items-center gap-1 mb-2 truncate">
                          {field.label}
                          {field.required && <span className="text-[var(--color-gold)]">*</span>}
                        </label>

                        {field.type === 'text' && (
                          <input
                            type="text"
                            placeholder={field.placeholder || ''}
                            value={formData.dynamicData[field.id] || ''}
                            onChange={(e) => handleUpdateDynamicField(field.id, e.target.value)}
                            className="w-full bg-white border-2 border-black/10 hover:border-black/20 focus:border-black rounded-xl px-4 py-3 text-[13px] outline-none transition-all"
                          />
                        )}

                        {field.type === 'textarea' && (
                          <textarea
                            rows={4}
                            placeholder={field.placeholder || ''}
                            value={formData.dynamicData[field.id] || ''}
                            onChange={(e) => handleUpdateDynamicField(field.id, e.target.value)}
                            className="w-full bg-white border-2 border-black/10 hover:border-black/20 focus:border-black rounded-xl px-4 py-3 text-[13px] outline-none transition-all resize-none"
                          />
                        )}

                        {field.type === 'number' && (
                          <div className="flex items-center justify-between gap-1 lg:gap-3 border-2 border-black/10 hover:border-black/20 rounded-xl p-1 lg:p-2 w-full bg-white transition-all">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateDynamicField(
                                  field.id,
                                  Math.max(0, (Number(formData.dynamicData[field.id]) || 0) - 1),
                                )
                              }
                              className="w-7 h-8 lg:w-10 lg:h-10 flex items-center justify-center bg-black/5 hover:bg-black/10 rounded-lg transition-colors cursor-pointer shrink-0"
                            >
                              <span className="material-symbols-outlined text-[16px] lg:text-[20px]">
                                remove
                              </span>
                            </button>
                            <input
                              type="number"
                              placeholder={field.placeholder || '0'}
                              value={formData.dynamicData[field.id] || ''}
                              onChange={(e) =>
                                handleUpdateDynamicField(field.id, Number(e.target.value))
                              }
                              className="w-full min-w-0 text-center text-[13px] lg:text-[16px] font-bold outline-none bg-transparent hide-arrows"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateDynamicField(
                                  field.id,
                                  (Number(formData.dynamicData[field.id]) || 0) + 1,
                                )
                              }
                              className="w-7 h-8 lg:w-10 lg:h-10 flex items-center justify-center bg-[var(--color-gold)] hover:bg-black text-white rounded-lg transition-colors cursor-pointer shrink-0"
                            >
                              <span className="material-symbols-outlined text-[16px] lg:text-[20px]">
                                add
                              </span>
                            </button>
                          </div>
                        )}

                        {field.type === 'color' && (
                          <div className="flex flex-wrap items-center gap-4">
                            {['#D4AF37', '#A6192E', '#F3E5AB', '#2E8B57', '#000000', '#FFFFFF'].map(
                              (color) => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => handleUpdateDynamicField(field.id, color)}
                                  className={`w-10 h-10 rounded-full border-2 transition-all shadow-sm cursor-pointer ${formData.dynamicData[field.id] === color ? 'border-black scale-110 shadow-md' : 'border-black/10 hover:scale-105'}`}
                                  style={{ backgroundColor: color }}
                                />
                              ),
                            )}
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-black/10 hover:border-black/30 transition-all flex items-center justify-center bg-gradient-to-tr from-red-500 via-green-500 to-blue-500">
                              <input
                                type="color"
                                value={formData.dynamicData[field.id] || '#D4AF37'}
                                onChange={(e) => handleUpdateDynamicField(field.id, e.target.value)}
                                className="absolute inset-[-10px] w-[200%] h-[200%] opacity-0 cursor-pointer"
                              />
                              {formData.dynamicData[field.id] &&
                                ![
                                  '#D4AF37',
                                  '#A6192E',
                                  '#F3E5AB',
                                  '#2E8B57',
                                  '#000000',
                                  '#FFFFFF',
                                ].includes(formData.dynamicData[field.id]) && (
                                  <div
                                    className="absolute inset-0 z-10"
                                    style={{ backgroundColor: formData.dynamicData[field.id] }}
                                  />
                                )}
                            </div>
                            <span className="text-[12px] text-black/50 ml-2 font-medium">
                              {formData.dynamicData[field.id] || 'Select a color'}
                            </span>
                          </div>
                        )}

                        {field.type === 'toggle' && (
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <div
                              className={`relative w-12 h-6 rounded-full transition-colors ${formData.dynamicData[field.id] ? 'bg-[var(--color-gold)]' : 'bg-black/20'}`}
                            >
                              <div
                                className={`absolute top-1 bottom-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${formData.dynamicData[field.id] ? 'left-7' : 'left-1'}`}
                              ></div>
                            </div>
                            <input
                              type="checkbox"
                              checked={formData.dynamicData[field.id] || false}
                              onChange={(e) => handleUpdateDynamicField(field.id, e.target.checked)}
                              className="hidden"
                            />
                          </label>
                        )}

                        {field.type === 'date' && (
                          <input
                            type="date"
                            value={formData.dynamicData[field.id] || ''}
                            onChange={(e) => handleUpdateDynamicField(field.id, e.target.value)}
                            className="w-full min-w-0 overflow-hidden bg-white border-2 border-black/10 hover:border-black/20 focus:border-black rounded-xl px-4 py-3 text-[13px] outline-none transition-all"
                          />
                        )}

                        {field.type === 'dropdown' && (
                          <select
                            value={formData.dynamicData[field.id] || ''}
                            onChange={(e) => handleUpdateDynamicField(field.id, e.target.value)}
                            className="w-full bg-white border-2 border-black/10 hover:border-black/20 focus:border-black rounded-xl px-4 py-3 text-[13px] outline-none transition-all appearance-none cursor-pointer"
                          >
                            <option value="">Select an option</option>
                            {field.options?.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {field.type === 'multiselect' && (
                          <div className="flex flex-wrap gap-2">
                            {field.options?.map((o) => {
                              const selected = (formData.dynamicData[field.id] || []).includes(
                                o.value,
                              );
                              return (
                                <button
                                  key={o.value}
                                  type="button"
                                  onClick={() => {
                                    const cur = formData.dynamicData[field.id] || [];
                                    if (cur.includes(o.value))
                                      handleUpdateDynamicField(
                                        field.id,
                                        cur.filter((v) => v !== o.value),
                                      );
                                    else handleUpdateDynamicField(field.id, [...cur, o.value]);
                                  }}
                                  className={`px-4 py-2 rounded-full text-[12px] font-medium border-2 transition-all cursor-pointer ${selected ? 'border-[var(--color-gold)] bg-[var(--color-gold)] text-white shadow-md' : 'border-black/10 hover:border-[var(--color-gold)] bg-white text-black/70'}`}
                                >
                                  {o.label}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {field.type === 'whatsapp_chat' && (
                          <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#E8F8F5] border border-[#A3E4D7] rounded-xl px-4 py-3 shadow-sm">
                            <div className="text-[12px] text-[#0E6251]">
                              <p className="font-bold mb-0.5">
                                {field.label || 'Live WhatsApp Assistance'}
                              </p>
                              <p className="opacity-80 text-[11px] sm:text-[12px] leading-snug">
                                Click the button to chat with our team directly
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const num = field.whatsappNumber || '919866006648';
                                let baseMsg =
                                  field.whatsappMessage ||
                                  'Hello, I have a question about my customization.';
                                if (initialProductPayload && initialProductPayload.productId) {
                                  const productLink = `${window.location.origin}/product/${initialProductPayload.productId}`;
                                  baseMsg += `\n\nProduct Link: ${productLink}`;
                                }
                                const msg = encodeURIComponent(baseMsg);
                                window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
                              }}
                              className="w-full sm:w-auto px-5 py-2.5 bg-[#25D366] hover:bg-[#1ebd59] text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0"
                            >
                              <WhatsAppIcon className="w-[16px] h-[16px]" />
                              Chat Now
                            </button>
                          </div>
                        )}
                        {field.type === 'radio' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {field.options?.map((o) => {
                              const isSelected = formData.dynamicData[field.id] === o.value;
                              return (
                                <label
                                  key={o.value}
                                  className={`relative flex items-center py-3 px-4 rounded-full cursor-pointer transition-all duration-300 ${isSelected ? 'bg-black text-white shadow-md scale-[1.02] border-2 border-black' : 'bg-white border-2 border-black/10 hover:border-black/20 text-black'}`}
                                >
                                  <div
                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-3 transition-all ${isSelected ? 'border-[var(--color-gold)]' : 'border-black/20 group-hover:border-black/40'}`}
                                  >
                                    {isSelected && (
                                      <div className="w-2 h-2 bg-[var(--color-gold)] rounded-full"></div>
                                    )}
                                  </div>
                                  <input
                                    type="radio"
                                    name={field.id}
                                    value={o.value}
                                    checked={isSelected}
                                    onChange={(e) =>
                                      handleUpdateDynamicField(field.id, e.target.value)
                                    }
                                    className="hidden"
                                  />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">
                                    {o.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {field.type === 'checkbox' && (
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <div
                              className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${formData.dynamicData[field.id] ? 'bg-[var(--color-gold)] border-[var(--color-gold)]' : 'border-black/20 group-hover:border-black/40'}`}
                            >
                              {formData.dynamicData[field.id] && (
                                <span className="material-symbols-outlined text-white text-[14px]">
                                  check
                                </span>
                              )}
                            </div>
                            <input
                              type="checkbox"
                              checked={formData.dynamicData[field.id] || false}
                              onChange={(e) => handleUpdateDynamicField(field.id, e.target.checked)}
                              className="hidden"
                            />
                            <span className="text-[13px] font-medium">{field.label}</span>
                          </label>
                        )}

                        {field.type === 'file' && (
                          <div className="border-2 border-dashed border-black/15 bg-[var(--color-surface-ivory)] rounded-2xl p-8 text-center hover:bg-black/5 hover:border-black/30 transition-all group">
                            <input
                              type="file"
                              multiple
                              onChange={async (e) => {
                                const files = Array.from(e.target.files);
                                if (files.length === 0) return;

                                const toastId = toast.loading(
                                  `Uploading ${files.length} file(s)...`,
                                );
                                try {
                                  const uploadedUrls = [];
                                  for (const file of files) {
                                    const fd = new FormData();
                                    fd.append('file', file);
                                    const res = await uploadService.uploadImages(
                                      fd,
                                      'custom-orders',
                                    );
                                    const url = res?.data?.url || res?.url;
                                    if (url) {
                                      uploadedUrls.push(url);
                                    }
                                  }
                                  toast.success(`Attached ${uploadedUrls.length} file(s)`, {
                                    id: toastId,
                                  });
                                  handleUpdateDynamicField(field.id, [
                                    ...(formData.dynamicData[field.id] || []),
                                    ...uploadedUrls,
                                  ]);
                                } catch (error) {
                                  toast.error('Upload failed. Please try again.', { id: toastId });
                                }
                              }}
                              className="hidden"
                              id={`file-${field.id}`}
                            />
                            <label
                              htmlFor={`file-${field.id}`}
                              className="cursor-pointer flex flex-col items-center"
                            >
                              <span className="material-symbols-outlined text-[36px] text-black/30 mb-3 group-hover:text-black/60 transition-colors">
                                cloud_upload
                              </span>
                              <span className="text-[14px] font-bold text-black">
                                Drag & Drop or Click to Upload
                              </span>
                              <span className="text-[12px] text-black/50 mt-1">
                                Upload reference designs, sketches, or images
                              </span>
                            </label>
                            {formData.dynamicData[field.id] &&
                              formData.dynamicData[field.id].length > 0 && (
                                <div className="mt-6 text-[12px] text-left space-y-2">
                                  <p className="font-bold text-[10px] uppercase tracking-wider text-black/40">
                                    Attached Files
                                  </p>
                                  {formData.dynamicData[field.id].map((url) => (
                                    <div
                                      key={url}
                                      className="flex justify-between items-center bg-white px-4 py-2.5 rounded-xl border border-black/5 shadow-sm"
                                    >
                                      <span className="font-medium text-[13px] truncate pr-4">
                                        {url.split('/').pop()}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleUpdateDynamicField(
                                            field.id,
                                            formData.dynamicData[field.id].filter((u) => u !== url),
                                          );
                                        }}
                                        className="text-red-500 hover:text-red-700 flex items-center justify-center p-1"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">
                                          close
                                        </span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          )
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-between items-center mt-10 pt-6 border-t border-black/5 gap-3">
          <button
            type="button"
            onClick={handleBack}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 border border-black/10 rounded-full text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface)] hover:bg-black/5 transition-all cursor-pointer whitespace-nowrap text-center ${currentStep === 1 ? 'opacity-0 pointer-events-none hidden sm:block' : ''}`}
          >
            Back
          </button>

          <div className="flex flex-1 sm:flex-none justify-end gap-2 sm:gap-3">
            {isReviewScreen && (
              <button
                type="button"
                onClick={() => {
                  toast.success('Draft manually saved.');
                }}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-3 border border-black/10 bg-[var(--color-surface-ivory)] rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-black/5 transition-all shadow-sm cursor-pointer whitespace-nowrap text-center"
              >
                Save Draft
              </button>
            )}

            {!isReviewScreen ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 sm:flex-none px-4 sm:px-8 py-3 bg-[var(--color-on-surface)] text-white rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-[var(--color-gold)] transition-all shadow-md cursor-pointer whitespace-nowrap text-center"
              >
                Next Step
              </button>
            ) : (
              <CustomerContactGate onAction={handleSubmit}>
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none px-4 sm:px-8 py-3 bg-[var(--color-gold)] text-white rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-black transition-all shadow-md cursor-pointer disabled:opacity-50 whitespace-nowrap text-center"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </CustomerContactGate>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
