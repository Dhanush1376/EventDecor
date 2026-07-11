import { m as motion } from 'framer-motion';
import { SkeletonCard, StatusBadge, fadeUp } from '../../../components/AdminUIKit';

export function TeamTab({ teamMembers, operationsLoading }) {
  return (
    <motion.div key="team" initial="hidden" animate="show" variants={fadeUp} className="space-y-6">
      <div className="admin-card p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-4">
          <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
            Available Setup Staff & Crew
          </h3>
          <span className="admin-badge admin-badge-neutral">
            {teamMembers.length} Staff members
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {operationsLoading ? (
            [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
          ) : teamMembers.length > 0 ? (
            teamMembers.map((team, idx) => (
              <div
                key={idx}
                className="p-5 bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] flex items-center justify-between"
              >
                <div>
                  <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                    {team.name}
                  </h4>
                  <span className="text-[11px] text-[var(--admin-text-secondary)] font-medium block mt-0.5 capitalize">
                    {team.role}
                  </span>
                  <span className="text-[11px] text-[var(--admin-text-tertiary)] block mt-1">
                    {team.contact}
                  </span>
                </div>
                <StatusBadge status="active" className="opacity-80" />
              </div>
            ))
          ) : (
            <div className="col-span-full py-10 text-center text-[var(--admin-text-tertiary)] text-[12px]">
              No team members are available for allocation yet.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
