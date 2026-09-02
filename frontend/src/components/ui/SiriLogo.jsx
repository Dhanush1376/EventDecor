export function SiriLogo({
  className = '',
  size = '36px',
  _showSubtitle = false,
  variant = 'default',
}) {
  // Parse the size to a number to scale it up
  const numericSize = typeof size === 'string' ? parseInt(size, 10) : size;
  // Make the logo slightly larger than passed size height (1.15x)
  const height = numericSize ? Math.round(numericSize * 1.15) : 42;

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{
        height: height + 'px',
        minHeight: height + 'px',
      }}
    >
      <img
        src="/MainLogo.png"
        alt="Siri Arts & Crafts Logo"
        loading="eager"
        fetchPriority="high"
        style={{
          height: '100%',
          width: 'auto',
          aspectRatio: '1 / 1',
          borderRadius: '50%',
          objectFit: 'cover',
          filter: variant === 'white' ? 'brightness(0) invert(1)' : 'none',
          transition: 'filter 0.3s ease',
        }}
        className="h-full flex items-center"
      />
    </div>
  );
}
