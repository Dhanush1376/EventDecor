import { ArrowRight, AlertCircle } from 'lucide-react';
import { m as motion } from 'framer-motion';
import { Button } from './Button';
export function EmptyState({
  title = 'Nothing found',
  description = "We couldn't find what you were looking for.",
  icon = 'search_off',
  actionLabel,
  onAction,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center min-h-[40vh] mt-6 text-center py-16 px-6 max-w-lg mx-auto relative overflow-hidden"
    >
      <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-[#f6f5f3] flex items-center justify-center mb-6 relative z-10 transition-transform duration-500 hover:scale-105">
        <span className="material-symbols-outlined text-[28px] lg:text-[32px] text-[#9c8965] font-light">
          {icon}
        </span>
      </div>

      <h3 className="font-display text-[28px] lg:text-[34px] text-[#1a1a1a] mb-3 tracking-tight leading-tight relative z-10">
        {title}
      </h3>

      <p className="font-body-md text-[#8c8c8c] text-[14px] lg:text-[15px] font-light max-w-[320px] mb-10 leading-relaxed relative z-10">
        {description}
      </p>

      {actionLabel && (
        <button
          onClick={onAction}
          className="relative z-10 group flex items-center justify-center gap-2 text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a] pb-2 border-b-[1.5px] border-[#1a1a1a] transition-all hover:opacity-70 cursor-pointer outline-none"
        >
          {actionLabel}
          <ArrowRight
            className="text-[16px] transition-transform group-hover:translate-x-1"
            strokeWidth={1.5}
          />
        </button>
      )}
    </motion.div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = "We're having trouble loading this right now. Please try again later.",
  onRetry,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center text-center py-24 px-6 max-w-lg mx-auto"
    >
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-rose-50/50 border border-rose-100/50 flex items-center justify-center text-rose-500/80 shadow-sm transition-transform duration-500 hover:scale-105">
          <AlertCircle className="text-[42px] font-light" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-rose-500/10 rounded-full blur-xl animate-pulse" />
      </div>
      <h3 className="font-headline-sm text-on-surface mb-3 tracking-tight font-normal text-[20px] lg:text-[24px]">
        {title}
      </h3>
      <p className="font-body-md text-on-surface-variant/60 mb-10 leading-relaxed text-[13px] lg:text-[14px] max-w-sm">
        {description}
      </p>
      {onRetry && (
        <Button
          variant="primary"
          onClick={onRetry}
          className="px-10 rounded-full font-label text-[11px] uppercase tracking-widest font-bold"
        >
          Try Again
        </Button>
      )}
    </motion.div>
  );
}
