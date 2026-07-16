import React, { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from 'react-hot-toast';
import { nodeTypes } from './CustomFlowNodes';
import VisualBuilderSidebar from './VisualBuilderSidebar';
import whatsappAutomationService from '../../services/whatsappAutomationService';

export default function VisualAutomationBuilder({ automation, onSave, onCancel }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize graph from automation prop
  useEffect(() => {
    if (!automation) return;

    const initialNodes = [
      {
        id: 'node-trigger',
        type: 'triggerNode',
        position: { x: 250, y: 50 },
        data: { category: automation.category },
      },
      {
        id: 'node-condition',
        type: 'conditionNode',
        position: { x: 250, y: 150 },
        data: { conditions: automation.conditions || [] },
      },
      {
        id: 'node-template',
        type: 'templateNode',
        position: { x: 250, y: 250 },
        data: {
          activeTemplateId: automation.activeTemplateId?._id || automation.activeTemplateId,
          templateName: automation.activeTemplateId?.name || 'No Template',
        },
      },
      {
        id: 'node-recipient',
        type: 'recipientNode',
        position: { x: 250, y: 350 },
        data: { recipientRoles: automation.recipientRoles || [] },
      },
      {
        id: 'node-config',
        type: 'configNode',
        position: { x: 250, y: 450 },
        data: { priority: automation.priority, retryPolicy: automation.retryPolicy },
      },
    ];

    const initialEdges = [
      {
        id: 'e1-2',
        source: 'node-trigger',
        target: 'node-condition',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: 'e2-3',
        source: 'node-condition',
        target: 'node-template',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: 'e3-4',
        source: 'node-template',
        target: 'node-recipient',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: 'e4-5',
        source: 'node-recipient',
        target: 'node-config',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
      },
    ];

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [automation, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (event, node) => {
      setActiveNodeId(node.id);

      // Visually mark selected
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, selected: n.id === node.id },
        })),
      );
    },
    [setNodes],
  );

  const onUpdateNode = (updatedData) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === activeNodeId) {
          return { ...n, data: { ...n.data, ...updatedData } };
        }
        return n;
      }),
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Reconstruct payload
      const payload = {};
      nodes.forEach((n) => {
        if (n.type === 'conditionNode') payload.conditions = n.data.conditions;
        if (n.type === 'templateNode') payload.activeTemplateId = n.data.activeTemplateId;
        if (n.type === 'recipientNode') payload.recipientRoles = n.data.recipientRoles;
        if (n.type === 'configNode') {
          payload.priority = n.data.priority;
          payload.retryPolicy = n.data.retryPolicy;
        }
      });

      await whatsappAutomationService.updateAutomation(automation.automationKey, payload);
      toast.success('Visual Workflow Saved!');
      onSave && onSave();
    } catch (err) {
      toast.error('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const activeNode = nodes.find((n) => n.id === activeNodeId);

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm relative z-20">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h2 className="text-[18px] font-bold text-gray-900">
              Visual Builder: {automation?.displayName || 'Automation'}
            </h2>
            <p className="text-[12px] text-gray-500">Linear Workflow Pipeline Editor</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="admin-btn bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="admin-btn admin-btn-primary flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            {isSaving ? 'Saving...' : 'Save Workflow'}
          </button>
        </div>
      </div>

      {/* Canvas & Sidebar */}
      <div className="flex-1 relative overflow-hidden flex">
        <div className="flex-1 bg-[var(--admin-bg-subtle)] relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            attributionPosition="bottom-left"
            nodesDraggable={false} // Linear pipeline, no need to drag layout
            nodesConnectable={false} // Fixed edges for V1 linear flow
            elementsSelectable={true}
          >
            <MiniMap />
            <Controls />
            <Background color="#ccc" gap={16} />
          </ReactFlow>
        </div>

        <VisualBuilderSidebar
          activeNode={activeNode}
          automation={automation}
          onUpdateNode={onUpdateNode}
          onClose={() => {
            setActiveNodeId(null);
            setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, selected: false } })));
          }}
        />
      </div>
    </div>
  );
}
