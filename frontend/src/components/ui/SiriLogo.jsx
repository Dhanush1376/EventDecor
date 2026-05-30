import React from 'react';

export function SiriLogo({ className = "", size = "36px", showSubtitle = true }) {
  return (
    <div 
      className={`flex flex-col items-center justify-center leading-none ${className}`}
      style={{ fontSize: size }}
    >
      <div className="flex items-baseline gap-0 leading-none">
        <span 
          style={{ 
            fontFamily: "'Playfair Display', 'Georgia', 'Times New Roman', serif", 
            fontWeight: 400, 
            color: '#7a6521', 
            fontSize: '1em', 
            marginRight: '0.01em', 
            display: 'inline-block', 
            lineHeight: 1 
          }}
        >S</span>
        <span 
          style={{ 
            fontFamily: "'Playfair Display', 'Georgia', 'Times New Roman', serif", 
            fontWeight: 400, 
            color: '#7a6521', 
            fontSize: '0.633em', 
            position: 'relative', 
            top: '0.05em', 
            marginRight: '0.01em', 
            display: 'inline-block', 
            lineHeight: 1 
          }}
        >i</span>
        <span 
          style={{ 
            fontFamily: "'Playfair Display', 'Georgia', 'Times New Roman', serif", 
            fontWeight: 400, 
            color: '#7a6521', 
            fontSize: '0.766em', 
            marginRight: '0.01em', 
            display: 'inline-block', 
            lineHeight: 1 
          }}
        >r</span>
        <span 
          style={{ 
            fontFamily: "'Playfair Display', 'Georgia', 'Times New Roman', serif", 
            fontWeight: 400, 
            color: '#7a6521', 
            fontSize: '0.866em', 
            display: 'inline-block', 
            lineHeight: 1 
          }}
        >i</span>
      </div>
      
      {showSubtitle && (
        <div className="flex flex-col items-center mt-[0.06em]">
          <div 
            style={{ 
              height: '1px', 
              width: '1.9em', 
              background: 'linear-gradient(90deg,transparent,rgba(122,101,33,0.9),transparent)', 
              margin: '0.04em 0 0.08em' 
            }}
          ></div>
          <div 
            style={{ 
              fontFamily: "'Lora', 'Georgia', serif", 
              fontWeight: 500, 
              fontSize: '0.22em', 
              color: '#7a6521', 
              letterSpacing: '0.02em', 
              whiteSpace: 'nowrap', 
              textTransform: 'none' 
            }}
          >
            Arts &amp; Crafts
          </div>
        </div>
      )}
    </div>
  );
}
