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
  const [openFaq, setOpenFaq] = useState(0);

  const faqs =
    cmsContent?.faqs?.length > 0
      ? cmsContent.faqs
      : [
          {
            question: 'How far in advance should we book your decor services?',
            answer:
              'For grand weddings and large-scale events, we recommend booking 6 to 8 months in advance. This allows our artisans ample time to source rare materials, handcraft bespoke elements, and conceptualize a truly unique design tailored to your vision.',
          },
          {
            question: 'Do you travel for destination weddings?',
            answer:
              'Yes, we proudly offer our services for destination weddings globally. Our core team travels to your chosen location, ensuring our signature craftsmanship and meticulous attention to detail are maintained, regardless of the venue.',
          },
          {
            question: 'Can we customize the decor to match a specific heritage theme?',
            answer:
              'Absolutely. We specialize in weaving authentic traditions—such as classic Telugu floral scapes and antique brass arrangements—into modern aesthetics. We work closely with you to ensure every cultural nuance is honored beautifully.',
          },
          {
            question: 'What is the typical investment for a bespoke event setup?',
            answer:
              'Because every event is custom-designed, the investment varies based on scale, floral choices, and architectural elements. We invite you to schedule a consultation with our design studio to receive a tailored proposal.',
          },
        ];

  const policies =
    cmsContent?.policies?.length > 0
      ? cmsContent.policies
      : [
          { title: 'Shipping Policy', icon: 'local_shipping', path: '/policy/shipping-policy' },
          { title: 'Terms and Conditions', icon: 'gavel', path: '/policy/terms-and-conditions' },
          {
            title: 'Cancellation Policy',
            icon: 'free_cancellation',
            path: '/policy/cancellation-policy',
          },
          { title: 'Refund Policy', icon: 'currency_exchange', path: '/policy/refund-policy' },
          {
            title: 'Exchange Policy',
            icon: 'published_with_changes',
            path: '/policy/exchange-policy',
          },
          { title: 'Return Policy', icon: 'keyboard_return', path: '/policy/return-policy' },
          { title: 'Privacy Policy', icon: 'security', path: '/policy/privacy-policy' },
        ];

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

  const specializations = cmsContent?.specializations || [
    {
      title: 'Bespoke Decor',
      description:
        'Handcrafted with intricate details, pushing the boundaries of traditional setup design.',
    },
    {
      title: 'Heritage Arts',
      description: 'Authentic Telugu traditions woven seamlessly into contemporary floral scapes.',
    },
  ];
  const features = cmsContent?.features || [];
  const founders = cmsContent?.founders || [];

  const getSrc = (img, fallback) => img?.url || (typeof img === 'string' ? img : fallback);

  const heroTitle = cmsContent?.heroTitle || 'The Art of Tradition.';
  const heroSubtitle = cmsContent?.heroSubtitle || 'Preserving Heritage, Crafting Dreams';

  return (
    <div
      ref={containerRef}
      className="bg-[#FAF9F6] min-h-screen relative overflow-hidden text-[#1A1A1A]"
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
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 px-4 lg:px-8 z-10 overflow-hidden bg-[#FAF9F6] min-h-[90vh] flex items-center justify-center">
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
        <div className="absolute inset-0 bg-[#FAF9F6]/20 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FAF9F6] via-transparent to-[#FAF9F6]/60 z-10 pointer-events-none" />

        {/* Soft Radial Glow behind text for maximum readability */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(250,249,246,0.95)_0%,rgba(250,249,246,0.7)_40%,transparent_75%)] lg:bg-[radial-gradient(circle_at_center,rgba(250,249,246,0.9)_0%,transparent_60%)] z-10 pointer-events-none" />

        {/* Foreground Content */}
        <div className="max-w-4xl mx-auto relative z-20 text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-[var(--color-gold-dark)]/30 bg-white/50 backdrop-blur-sm mb-8"
          >
            <span className="material-symbols-outlined text-[14px] text-[var(--color-gold-dark)]">
              auto_awesome
            </span>
            <span className="font-label text-[10px] uppercase tracking-[0.25em] text-[#1A1A1A] font-bold mt-0.5">
              Our Mission & Vision
            </span>
          </motion.div>

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
            <span className="text-[var(--color-gold-dark)] font-medium">{heroSubtitle}.</span>{' '}
            {cmsContent?.missionStatement ||
              'We are building the future of premium event decor by combining traditional artistry with modern technology and unparalleled service.'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
            className="flex flex-col sm:flex-row items-center justify-center gap-8 w-full sm:w-auto mt-4"
          >
            <button className="group inline-flex items-center gap-4 border-b border-[var(--color-gold-dark)] pb-2 text-[#1A1A1A] hover:text-[var(--color-gold-dark)] transition-colors duration-500">
              <span className="font-label text-[11px] uppercase tracking-[0.2em] font-bold">
                Explore Collections
              </span>
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-2 transition-transform duration-500">
                arrow_forward
              </span>
            </button>
            <button className="group inline-flex items-center gap-3 border-b border-transparent pb-2 text-[#4A4A4A] hover:text-[var(--color-gold-dark)] transition-colors duration-500">
              <span className="material-symbols-outlined text-[20px] font-light">play_circle</span>
              <span className="font-label text-[11px] uppercase tracking-[0.2em] font-bold">
                Watch Our Story
              </span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* 3. FAQ Section */}
      <section className="py-32 bg-[#FAF9F6] relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-20">
          <div className="flex flex-col lg:flex-row gap-16 lg:gap-32">
            <div className="w-full lg:w-1/3">
              <span className="font-label text-[9px] uppercase tracking-[0.4em] text-[var(--color-gold-dark)] font-bold mb-4 block">
                F.A.Q
              </span>
              <h2 className="font-display text-4xl lg:text-5xl leading-[1.1] sticky top-32 text-[#1A1A1A]">
                Got Questions?
                <br />
                We've got <span className="italic font-light text-outline">answers.</span>
              </h2>
            </div>

            <div className="w-full lg:w-2/3 space-y-6 pt-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="border-b border-outline-variant/30 pb-6">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-start lg:items-center justify-between text-left group gap-8"
                  >
                    <h3
                      className={`font-display text-2xl lg:text-3xl transition-colors duration-500 ${openFaq === idx ? 'text-[var(--color-gold-dark)]' : 'text-[#1A1A1A] group-hover:text-[var(--color-gold-dark)]'}`}
                    >
                      {faq.question}
                    </h3>
                    <motion.span
                      animate={{ rotate: openFaq === idx ? 180 : 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className={`material-symbols-outlined text-[32px] font-light mt-1 lg:mt-0 shrink-0 transition-colors duration-500 ${openFaq === idx ? 'text-[var(--color-gold-dark)]' : 'text-[#1A1A1A] group-hover:text-[var(--color-gold-dark)]'}`}
                    >
                      expand_more
                    </motion.span>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{
                      height: openFaq === idx ? 'auto' : 0,
                      opacity: openFaq === idx ? 1 : 0,
                    }}
                    className="overflow-hidden"
                  >
                    <p className="font-body text-lg text-[#4A4A4A] leading-relaxed font-light mt-6 max-w-2xl">
                      {faq.answer}
                    </p>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Policy Links Strip (Scrolling Marquee) */}
      <section className="py-10 bg-[#FAF9F6] relative z-10 border-t border-b border-outline-variant/30 overflow-hidden flex items-center">
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

      {/* 5. The Artisans (Magazine Spread) */}
      {founders.length > 0 && (
        <section className="py-32 lg:py-48 max-w-[1600px] mx-auto px-6 lg:px-20 relative z-10">
          <div className="text-center mb-24">
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
        <section className="py-32 bg-[#FAF9F6] relative z-10 border-t border-outline-variant/20">
          <div className="max-w-[1600px] mx-auto px-6 lg:px-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 lg:mb-24 gap-8 md:gap-0">
              <div className="max-w-2xl">
                <span className="font-label text-[10px] uppercase tracking-[0.4em] text-[var(--color-gold-dark)] font-bold mb-6 block">
                  Our Portfolio
                </span>
                <h2 className="font-display text-4xl lg:text-6xl text-[#1A1A1A] leading-[1.1] mb-6">
                  Curated <span className="italic font-light text-outline">Moments</span>
                </h2>
                <p className="font-body text-lg text-[#4A4A4A] font-light leading-relaxed">
                  Glimpses into our grandest celebrations. Every setup is a testament to our
                  dedication to authentic heritage arts, lovingly reimagined for modern elegance.
                </p>
              </div>
              <div className="shrink-0">
                <Link
                  to="/gallery"
                  className="group inline-flex items-center gap-4 border-b border-[var(--color-gold-dark)] pb-2 text-[#1A1A1A] hover:text-[var(--color-gold-dark)] transition-colors duration-500"
                >
                  <span className="font-label text-[11px] uppercase tracking-[0.2em] font-bold">
                    Explore Full Gallery
                  </span>
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-2 transition-transform duration-500">
                    arrow_forward
                  </span>
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
                  className="relative w-full break-inside-avoid overflow-hidden group bg-[#FAF9F6] rounded-2xl shadow-xl shadow-black/5"
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
                        <span className="material-symbols-outlined text-white text-[32px] mb-3 font-light">
                          visibility
                        </span>
                        <span className="font-label text-[10px] uppercase tracking-[0.2em] text-white font-bold">
                          View in Gallery
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
