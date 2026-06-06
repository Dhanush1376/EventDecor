import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function CustomDropdown({
  options,
  value,
  onChange,
  label,
  className = '',
  buttonClassName = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState('left');
  const [openUpwards, setOpenUpwards] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Edge detection logic
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const screenWidth = window.innerWidth;

      // Horizontal edge detection
      if (rect.left + 200 > screenWidth) {
        setDropdownPosition('right');
      } else {
        setDropdownPosition('left');
      }

      // Vertical edge detection
      const spaceBelow = window.innerHeight - rect.bottom;
      // If there's less than ~300px below and more space above, open upwards
      if (spaceBelow < 300 && rect.top > spaceBelow) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        setIsOpen(true);
        const currentIdx = options.findIndex((opt) => opt.value === value);
        setActiveIndex(currentIdx >= 0 ? currentIdx : 0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        e.preventDefault();
        break;
      case 'ArrowDown':
        setActiveIndex((prev) => (prev + 1) % options.length);
        e.preventDefault();
        break;
      case 'ArrowUp':
        setActiveIndex((prev) => (prev - 1 + options.length) % options.length);
        e.preventDefault();
        break;
      case 'Enter':
      case ' ':
        if (activeIndex >= 0 && activeIndex < options.length) {
          onChange(options[activeIndex].value);
          setIsOpen(false);
        }
        e.preventDefault();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <div className={`relative ${className}`} ref={dropdownRef} onKeyDown={handleKeyDown}>
      {label && (
        <span className="font-label text-[11px] uppercase tracking-widest text-black/30 font-bold block mb-1.5 ml-1">
          {label}
        </span>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        type="button"
        className={`w-full flex items-center justify-between bg-gray-50/80 hover:bg-white px-4 py-2.5 rounded-full border border-black/5 hover:border-primary/20 transition-all cursor-pointer group shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${buttonClassName}`}
      >
        <span className="font-label text-[11px] sm:text-[12px] lg:text-[10px] uppercase tracking-widest font-bold text-black truncate pr-2">
          {selectedOption.label}
        </span>
        <span
          className={`material-symbols-outlined text-[18px] text-black/20 group-hover:text-primary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: openUpwards ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUpwards ? 10 : -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`absolute z-[100] w-full min-w-[200px] bg-white rounded-2xl shadow-2xl border border-black/5 overflow-hidden py-2 ${
              dropdownPosition === 'right' ? 'right-0' : 'left-0'
            } ${openUpwards ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          >
            <div
              className="max-h-[280px] overflow-y-auto no-scrollbar"
              role="listbox"
              id="dropdown-options"
            >
              {options.map((option, idx) => (
                <button
                  key={option.value}
                  role="option"
                  aria-selected={value === option.value}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  type="button"
                  className={`w-full text-left px-4 py-2.5 font-label text-[11px] uppercase tracking-widest transition-all flex items-center justify-between ${
                    value === option.value || activeIndex === idx
                      ? 'bg-primary/5 text-primary font-bold'
                      : 'text-black/60 hover:bg-gray-50 hover:text-black'
                  }`}
                >
                  {option.label}
                  {value === option.value && (
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
