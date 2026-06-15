import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import fallbackLocationsData from '../content/locations.json';
import { useWebsiteContent } from '../hooks/useWebsiteContent';

export function LocationLanding() {
  const { city } = useParams();

  const { locations } = useWebsiteContent();
  const locationsData = locations || fallbackLocationsData;

  // Find location data based on the URL parameter
  const locationObj = useMemo(() => {
    if (!city) return null;
    // Handle both exact slugs (like "wedding-decorations-hyderabad") and plain city names ("hyderabad")
    return locationsData.find(
      (loc) => loc.slug === city || loc.city.toLowerCase() === city.toLowerCase(),
    );
  }, [city, locationsData]);

  if (!locationObj) {
    return <Navigate to="/" replace />;
  }

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Locations', url: '/locations' },
    { name: locationObj.city, url: `/${locationObj.slug}` },
  ];

  return (
    <div className="min-h-screen bg-background pt-20 pb-20">
      <SEO
        title={locationObj.title}
        description={locationObj.metaDescription}
        canonicalUrl={`/${locationObj.slug}`}
        ogImage={locationObj.heroImage}
        breadcrumbs={breadcrumbs}
        faq={locationObj.faqs}
      />

      {/* Hero Section */}
      <div className="relative w-full h-[50vh] md:h-[60vh] lg:h-[70vh]">
        <LazyImage
          src={locationObj.heroImage}
          alt={`Event decorations in ${locationObj.city}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-4xl w-full text-center mt-12">
            <span className="px-4 py-1.5 bg-primary/90 text-white text-sm font-bold uppercase tracking-widest rounded-full backdrop-blur-md mb-6 inline-flex items-center gap-2 shadow-lg">
              <MapPin className="w-4 h-4" /> Serving {locationObj.city}
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-7xl text-white font-bold leading-tight mb-6 drop-shadow-lg">
              {locationObj.h1}
            </h1>
            <p className="text-white/90 text-lg md:text-2xl font-light max-w-2xl mx-auto drop-shadow-md">
              Bringing luxury event design and artisanal heritage to your special occasions.
            </p>
            <div className="mt-8">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center px-8 py-4 bg-primary text-white rounded-full font-bold text-lg hover:bg-primary-dark transition-colors shadow-xl hover:shadow-2xl transform hover:-translate-y-1 duration-300"
              >
                Book a Consultation
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mt-16 md:mt-24">
        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-on-surface">
              Why Choose Siri Arts & Crafts in {locationObj.city}?
            </h2>
            {locationObj.content.map((paragraph, index) => (
              <p key={index} className="text-on-surface-variant text-lg leading-relaxed">
                {paragraph}
              </p>
            ))}

            <div className="pt-6">
              <Link
                to="/gallery"
                className="inline-flex items-center text-primary font-bold text-lg hover:text-primary-dark transition-colors group"
              >
                View Our Recent Work in {locationObj.city}
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-2" />
              </Link>
            </div>
          </div>

          <div className="bg-surface/50 backdrop-blur-md border border-outline-variant/30 rounded-[2rem] p-8 md:p-12 shadow-xl">
            <h3 className="font-display text-2xl font-bold text-on-surface mb-8 flex items-center gap-3">
              <Star className="w-6 h-6 text-primary" /> Premium Services Offered
            </h3>
            <ul className="space-y-6">
              {locationObj.services.map((service, idx) => (
                <li key={idx} className="flex items-start gap-4">
                  <div className="mt-1 shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-on-surface text-lg font-medium">{service}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* FAQs Section */}
        {locationObj.faqs && locationObj.faqs.length > 0 && (
          <div className="mt-24 pt-16 border-t border-outline-variant/30">
            <FAQAccordion
              faqs={locationObj.faqs}
              title={`Common Questions about our Services in ${locationObj.city}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
