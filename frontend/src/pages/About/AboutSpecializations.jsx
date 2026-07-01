import { StackedSectionWrapper } from '../../components/layout/StackedSectionWrapper';

export function AboutSpecializations({ specializations }) {
  if (!specializations || specializations.length === 0) return null;

  return (
    <StackedSectionWrapper index={2} isLast={false} bgClass="bg-surface-variant">
      <section className="py-24 lg:py-40 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10 text-center mb-16 lg:mb-24">
          <span className="font-label-sm text-[10px] uppercase tracking-[0.4em] text-primary font-bold mb-4 block">
            Our Expertise
          </span>
          <h2 className="font-headline text-[42px] lg:text-[56px] leading-[1.1] tracking-tight">
            Specializations
          </h2>
        </div>
        <div className="max-w-7xl mx-auto px-4 lg:px-12 grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
          {specializations.map((spec, i) => (
            <div key={i} className="bg-surface rounded-3xl p-8 border border-black/[0.05]">
              <h3 className="font-display text-2xl mb-4">{spec.title}</h3>
              <p className="font-body text-on-surface-variant/80">{spec.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </StackedSectionWrapper>
  );
}
