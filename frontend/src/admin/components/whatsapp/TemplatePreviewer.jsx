import React from 'react';

const TemplatePreviewer = ({ templateText = '' }) => {
  // Basic markdown parser for WhatsApp
  // *bold* -> <strong>bold</strong>
  // _italic_ -> <em>italic</em>
  // ~strike~ -> <del>strike</del>
  // ```code``` -> <code>code</code>
  // \n -> <br/>
  const parseWhatsAppMarkdown = (text) => {
    if (!text) return { __html: '<span class="text-gray-400 italic">No content...</span>' };

    let parsed = text
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/~(.*?)~/g, '<del>$1</del>')
      .replace(
        /```(.*?)```/g,
        '<code class="bg-black/10 px-1 rounded font-mono text-[11px]">$1</code>',
      )
      .replace(/\n/g, '<br/>');

    // Simple variable highlighter {{var}}
    parsed = parsed.replace(
      /\{\{(.*?)\}\}/g,
      '<span class="bg-blue-100 text-blue-700 px-1 rounded text-[12px] font-mono">{{$1}}</span>',
    );

    return { __html: parsed };
  };

  return (
    <div className="flex flex-col h-full bg-[#EFEAE2] rounded-xl overflow-hidden shadow-inner border border-gray-200">
      {/* Mock WhatsApp Header */}
      <div className="bg-[#075E54] text-white p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-[18px]">person</span>
        </div>
        <div>
          <div className="text-[14px] font-semibold">Customer Preview</div>
          <div className="text-[11px] text-white/70">Online</div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat overflow-y-auto">
        {/* Mock Message Bubble */}
        <div className="max-w-[85%] bg-white rounded-xl rounded-tl-none p-3.5 pb-7 shadow-sm relative text-[14.5px] text-[#111B21] leading-snug">
          <div
            className="whitespace-pre-wrap break-words"
            dangerouslySetInnerHTML={parseWhatsAppMarkdown(templateText)}
          />

          <div className="absolute bottom-1 right-2 text-[10px] text-gray-500 flex items-center gap-1">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            <span className="material-symbols-outlined text-[14px] text-[#53bdeb]">done_all</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreviewer;
