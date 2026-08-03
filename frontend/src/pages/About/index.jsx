import { ArrowRight, Eye } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { m as motion, useScroll, useTransform } from 'framer-motion';
import { SEO } from '../../components/seo/SEO';
import { cmsService, galleryService } from '../../services/domainServices';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';
import logger from '../../utils/core/logger';
import { CloudinaryImage } from '../../components/ui/CloudinaryImage';
import { MandalaElement } from '../../components/ui/MandalaElement';
import { EASE, DURATION } from '../../constants/design-tokens';
import { AboutSkeleton } from '../../components/ui/Skeleton';

export function About() {
  const { navigation, loading: webLoading } = useWebsiteContent();
  const logoText = navigation?.logo?.text || 'SIRI ARTS & CRAFTS';

  const [cmsContent, setCmsContent] = useState(null);
  const [galleryPreview, setGalleryPreview] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openFaqs, setOpenFaqs] = useState([0]);

  const faqs = cmsContent?.faqs || [];
  const policies = cmsContent?.policies || [];

  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.05]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [cmsRes, galleryRes] = await Promise.all([
          cmsService.getSection('aboutPage').catch(() => null),
          galleryService.getAll({ limit: 6 }).catch(() => null),
        ]);

        if (cmsRes?.success && cmsRes?.data) {
          setCmsContent(cmsRes.data.data || cmsRes.data);
        }
        if (galleryRes?.success) {
          setGalleryPreview(
            galleryRes.data?.items || galleryRes.data?.data || galleryRes.data || [],
          );
        }
      } catch (err) {
        logger.error('About page data fetch failed:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading || webLoading) {
    return <AboutSkeleton />;
  }

  const founders = cmsContent?.founders || [];

  const getSrc = (img, fallback) => img?.url || (typeof img === 'string' ? img : fallback);

  const heroTitle = cmsContent?.heroTitle || '';
  const heroSubtitle = cmsContent?.heroSubtitle || '';

  return (
    <div
      ref={containerRef}
      className="bg-[#EAE5DB] min-h-screen relative overflow-hidden text-[#1A1A1A]"
    >
      <SEO
        title={`Our Story | ${logoText}`}
        description={`Discover the cinematic luxury of ${logoText}. Handcrafted Telugu cultural decor.`}
      />

      {/* Global Delicate Accents */}
      <div className="fixed top-0 left-0 w-full h-1 bg-[var(--color-gold)]/20 z-50" />
      <MandalaElement
        className="fixed -top-32 -right-32 opacity-[0.02] pointer-events-none z-0 mix-blend-multiply grayscale"
        size={900}
        duration={250}
      />

      {/* 1. Full-Bleed Scrolling Hero */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 px-4 lg:px-8 z-10 overflow-hidden bg-[#EAE5DB] min-h-[90vh] flex items-center justify-center">
        {/* Full-Bleed Scrolling Background */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 flex flex-col justify-center gap-4 md:gap-6 -rotate-[6deg] scale-[0.8] md:scale-100 lg:scale-[1.25] opacity-90 w-[300vw] md:w-[200vw] lg:w-[150vw] left-1/2 -translate-x-1/2">
            {/* Row 1 - Slides Left */}
            <motion.div
              animate={{ x: [0, -1000] }}
              transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
              className="flex gap-6 w-max"
            >
              {[...galleryPreview, ...galleryPreview, ...galleryPreview, ...galleryPreview].map(
                (item, idx) => (
                  <div
                    key={`r1-${idx}`}
                    className="w-48 h-36 rounded-2xl bg-white shadow-sm border border-outline-variant/20 flex-shrink-0 overflow-hidden p-2 flex flex-col gap-2"
                  >
                    <div className="w-full flex-1 rounded-xl overflow-hidden bg-surface-container">
                      <CloudinaryImage
                        src={getSrc(item.image, getSrc(item, ''))}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="h-1.5 w-1/2 bg-outline-variant/20 rounded-full mx-1" />
                  </div>
                ),
              )}
            </motion.div>

            {/* Row 2 - Slides Right */}
            <motion.div
              animate={{ x: [-1000, 0] }}
              transition={{ repeat: Infinity, duration: 45, ease: 'linear' }}
              className="flex gap-6 w-max -ml-24"
            >
              {[...galleryPreview, ...galleryPreview, ...galleryPreview, ...galleryPreview]
                .reverse()
                .map((item, idx) => (
                  <div
                    key={`r2-${idx}`}
                    className="w-56 h-40 rounded-2xl bg-white shadow-sm border border-outline-variant/20 flex-shrink-0 overflow-hidden p-2 flex flex-col gap-2"
                  >
                    <div className="w-full flex-1 rounded-xl overflow-hidden bg-surface-container">
                      <CloudinaryImage
                        src={getSrc(item.image, getSrc(item, ''))}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <div className="h-1.5 w-1/3 bg-outline-variant/20 rounded-full" />
                      <div className="h-1.5 w-4 bg-[var(--color-gold)]/40 rounded-full" />
                    </div>
                  </div>
                ))}
            </motion.div>

            {/* Row 3 - Slides Left */}
            <motion.div
              animate={{ x: [0, -1000] }}
              transition={{ repeat: Infinity, duration: 35, ease: 'linear' }}
              className="flex gap-6 w-max"
            >
              {[...galleryPreview, ...galleryPreview, ...galleryPreview, ...galleryPreview].map(
                (item, idx) => (
                  <div
                    key={`r3-${idx}`}
                    className="w-44 h-32 rounded-2xl bg-white shadow-sm border border-outline-variant/20 flex-shrink-0 overflow-hidden p-2 flex flex-col gap-2"
                  >
                    <div className="w-full flex-1 rounded-xl overflow-hidden bg-surface-container">
                      <CloudinaryImage
                        src={getSrc(item.image, getSrc(item, ''))}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="h-1.5 w-2/3 bg-outline-variant/20 rounded-full mx-1" />
                  </div>
                ),
              )}
            </motion.div>

            {/* Row 4 - Slides Right */}
            <motion.div
              animate={{ x: [-1000, 0] }}
              transition={{ repeat: Infinity, duration: 42, ease: 'linear' }}
              className="flex gap-6 w-max -ml-16"
            >
              {[...galleryPreview, ...galleryPreview, ...galleryPreview, ...galleryPreview]
                .reverse()
                .map((item, idx) => (
                  <div
                    key={`r4-${idx}`}
                    className="w-40 h-28 rounded-2xl bg-white shadow-sm border border-outline-variant/20 flex-shrink-0 overflow-hidden p-2 flex flex-col gap-2"
                  >
                    <div className="w-full flex-1 rounded-xl overflow-hidden bg-surface-container">
                      <CloudinaryImage
                        src={getSrc(item.image, getSrc(item, ''))}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <div className="h-1 w-1/2 bg-outline-variant/20 rounded-full" />
                    </div>
                  </div>
                ))}
            </motion.div>
          </div>
        </div>

        {/* Cream Vignette / Gradient Overlay */}
        <div className="absolute inset-0 bg-[#EAE5DB]/20 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FAF9F6] via-transparent to-[#FAF9F6]/60 z-10 pointer-events-none" />

        {/* Soft Radial Glow behind text for maximum readability */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(250,249,246,0.95)_0%,rgba(250,249,246,0.7)_40%,transparent_75%)] lg:bg-[radial-gradient(circle_at_center,rgba(250,249,246,0.9)_0%,transparent_60%)] z-10 pointer-events-none" />

        {/* Foreground Content */}
        <div className="max-w-4xl mx-auto relative z-20 text-center flex flex-col items-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
            className="font-display text-5xl md:text-6xl lg:text-[80px] text-[#1A1A1A] leading-[1.05] mb-8"
          >
            {heroTitle}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="text-lg md:text-xl text-[#4A4A4A] mb-12 max-w-2xl leading-relaxed font-light"
          >
            <span className="text-[var(--color-gold-dark)] font-medium">
              {heroSubtitle ? `${heroSubtitle}.` : ''}
            </span>{' '}
            {cmsContent?.missionStatement || ''}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
            className="flex flex-col sm:flex-row items-center justify-center gap-8 w-full sm:w-auto mt-4"
          >
            <Link
              to="/collections"
              className="group inline-flex items-center gap-4 border-b border-[var(--color-gold-dark)] pb-2 text-[#1A1A1A] hover:text-[var(--color-gold-dark)] transition-colors duration-500"
            >
              <span className="font-label text-[11px] uppercase tracking-[0.2em] font-bold">
                Explore Collections
              </span>
              <ArrowRight
                className="text-[18px] group-hover:translate-x-2 transition-transform duration-500"
                strokeWidth={1.5}
              />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 3. FAQ Section */}
      {faqs.length > 0 && (
        <section className="py-32 bg-[#EAE5DB] relative z-10 overflow-hidden">
          {/* Subtle Mandala Watermark */}
          <div className="absolute top-0 left-0 -translate-x-1/3 -translate-y-1/4 pointer-events-none z-0">
            <MandalaElement size={800} opacity={0.15} />
          </div>
          <div className="max-w-[1400px] mx-auto px-6 lg:px-20 relative z-10">
            <div className="flex flex-col lg:flex-row gap-16 lg:gap-32">
              <div className="w-full lg:w-1/3">
                <span className="font-label text-[9px] uppercase tracking-[0.4em] text-[var(--color-gold-dark)] font-bold mb-4 block">
                  F.A.Q
                </span>
                <h2 className="font-display text-4xl lg:text-5xl leading-[1.1] sticky top-32 text-[#1A1A1A]">
                  Got Questions?
                  <br />
                  We've got answers.
                </h2>
              </div>

              <div className="w-full lg:w-2/3 space-y-4 pt-4">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="border-b border-outline-variant/30 pb-4">
                    <button
                      onClick={() =>
                        setOpenFaqs((prev) =>
                          prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
                        )
                      }
                      className="w-full flex items-start lg:items-center justify-between text-left group gap-4"
                    >
                      <h3 className="font-display text-lg lg:text-xl transition-colors duration-500 text-[#1A1A1A] group-hover:text-[var(--color-gold-dark)]">
                        {faq.question}
                      </h3>
                      <motion.span
                        animate={{ rotate: openFaqs.includes(idx) ? 180 : 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="material-symbols-outlined text-[24px] font-light mt-1 lg:mt-0 shrink-0 transition-colors duration-500 text-[#1A1A1A] group-hover:text-[var(--color-gold-dark)]"
                      >
                        expand_more
                      </motion.span>
                    </button>
                    <motion.div
                      initial={false}
                      animate={{
                        height: openFaqs.includes(idx) ? 'auto' : 0,
                        opacity: openFaqs.includes(idx) ? 1 : 0,
                      }}
                      className="overflow-hidden"
                    >
                      <p className="font-body text-base text-[#4A4A4A] leading-relaxed font-light mt-4 max-w-2xl">
                        {faq.answer}
                      </p>
                    </motion.div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Policy Links Strip (Scrolling Marquee) */}
      {policies.length > 0 && (
        <section className="py-10 bg-[#EAE5DB] relative z-10 border-t border-b border-outline-variant/30 overflow-hidden flex items-center">
          {/* Subtle Mandala Watermark */}
          <div className="absolute top-1/2 -translate-y-1/2 right-10 opacity-[0.03] w-96 h-96 pointer-events-none z-0">
            <MandalaElement className="w-full h-full text-black" />
          </div>

          {/* Marquee Container */}
          <div className="w-full relative z-10 flex overflow-hidden">
            <motion.div
              animate={{ x: ['0%', '-50%'] }}
              transition={{ repeat: Infinity, duration: 35, ease: 'linear' }}
              className="flex items-center gap-16 lg:gap-32 w-max shrink-0 pr-16 lg:pr-32 hover:[animation-play-state:paused]"
            >
              {[...policies, ...policies].map((policy, idx) => (
                <div key={idx} className="flex items-center gap-16 lg:gap-32">
                  <Link
                    to={policy.path}
                    className="font-label text-[10px] lg:text-[11px] uppercase tracking-[0.25em] text-[#4A4A4A] hover:text-[var(--color-gold-dark)] transition-colors duration-500 font-bold whitespace-nowrap"
                  >
                    {policy.title}
                  </Link>
                  {/* Elegant separator dot between items */}
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold-dark)]/40 shrink-0" />
                </div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* 4.5 Who We Are / About Section */}
      <section className="py-24 lg:py-32 bg-[#FAF9F6] relative z-10 border-t border-b border-outline-variant/20 overflow-hidden">
        {/* Subtle Mandala Watermark */}
        <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 pointer-events-none z-0">
          <MandalaElement size={600} opacity={0.15} variant={2} />
        </div>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-20 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Image Side */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="w-full lg:w-1/2 relative"
            >
              {/* Corner Mandala Accent */}
              <div className="absolute -top-16 -left-16 pointer-events-none z-0 hidden lg:block">
                <MandalaElement size={300} opacity={0.2} variant={1} />
              </div>
              <div className="absolute -bottom-16 -right-16 pointer-events-none z-0 hidden lg:block">
                <MandalaElement size={250} opacity={0.15} variant={3} />
              </div>

              <div className="w-full aspect-[4/5] lg:aspect-[3/4] rounded-[32px] overflow-hidden shadow-xl shadow-black/5 relative z-10">
                <CloudinaryImage
                  src={
                    cmsContent?.aboutImage ||
                    galleryPreview[0]?.image ||
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuC6Cy1TlK9jjSUwKlKlXEL_AKlV3Ff5c2VdyViS7GGN3dgR1UB3SgmAto5fKc__pxujkfieY8wFl8MLAhbv7fZHW-oIWdXX0Xqg7SaMj5Szj9w6aGsuChZguzRLBppvcE_7OyVd9N7Ldchm0izPUhXOQGyYaQUsd43cUxBLr5ift2YUa0I_rr4_34hldd6L-V9MeNbxa-BUn2gvZq7JQypKg2Wl6-8TPta6D_ZooOmuUfcwSJJUjNe8-voUHsu7mBKM_CeD9YFd204'
                  }
                  alt="Our Story"
                  className="w-full h-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-1000"
                />
              </div>
            </motion.div>

            {/* Text Side */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              className="w-full lg:w-1/2"
            >
              <span className="font-label text-[10px] uppercase tracking-[0.4em] text-[var(--color-gold-dark)] font-bold mb-6 block">
                Who We Are
              </span>
              <h2 className="font-display text-4xl lg:text-5xl lg:text-6xl text-[#1A1A1A] leading-[1.1] mb-8">
                {cmsContent?.aboutTitle1 || 'A Legacy of'} <br />
                <span className="italic font-light text-outline">
                  {cmsContent?.aboutTitle2 || 'Elegance'}
                </span>
              </h2>
              <p className="font-body text-lg text-[#4A4A4A] leading-relaxed font-light mb-6">
                {cmsContent?.aboutText ||
                  'Siri Arts & Crafts was born out of a profound love for our cultural heritage and a passion for bringing traditional elegance to modern celebrations. We meticulously curate and craft decor that speaks volumes of our rich Indian roots, ensuring every piece adds a touch of royal grace to your special moments.'}
              </p>
              <p className="font-body text-lg text-[#4A4A4A] leading-relaxed font-light">
                {cmsContent?.aboutTextSecondary ||
                  'From intricate floral arrangements to majestic mandap designs, our work is an ode to the timeless beauty of Indian artistry. We believe that decor is not just about beautifying a space, but about creating an atmosphere where memories are forged and legacies are celebrated.'}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. The Artisans (Magazine Spread) */}
      {founders.length > 0 && (
        <section className="py-32 lg:py-48 max-w-[1600px] mx-auto px-6 lg:px-20 relative z-10">
          {/* Subtle Mandala Watermark */}
          <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/4 pointer-events-none z-0">
            <MandalaElement size={800} opacity={0.15} variant={3} />
          </div>
          <div className="text-center mb-24 relative z-10">
            <span className="font-label text-[9px] uppercase tracking-[0.4em] text-[var(--color-gold-dark)] font-bold mb-4 block">
              The Artisans
            </span>
            <h2 className="font-display text-4xl lg:text-6xl leading-[1.1]">
              Masterminds <span className="italic font-light text-outline">behind the Craft</span>
            </h2>
          </div>

          <div className="space-y-32">
            {founders.map((founder, idx) => {
              const isEven = idx % 2 === 0;
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12 lg:gap-24`}
                >
                  {/* Edge-to-edge style image container */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: DURATION.slower, ease: EASE.luxury }}
                    className="w-full lg:w-1/2 aspect-[3/4] overflow-hidden"
                  >
                    <CloudinaryImage
                      src={getSrc(founder.image, '/assets/placeholder-avatar.jpg')}
                      alt={founder.name}
                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-[2s]"
                    />
                  </motion.div>

                  <div className="w-full lg:w-1/2 flex flex-col justify-center">
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2, duration: DURATION.slow, ease: EASE.luxury }}
                    >
                      <h3 className="font-display text-5xl lg:text-7xl mb-2 tracking-tight">
                        {founder.name}
                      </h3>
                      <p className="font-label text-[10px] uppercase tracking-widest text-outline-variant font-bold mb-10">
                        {founder.role}
                      </p>

                      <div className="relative">
                        <span className="absolute -top-10 -left-8 text-8xl text-primary/10 font-serif leading-none select-none">
                          "
                        </span>
                        <p className="font-body text-xl lg:text-2xl text-[#4A4A4A] leading-[1.6] font-light italic mb-8 relative z-10">
                          {founder.bio ||
                            founder.quote ||
                            'Crafting experiences that transcend time. We believe every piece of decor should whisper a story of heritage and luxury.'}
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. Heritage Gallery (Flowing Masonry) */}
      {galleryPreview.length > 0 && (
        <section className="py-32 bg-[#EAE5DB] relative z-10 border-t border-outline-variant/20 overflow-hidden">
          {/* Subtle Mandala Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
            <MandalaElement size={1200} opacity={0.12} variant={4} />
          </div>
          <div className="max-w-[1600px] mx-auto px-6 lg:px-20 relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 lg:mb-24 gap-8 md:gap-0">
              <div className="max-w-2xl">
                <span className="font-label text-[10px] uppercase tracking-[0.4em] text-[var(--color-gold-dark)] font-bold mb-6 block">
                  Our Portfolio
                </span>
                <h2 className="font-display text-4xl lg:text-6xl text-[#1A1A1A] leading-[1.1] mb-6">
                  Curated Moments
                </h2>
                <p className="font-body text-lg text-[#4A4A4A] font-light leading-relaxed">
                  Glimpses into our grandest celebrations. Every setup is a testament to our
                  dedication to authentic heritage arts, lovingly reimagined for modern elegance.
                </p>
              </div>
              <div className="shrink-0 hidden md:block">
                <Link
                  to="/gallery"
                  className="group inline-flex items-center gap-4 border-b border-[var(--color-gold-dark)] pb-2 text-[#1A1A1A] hover:text-[var(--color-gold-dark)] transition-colors duration-500"
                >
                  <span className="font-label text-[11px] uppercase tracking-[0.2em] font-bold">
                    Explore Full Gallery
                  </span>
                  <ArrowRight
                    className="text-[18px] group-hover:translate-x-2 transition-transform duration-500"
                    strokeWidth={1.5}
                  />
                </Link>
              </div>
            </div>

            {/* True Masonry Layout */}
            <div className="columns-2 lg:columns-3 gap-4 md:gap-6 lg:gap-8 space-y-4 md:space-y-6 lg:space-y-8">
              {galleryPreview.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.7, ease: 'easeOut', delay: (idx % 3) * 0.1 }}
                  className="relative w-full break-inside-avoid overflow-hidden group bg-[#EAE5DB] rounded-2xl shadow-xl shadow-black/5"
                >
                  <Link to="/gallery" className="block w-full relative cursor-pointer">
                    <CloudinaryImage
                      src={getSrc(item.image, getSrc(item, ''))}
                      alt="Gallery Inspiration"
                      className="w-full h-auto object-cover scale-[1.02] group-hover:scale-[1.08] transition-transform duration-[1.5s] ease-out block"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 flex flex-col items-center">
                        <Eye className="text-white text-[32px] mb-3 font-light" strokeWidth={1.5} />
                        <span className="font-label text-[10px] uppercase tracking-[0.2em] text-white font-bold">
                          View in Gallery
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Mobile Explore Link (Bottom) */}
            <div className="mt-12 flex justify-center md:hidden">
              <Link
                to="/gallery"
                className="group inline-flex items-center gap-4 border-b border-[var(--color-gold-dark)] pb-2 text-[#1A1A1A] hover:text-[var(--color-gold-dark)] transition-colors duration-500"
              >
                <span className="font-label text-[11px] uppercase tracking-[0.2em] font-bold">
                  Explore Full Gallery
                </span>
                <ArrowRight
                  className="text-[18px] group-hover:translate-x-2 transition-transform duration-500"
                  strokeWidth={1.5}
                />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
