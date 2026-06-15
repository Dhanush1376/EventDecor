export function OccasionEditor({ occasions = [], onChange }) {
  const handleAdd = () => {
    const newItem = {
      id: Date.now().toString(),
      label: 'New Occasion',
      desc: '',
      link: '/events',
      image: '',
    };
    onChange([...occasions, newItem]);
  };

  const handleUpdate = (index, field, value) => {
    const updated = [...occasions];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleRemove = (index) => {
    const updated = occasions.filter((_, i) => i !== index);
    onChange(updated);
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const updated = [...occasions];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    onChange(updated);
  };

  const moveDown = (index) => {
    if (index === occasions.length - 1) return;
    const updated = [...occasions];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-[11px] font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2">
        <span>Occasion Cards</span>
        <span>{occasions.length} Added</span>
      </div>

      <div className="space-y-4">
        {occasions.map((occasion, index) => (
          <div
            key={occasion.id || index}
            className="p-4 bg-[var(--admin-surface)] rounded-2xl border border-[var(--admin-border)] shadow-[var(--admin-shadow-xs)] relative group"
          >
            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--admin-surface-muted)] disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              </button>
              <button
                onClick={() => moveDown(index)}
                disabled={index === occasions.length - 1}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--admin-surface-muted)] disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
              </button>
              <button
                onClick={() => handleRemove(index)}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-500/10 text-red-500 ml-1"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <AdminField label="Title / Label">
                  <AdminInput
                    value={occasion.label || ''}
                    onChange={(e) => handleUpdate(index, 'label', e.target.value)}
                    placeholder="e.g. Wedding Ceremonies"
                  />
                </AdminField>
                <div className="mt-3">
                  <AdminField label="Description (Subtitle)">
                    <AdminInput
                      value={occasion.desc || ''}
                      onChange={(e) => handleUpdate(index, 'desc', e.target.value)}
                      placeholder="Short description..."
                    />
                  </AdminField>
                </div>
                <div className="mt-3">
                  <AdminField label="Link URL">
                    <AdminInput
                      value={occasion.link || ''}
                      onChange={(e) => handleUpdate(index, 'link', e.target.value)}
                      placeholder="/events"
                    />
                  </AdminField>
                </div>
              </div>

              <div>
                <AdminField label="Occasion Image">
                  <ImageUpload
                    value={occasion.image}
                    onChange={(url) => handleUpdate(index, 'image', url)}
                    aspectRatio="3/4"
                  />
                </AdminField>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="w-full py-3 rounded-xl border border-dashed border-[var(--admin-border-strong)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-accent)] hover:bg-[var(--admin-accent)]/5 flex justify-center items-center gap-2 transition-all text-[12px] font-semibold cursor-pointer"
      >
        <span className="material-symbols-outlined text-[16px]">add</span>
        Add Occasion Card
      </button>
    </div>
  );
}
