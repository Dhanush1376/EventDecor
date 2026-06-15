import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, User } from 'lucide-react';
import { LazyImage } from '../ui/LazyImage';
export function BlogCard({ post, featured = false }) {
  if (!post) return null;

  if (featured) {
    return (
      <Link
        to={`/blog/${post.slug}`}
        className="group block w-full relative rounded-3xl overflow-hidden shadow-xl shadow-black/10 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
      >
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="w-full h-[400px] md:h-[500px]">
          <LazyImage
            src={post.heroImage}
            alt={post.heroImageAlt || post.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 z-20 flex flex-col justify-end">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-full backdrop-blur-md">
              {post.category}
            </span>
            <span className="text-white/80 text-sm flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(post.publishDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
          <h2 className="font-display text-2xl md:text-4xl font-bold text-white mb-3 line-clamp-2">
            {post.title}
          </h2>
          <p className="text-white/90 text-sm md:text-base line-clamp-2 md:line-clamp-3 mb-6 max-w-3xl">
            {post.metaDescription}
          </p>
          <div className="flex items-center text-primary font-medium group-hover:text-white transition-colors">
            Read Article{' '}
            <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-2" />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col h-full bg-surface/50 backdrop-blur-sm border border-outline-variant/30 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative w-full pt-[60%] overflow-hidden">
        <div className="absolute inset-0">
          <LazyImage
            src={post.heroImage}
            alt={post.heroImageAlt || post.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        </div>
        <div className="absolute top-4 left-4 z-10">
          <span className="px-3 py-1 bg-white/90 text-on-surface text-xs font-bold uppercase tracking-wider rounded-full shadow-sm backdrop-blur-md">
            {post.category}
          </span>
        </div>
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center gap-4 text-on-surface-variant text-xs mb-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> {new Date(post.publishDate).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" /> {post.author}
          </span>
        </div>
        <h3 className="font-display text-xl font-bold text-on-surface mb-3 line-clamp-2 group-hover:text-primary transition-colors">
          {post.title}
        </h3>
        <p className="text-on-surface-variant text-sm line-clamp-3 mb-6 flex-grow">
          {post.metaDescription}
        </p>
        <div className="flex items-center text-primary font-medium text-sm mt-auto">
          Read More{' '}
          <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
