import {
  PackageCheck,
  HelpCircle,
  ListChecks,
  ImagePlus,
  UserRound,
  CornerDownLeft,
  ArrowLeftRight,
  ArrowRight,
  Copy,
  Info,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { returnService } from '../../services/api/returnService';
import { OptimizedImage } from '../../components/ui';
import { ReturnExchangeSkeleton } from '../../components/ui/skeletons/PageSkeletons';
import { SEO } from '../../components/seo/SEO';
import { useConfig } from '../../context/ConfigContext';
import EvidenceUploader from './components/EvidenceUploader';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';

export const RETURN_REASONS = [
  { value: 'damaged', label: 'Damaged product', icon: 'broken_image' },
  { value: 'defective', label: 'Defective product', icon: 'build' },
  { value: 'wrong_item', label: 'Wrong item received', icon: 'swap_horiz' },
  { value: 'missing_item', label: 'Missing item', icon: 'inventory_2' },
  { value: 'size_variant', label: 'Size or variant issue', icon: 'straighten' },
  { value: 'other', label: 'Other', icon: 'more_horiz' },
];

export const RESOLUTIONS = {
  return: [
    { value: 'refund', label: 'Refund' },
    { value: 'discuss', label: 'Contact me to discuss' },
  ],
  exchange: [
    { value: 'replacement', label: 'Replacement / Exchange' },
    { value: 'discuss', label: 'Contact me to discuss' },
  ],
};

const sectionTitle =
  'text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5';
const card = 'p-4 sm:p-5 border rounded-[16px] border-outline-variant/30 bg-surface-bright';
const choice = (selected) =>
  `p-3 border rounded-[12px] cursor-pointer transition-all text-[9px] font-bold uppercase tracking-widest focus-within:ring-2 focus-within:ring-[#D4AF37] ${
    selected
      ? 'bg-[#2A2927] border-[#2A2927] text-white'
      : 'bg-[#FDFBF7] border-[#E8E6E1] text-[#2A2927] hover:border-[#D4AF37]'
  }`;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

export function WhatsAppReturnPage({ defaultType = 'return' }) {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const preselectItemId = searchParams.get('itemId');
  const { supportEmail, supportPhone } = useConfig();

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [requestType, setRequestType] = useState(defaultType);
  const [selected, setSelected] = useState({}); // { itemId: quantity }
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [resolution, setResolution] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [preparing, setPreparing] = useState(false);
  const [prepared, setPrepared] = useState(null); // { whatsappUrl, message }

  useEffect(() => {
    if (!orderId) {
      setLoadError('No order was selected.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    returnService
      .getWhatsAppEligibility(orderId)
      .then((res) => {
        if (cancelled) return;
        const payload = res.data?.data;
        setData(payload);
        const preselect = payload?.items?.find((i) => i.itemId === preselectItemId && i.eligible);
        const onlyEligible = payload?.items?.filter((i) => i.eligible);
        if (preselect) setSelected({ [preselect.itemId]: 1 });
        else if (onlyEligible?.length === 1) setSelected({ [onlyEligible[0].itemId]: 1 });
        if (payload?.requestTypes && !payload.requestTypes[defaultType]) {
          const fallback = defaultType === 'return' ? 'exchange' : 'return';
          if (payload.requestTypes[fallback]) setRequestType(fallback);
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.response?.data?.message || 'Could not load this order.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [orderId, preselectItemId, defaultType]);

  // Resolution options depend on the request type; clear a choice that no longer applies.
  useEffect(() => {
    if (resolution && !RESOLUTIONS[requestType].some((r) => r.value === resolution)) {
      setResolution('');
    }
  }, [requestType, resolution]);

  const eligibleItems = useMemo(() => data?.items?.filter((i) => i.eligible) || [], [data]);
  const ineligibleItems = useMemo(() => data?.items?.filter((i) => !i.eligible) || [], [data]);
  const typeEnabled = data?.requestTypes?.[requestType] !== false;

  const toggleItem = (item) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[item.itemId]) delete next[item.itemId];
      else next[item.itemId] = 1;
      return next;
    });
    setErrors((e) => ({ ...e, items: undefined }));
  };

  const validate = () => {
    const next = {};
    if (Object.keys(selected).length === 0) next.items = 'Select at least one item.';
    if (!reason) next.reason = 'Choose a reason.';
    if (reason === 'other' && description.trim().length < 10)
      next.description = 'Please describe the issue (at least 10 characters).';
    if (!resolution) next.resolution = 'Choose how you would like this resolved.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handlePrepare = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setPreparing(true);
    try {
      const res = await returnService.buildWhatsAppRequest(orderId, {
        requestType,
        items: Object.entries(selected).map(([itemId, quantity]) => ({ itemId, quantity })),
        reason,
        description: description.trim() || undefined,
        preferredResolution: resolution,
        imageUrls: images.length ? images : undefined,
      });
      setPrepared(res.data?.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(
        err?.response?.data?.message || 'Could not prepare your request. Please try again.',
      );
    } finally {
      setPreparing(false);
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(prepared.message);
      toast.success('Message copied');
    } catch {
      toast.error('Could not copy the message');
    }
  };

  if (loading) return <ReturnExchangeSkeleton />;

  if (loadError || !data) {
    return (
      <div className="max-w-2xl text-left text-[11px] py-5 space-y-4">
        <SEO title="Return or Exchange" noindex />
        <div className={card}>
          <p className="text-[11px] text-on-surface">{loadError || 'Could not load this order.'}</p>
          <Link
            to="/dashboard/orders"
            className="inline-flex mt-4 text-[9px] font-bold uppercase tracking-widest text-[#2A2927] underline"
          >
            Back to My Orders
          </Link>
        </div>
      </div>
    );
  }

  const contactFallback = (
    <p className="text-[10px] text-secondary leading-relaxed">
      You can also reach us
      {supportPhone ? (
        <>
          {' '}
          on{' '}
          <a className="underline" href={`tel:${supportPhone.replace(/\s/g, '')}`}>
            {supportPhone}
          </a>
        </>
      ) : null}
      {supportEmail ? (
        <>
          {' '}
          or at{' '}
          <a className="underline" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
        </>
      ) : null}
      .
    </p>
  );

  // ── Ready screen: the message is prepared, the customer still has to send it ──
  if (prepared) {
    return (
      <div className="max-w-2xl text-left text-[11px] py-5 space-y-5">
        <SEO title="Send your request on WhatsApp" noindex />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${card} space-y-4`}
        >
          <h1 className="text-[13px] font-bold text-[#2A2927]">
            Your {requestType} request details are ready.
          </h1>
          <p className="text-[11px] text-on-surface leading-relaxed">
            Please send the pre-filled WhatsApp message to complete your request. WhatsApp opens
            with the message filled in, but <strong>it is not sent until you press Send</strong>.
          </p>
          <a
            href={prepared.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#25D366] hover:bg-[#1ebe5b] text-white font-bold uppercase tracking-widest text-[10px] shadow-sm transition-colors"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Open WhatsApp
          </a>
          <ul className="text-[10px] text-secondary space-y-1.5 list-disc pl-4">
            <li>You can attach more photos directly in the WhatsApp chat.</li>
            <li>Our team will reply on WhatsApp with the next steps.</li>
            <li>
              WhatsApp did not open? Copy the message and send it to us from WhatsApp on your phone.
            </li>
          </ul>
        </motion.div>

        <div className={`${card} space-y-3`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={sectionTitle}>Message preview</h2>
            <button
              type="button"
              onClick={copyMessage}
              className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#2A2927] hover:text-[#8c7335]"
            >
              <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
              Copy
            </button>
          </div>
          <pre className="whitespace-pre-wrap break-words font-body text-[11px] text-on-surface bg-[#FDFBF7] border border-[#E8E6E1] rounded-[12px] p-4 max-h-[420px] overflow-auto">
            {prepared.message}
          </pre>
        </div>

        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => setPrepared(null)}
            className="text-[9px] font-bold uppercase tracking-widest text-secondary underline"
          >
            Edit request
          </button>
          <Link
            to={`/dashboard/orders?orderId=${orderId}`}
            className="text-[9px] font-bold uppercase tracking-widest text-secondary underline"
          >
            Back to order
          </Link>
        </div>
      </div>
    );
  }

  // ── Request form ──
  return (
    <form
      onSubmit={handlePrepare}
      noValidate
      className="max-w-2xl text-left text-[11px] py-5 space-y-5"
    >
      <SEO title="Return or Exchange" noindex />

      <div>
        <h1 className="text-[13px] font-bold text-[#2A2927]">Return or exchange items</h1>
        <p className="text-[10px] text-secondary mt-1 leading-relaxed">
          Fill in the details below. We will prepare a WhatsApp message for you to send to our team,
          who will handle your request personally.
        </p>
      </div>

      {!data.whatsappConfigured && (
        <div
          className="p-4 rounded-[12px] border border-amber-200 bg-amber-50 text-amber-900 space-y-1"
          role="alert"
        >
          <p className="text-[11px] font-semibold">
            WhatsApp requests are temporarily unavailable.
          </p>
          {contactFallback}
        </div>
      )}

      {/* Order & customer details (read-only, from the order) */}
      <div className={`${card} grid grid-cols-1 sm:grid-cols-2 gap-4`}>
        <div className="space-y-1">
          <h2 className={sectionTitle}>
            <PackageCheck className="w-3 h-3" strokeWidth={1.5} />
            Order
          </h2>
          <p className="text-[11px] text-on-surface font-mono break-all">#{data.orderId}</p>
          <p className="text-[10px] text-secondary">Ordered {formatDate(data.orderDate)}</p>
          {data.deliveredAt && (
            <p className="text-[10px] text-secondary">Delivered {formatDate(data.deliveredAt)}</p>
          )}
        </div>
        <div className="space-y-1">
          <h2 className={sectionTitle}>
            <UserRound className="w-3 h-3" strokeWidth={1.5} />
            Your details
          </h2>
          <p className="text-[11px] text-on-surface">{data.customer?.name}</p>
          {data.customer?.phone && (
            <p className="text-[10px] text-secondary">{data.customer.phone}</p>
          )}
          {data.customer?.email && (
            <p className="text-[10px] text-secondary break-all">{data.customer.email}</p>
          )}
        </div>
      </div>

      {/* Request type */}
      <fieldset className="space-y-3">
        <legend className={sectionTitle}>What would you like to do?</legend>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'return', label: 'Return', Icon: CornerDownLeft },
            { value: 'exchange', label: 'Exchange', Icon: ArrowLeftRight },
          ].map(({ value, label, Icon }) => {
            const disabled = data.requestTypes?.[value] === false;
            return (
              <label
                key={value}
                className={`${choice(requestType === value)} flex items-center justify-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="requestType"
                  value={value}
                  className="sr-only"
                  checked={requestType === value}
                  disabled={disabled}
                  onChange={() => setRequestType(value)}
                />
                <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                {label}
              </label>
            );
          })}
        </div>
        {!typeEnabled && (
          <p className="text-[10px] text-error">
            {requestType === 'return' ? 'Returns' : 'Exchanges'} are currently not accepted.
          </p>
        )}
      </fieldset>

      {/* Items */}
      <fieldset className="space-y-3">
        <legend className={sectionTitle}>
          <ListChecks className="w-3 h-3" strokeWidth={1.5} />
          Which items?
        </legend>
        {eligibleItems.length === 0 && (
          <p className="text-[11px] text-on-surface">
            None of the items in this order can be returned or exchanged right now.
          </p>
        )}
        {eligibleItems.map((item) => {
          const isSelected = Boolean(selected[item.itemId]);
          return (
            <div
              key={item.itemId}
              className={`flex items-start gap-4 p-4 border rounded-[16px] transition-all ${isSelected ? 'border-[#D4AF37] bg-[#FDFBF7] shadow-sm' : 'bg-[#FDFBF7] border-[#E8E6E1]'}`}
            >
              <input
                id={`item-${item.itemId}`}
                type="checkbox"
                className="mt-1 w-4 h-4 accent-[#2A2927] rounded-sm cursor-pointer"
                checked={isSelected}
                onChange={() => toggleItem(item)}
              />
              <label
                htmlFor={`item-${item.itemId}`}
                className="flex gap-4 flex-1 min-w-0 cursor-pointer"
              >
                <div className="w-14 h-14 rounded-[12px] overflow-hidden bg-surface-container border border-outline-variant/20 shrink-0">
                  <OptimizedImage
                    src={item.imageSrc}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold uppercase tracking-wider text-[#2A2927] text-[10px] block truncate">
                    {item.title}
                  </span>
                  {item.variant && (
                    <span className="text-[10px] text-secondary block">{item.variant}</span>
                  )}
                  <span className="text-[10px] text-secondary block">Ordered: {item.quantity}</span>
                </div>
              </label>
              {isSelected && item.quantity > 1 && (
                <div className="shrink-0">
                  <label htmlFor={`qty-${item.itemId}`} className="sr-only">
                    Quantity for {item.title}
                  </label>
                  <select
                    id={`qty-${item.itemId}`}
                    className="form-field py-1 px-2 text-[10px]"
                    value={selected[item.itemId]}
                    onChange={(e) =>
                      setSelected((prev) => ({ ...prev, [item.itemId]: Number(e.target.value) }))
                    }
                  >
                    {Array.from({ length: item.quantity }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        Qty {n}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
        {ineligibleItems.map((item) => (
          <div
            key={item.itemId}
            className="flex items-start gap-4 p-4 border rounded-[16px] opacity-60 bg-surface-container-lowest border-outline-variant/20"
          >
            <div className="w-14 h-14 rounded-[12px] overflow-hidden bg-surface-container border border-outline-variant/20 shrink-0">
              <OptimizedImage
                src={item.imageSrc}
                alt={item.title}
                className="w-full h-full object-cover grayscale"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold uppercase tracking-wider text-[#2A2927] text-[10px] block truncate">
                {item.title}
              </span>
              <span className="text-[10px] text-secondary block">{item.ineligibleReason}</span>
            </div>
          </div>
        ))}
        {errors.items && (
          <p className="text-[10px] text-error" role="alert">
            {errors.items}
          </p>
        )}
      </fieldset>

      {/* Reason */}
      <fieldset className="space-y-3">
        <legend className={sectionTitle}>
          <HelpCircle className="w-3 h-3" strokeWidth={1.5} />
          Reason
        </legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {RETURN_REASONS.map((r) => (
            <label
              key={r.value}
              className={`${choice(reason === r.value)} flex flex-col items-center gap-2 text-center`}
            >
              <input
                type="radio"
                name="reason"
                value={r.value}
                className="sr-only"
                checked={reason === r.value}
                onChange={() => {
                  setReason(r.value);
                  setErrors((e) => ({ ...e, reason: undefined }));
                }}
              />
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                {r.icon}
              </span>
              {r.label}
            </label>
          ))}
        </div>
        {errors.reason && (
          <p className="text-[10px] text-error" role="alert">
            {errors.reason}
          </p>
        )}
      </fieldset>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="return-description" className={sectionTitle}>
          Description {reason === 'other' ? '(required)' : '(optional)'}
        </label>
        <textarea
          id="return-description"
          className="form-field resize-none h-24"
          maxLength={1000}
          placeholder="Tell us what happened"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setErrors((er) => ({ ...er, description: undefined }));
          }}
        />
        {errors.description && (
          <p className="text-[10px] text-error" role="alert">
            {errors.description}
          </p>
        )}
      </div>

      {/* Preferred resolution */}
      <fieldset className="space-y-3">
        <legend className={sectionTitle}>Preferred resolution</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RESOLUTIONS[requestType].map((r) => (
            <label
              key={r.value}
              className={`${choice(resolution === r.value)} flex items-center justify-center text-center`}
            >
              <input
                type="radio"
                name="resolution"
                value={r.value}
                className="sr-only"
                checked={resolution === r.value}
                onChange={() => {
                  setResolution(r.value);
                  setErrors((e) => ({ ...e, resolution: undefined }));
                }}
              />
              {r.label}
            </label>
          ))}
        </div>
        {errors.resolution && (
          <p className="text-[10px] text-error" role="alert">
            {errors.resolution}
          </p>
        )}
      </fieldset>

      {/* Photos */}
      <div className="space-y-2">
        <h2 className={sectionTitle}>
          <ImagePlus className="w-3 h-3" strokeWidth={1.5} />
          Photos (optional)
        </h2>
        <p className="text-[10px] text-secondary">
          Upload photos here to include links in your message, or attach them directly in WhatsApp.
        </p>
        <EvidenceUploader
          images={images}
          videos={[]}
          onImagesChange={setImages}
          onVideosChange={() => {}}
          maxImages={5}
          maxVideos={0}
          onUploadingChange={setUploading}
        />
      </div>

      <div className="flex items-start gap-2 text-[10px] text-secondary">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.5} />
        <span>
          Your request is sent only when you press Send in WhatsApp. Our team handles every request
          personally and will reply there.
        </span>
      </div>

      <button
        type="submit"
        disabled={
          preparing ||
          uploading ||
          !data.whatsappConfigured ||
          !typeEnabled ||
          eligibleItems.length === 0
        }
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#2A2927] hover:bg-black text-white font-bold uppercase tracking-widest text-[10px] shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {preparing
          ? 'Preparing message…'
          : uploading
            ? 'Uploading photos…'
            : 'Continue to WhatsApp'}
        {!preparing && <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />}
      </button>
    </form>
  );
}

export default WhatsAppReturnPage;
