import { Link } from 'react-router-dom';

/**
 * Reusable section header with kicker, title, and optional "See All" link.
 */
export function SectionHeader({ kicker, title, seeAllLink, className = '' }) {
  return (
    <div className={`h1-section-header ${className}`}>
      {kicker && <span className="h1-section-header__kicker">{kicker}</span>}
      <div className="h1-section-header__row">
        <h2 className="h1-section-header__title">{title}</h2>
        {seeAllLink && (
          <Link to={seeAllLink} className="h1-section-header__see-all">
            See All
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        )}
      </div>
    </div>
  );
}
