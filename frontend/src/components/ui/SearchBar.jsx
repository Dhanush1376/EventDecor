import React, { useState, useEffect } from "react";

export function SearchBar({
  value = "",
  onChange,
  placeholder = "Search collections...",
  className = "",
}) {
  const [localValue, setLocalValue] = useState(value);

  // Sync internal state with external prop (for clear/reset)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (localValue === value) return;
    const handler = setTimeout(() => {
      onChange?.({ target: { value: localValue } });
    }, 220);
    return () => clearTimeout(handler);
  }, [localValue, onChange, value]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
  };

  const handleClear = () => {
    setLocalValue("");
    onChange?.({ target: { value: "" } });
  };

  return (
    <div
      className={`relative group w-full md:flex-1 bg-surface-bright/90 backdrop-blur-md border border-outline-variant/30 rounded-full focus-within:bg-white focus-within:border-primary/30 focus-within:shadow-luxury-sm transition-all duration-300 overflow-hidden ${className}`}
    >
      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant/60 group-focus-within:text-primary transition-colors select-none pointer-events-none font-bold">
        search
      </span>
      <input
        type="text"
        value={localValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full pl-12 pr-12 py-3 bg-transparent border-none outline-none ring-0 focus:ring-0 font-body text-[14px] text-on-surface font-medium placeholder:text-on-surface-variant/50"
        aria-label="Search"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-primary transition-colors p-1 rounded-full hover:bg-primary/5"
          aria-label="Clear search"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      )}
    </div>
  );
}
