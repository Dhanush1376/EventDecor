import React, { useState, useRef, useEffect } from 'react';

const WhatsAppMarkdownToolbar = ({ textareaRef, onInsert }) => {
  const [showVariables, setShowVariables] = useState(false);
  const varsRef = useRef(null);

  const variables = [
    { label: 'Order Number', value: '{{order_number}}' },
    { label: 'Customer Name', value: '{{customer_name}}' },
    { label: 'Total Amount', value: '{{total_amount}}' },
    { label: 'Tracking Link', value: '{{tracking_link}}' },
    { label: 'Store Name', value: '{{store_name}}' },
  ];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (varsRef.current && !varsRef.current.contains(e.target)) {
        setShowVariables(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFormat = (char) => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;

    // If text is selected, wrap it. Else insert at cursor
    let newText;
    let newCursorPos;

    if (start !== end) {
      const selected = text.slice(start, end);
      newText = text.slice(0, start) + char + selected + char + text.slice(end);
      newCursorPos = end + char.length * 2;
    } else {
      newText = text.slice(0, start) + char + char + text.slice(start);
      newCursorPos = start + char.length;
    }

    onInsert(newText, newCursorPos);
  };

  const handleInsertVar = (val) => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const text = el.value;

    const newText = text.slice(0, start) + val + text.slice(start);
    const newCursorPos = start + val.length;

    onInsert(newText, newCursorPos);
    setShowVariables(false);
  };

  return (
    <div className="flex items-center gap-1 p-2 bg-[var(--admin-bg-subtle)] border-b border-[var(--admin-border-subtle)] rounded-t-lg">
      <button
        onClick={() => handleFormat('*')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-700 font-bold w-8 h-8 flex items-center justify-center"
        title="Bold (*)"
      >
        B
      </button>
      <button
        onClick={() => handleFormat('_')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-700 italic w-8 h-8 flex items-center justify-center"
        title="Italic (_)"
      >
        I
      </button>
      <button
        onClick={() => handleFormat('~')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-700 line-through w-8 h-8 flex items-center justify-center"
        title="Strikethrough (~)"
      >
        S
      </button>
      <button
        onClick={() => handleFormat('```')}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-700 font-mono w-8 h-8 flex items-center justify-center"
        title="Code (```)"
      >
        &lt;/&gt;
      </button>

      <div className="w-px h-5 bg-gray-300 mx-1"></div>

      <div className="relative" ref={varsRef}>
        <button
          onClick={() => setShowVariables(!showVariables)}
          className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-gray-200 text-[12px] font-medium text-[var(--admin-text-secondary)]"
        >
          <span className="material-symbols-outlined text-[16px]">data_object</span>
          Variables
        </button>

        {showVariables && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 shadow-lg rounded-lg z-50 py-1">
            {variables.map((v) => (
              <button
                key={v.value}
                onClick={() => handleInsertVar(v.value)}
                className="w-full text-left px-3 py-2 text-[12px] hover:bg-[var(--admin-bg-subtle)] text-[var(--admin-text-primary)]"
              >
                {v.label}{' '}
                <span className="text-gray-400 block text-[10px] font-mono">{v.value}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppMarkdownToolbar;
