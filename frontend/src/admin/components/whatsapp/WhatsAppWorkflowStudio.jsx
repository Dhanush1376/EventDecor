import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from 'react-hot-toast';

const initialNodes = [
  {
    id: 'trigger-1',
    type: 'input',
    data: { label: 'Event Trigger: Order Placed' },
    position: { x: 250, y: 50 },
    style: {
      background: '#ebf8ff',
      border: '1px solid #3182ce',
      borderRadius: '8px',
      padding: '10px',
    },
  },
];

const initialEdges = [];

const WhatsAppWorkflowStudio = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const addNode = (type) => {
    const newNode = {
      id: `${type}-${Date.now()}`,
      data: { label: `New ${type} Node` },
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      style: {
        background:
          type === 'condition'
            ? '#fff5f5'
            : type === 'delay'
              ? '#fffff0'
              : type === 'experiment'
                ? '#faf5ff'
                : '#f0fff4',
        border: '1px solid #cbd5e0',
        borderRadius: '8px',
        padding: '10px',
      },
      // For experiment nodes, we default to a 50/50 split
      ...(type === 'experiment'
        ? {
            data: {
              label: `A/B Experiment`,
              allocations: [
                { edgeHandle: 'a', weight: 50 },
                { edgeHandle: 'b', weight: 50 },
              ],
            },
          }
        : {}),
    };

    // Custom internal types for our backend logic
    if (type === 'action') newNode.type = 'default';
    if (type === 'condition') newNode.type = 'default';
    if (type === 'experiment') newNode.type = 'default';

    setNodes((nds) => nds.concat(newNode));
  };

  const onNodeClick = (event, node) => {
    setSelectedNode(node);
  };

  const updateNodeData = (key, value) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              [key]: value,
            },
          };
        }
        return node;
      }),
    );
    setSelectedNode((prev) => ({
      ...prev,
      data: { ...prev.data, [key]: value },
    }));
  };

  const saveWorkflow = async () => {
    const graph = {
      nodes,
      edges,
    };
    console.log('Deploying JSON DAG:', graph);
    // In a real implementation, we would PUT this JSON to the backend API:
    // await whatsappAutomationService.updateAutomation(id, { nodes, edges });
    toast.success('Workflow Graph Saved Successfully!');
  };

  return (
    <div className="flex h-[70vh] bg-white rounded-2xl shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden">
      {/* Node Palette (Left sidebar) */}
      <div className="w-64 border-r border-gray-100 bg-gray-50 p-4 flex flex-col gap-3">
        <h3 className="font-bold text-[14px] text-gray-800 mb-2">Node Palette</h3>
        <button
          onClick={() => addNode('condition')}
          className="w-full bg-white border border-gray-200 py-2 px-3 rounded-md text-[13px] font-medium text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2 transition-colors"
        >
          <span className="material-icons-outlined text-[16px]">call_split</span>
          Condition Branch
        </button>
        <button
          onClick={() => addNode('delay')}
          className="w-full bg-white border border-gray-200 py-2 px-3 rounded-md text-[13px] font-medium text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2 transition-colors"
        >
          <span className="material-icons-outlined text-[16px]">schedule</span>
          Delay / Wait
        </button>
        <button
          onClick={() => addNode('experiment')}
          className="w-full bg-white border border-purple-200 bg-purple-50 py-2 px-3 rounded-md text-[13px] font-medium text-purple-700 hover:bg-purple-100 flex items-center justify-center gap-2 transition-colors"
        >
          <span className="material-icons-outlined text-[16px]">science</span>
          A/B Experiment
        </button>
        <button
          onClick={() => addNode('action')}
          className="w-full bg-white border border-green-200 bg-green-50 py-2 px-3 rounded-md text-[13px] font-medium text-green-700 hover:bg-green-100 flex items-center justify-center gap-2 transition-colors"
        >
          <span className="material-icons-outlined text-[16px]">send</span>
          WhatsApp Action
        </button>

        <div className="mt-auto pt-4 border-t border-gray-200">
          <button onClick={saveWorkflow} className="admin-btn-primary w-full py-2">
            Deploy Workflow
          </button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background color="#ccc" gap={16} />
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
          <Panel
            position="top-right"
            className="bg-white/80 backdrop-blur px-3 py-1.5 rounded-md text-[12px] font-medium shadow-sm border border-gray-100 m-2"
          >
            Enterprise Workflow Studio
          </Panel>
        </ReactFlow>
      </div>

      {/* Property Editor (Right sidebar) */}
      {selectedNode && (
        <div className="w-72 border-l border-gray-100 bg-white p-4 flex flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.03)] z-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-[14px] text-gray-800">Node Properties</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="material-icons-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                Node ID
              </label>
              <input
                type="text"
                readOnly
                value={selectedNode.id}
                className="w-full text-[12px] bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-gray-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                Label
              </label>
              <input
                type="text"
                value={selectedNode.data.label}
                onChange={(e) => updateNodeData('label', e.target.value)}
                className="w-full text-[13px] border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
              />
            </div>

            {selectedNode.id.startsWith('action') && (
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Template ID
                </label>
                <select
                  className="w-full text-[13px] border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={selectedNode.data.templateId || ''}
                  onChange={(e) => updateNodeData('templateId', e.target.value)}
                >
                  <option value="">Select Template...</option>
                  <option value="60f1b9b9b9b9b9b9b9b9b9b9">Welcome Campaign</option>
                  <option value="60f1b9b9b9b9b9b9b9b9b9c0">Abandoned Cart</option>
                </select>
              </div>
            )}

            {selectedNode.id.startsWith('delay') && (
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Delay (Minutes)
                </label>
                <input
                  type="number"
                  value={selectedNode.data.delayMinutes || 0}
                  onChange={(e) => updateNodeData('delayMinutes', Number(e.target.value))}
                  className="w-full text-[13px] border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            )}

            {selectedNode.id.startsWith('condition') && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Evaluate Field
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. order.total"
                    value={selectedNode.data.field || ''}
                    onChange={(e) => updateNodeData('field', e.target.value)}
                    className="w-full text-[13px] border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Operator
                  </label>
                  <select
                    className="w-full text-[13px] border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={selectedNode.data.operator || 'eq'}
                    onChange={(e) => updateNodeData('operator', e.target.value)}
                  >
                    <option value="eq">Equals</option>
                    <option value="gt">Greater Than</option>
                    <option value="lt">Less Than</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Compare Value
                  </label>
                  <input
                    type="text"
                    value={selectedNode.data.value || ''}
                    onChange={(e) => updateNodeData('value', e.target.value)}
                    className="w-full text-[13px] border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </>
            )}

            {selectedNode.id.startsWith('experiment') && (
              <div className="space-y-3 mt-4 border-t border-gray-100 pt-4">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                  Traffic Allocation
                </label>
                {(selectedNode.data.allocations || []).map((alloc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-200"
                  >
                    <span className="text-[12px] font-bold text-gray-700">
                      Branch {alloc.edgeHandle.toUpperCase()}:
                    </span>
                    <input
                      type="number"
                      value={alloc.weight}
                      onChange={(e) => {
                        const newAllocations = [...selectedNode.data.allocations];
                        newAllocations[idx].weight = Number(e.target.value);
                        updateNodeData('allocations', newAllocations);
                      }}
                      className="w-16 text-[12px] border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <span className="text-[12px] text-gray-500">%</span>
                  </div>
                ))}
                <div className="text-[11px] text-gray-400 italic">
                  Total must equal 100%. Statistical winners are computed automatically.
                </div>
              </div>
            )}

            <button
              onClick={() => setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id))}
              className="w-full mt-4 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 py-2 rounded text-[13px] font-bold transition-colors"
            >
              Delete Node
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppWorkflowStudio;
