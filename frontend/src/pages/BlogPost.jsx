import React, { useMemo } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Calendar, User, ArrowLeft, Share2 } from 'lucide-react';
import { SEO } from '../components/seo/SEO';
import { LazyImage } from '../components/ui/LazyImage';
import { FAQAccordion } from '../components/seo/FAQAccordion';
import { BlogCard } from '../components/blog/BlogCard';
import fallbackBlogsData from '../content/blogs.json';
import { useWebsiteContent } from '../hooks/useWebsiteContent';

export function BlogPost() {
  const { slug } = useParams();
  
  const { blogs } = useWebsiteContent();
  const blogsData = blogs || fallbackBlogsData;

  const post = useMemo(() => blogsData.find(b => b.slug === slug), [slug, blogsData]);
  
  // Find related posts (same category, excluding current)
  const relatedPosts = useMemo(() => {
    if (!post) return [];
    return blogsData
      .filter(b => b.category === post.category && b.slug !== post.slug)
      .slice(0, 3);
  }, [post, blogsData]);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  // Construct Article Schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    image: [post.heroImage],
    datePublished: post.publishDate,
    dateModified: post.publishDate,
    author: [{
      '@type': 'Person',
      name: post.author,
    }],
    description: post.metaDescription
  };

  // Construct Breadcrumbs
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: post.title, url: `/blog/${post.slug}` }
  ];

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="min-h-screen bg-background pt-20 pb-20">
      <SEO 
        title={post.title}
        description={post.metaDescription}
        canonicalUrl={`/blog/${post.slug}`}
        ogImage={post.heroImage}
        ogType="article"
        article={{
          publishedTime: post.publishDate,
          modifiedTime: post.publishDate,
          author: post.author
        }}
        schema={articleSchema}
        breadcrumbs={breadcrumbs}
        faq={post.faqs}
      />

      {/* Hero Section */}
      <div className="relative w-full h-[50vh] md:h-[60vh] lg:h-[70vh]">
        <LazyImage 
          src={post.heroImage} 
          alt={post.heroImageAlt || post.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-4xl w-full text-center mt-12">
            <span className="px-3 py-1 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-full backdrop-blur-md mb-6 inline-block">
              {post.category}
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-white font-bold leading-tight mb-6">
              {post.title}
            </h1>
            <div className="flex items-center justify-center gap-6 text-white/90 text-sm md:text-base">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> 
                {new Date(post.publishDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" /> {post.author}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mt-8 md:mt-12">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Main Content */}
          <article className="flex-1 max-w-3xl mx-auto lg:mx-0 w-full">
            <Link to="/blog" className="inline-flex items-center text-on-surface-variant hover:text-primary transition-colors mb-8 font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
            </Link>

            <div className="prose-container space-y-6 text-on-surface leading-relaxed text-lg">
              {post.content.map((block, index) => {
                switch(block.type) {
                  case 'h2':
                    return <h2 key={index} className="font-display text-3xl font-bold mt-12 mb-6 text-on-surface">{block.text}</h2>;
                  case 'h3':
                    return <h3 key={index} className="font-display text-2xl font-semibold mt-8 mb-4 text-on-surface">{block.text}</h3>;
                  case 'p':
                    return <p key={index} className="mb-6 text-on-surface-variant leading-loose">{block.text}</p>;
                  default:
                    return null;
                }
              })}
            </div>

            {/* Tags & Share */}
            <div className="mt-12 pt-8 border-t border-outline-variant/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex flex-wrap gap-2">
                {post.tags?.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-surface-variant text-on-surface-variant text-sm rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-on-surface-variant font-medium flex items-center gap-2">
                  <Share2 className="w-4 h-4" /> Share:
                </span>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full bg-surface-variant text-sm font-bold text-on-surface hover:bg-primary hover:text-white transition-colors">
                  Facebook
                </a>
                <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full bg-surface-variant text-sm font-bold text-on-surface hover:bg-primary hover:text-white transition-colors">
                  X (Twitter)
                </a>
              </div>
            </div>
          </article>

          {/* Sidebar / Related Links */}
          <aside className="w-full lg:w-80 shrink-0">
            <div className="sticky top-24 space-y-8">
              {/* Internal Links Block */}
              {post.relatedLinks && post.relatedLinks.length > 0 && (
                <div className="bg-surface/50 backdrop-blur-md border border-outline-variant/30 rounded-2xl p-6">
                  <h3 className="font-display text-xl font-bold text-on-surface mb-4">Explore More</h3>
                  <ul className="space-y-3">
                    {post.relatedLinks.map((link, idx) => (
                      <li key={idx}>
                        <Link to={link.url} className="text-primary hover:underline font-medium block">
                          → {link.text}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* FAQs Section */}
        {post.faqs && post.faqs.length > 0 && (
          <div className="mt-16 pt-16 border-t border-outline-variant/30">
            <FAQAccordion faqs={post.faqs} title="Frequently Asked Questions" />
          </div>
        )}

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-16 pt-16 border-t border-outline-variant/30">
            <h2 className="font-display text-3xl font-bold text-on-surface mb-8 text-center">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {relatedPosts.map(p => (
                <BlogCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
