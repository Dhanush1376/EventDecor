import { useState } from 'react';

export function FAQAccordion({ faqs, title = 'Frequently Asked Questions' }) {
  const [activeIndex, setActiveIndex] = useState(null);

  if (!faqs || faqs.length === 0) return null;

  const toggleAccordion = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="w-full max-w-4xl mx-auto py-12 px-margin-mobile md:px-margin-desktop">
      {title && (
        <h2 className="font-display text-3xl md:text-4xl text-on-surface font-bold text-center mb-8">
          {title}
        </h2>
      )}

      <div className="space-y-4">
        {faqs.map((faq, index) => {
          const isActive = activeIndex === index;
          return (
            <div
              key={index}
              className="bg-surface/60 backdrop-blur-md border border-outline-variant/30 rounded-2xl overflow-hidden transition-colors hover:bg-surface/80"
            >
              <button
                type="button"
                className="w-full px-6 py-5 flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                onClick={() => toggleAccordion(index)}
                aria-expanded={isActive}
              >
                <span className="font-medium text-left text-on-surface pr-4">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-primary shrink-0 transition-transform duration-300 ${isActive ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isActive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className="px-6 pb-5 pt-0 text-on-surface-variant leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
