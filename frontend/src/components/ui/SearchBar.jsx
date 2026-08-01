import { Search, Camera, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export function SearchBar({
  value = '',
  onChange,
  onSubmit,
  placeholder = 'Search collections...',
  className = '',
  onCameraClick,
  onClick,
}) {
  const [localValue, setLocalValue] = useState(value);
  const onChangeRef = useRef(onChange);
  const lastEmittedValue = useRef(value);
  const isFocused = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync internal state with external prop (for clear/reset)
  useEffect(() => {
    if (value !== localValue && (!isFocused.current || value === '')) {
      setLocalValue(value);
      lastEmittedValue.current = value;
    }
  }, [value, localValue]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    lastEmittedValue.current = newValue;
    onChange?.({ target: { value: newValue } });
  };

  const handleClear = () => {
    setLocalValue('');
    lastEmittedValue.current = '';
    onChange?.({ target: { value: '' } });
  };

  const hasCamera = !!onCameraClick;
  const hasClear = !!localValue;
  const paddingRightClass =
    hasCamera && hasClear ? 'pr-18 lg:pr-20' : hasCamera || hasClear ? 'pr-11 lg:pr-12' : 'pr-4';

  return (
    <div
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
      className={`relative group w-full lg:flex-1 bg-surface-bright/90 backdrop-blur-md border-none rounded-full transition-all duration-300 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <Search
        className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant/60 transition-colors select-none pointer-events-none font-bold"
        strokeWidth={1.5}
      />
      <input
        type="text"
        value={localValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        readOnly={!!onClick}
        onFocus={(e) => {
          isFocused.current = true;
          if (onClick) {
            e.target.blur();
            onClick();
          }
        }}
        onBlur={() => {
          isFocused.current = false;
        }}
        className={`w-full h-full pl-9 lg:pl-12 ${paddingRightClass} py-0 bg-transparent border-none outline-none appearance-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 !shadow-none focus:!shadow-none font-body text-[14px] text-on-surface font-medium placeholder:text-on-surface-variant/50 search-portal-input ${onClick ? 'cursor-pointer' : ''}`}
        style={{
          outline: 'none',
          border: 'none',
          boxShadow: 'none',
          WebkitAppearance: 'none',
          appearance: 'none',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
            if (onSubmit) {
              onSubmit(localValue);
            } else if (localValue.trim()) {
              window.dispatchEvent(
                new CustomEvent('open-global-search', {
                  detail: { mode: 'text', query: localValue.trim() },
                }),
              );
            }
          }
        }}
        aria-label="Search"
      />
      <div className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
        {onCameraClick && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCameraClick();
            }}
            className="text-on-surface-variant/60 hover:text-primary hover:scale-105 transition-all w-8 h-8 lg:w-9 lg:h-9 !min-h-0 aspect-square flex items-center justify-center rounded-full hover:bg-primary/5 cursor-pointer shrink-0"
            aria-label="Search by image"
          >
            <Camera className="text-[18px]" strokeWidth={1.5} />
          </button>
        )}
        {localValue && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="text-on-surface-variant/60 hover:text-primary transition-colors w-8 h-8 lg:w-9 lg:h-9 !min-h-0 aspect-square flex items-center justify-center rounded-full hover:bg-primary/5 cursor-pointer shrink-0"
            aria-label="Clear search"
          >
            <X className="text-[18px]" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}
