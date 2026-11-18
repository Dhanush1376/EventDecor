import { useId, useLayoutEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useConfig } from '../../context/ConfigContext';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';
import { buildSameAsLinks, TWITTER_HANDLE } from '../../constants/brandEnv';
import { getOptimizedUrl } from '../../utils/media/imageUtils';
import {
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  ROBOTS_INDEX,
  ROBOTS_NOINDEX,
  STATIC_PAGES,
  absoluteUrl,
  breadcrumbSchema as buildBreadcrumbSchema,
  formatTitle,
  isNoindexPath,
  normalizePath,
  organizationSchema as buildOrganizationSchema,
  productSchema as buildProductSchema,
  toMetaDescription,
  webPageSchema,
  websiteSchema as buildWebsiteSchema,
} from '../../seo/seoConfig';
import { registerHead, unregisterHead } from '../../seo/headManager';

function formatPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return `+91-${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+91-${digits.slice(2)}`;
  return String(raw).trim();
}

/**
 * Route-aware SEO head manager.
 *
 * - Titles are always "<Page> | Siri Arts & Crafts" (or the page's full static title).
 * - Private/transactional routes are forced to noindex here, whatever the page passes, so a
 *   page can never accidentally make a cart, checkout or account screen indexable.
 * - Canonicals are absolute production URLs with no query string (unless a page passes one).
 * - Structured data is built only from real data (see src/seo/seoConfig.js).
 *
 * Rendered once in MainLayout as the route default (`routeDefault`), and again by each page
 * with its own values; the page-level instance wins (see src/seo/headManager.js).
 */
export function SEO({
  title,
  description,
  ogImage,
  image,
  preloadImage,
  canonicalUrl,
  schema,
  ogType = 'website',
  noindex = false,
  robots,
  article,
  product,
  breadcrumbs,
  faq,
  routeDefault = false,
}) {
  const instanceId = useId();
  const location = useLocation();
  const { footer, contact } = useWebsiteContent();
  const { storeSettings } = useConfig();

  const path = normalizePath(location.pathname);
  const staticPage = STATIC_PAGES[path];
  const isHomePage = path === '/';

  const siteName = storeSettings?.general?.storeName?.trim() || SITE_NAME;

  // ── Indexing ───────────────────────────────────────────────────────────
  const forceNoindex =
    noindex || isNoindexPath(path) || (typeof robots === 'string' && robots.includes('noindex'));
  const robotsContent = forceNoindex ? ROBOTS_NOINDEX : ROBOTS_INDEX;

  // ── Title & description ────────────────────────────────────────────────
  // A page-supplied title wins; otherwise the static route title; otherwise the brand title.
  const fullTitle = title ? formatTitle(title) : staticPage?.title || STATIC_PAGES['/'].title;
  const metaDescription =
    toMetaDescription(description) || staticPage?.description || STATIC_PAGES['/'].description;

  // ── Canonical ──────────────────────────────────────────────────────────
  const canonical = forceNoindex ? null : absoluteUrl(canonicalUrl || path);

  const metaImage = ogImage || image || DEFAULT_OG_IMAGE;

  // ── Structured data ────────────────────────────────────────────────────
  const settingsContact = storeSettings?.contact || {};
  const phone = formatPhone(settingsContact.phone || contact?.phone);
  const email = settingsContact.email || storeSettings?.general?.supportEmail || '';
  const street = settingsContact.address || contact?.address || '';
  const address =
    street || settingsContact.city
      ? {
          '@type': 'PostalAddress',
          ...(street ? { streetAddress: street } : {}),
          ...(settingsContact.city ? { addressLocality: settingsContact.city } : {}),
          ...(settingsContact.state ? { addressRegion: settingsContact.state } : {}),
          ...(settingsContact.postalCode ? { postalCode: settingsContact.postalCode } : {}),
          addressCountry: 'IN',
        }
      : null;
  const sameAs = buildSameAsLinks(footer?.socialLinks || {});

  const schemas = [];
  if (!forceNoindex) {
    if (isHomePage || path === '/contact') {
      schemas.push(buildOrganizationSchema({ name: siteName, phone, email, address, sameAs }));
    }
    if (isHomePage) schemas.push(buildWebsiteSchema(siteName));
    if (staticPage) {
      schemas.push(
        webPageSchema({
          type: staticPage.pageType,
          path: canonicalUrl || path,
          title: fullTitle,
          description: metaDescription,
        }),
      );
    }
    const crumbs = breadcrumbs || staticPage?.breadcrumbs;
    const crumbSchema = buildBreadcrumbSchema(crumbs);
    if (crumbSchema) schemas.push(crumbSchema);
    if (product) schemas.push(buildProductSchema(product, { path }));
    if (faq?.length) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      });
    }
    if (schema) schemas.push(...(Array.isArray(schema) ? schema : [schema]));
  }

  const imageAlt = title ? `${title} — ${siteName}` : siteName;

  const meta = [
    { name: 'description', content: metaDescription },
    { name: 'robots', content: robotsContent },
    { property: 'og:type', content: ogType },
    { property: 'og:site_name', content: siteName },
    { property: 'og:locale', content: 'en_IN' },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: metaDescription },
    canonical && { property: 'og:url', content: canonical },
    metaImage && { property: 'og:image', content: metaImage },
    metaImage && { property: 'og:image:alt', content: imageAlt },
    { name: 'twitter:card', content: 'summary_large_image' },
    TWITTER_HANDLE && { name: 'twitter:site', content: TWITTER_HANDLE },
    { name: 'twitter:title', content: fullTitle },
    { name: 'twitter:description', content: metaDescription },
    metaImage && { name: 'twitter:image', content: metaImage },
    metaImage && { name: 'twitter:image:alt', content: imageAlt },
    article?.publishedTime && {
      property: 'article:published_time',
      content: article.publishedTime,
    },
    article?.modifiedTime && { property: 'article:modified_time', content: article.modifiedTime },
    article && { property: 'article:author', content: article.author || siteName },
  ].filter(Boolean);

  const links = [
    canonical && { rel: 'canonical', href: canonical },
    preloadImage && { rel: 'preload', as: 'image', href: getOptimizedUrl(preloadImage) },
  ].filter(Boolean);

  // Stable identity for the effect: only re-register when the resolved head actually changes.
  const headKey = JSON.stringify({
    title: fullTitle,
    meta,
    links,
    schemas: schemas.filter(Boolean),
  });
  const head = useMemo(() => JSON.parse(headKey), [headKey]);

  useLayoutEffect(() => {
    registerHead(instanceId, head, routeDefault ? 0 : 1);
  }, [instanceId, head, routeDefault]);

  useLayoutEffect(() => () => unregisterHead(instanceId), [instanceId]);

  return null;
}
