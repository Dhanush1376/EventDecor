import { AdminToggle } from '../../../components/AdminUIKit';

export function PublishStep({ formData, setFormData }) {
  return (
    <div className="space-y-5">
      <div className="admin-card-inset p-4 rounded-[var(--admin-radius-lg)] max-w-sm">
        <AdminToggle
          label="Publishing Campaign Status"
          description="Enable to activate this promotional offer in production"
          checked={formData.isActive}
          onChange={() => setFormData({ ...formData, isActive: !formData.isActive })}
        />
      </div>
    </div>
  );
}
