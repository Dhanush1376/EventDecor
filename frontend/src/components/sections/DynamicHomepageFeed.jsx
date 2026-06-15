import { Component, useEffect, useState } from 'react';
import { usePersonalizedSections } from '../../hooks/usePersonalizedSections';
import { recommendationService } from '../../services/recommendationService';
import logger from '../../utils/logger';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    logger.warn('DynamicHomepageFeed caught error', error, errorInfo);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function DynamicHomepageFeedContent() {
  const [sessionId, setSessionId] = useState('anonymous-session');

  useEffect(() => {
    try {
      let stored = localStorage.getItem('sessionId');
      if (!stored) {
        stored =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
        localStorage.setItem('sessionId', stored);
      }
      setSessionId(stored);
    } catch {
      setSessionId('anonymous-session');
    }
  }, []);

  const { data, isLoading, isError } = usePersonalizedSections(sessionId);

  if (isLoading) {
    return (
      <div className="w-full py-16 space-y-12">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="max-w-[2000px] mx-auto px-4 md:px-8 xl:px-12">
            <div className="h-8 w-64 bg-black/5 rounded animate-pulse mb-6" />
            <div className="flex gap-4 overflow-hidden">
              {[...Array(4)].map((_, j) => (
                <div
                  key={j}
                  className="min-w-[280px] md:min-w-[320px] aspect-[4/5] bg-black/5 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError || !data?.success || !data?.data?.sections) {
    return null; // Fail silently, standard homepage sections remain
  }

  const sections = data.data.sections;

  const handleItemClick = (item, sectionKey) => {
    const targetType = item.targetType || 'product';
    recommendationService.trackEvent(`${targetType}_click`, targetType, item._id || item.id, {
      source: sectionKey,
      path: window.location.pathname,
    });
  };

  return (
    <div className="w-full py-16 space-y-20 bg-surface-bright">
      {sections.map((section, idx) => (
        <motion.div
          key={section.key}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, delay: idx * 0.1 }}
          className="max-w-[2000px] mx-auto"
        >
          <div className="px-4 md:px-8 xl:px-12 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              {section.badge && (
                <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full font-label uppercase tracking-widest text-[10px] font-bold mb-3">
                  {section.badge}
                </span>
              )}
              <h2 className="font-display text-3xl md:text-4xl text-on-surface">{section.title}</h2>
            </div>
          </div>

          <RecommendationCarousel
            items={section.items}
            title=""
            onItemClick={(item) => handleItemClick(item, section.key)}
          />
        </motion.div>
      ))}
    </div>
  );
}

export function DynamicHomepageFeed() {
  return (
    <ErrorBoundary>
      <DynamicHomepageFeedContent />
    </ErrorBoundary>
  );
}
