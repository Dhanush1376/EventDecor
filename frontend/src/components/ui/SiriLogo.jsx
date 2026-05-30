import React from 'react';

export function SiriLogo({ className = "", size = "36px", showSubtitle = false }) {
  return (
    <div 
      className={`siri-logo-mark group/logo inline-flex items-center justify-center rounded-full relative ${className}`}
      style={{ 
        width: size, 
        height: size,
        minWidth: size,
        minHeight: size,
        background: 'linear-gradient(145deg, #a08633 0%, #7a6521 40%, #5c4b18 70%, #8b7428 100%)',
        boxShadow: '0 1px 4px rgba(122,101,33,0.25), inset 0 1px 1px rgba(255,255,255,0.15)',
      }}
    >
      {/* Inner ring border for depth */}
      <div 
        className="absolute inset-[1.5px] rounded-full pointer-events-none"
        style={{
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      />

      {/* Shimmer sweep overlay */}
      <div 
        className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)',
          backgroundSize: '200% 100%',
          animation: 'siriLogoShimmer 5s ease-in-out infinite',
        }}
      />

      {/* Text — unchanged font & sizing */}
      <div 
        className="flex items-baseline gap-0 leading-none select-none relative z-10"
        style={{
          fontSize: '1.2em',
          transform: 'translateY(-0.03em)',
          textShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      >
        <span 
          style={{ 
            fontFamily: "'Playfair Display', 'Georgia', 'Times New Roman', serif", 
            fontWeight: 400, 
            color: 'var(--color-surface, #faf9f6)', 
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
            color: 'var(--color-surface, #faf9f6)', 
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
            color: 'var(--color-surface, #faf9f6)', 
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
            color: 'var(--color-surface, #faf9f6)', 
            fontSize: '0.866em', 
            display: 'inline-block', 
            lineHeight: 1 
          }}
        >i</span>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes siriLogoShimmer {
          0% { background-position: 200% 0; }
          25%, 100% { background-position: -200% 0; }
        }
        .siri-logo-mark {
          transition: box-shadow 0.4s ease, transform 0.3s ease;
        }
        .siri-logo-mark:hover {
          box-shadow: 0 2px 12px rgba(160,134,51,0.45), 0 0 20px rgba(196,168,124,0.2), inset 0 1px 1px rgba(255,255,255,0.15);
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
}
