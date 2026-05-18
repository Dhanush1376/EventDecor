import React from "react";

export function Pagination({ currentPage = 1, totalPages = 5, onPageChange }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const visiblePages = pages.filter((page) => {
    if (totalPages <= 7) return true;
    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
  });

  return (
    <nav className="flex justify-center items-center mt-8 gap-2 sm:gap-4" aria-label="Pagination">
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange && onPageChange(currentPage - 1)}
        className="text-secondary hover:text-primary disabled:opacity-30 transition-colors p-1 sm:p-2 cursor-pointer font-bold"
        aria-label="Previous Page"
      >
        <span className="material-symbols-outlined text-[18px] sm:text-[24px]">
          arrow_back
        </span>
      </button>

      {/* Mobile View: Compact Label */}
      <div className="sm:hidden font-label text-[11px] uppercase tracking-widest text-black/40 font-bold">
        Page {currentPage} of {totalPages}
      </div>

      {/* Desktop View: Full Page Buttons */}
      <div className="hidden sm:flex gap-1 sm:gap-2">
        {visiblePages.map((page, index) => {
          const previous = visiblePages[index - 1];
          const showGap = previous && page - previous > 1;
          return (
            <React.Fragment key={page}>
              {showGap && <span className="flex h-10 items-center px-1 text-outline">...</span>}
              <button
                onClick={() => onPageChange && onPageChange(page)}
                aria-current={currentPage === page ? "page" : undefined}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-label text-[11px] sm:text-[12px] flex items-center justify-center transition-all duration-300 font-bold cursor-pointer ${
                  currentPage === page
                    ? "bg-primary text-white shadow-md scale-105"
                    : "text-on-surface/80 hover:bg-surface-container border border-outline-variant/10"
                }`}
              >
                {page}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange && onPageChange(currentPage + 1)}
        className="text-secondary hover:text-primary disabled:opacity-30 transition-colors p-1 sm:p-2 cursor-pointer font-bold"
        aria-label="Next Page"
      >
        <span className="material-symbols-outlined text-[18px] sm:text-[24px]">
          arrow_forward
        </span>
      </button>
    </nav>
  );
}
