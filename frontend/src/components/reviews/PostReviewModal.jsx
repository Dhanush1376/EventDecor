import { m as motion, AnimatePresence } from 'framer-motion';
import { OptimizedImage } from '../ui/OptimizedImage';
import { useState } from 'react';
import { useReviewForm } from './useReviewForm';
import { REVIEW_SAMPLE_IMAGES } from '../../constants/placeholderImages';

const EXPERIENCE_TYPES = [
  {
    id: 'product',
    title: 'Product Masterpiece',
    desc: 'Handcrafted decor, brass diyas, artisanal trays & divine idola',
    icon: 'diamond',
  },
  {
    id: 'event',
    title: 'Event Setup Experience',
    desc: 'Full venue styling, floral archways & engagement stage curation',
    icon: 'celebration',
  },
  {
    id: 'showcase',
    title: 'Showcase Rental Experience',
    desc: 'Royal side-stage props, traditional backdrops & premium pedestals',
    icon: 'styler',
  },
  {
    id: 'overall',
    title: 'Overall Brand Story',
    desc: 'Your overarching narrative with Siri Arts & Crafts concierge',
    icon: 'auto_awesome',
  },
];

const SMART_PROMPTS = [
  'The brass carving details were absolutely flawless for our ceremony...',
  'Our guests were mesmerized by the royal mandap showcase arrangement...',
  'The delivery concierge arrived perfectly on schedule and set up flawlessly...',
  'The handcrafted coconut decor added such an authentic traditional aura...',
];

export function PostReviewModal({ isOpen, onClose, onSubmit }) {
  const {
    step,
    setStep,
    isSubmitting,
    experienceType,
    setExperienceType,
    ratings,
    hoverRatings,
    customerName,
    setCustomerName,
    eventType,
    setEventType,
    favoriteElement,
    setFavoriteElement,
    comment,
    setComment,
    isAiPolishing,
    mediaList,
    setMediaList,
    newMediaUrl,
    setNewMediaUrl,
    handleStarClick,
    handleStarHover,
    addSampleMedia,
    handleCustomMediaAdd,
    triggerAiPolish,
    handleSubmitFinal,
  } = useReviewForm({ onSubmit, onClose });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto font-body">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl my-8 bg-[#FAF9F6] border border-[#D4AF37]/30 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Top Gold Bar */}
        <div className="h-2 bg-gradient-to-r from-[var(--color-gold-dark)] via-[#D4AF37] to-[#C4A87C]" />

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#D4AF37]/20 bg-white/60 backdrop-blur-xs shrink-0">
          <div>
            <span className="font-label text-[10px] uppercase tracking-[0.3em] text-[var(--color-gold-dark)] font-bold">
              Premium Client Stories
            </span>
            <h2 className="text-xl md:text-2xl font-display font-bold text-[#2D2B29] mt-0.5">
              Share Your Celebration Narrative
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 min-h-0 rounded-full bg-[#FAF9F6] border border-[#D4AF37]/30 flex items-center justify-center text-[#2D2B29] hover:bg-[var(--color-gold-dark)] hover:text-white transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-8 py-3 bg-[#F4F1EA] border-b border-[#D4AF37]/10 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((st) => (
              <div key={st} className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] transition-all ${
                    step === st
                      ? 'bg-[var(--color-gold-dark)] text-white ring-2 ring-[#D4AF37]/50'
                      : step > st
                        ? 'bg-[#D4AF37] text-white'
                        : 'bg-[#EAE5DA] text-[#8C8270]'
                  }`}
                >
                  {step > st ? '✓' : st}
                </div>
                {st < 5 && <div className="w-4 h-[2px] bg-[#D4AF37]/20" />}
              </div>
            ))}
          </div>
          <span className="font-label uppercase text-[10px] font-bold text-[var(--color-gold-dark)]">
            Step {step} of 5:{' '}
            {step === 1
              ? 'Experience Type'
              : step === 2
                ? 'Multi-Dimension Rating'
                : step === 3
                  ? 'Detailed Narrative'
                  : step === 4
                    ? 'Event Media Showcase'
                    : 'Live Luxury Preview'}
          </span>
        </div>

        {/* Workspace Body */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center max-w-md mx-auto">
                  <h3 className="text-lg font-display font-bold text-[#2D2B29]">
                    What would you like to review?
                  </h3>
                  <p className="text-xs text-[#7F7663] mt-1 leading-relaxed">
                    Select the dimension of your engagement with Siri Arts & Crafts to categorize
                    your story.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {EXPERIENCE_TYPES.map((exp) => (
                    <div
                      key={exp.id}
                      onClick={() => setExperienceType(exp.id)}
                      className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
                        experienceType === exp.id
                          ? 'bg-gradient-to-br from-[var(--color-gold-dark)] to-[var(--color-gold-darker)] border-[#D4AF37] text-white shadow-xl scale-[1.02]'
                          : 'bg-white border-[#D4AF37]/20 hover:border-[#D4AF37]/60 text-[#2D2B29]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            experienceType === exp.id
                              ? 'bg-white/10 text-[#D4AF37]'
                              : 'bg-[#F8F5F0] text-[var(--color-gold-dark)]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-2xl">{exp.icon}</span>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            experienceType === exp.id
                              ? 'border-[#D4AF37] bg-[#D4AF37] text-white'
                              : 'border-zinc-300'
                          }`}
                        >
                          {experienceType === exp.id && (
                            <span className="material-symbols-outlined text-xs">check</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-base leading-tight">
                          {exp.title}
                        </h4>
                        <p
                          className={`text-xs mt-1 leading-relaxed ${
                            experienceType === exp.id ? 'text-white/80' : 'text-[#7F7663]'
                          }`}
                        >
                          {exp.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center max-w-md mx-auto">
                  <h3 className="text-lg font-display font-bold text-[#2D2B29]">
                    Rate Your Experience Dimensions
                  </h3>
                  <p className="text-xs text-[#7F7663] mt-1 leading-relaxed">
                    Provide a multi-dimensional assessment of our artisanal craftsmanship, delivery
                    accuracy, and setup excellence.
                  </p>
                </div>

                <div className="bg-white border border-[#D4AF37]/20 rounded-3xl p-6 space-y-5">
                  {/* Overall Star Rating Banner */}
                  <div className="pb-5 border-b border-[#D4AF37]/10 text-center">
                    <span className="text-xs uppercase tracking-widest text-[var(--color-gold-dark)] font-bold block mb-2">
                      Overall Satisfaction
                    </span>
                    <div className="flex justify-center gap-2 text-[#D4AF37]">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          onClick={() => handleStarClick('overall', star)}
                          onMouseEnter={() => handleStarHover('overall', star)}
                          onMouseLeave={() => handleStarHover('overall', null)}
                          className="material-symbols-outlined text-4xl cursor-pointer hover:scale-125 transition-transform"
                          style={{
                            fontVariationSettings:
                              "'FILL' " +
                              (star <= (hoverRatings.overall || ratings.overall) ? '1' : '0'),
                            color:
                              star <= (hoverRatings.overall || ratings.overall)
                                ? '#D4AF37'
                                : '#E2DACB',
                          }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-[#2D2B29] font-semibold mt-2 block">
                      {ratings.overall === 5
                        ? '👑 Absolute Luxury Perfection'
                        : ratings.overall === 4
                          ? '✨ Superb Artisanal Quality'
                          : '🌟 Satisfactory Experience'}
                    </span>
                  </div>

                  {/* Sub-categories */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {[
                      { key: 'quality', label: 'Handcrafted Quality', icon: 'workspace_premium' },
                      { key: 'design', label: 'Design Elegance & Aesthetics', icon: 'palette' },
                      {
                        key: 'delivery',
                        label: 'Punctual Delivery Logistics',
                        icon: 'local_shipping',
                      },
                      { key: 'setup', label: 'Venue Setup Professionalism', icon: 'architecture' },
                      {
                        key: 'communication',
                        label: 'Concierge Communication',
                        icon: 'support_agent',
                      },
                    ].map((cat) => (
                      <div
                        key={cat.key}
                        className="flex items-center justify-between p-3.5 bg-[#FAF9F6] rounded-2xl border border-black/5"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-base text-[var(--color-gold-dark)]">
                            {cat.icon}
                          </span>
                          <span className="text-xs font-semibold text-[#2D2B29]">{cat.label}</span>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((st) => (
                            <span
                              key={st}
                              onClick={() => handleStarClick(cat.key, st)}
                              onMouseEnter={() => handleStarHover(cat.key, st)}
                              onMouseLeave={() => handleStarHover(cat.key, null)}
                              className="material-symbols-outlined text-base cursor-pointer hover:scale-125 transition-transform"
                              style={{
                                fontVariationSettings:
                                  "'FILL' " +
                                  (st <= (hoverRatings[cat.key] || ratings[cat.key]) ? '1' : '0'),
                                color:
                                  st <= (hoverRatings[cat.key] || ratings[cat.key])
                                    ? 'var(--color-gold-dark)'
                                    : '#E2DACB',
                              }}
                            >
                              star
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="text-center max-w-md mx-auto">
                  <h3 className="text-lg font-display font-bold text-[#2D2B29]">
                    Write Your Story
                  </h3>
                  <p className="text-xs text-[#7F7663] mt-1 leading-relaxed">
                    Share emotional details of how Siri Arts made your milestone celebration
                    unforgettable.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold-dark)] block mb-1.5">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Meera Kapoor"
                      className="w-full bg-white border border-[#D4AF37]/30 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[var(--color-gold-dark)] font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold-dark)] block mb-1.5">
                      Celebration Event
                    </label>
                    <input
                      type="text"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      placeholder="e.g. Royal Haldi & Engagement"
                      className="w-full bg-white border border-[#D4AF37]/30 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[var(--color-gold-dark)] font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold-dark)] block mb-1.5">
                      Favorite Decor Piece
                    </label>
                    <input
                      type="text"
                      value={favoriteElement}
                      onChange={(e) => setFavoriteElement(e.target.value)}
                      placeholder="e.g. Antique Gold Mandap Arch"
                      className="w-full bg-white border border-[#D4AF37]/30 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[var(--color-gold-dark)] font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold-dark)]">
                      Your Detailed Review
                    </label>
                    <button
                      type="button"
                      onClick={triggerAiPolish}
                      disabled={isAiPolishing}
                      className="flex items-center gap-1 text-[11px] font-bold text-[var(--color-gold-dark)] bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 transition-all cursor-pointer"
                    >
                      {isAiPolishing ? (
                        <>
                          <div className="skeleton-box inline-block w-2.5 h-2.5 rounded-md" />
                          Polishing with AI...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-xs">auto_awesome</span>✨
                          Polish with AI Concierge
                        </>
                      )}
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Describe the atmosphere, guest reactions, before & after venue transformation, and artisan care..."
                    className="w-full bg-white border border-[#D4AF37]/30 rounded-2xl p-4 text-xs leading-relaxed outline-none focus:border-[var(--color-gold-dark)] transition-colors"
                  />
                </div>

                {/* Smart Prompts Starters */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-[#7F7663] font-bold block">
                    💡 Click a Smart Starter to begin writing:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {SMART_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setComment((prev) => (prev ? prev + ' ' : '') + prompt)}
                        className="text-[11px] bg-white border border-[#D4AF37]/20 hover:border-[var(--color-gold-dark)] text-[#2D2B29] px-3 py-1.5 rounded-full transition-all cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center max-w-md mx-auto">
                  <h3 className="text-lg font-display font-bold text-[#2D2B29]">
                    Upload Photos & Video Memories
                  </h3>
                  <p className="text-xs text-[#7F7663] mt-1 leading-relaxed">
                    Attach venue photos, closeups of brass trays, or video highlight clips. Earn ₹50
                    Siri Cash for photo/video stories!
                  </p>
                </div>

                {/* Sample Media Pre-Seeds */}
                <div className="bg-[#FAF9F6] border border-[#D4AF37]/20 rounded-3xl p-5 space-y-3">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--color-gold-dark)] font-bold block">
                    ✨ Click pre-curated gorgeous event memories to test upload instantly:
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {REVIEW_SAMPLE_IMAGES.map((sample, idx) => (
                      <div
                        key={idx}
                        onClick={() => addSampleMedia(sample.url, 'image')}
                        className="group relative aspect-video rounded-xl overflow-hidden border border-[#D4AF37]/30 cursor-pointer shadow-xs"
                      >
                        <OptimizedImage
                          src={sample.url}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          alt="Sample"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] text-white font-bold bg-[var(--color-gold-dark)] px-2 py-1 rounded-md">
                            ＋ Attach
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom URL or Mock Upload Box */}
                <form onSubmit={handleCustomMediaAdd} className="flex gap-3">
                  <input
                    type="url"
                    value={newMediaUrl}
                    onChange={(e) => setNewMediaUrl(e.target.value)}
                    placeholder="Paste an image or video URL here (e.g. from Google Photos / Unsplash)..."
                    className="flex-1 bg-white border border-[#D4AF37]/30 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[var(--color-gold-dark)]"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[var(--color-gold-dark)] text-white rounded-xl text-xs font-bold hover:bg-[var(--color-gold-darker)] transition-colors cursor-pointer shrink-0"
                  >
                    Attach Link
                  </button>
                </form>

                {/* Uploaded Media Preview Rack */}
                {mediaList.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#2D2B29]">
                      Attached Memories ({mediaList.length}):
                    </span>
                    <div className="flex flex-wrap gap-3">
                      {mediaList.map((media, idx) => (
                        <div
                          key={idx}
                          className="relative w-20 h-20 rounded-2xl overflow-hidden border border-[#D4AF37]/40 shadow-sm group"
                        >
                          {media.type === 'video' ? (
                            <div className="w-full h-full bg-[var(--color-gold-dark)] flex items-center justify-center text-white">
                              <span className="material-symbols-outlined text-2xl">
                                play_circle
                              </span>
                            </div>
                          ) : (
                            <OptimizedImage
                              src={media.url}
                              className="w-full h-full object-cover"
                              alt="Uploaded Preview"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => setMediaList(mediaList.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/70 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center max-w-md mx-auto">
                  <h3 className="text-lg font-display font-bold text-[#2D2B29]">
                    Review Final Luxury Card
                  </h3>
                  <p className="text-xs text-[#7F7663] mt-1 leading-relaxed">
                    Here is how your testimonial will be showcased in the Siri Arts Client
                    Narratives Gallery.
                  </p>
                </div>

                {/* Gorgeous Live Preview Card */}
                <div className="bg-white rounded-[2rem] border border-[#D4AF37]/40 p-6 shadow-xl space-y-4 max-w-xl mx-auto relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#D4AF37]/10 to-transparent rounded-bl-[100px] pointer-events-none" />

                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[var(--color-gold-dark)] to-[#D4AF37] text-white flex items-center justify-center font-display text-lg font-bold shadow-md">
                        {customerName ? customerName.substring(0, 2).toUpperCase() : 'SA'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-display font-bold text-base text-[#2D2B29]">
                            {customerName || 'Bespoke Patron'}
                          </h4>
                          <span
                            className="material-symbols-outlined text-sm text-emerald-600 font-bold"
                            title="Verified Patron"
                          >
                            verified
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-gold-dark)] font-semibold">
                          {eventType} · {favoriteElement}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 text-[#D4AF37]">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className="material-symbols-outlined text-base"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-[#2D2B29]/90 leading-relaxed italic bg-[#FAF9F6] p-4 rounded-2xl border border-black/5 font-serif">
                    "
                    {comment ||
                      'An exquisite masterwork of timeless decor that elevated our venue into a royal sanctuary.'}
                    "
                  </p>

                  {/* Media rack */}
                  {mediaList.length > 0 && (
                    <div className="flex gap-2.5 overflow-x-auto pb-1">
                      {mediaList.map((m, idx) => (
                        <div
                          key={idx}
                          className="w-16 h-16 rounded-xl overflow-hidden border border-[#D4AF37]/30 shrink-0 shadow-xs"
                        >
                          {m.type === 'video' ? (
                            <div className="w-full h-full bg-[var(--color-gold-dark)] flex items-center justify-center text-white text-xs font-bold">
                              VIDEO
                            </div>
                          ) : (
                            <OptimizedImage
                              src={m.url}
                              className="w-full h-full object-cover"
                              alt="Preview"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-[#7F7663] pt-2 border-t border-black/5">
                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                      <span className="material-symbols-outlined text-xs">loyalty</span>₹
                      {mediaList.length > 0 ? 50 : 25} Siri Cash Reward Secured
                    </span>
                    <span>Just now · Verified Event</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-8 py-5 bg-[#FAF9F6] border-t border-[#D4AF37]/20 flex justify-between items-center shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-5 py-2.5 rounded-xl border border-[#D4AF37]/40 text-[var(--color-gold-dark)] font-bold text-xs hover:bg-white transition-colors cursor-pointer"
            >
              ← Previous Step
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="px-7 py-3 rounded-xl bg-[var(--color-gold-dark)] text-white font-bold text-xs hover:bg-[var(--color-gold-darker)] shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
            >
              Continue to Step {step + 1} →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitFinal}
              disabled={isSubmitting}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[var(--color-gold-dark)] via-[#A68500] to-[var(--color-gold-dark)] text-white font-bold text-xs uppercase tracking-wider hover:brightness-110 shadow-xl transition-all cursor-pointer flex items-center gap-2 ml-auto"
            >
              {isSubmitting ? (
                <>
                  <div className="skeleton-box inline-block w-4 h-4 rounded-md" />
                  Publishing Story...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">campaign</span>
                  Publish & Claim ₹{mediaList.length > 0 ? 50 : 25} Reward
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
