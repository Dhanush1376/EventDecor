import { m as motion, AnimatePresence } from 'framer-motion';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Check from 'lucide-react/dist/esm/icons/check';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import X from 'lucide-react/dist/esm/icons/x';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import logger from '../../utils/core/logger';

const FacebookIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
const TwitterIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);
const LinkedinIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

/**
 * Universal Enterprise Share Button
 * Automatically uses Web Share API on mobile, falls back to a custom animated popover on desktop.
 */
export function ShareButton({
  url = window.location.href,
  title = 'Check this out!',
  description = '',
  variant = 'outline',
  size = 'md',
  className = '',
  iconOnly = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef(null);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleShare = async () => {
    const shareData = {
      title,
      text: title,
      url,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // AbortError is expected when user dismisses the share sheet
        if (err.name !== 'AbortError') {
          logger.error('Error using native share:', err);
          setIsOpen(true);
        }
      }
    } else {
      // Fallback to custom popover for Desktop
      setIsOpen((prev) => !prev);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setIsOpen(false), 2500);
    } catch (_err) {
      toast.error('Failed to copy link');
    }
  };

  const socialLinks = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'text-green-500 hover:bg-green-50',
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title}\n${url}`)}`,
    },
    {
      name: 'Facebook',
      icon: FacebookIcon,
      color: 'text-blue-600 hover:bg-blue-50',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      name: 'Twitter / X',
      icon: TwitterIcon,
      color: 'text-neutral-800 hover:bg-neutral-100',
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
      name: 'LinkedIn',
      icon: LinkedinIcon,
      color: 'text-blue-700 hover:bg-blue-50',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
  ];

  const baseStyles =
    'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50';

  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90',
    outline: 'border border-neutral-200 bg-white hover:border-primary hover:text-primary',
    ghost: 'text-neutral-600 hover:bg-neutral-100 hover:text-primary',
    custom: '', // Allows complete styling override
  };

  const sizes = {
    sm: iconOnly ? 'w-8 h-8' : 'h-8 px-3 text-xs',
    md: iconOnly ? 'w-10 h-10' : 'h-10 px-4 text-sm',
    lg: iconOnly ? 'w-12 h-12' : 'h-12 px-6 text-base',
    custom: '', // Allows complete styling override
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        onClick={handleShare}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        aria-label={iconOnly ? 'Share product' : 'Share this content'}
        aria-expanded={isOpen}
      >
        <Share2 size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
        {!iconOnly && <span>Share</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 z-50 mt-2 w-72 rounded-2xl bg-white p-4 shadow-xl border border-neutral-100 origin-top-right"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-playfair text-sm font-semibold text-neutral-800">
                Share with your network
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 transition-colors w-7 h-7 min-h-0 flex items-center justify-center rounded-full hover:bg-neutral-100 flex-shrink-0"
                aria-label="Close share menu"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors ${social.color}`}
                  title={`Share to ${social.name}`}
                  onClick={() => setIsOpen(false)}
                >
                  <social.icon size={20} strokeWidth={1.5} />
                  <span className="text-[10px] font-medium text-neutral-500 whitespace-nowrap">
                    {social.name.split(' ')[0]}
                  </span>
                </a>
              ))}
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                readOnly
                value={url}
                className="w-full rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 pr-12 text-xs text-neutral-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="absolute right-1 top-1 flex h-7 w-9 items-center justify-center rounded-md bg-white border border-neutral-200 text-neutral-600 shadow-sm transition-all hover:bg-neutral-50 hover:text-primary active:scale-95"
                aria-label={copied ? 'Link copied' : 'Copy share link'}
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
