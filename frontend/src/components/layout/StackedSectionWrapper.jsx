/**
 * StackedSectionWrapper
 * Simplified to a standard layout to fix severe flickering and ResizeObserver thrashing
 * on scroll, providing a smooth and proper user experience.
 */
export function StackedSectionWrapper({ children, index, isLast, bgClass = 'bg-surface' }) {
  return (
    <section className={`w-full relative z-[${index}] ${bgClass}`}>
      <div className="w-full relative flex flex-col justify-center">{children}</div>
    </section>
  );
}
