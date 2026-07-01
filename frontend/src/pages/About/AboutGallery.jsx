import { StackedSectionWrapper } from '../../components/layout/StackedSectionWrapper';
import { CloudinaryImage } from '../../components/ui/CloudinaryImage';
import { Link } from 'react-router-dom';

export function AboutGallery({ galleryPreview }) {
  if (!galleryPreview || galleryPreview.length === 0) return null;

  return (
    <StackedSectionWrapper index={5} isLast={true} bgClass="bg-surface">
      <section className="py-24 lg:py-40 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 mb-12 lg:mb-16">
          <div>
            <span className="font-label-sm text-[10px] uppercase tracking-[0.4em] text-primary font-bold mb-4 block">
              Portfolio
            </span>
            <h2 className="font-headline text-[42px] lg:text-[56px] leading-[1.1] tracking-tight">
              Featured Works
            </h2>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 lg:px-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {galleryPreview.slice(0, 4).map((item, i) => (
            <div
              key={item._id || i}
              className="aspect-square rounded-2xl overflow-hidden relative group"
            >
              <CloudinaryImage
                src={item.image || item.url}
                alt={item.title || 'Gallery item'}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            </div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-12 mt-12 lg:mt-16 flex justify-center">
          <Link
            to="/gallery"
            className="relative overflow-hidden inline-flex items-center justify-center bg-[#1a1a1a] text-white px-8 py-3.5 rounded-full font-label text-[11px] uppercase tracking-[0.15em] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_8px_20px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.2)] font-bold group"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              View Gallery
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform duration-300">
                arrow_forward
              </span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          </Link>
        </div>
      </section>
    </StackedSectionWrapper>
  );
}
