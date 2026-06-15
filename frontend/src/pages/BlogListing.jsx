import { useState, useMemo } from 'react';
import fallbackBlogsData from '../content/blogs.json';
import { useWebsiteContent } from '../hooks/useWebsiteContent';

export function BlogListing() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const { blogs } = useWebsiteContent();
  const blogsData = blogs || fallbackBlogsData;

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(blogsData.map((blog) => blog.category));
    return ['All', ...Array.from(cats)];
  }, [blogsData]);

  // Filter posts based on search and category
  const filteredPosts = useMemo(() => {
    return blogsData.filter((post) => {
      const matchesSearch =
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.metaDescription.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'All' || post.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, activeCategory, blogsData]);

  const featuredPost = blogsData[0]; // First post is featured
  const regularPosts = filteredPosts.filter((p) => p.id !== featuredPost.id);

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <SEO
        title="Event Decoration Blog & Ideas"
        description="Explore the latest event decoration trends, wedding ideas, and traditional pooja setups from the experts at Siri Arts & Crafts."
        canonicalUrl="/blog"
      />

      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-on-surface font-bold mb-6">
            Ideas & Inspiration
          </h1>
          <p className="text-on-surface-variant text-lg md:text-xl">
            Discover expert guides, styling tips, and the latest trends in luxury event decoration
            and handmade gifting.
          </p>
        </div>

        {/* Featured Post (Only show if 'All' category and no search term) */}
        {activeCategory === 'All' && !searchTerm && featuredPost && (
          <div className="mb-16">
            <BlogCard post={featuredPost} featured={true} />
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          {/* Categories */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeCategory === cat
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-surface border border-outline-variant/30 text-on-surface hover:bg-surface-variant'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-surface border border-outline-variant/30 rounded-full text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
          </div>
        </div>

        {/* Blog Grid */}
        {filteredPosts.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {(activeCategory === 'All' && !searchTerm ? regularPosts : filteredPosts).map(
              (post) => (
                <BlogCard key={post.id} post={post} />
              ),
            )}
          </motion.div>
        ) : (
          <div className="text-center py-20">
            <h3 className="text-2xl font-bold text-on-surface mb-2">No articles found</h3>
            <p className="text-on-surface-variant">Try adjusting your search or category filter.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setActiveCategory('All');
              }}
              className="mt-6 px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary-dark transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
