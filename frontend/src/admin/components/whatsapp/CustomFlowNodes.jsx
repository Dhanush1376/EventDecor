import React from 'react';
import { Handle, Position } from '@xyflow/react';

// Common Node Container
const BaseNode = ({ id, icon, title, subtitle, color, isFirst, isLast, selected }) => (
  <div
    className={`relative bg-white rounded-xl shadow-sm border-2 ${selected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'} transition-all min-w-[250px] overflow-hidden`}
  >
    {!isFirst && (
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-3" />
    )}

    <div className="flex flex-col">
      <div className="px-4 py-3 border-b flex items-center gap-3 bg-gray-50/50">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-white`}
          style={{ backgroundColor: color }}
        >
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-gray-800">{title}</h3>
          {subtitle && (
            <p className="text-[11px] text-gray-500 font-medium truncate max-w-[180px]">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>

    {!isLast && (
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-3 !h-3" />
    )}
  </div>
);

export const TriggerNode = ({ data, selected }) => {
  return (
    <BaseNode
      icon="bolt"
      color="#8B5CF6" // Purple
      title="Trigger Event"
      subtitle={`On: ${data.category?.toUpperCase() || 'UNKNOWN'}`}
      isFirst={true}
      selected={selected}
    />
  );
};

export const ConditionNode = ({ data, selected }) => {
  const count = data.conditions?.length || 0;
  return (
    <BaseNode
      icon="account_tree"
      color="#F59E0B" // Amber
      title="Conditions"
      subtitle={count === 0 ? 'Always run (No conditions)' : `${count} rule(s) configured`}
      selected={selected}
    />
  );
};

export const TemplateNode = ({ data, selected }) => {
  return (
    <BaseNode
      icon="drafts"
      color="#3B82F6" // Blue
      title="Message Template"
      subtitle={data.templateName || 'No template selected'}
      selected={selected}
    />
  );
};

export const RecipientNode = ({ data, selected }) => {
  const count = data.recipientRoles?.filter((r) => r.enabled !== false)?.length || 0;
  return (
    <BaseNode
      icon="group"
      color="#10B981" // Green
      title="Recipients"
      subtitle={`${count} role(s) configured`}
      selected={selected}
    />
  );
};

export const ConfigNode = ({ data, selected }) => {
  return (
    <BaseNode
      icon="settings_suggest"
      color="#6B7280" // Gray
      title="Queue & Retries"
      subtitle={`Priority: ${data.priority?.toUpperCase() || 'NORMAL'} | Max Retries: ${data.retryPolicy?.maxRetries ?? 4}`}
      isLast={true}
      selected={selected}
    />
  );
};

export const nodeTypes = {
  triggerNode: TriggerNode,
  conditionNode: ConditionNode,
  templateNode: TemplateNode,
  recipientNode: RecipientNode,
  configNode: ConfigNode,
};
