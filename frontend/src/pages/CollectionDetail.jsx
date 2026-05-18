import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SectionWrapper } from "../components/layout";
import { ProductCard, FilterPanel, ShareButton } from "../components/ui";
import { fadeUp } from "../animations/variants";
import { SEO } from "../components/seo/SEO";
import { handleImageError } from "../utils/imageUtils";
import { productService } from "../services/domainServices";

const fallbackHero =
  "https://res.cloudinary.com/drxgnnzeb/image/upload/v1779129318/event_decor_ecommerce/assets/event_decor_collection_wedding.png";

const humanizeSlug = (value = "") =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getProductsFromResponse = (payload) => {
  const data = payload?.data || payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export function CollectionDetail() {
  const { id } = useParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const requestedCategory = useMemo(() => humanizeSlug(id), [id]);

  useEffect(() => {
    let active = true;

    const loadCollection = async () => {
      setLoading(true);
      setError("");

      try {
        const categoriesResult = await productService.getCategories();
        const liveCategories = categoriesResult?.data || categoriesResult || [];
        const matchedCategory =
          liveCategories.find((category) => category.toLowerCase() === requestedCategory.toLowerCase()) ||
          liveCategories.find((category) => category.toLowerCase().replace(/\s+/g, "-") === id) ||
          requestedCategory;

        const productsResult = await productService.getAll({
          category: matchedCategory,
          limit: 24,
          sort: "newest",
        });

        if (!active) return;
        setCategories(liveCategories);
        setProducts(getProductsFromResponse(productsResult));
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "Unable to load this collection right now.");
        setProducts([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCollection();

    return () => {
      active = false;
    };
  }, [id, requestedCategory]);

  const heroProduct = products.find((product) => product.imageSrc) || products[0];
  const collectionTitle = categories.find((category) => category.toLowerCase() === requestedCategory.toLowerCase()) || requestedCategory;
  const heroImage = heroProduct?.imageSrc || fallbackHero;
  const description =
    heroProduct?.seoDescription ||
    heroProduct?.description ||
    `Explore live ${collectionTitle} pieces from the Siri Arts catalog.`;

  return (
    <div className="pt-20 md:pt-28">
      <SEO title={collectionTitle} description={description} />
      <main>
        <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-4 md:py-6">
          <nav
            className="flex items-center gap-2 font-label text-[10px] uppercase tracking-widest text-secondary/40"
            aria-label="Breadcrumb"
          >
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span className="opacity-30">/</span>
            <Link to="/collections" className="hover:text-primary transition-colors">
              Collections
            </Link>
            <span className="opacity-30">/</span>
            <span className="text-primary font-bold">{collectionTitle}</span>
          </nav>
        </div>

        <header className="relative w-full h-[40vh] md:h-[58vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <motion.img
              onError={handleImageError}
              initial={{ scale: 1.06 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.3 }}
              src={heroImage}
              alt={collectionTitle}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/45" />
          </div>

          <div className="relative z-10 text-center text-white px-6 max-w-4xl">
            <motion.span
              variants={fadeUp}
              initial="initial"
              animate="whileInView"
              className="font-label text-[11px] uppercase tracking-[0.5em] mb-4 block"
            >
              Live Collection
            </motion.span>
            <motion.h1
              variants={fadeUp}
              initial="initial"
              animate="whileInView"
              transition={{ delay: 0.1 }}
              className="font-display text-[42px] md:text-[72px] italic leading-tight mb-4"
            >
              {collectionTitle}
            </motion.h1>
            <motion.p
              variants={fadeUp}
              initial="initial"
              animate="whileInView"
              transition={{ delay: 0.2 }}
              className="font-body text-[15px] md:text-[18px] font-light italic line-clamp-2 mb-6"
            >
              {description}
            </motion.p>
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="whileInView"
              transition={{ delay: 0.3 }}
              className="flex justify-center"
            >
              <ShareButton 
                url={window.location.href} 
                title={`${collectionTitle} - Siri Arts & Crafts`}
                description={description}
                variant="primary"
              />
            </motion.div>
          </div>
        </header>

        <SectionWrapper className="!py-12 md:!py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <aside className="lg:col-span-3 hidden lg:block sticky top-32 h-fit">
              <FilterPanel />
            </aside>

            <div className="lg:col-span-9">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-10">
                <p className="font-label text-[11px] uppercase tracking-widest text-secondary/60">
                  {loading ? "Loading live catalog" : `${products.length} Artisanal Selections`}
                </p>
                <Link
                  to={`/collections?category=${encodeURIComponent(collectionTitle)}`}
                  className="font-label text-[11px] uppercase tracking-widest text-primary border-b border-primary/20 pb-1 w-fit"
                >
                  Open Full Catalog
                </Link>
              </div>

              {error && (
                <div className="rounded-2xl border border-error/20 bg-error/5 p-6 text-sm text-error mb-8">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <ProductCard key={index} loading />
                  ))}
                </div>
              ) : products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {products.map((product) => (
                    <ProductCard key={product._id || product.id} {...product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 border border-outline-variant/20 rounded-3xl bg-surface-container-low">
                  <span className="material-symbols-outlined text-[40px] text-primary/40 mb-4 block">
                    inventory_2
                  </span>
                  <h2 className="font-display text-[28px] text-on-surface mb-2">
                    No live pieces found
                  </h2>
                  <p className="font-body text-sm text-on-surface/60 max-w-md mx-auto">
                    This collection is connected to the product database, but no active products currently match it.
                  </p>
                </div>
              )}
            </div>
          </div>
        </SectionWrapper>
      </main>
    </div>
  );
}
