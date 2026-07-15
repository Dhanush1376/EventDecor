import React, { useState, useRef, useEffect } from 'react';
import WhatsAppMarkdownToolbar from './WhatsAppMarkdownToolbar';
import TemplatePreviewer from './TemplatePreviewer';

const TemplateEditor = ({ initialText = '', onChange, onSave }) => {
  const [text, setText] = useState(initialText);
  const textareaRef = useRef(null);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (onChange) onChange(e.target.value);
  };

  const handleToolbarInsert = (newText, newCursorPos) => {
    setText(newText);
    if (onChange) onChange(newText);

    // Restore focus and cursor position after React re-renders
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Editor Column */}
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[14px] font-semibold text-[var(--admin-text-primary)]">
            Message Body Template
          </h3>
          {onSave && (
            <button
              onClick={() => onSave(text)}
              className="admin-btn admin-btn-primary h-8 px-3 text-[12px]"
            >
              Save Template
            </button>
          )}
        </div>
        <div className="flex-1 flex flex-col border border-[var(--admin-border-subtle)] rounded-lg focus-within:ring-2 focus-within:ring-[var(--admin-accent)] focus-within:border-transparent transition-all">
          <WhatsAppMarkdownToolbar textareaRef={textareaRef} onInsert={handleToolbarInsert} />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            className="flex-1 w-full min-h-[250px] p-4 bg-white rounded-b-lg resize-y focus:outline-none text-[14px] text-[var(--admin-text-primary)] leading-relaxed"
            placeholder="Type your WhatsApp message template here..."
          />
        </div>
        <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-2">
          Tip: You can use WhatsApp formatting like *bold*, _italic_, and ~strikethrough~.
        </p>
      </div>

      {/* Preview Column */}
      <div className="flex flex-col h-full">
        <h3 className="text-[14px] font-semibold text-[var(--admin-text-primary)] mb-2">
          Live Preview
        </h3>
        <div className="flex-1 h-[330px]">
          <TemplatePreviewer templateText={text} />
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
