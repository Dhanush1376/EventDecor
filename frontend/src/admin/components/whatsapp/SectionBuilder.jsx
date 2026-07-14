import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { SortableSectionItem } from './SortableSectionItem';

const SectionBuilder = ({ sections: initialSections = [], onChange }) => {
  const [sections, setSections] = useState(initialSections);
  const [activeId, setActiveId] = useState(null);

  // Sync prop changes
  useEffect(() => {
    if (initialSections.length > 0) {
      // Sort by order initially
      const sorted = [...initialSections].sort((a, b) => a.order - b.order);
      setSections(sorted);
    } else {
      // Defaults if none provided
      setSections([
        { sectionKey: 'header', order: 1, enabled: true, showDivider: true },
        { sectionKey: 'details', order: 2, enabled: true, showDivider: true },
        { sectionKey: 'products_table', order: 3, enabled: true, showDivider: true },
        { sectionKey: 'footer', order: 4, enabled: true, showDivider: false },
      ]);
    }
  }, [initialSections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.sectionKey === active.id);
      const newIndex = sections.findIndex((s) => s.sectionKey === over.id);

      const newArr = arrayMove(sections, oldIndex, newIndex);
      // Reassign order
      const updatedArr = newArr.map((s, idx) => ({ ...s, order: idx + 1 }));
      setSections(updatedArr);
      if (onChange) onChange(updatedArr);
    }
  };

  const toggleSection = (id) => {
    const updated = sections.map((s) => (s.sectionKey === id ? { ...s, enabled: !s.enabled } : s));
    setSections(updated);
    if (onChange) onChange(updated);
  };

  const toggleDivider = (id) => {
    const updated = sections.map((s) =>
      s.sectionKey === id ? { ...s, showDivider: !s.showDivider } : s,
    );
    setSections(updated);
    if (onChange) onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-[14px] font-semibold text-[var(--admin-text-primary)]">
          Message Layout Builder
        </h3>
        <span className="text-[12px] text-[var(--admin-text-secondary)]">
          Drag to reorder sections
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
      >
        <SortableContext
          items={sections.map((s) => s.sectionKey)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {sections.map((section) => (
              <SortableSectionItem
                key={section.sectionKey}
                id={section.sectionKey}
                section={section}
                onToggle={toggleSection}
                onToggleDivider={toggleDivider}
              />
            ))}
          </div>
        </SortableContext>

        {/* Drag Overlay for smooth visuals */}
        <DragOverlay>
          {activeId ? (
            <div className="opacity-80 scale-105">
              <SortableSectionItem
                id={activeId}
                section={sections.find((s) => s.sectionKey === activeId)}
                onToggle={() => {}}
                onToggleDivider={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default SectionBuilder;
