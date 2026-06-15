import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';
import {
  SITE_URL,
  SITE_NAME,
  OG_IMAGE_URL,
  CONTACT_PHONE,
  buildSameAsLinks,
  TWITTER_HANDLE,
} from '../../constants/brandEnv';

const DEFAULT_DESCRIPTION =
  'Discover masterfully crafted luxury event decor pieces that honor ancient Indian traditions with contemporary luxury sensibilities. Bespoke Mandaps, Artisanal Art, and Heritage Decor.';
const DEFAULT_TITLE = 'Luxury Event Decor & Artisanal Heritage';
const priceValidUntilDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split('T')[0];

/**
 * Normalize a URL path: strip trailing slashes (except root "/")
 */
function normalizeUrl(url) {
  if (!url || url === '/') return url;
  return url.replace(/\/+$/, '');
}

/**
 * Enterprise-grade SEO component with full Open Graph, Twitter Cards,
 * JSON-LD structured data, canonical URLs, and rich snippet support.
 */
export function SEO({
  title,
  description,
  keywords,
  ogImage,
  preloadImage,
  canonicalUrl,
  schema,
  ogType = 'website',
  noindex = false,
  article,
  product,
  breadcrumbs,
  faq,
}) {
  const location = useLocation();
  const { footer, contact } = useWebsiteContent();
  const sameAs = buildSameAsLinks(footer?.socialLinks);
  const siteName = SITE_NAME || 'Siri Arts & Crafts';
  const siteUrl = SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const contactPhone = contact?.phone
    ? `+91-${String(contact.phone).replace(/^\+91-?/, '')}`
    : CONTACT_PHONE;

  const fullTitle = title
    ? `${title} | ${siteName}`
    : siteName
      ? `${siteName} | ${DEFAULT_TITLE}`
      : DEFAULT_TITLE;
  const metaDescription = description || DEFAULT_DESCRIPTION;
  const normalizedPath = normalizeUrl(location.pathname);
  const currentUrl = canonicalUrl || (siteUrl ? `${siteUrl}${normalizedPath}` : normalizedPath);
  const metaImage = ogImage || OG_IMAGE_URL;
  const metaImageType = metaImage.endsWith('.png')
    ? 'image/png'
    : metaImage.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: siteUrl,
    logo: siteUrl ? `${siteUrl}/favicon.png` : undefined,
    description: 'Premium handcrafted event decor, wedding trays, and heritage pooja essentials.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Ongole',
      addressRegion: 'Andhra Pradesh',
      addressCountry: 'IN',
    },
    ...(contactPhone && {
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: contactPhone,
        contactType: 'customer service',
        availableLanguage: ['English', 'Telugu', 'Hindi'],
      },
    }),
    ...(sameAs.length > 0 && { sameAs }),
  };

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: siteName,
    image: OG_IMAGE_URL || metaImage,
    url: siteUrl,
    telephone: contactPhone,
    description:
      'Premium handcrafted event decor, wedding trays, and heritage pooja essentials. Woven with tradition and refined for the modern aesthetic.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: contact?.address ? undefined : 'Ongole',
      addressRegion: 'Andhra Pradesh',
      addressCountry: 'IN',
      ...(contact?.address && { streetAddress: contact.address }),
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 15.5057,
      longitude: 80.0499,
    },
    priceRange: '₹₹',
    openingHours: 'Mo-Sa 10:00-19:00',
    ...(sameAs.length > 0 && { sameAs }),
  };

  const breadcrumbSchema = breadcrumbs
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url && siteUrl ? `${siteUrl}${item.url}` : undefined,
        })),
      }
    : null;

  const priceValidUntil = priceValidUntilDate;

  const productSchema = product
    ? {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: product.name,
        image: product.images || [product.image],
        description: product.description,
        sku: product.sku,
        brand: {
          '@type': 'Brand',
          name: siteName,
        },
        offers: {
          '@type': 'Offer',
          url: currentUrl,
          priceCurrency: 'INR',
          price: product.price,
          priceValidUntil: priceValidUntil,
          availability: product.inStock
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Organization',
            name: siteName,
          },
        },
        ...(product.rating && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount || 1,
            bestRating: 5,
            worstRating: 1,
          },
        }),
      }
    : null;

  const faqSchema = faq
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      }
    : null;

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: siteUrl,
    ...(siteUrl && {
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${siteUrl}/collections?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    }),
  };

  const isHomePage = normalizedPath === '' || normalizedPath === '/';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      {currentUrl && <link rel="canonical" href={currentUrl} />}
      <meta name="author" content={siteName} />

      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
      )}

      <meta property="og:type" content={ogType} />
      {currentUrl && <meta property="og:url" content={currentUrl} />}
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      {metaImage && <meta property="og:image" content={metaImage} />}
      {metaImage && <meta property="og:image:type" content={metaImageType} />}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta
        property="og:image:alt"
        content={title ? `${title} — ${siteName}` : `${siteName} — Premium Handcrafted Event Decor`}
      />
      <meta property="og:locale" content="en_IN" />

      <meta name="twitter:card" content="summary_large_image" />
      {TWITTER_HANDLE && <meta name="twitter:site" content={TWITTER_HANDLE} />}
      {TWITTER_HANDLE && <meta name="twitter:creator" content={TWITTER_HANDLE} />}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      {metaImage && <meta name="twitter:image" content={metaImage} />}
      <meta
        name="twitter:image:alt"
        content={title ? `${title} — ${siteName}` : `${siteName} — Premium Handcrafted Event Decor`}
      />

      {article && (
        <>
          <meta property="article:published_time" content={article.publishedTime} />
          <meta property="article:modified_time" content={article.modifiedTime} />
          <meta property="article:author" content={article.author || siteName} />
        </>
      )}

      <meta name="theme-color" content="#d4af37" />
      <meta name="msapplication-TileColor" content="#d4af37" />

      {currentUrl && <link rel="alternate" hrefLang="en-in" href={currentUrl} />}
      {currentUrl && <link rel="alternate" hrefLang="x-default" href={currentUrl} />}
      {preloadImage && <link rel="preload" as="image" href={preloadImage} />}

      <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
      {isHomePage && (
        <script type="application/ld+json">{JSON.stringify(localBusinessSchema)}</script>
      )}
      {schema && <script type="application/ld+json">{JSON.stringify(schema)}</script>}
      {breadcrumbSchema && (
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      )}
      {productSchema && <script type="application/ld+json">{JSON.stringify(productSchema)}</script>}
      {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
    </Helmet>
  );
}
