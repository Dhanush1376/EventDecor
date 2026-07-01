import { SiriLogo } from './SiriLogo';
import { useEffect, useState } from 'react';

export default function CloudflareVerification({
  onVerify,
  domain = 'siriartsandcrafts.com',
  isTesting = false,
}) {
  const [dots, setDots] = useState(0);
  const [isVerifying, setIsVerifying] = useState(true);

  // Animate the dots for "Verifying..."
  useEffect(() => {
    if (!isVerifying) return;

    const interval = setInterval(() => {
      setDots((prev) => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(interval);
  }, [isVerifying]);

  // Simulate verification completion
  useEffect(() => {
    if (isTesting) {
      const timer = setTimeout(() => {
        setIsVerifying(false);
        if (onVerify) onVerify();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isTesting, onVerify]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans p-6 items-center justify-center sm:items-start sm:justify-start">
      <div className="w-full max-w-3xl mx-auto mt-12 sm:mt-24">
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-white flex items-center justify-center p-1 shrink-0 rounded-sm">
            <SiriLogo size="32px" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight truncate">
            {domain}
          </h1>
        </div>

        {/* Status Text */}
        <h2 className="text-2xl sm:text-3xl font-semibold mb-4 tracking-tight">
          Performing security verification
        </h2>

        <p className="text-gray-400 text-base sm:text-lg mb-8 max-w-2xl leading-relaxed">
          This website uses a security service to protect against malicious bots. This page is
          displayed while the website verifies you are not a bot.
        </p>

        {/* Verification Box */}
        <div className="border border-gray-700 bg-[#1a1a1a] rounded-sm p-4 w-full max-w-[480px] flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            {/* Custom Spinner */}
            <div className="relative w-8 h-8 flex items-center justify-center">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: isVerifying ? '#22c55e' : '#4ade80',
                    opacity: isVerifying
                      ? i === dots || i === (dots - 1 + 8) % 8 || i === (dots - 2 + 8) % 8
                        ? 1
                        : 0.2
                      : 1,
                    transform: `rotate(${i * 45}deg) translateY(-12px)`,
                    transition: 'opacity 0.2s ease',
                  }}
                />
              ))}
            </div>
            <span className="text-gray-200 text-sm font-medium">
              Verifying{isVerifying ? '.'.repeat(dots) : '...'}
            </span>
          </div>

          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 mb-1">
              {/* Cloudflare Cloud Logo */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-[#f38020]"
              >
                <path
                  d="M19.16 9.54c-.16-.94-.78-1.74-1.63-2.12-.13-1.6-1.12-3-2.61-3.61-1.49-.61-3.21-.49-4.57.34C9.53 2.92 7.78 2.22 5.92 2.66c-1.86.44-3.3 1.88-3.74 3.74-.29 1.25-.01 2.56.76 3.63C1.69 11.23 1 12.8 1 14.5c0 2.48 2.02 4.5 4.5 4.5h13c2.48 0 4.5-2.02 4.5-4.5 0-2.31-1.74-4.23-3.84-4.96z"
                  fill="currentColor"
                />
              </svg>
              <span className="font-bold text-white text-xs tracking-wider">CLOUDFLARE</span>
            </div>
            <div className="text-[10px] text-gray-500 gap-1 flex">
              <a href="#" className="hover:underline">
                Privacy
              </a>
              <span>·</span>
              <a href="#" className="hover:underline">
                Help
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
