import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const SortableSectionItem = ({ id, section, onToggle, onToggleDivider }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const getIcon = (key) => {
    switch (key) {
      case 'header':
        return 'title';
      case 'details':
        return 'list_alt';
      case 'products_table':
        return 'inventory_2';
      case 'footer':
        return 'horizontal_rule';
      case 'shipping_info':
        return 'local_shipping';
      default:
        return 'drag_indicator';
    }
  };

  const formatKey = (key) =>
    key
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 mb-2 bg-white border rounded-lg shadow-sm transition-all ${isDragging ? 'border-[var(--admin-accent)] shadow-md ring-2 ring-[var(--admin-accent)] ring-opacity-20' : 'border-[var(--admin-border-subtle)]'}`}
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
        </button>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--admin-bg-subtle)] text-[var(--admin-text-secondary)]">
          <span className="material-symbols-outlined text-[16px]">
            {getIcon(section.sectionKey)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[14px] font-medium text-[var(--admin-text-primary)]">
            {formatKey(section.sectionKey)}
          </span>
          {section.showDivider && (
            <span className="text-[11px] text-gray-400">Includes bottom divider</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[var(--admin-text-secondary)]" title="Toggle Divider">
            Divider
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={section.showDivider}
              onChange={() => onToggleDivider(id)}
            />
            <div className="w-7 h-4 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[var(--admin-accent)]"></div>
          </label>
        </div>

        <div className="w-px h-6 bg-[var(--admin-border-subtle)]"></div>

        <div className="flex items-center gap-2">
          <span
            className="text-[12px] font-medium"
            style={{
              color: section.enabled ? 'var(--admin-text-primary)' : 'var(--admin-text-tertiary)',
            }}
          >
            {section.enabled ? 'On' : 'Off'}
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={section.enabled}
              onChange={() => onToggle(id)}
            />
            <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
          </label>
        </div>
      </div>
    </div>
  );
};
