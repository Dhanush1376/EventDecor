import logger from '../../../config/logger';
import WhatsAppAutomation from '../../../models/WhatsAppAutomation';
import { WhatsAppTemplateEngine } from './WhatsAppTemplateEngine';
import { SmartRouter } from './SmartRouter';
import WhatsAppMessageLog from '../../../models/WhatsAppMessageLog';
import WorkflowExecutionLog from '../../../models/WorkflowExecutionLog';
import { randomUUID as uuidv4 } from 'crypto';
import { whatsappDispatchQueue } from '../../../jobs/whatsappQueues';

export class WorkflowExecutionEngine {
  /**
   * Starts or resumes the execution of a DAG Automation Workflow.
   * Node execution is sequential. Branches can execute in parallel if allowed.
   */
  static async executeWorkflow(
    automationId: string,
    payload: any,
    currentNodeId?: string, // If null, starts from the 'trigger' node
  ): Promise<void> {
    try {
      const automation = await WhatsAppAutomation.findById(automationId).lean();
      if (!automation || !automation.enabled) return;

      const nodes = automation.nodes || [];
      const edges = automation.edges || [];

      let startNode;
      let executionLog;

      if (currentNodeId) {
        startNode = nodes.find((n: any) => n.id === currentNodeId);
        // Find existing execution log based on the payload idempotency or UUID
        // For simplicity in this tier, we'll look up the most recent 'running' log for this automation and payload phone
        // In a true implementation, an executionId would be passed down via the BullMQ payload.
        executionLog = await WorkflowExecutionLog.findOne({
          automationId: automation._id,
          status: 'running',
        }).sort({ createdAt: -1 });
      } else {
        startNode = nodes.find((n: any) => n.type === 'trigger');
        // Create new execution log
        executionLog = await WorkflowExecutionLog.create({
          executionId: uuidv4(),
          automationId: automation._id,
          automationName: automation.displayName || 'Unknown Automation',
          triggerPayload: payload,
          nodeTrace: [],
        });
      }

      if (!startNode) {
        logger.error(
          `[WorkflowExecutionEngine] No start node found for automation ${automationId}`,
        );
        return;
      }

      await this.processNode(startNode, nodes, edges, automation, payload, executionLog);
    } catch (error) {
      logger.error(`[WorkflowExecutionEngine] Error executing workflow ${automationId}`, error);
    }
  }

  private static async processNode(
    node: any,
    allNodes: any[],
    allEdges: any[],
    automation: any,
    payload: any,
    executionLog: any,
  ): Promise<void> {
    logger.info(`[WorkflowExecutionEngine] Processing Node ${node.id} (${node.type})`);

    const nodeEntryTime = new Date();
    let traceStatus: 'success' | 'failed' | 'skipped' | 'waiting' = 'success';
    let evaluatedEdge = undefined;
    let nodeError = undefined;

    let proceedToNext = true;
    let specificEdgesToFollow: string[] = [];

    switch (node.type) {
      case 'trigger':
        // Trigger just starts the flow
        break;

      case 'condition': {
        const { field, operator, value } = node.data || {};
        const payloadValue = payload[field];
        let isMatch = false;

        if (operator === 'eq') isMatch = payloadValue == value;
        if (operator === 'gt') isMatch = payloadValue > value;
        if (operator === 'lt') isMatch = payloadValue < value;

        // Find edges connected to true/false handles
        const sourceHandle = isMatch ? 'true' : 'false';
        const validEdges = allEdges.filter(
          (e) => e.source === node.id && e.sourceHandle === sourceHandle,
        );

        if (validEdges.length === 0) {
          proceedToNext = false; // Dead end
        } else {
          specificEdgesToFollow = validEdges.map((e) => e.target);
          evaluatedEdge = sourceHandle;
          proceedToNext = false; // We manually trigger the children
        }
        break;
      }

      case 'experiment': {
        const allocations = node.data?.allocations || []; // e.g., [{ edgeHandle: 'a', weight: 50 }, { edgeHandle: 'b', weight: 50 }]
        let selectedHandle = null;

        if (allocations.length > 0) {
          const rand = Math.random() * 100;
          let cumulative = 0;
          for (const alloc of allocations) {
            cumulative += Number(alloc.weight);
            if (rand <= cumulative) {
              selectedHandle = alloc.edgeHandle;
              break;
            }
          }
        }

        if (selectedHandle) {
          const expEdges = allEdges.filter(
            (e) => e.source === node.id && e.sourceHandle === selectedHandle,
          );
          if (expEdges.length > 0) {
            specificEdgesToFollow = expEdges.map((e) => e.target);
            evaluatedEdge = selectedHandle;
          }
        }
        proceedToNext = false; // Manually trigger children based on the statistical roll
        break;
      }

      case 'delay': {
        const delayMs = (node.data?.delayMinutes || 0) * 60 * 1000;
        // Find next nodes
        const nextEdges = allEdges.filter((e) => e.source === node.id);

        for (const edge of nextEdges) {
          // Re-queue the engine starting from the TARGET node after the delay
          await whatsappDispatchQueue.add(
            'execute-workflow-node',
            {
              automationId: automation._id.toString(),
              payload,
              currentNodeId: edge.target,
            },
            { delay: delayMs },
          );
        }
        traceStatus = 'waiting';
        logger.info(`[WorkflowExecutionEngine] Paused execution for ${node.data?.delayMinutes}m`);
        proceedToNext = false; // Stop current execution thread
        break;
      }

      case 'action_whatsapp':
        try {
          await this.executeWhatsAppAction(node, automation, payload);
        } catch (e: any) {
          traceStatus = 'failed';
          nodeError = e.message;
        }
        break;

      default:
        logger.warn(`[WorkflowExecutionEngine] Unknown node type: ${node.type}`);
        break;
    }

    if (executionLog) {
      executionLog.nodeTrace.push({
        nodeId: node.id,
        nodeType: node.type,
        status: traceStatus,
        evaluatedEdge,
        enteredAt: nodeEntryTime,
        exitedAt: new Date(),
        latencyMs: Date.now() - nodeEntryTime.getTime(),
        error: nodeError,
      });
      await executionLog.save();
    }

    // Standard progression if not blocked by delay or condition branching
    if (proceedToNext) {
      const outgoingEdges = allEdges.filter((e) => e.source === node.id);
      specificEdgesToFollow = outgoingEdges.map((e) => e.target);
    }

    // Traverse children
    for (const targetId of specificEdgesToFollow) {
      const targetNode = allNodes.find((n) => n.id === targetId);
      if (targetNode) {
        if (automation.executionState?.allowParallelBranching) {
          // Parallel execution
          this.processNode(targetNode, allNodes, allEdges, automation, payload, executionLog).catch(
            (err) => logger.error('Process Node execution error', err),
          );
        } else {
          // Sequential execution
          await this.processNode(targetNode, allNodes, allEdges, automation, payload, executionLog);
        }
      }
    }

    // Mark completed if no specificEdgesToFollow and not waiting for delay
    if (specificEdgesToFollow.length === 0 && traceStatus !== 'waiting' && executionLog) {
      executionLog.status = 'completed';
      executionLog.completionTimestamp = new Date();
      await executionLog.save();
    }
  }

  private static async executeWhatsAppAction(
    node: any,
    automation: any,
    payload: any,
  ): Promise<void> {
    const templateId = node.data?.templateId;
    const recipientPhone = payload.phone;

    if (!templateId || !recipientPhone) return;

    try {
      const template = await WhatsAppTemplateEngine.getTemplate(templateId);
      if (!template) return;

      const renderedMessage = await WhatsAppTemplateEngine.render(
        template,
        { customerStats: payload },
        [],
        [],
      );
      const provider = await SmartRouter.getRoute(node.data?.routingCategory || 'transactional');

      const response = await provider.sendTemplateMessage(
        recipientPhone,
        template.metaTemplateName,
        template.metaTemplateLanguage,
        [],
      );

      await WhatsAppMessageLog.create({
        messageId: uuidv4(),
        automationKey: automation.key,
        automationName: automation.name,
        recipientPhone,
        templateId: template._id,
        templateName: template.name,
        renderedMessage,
        deliveryStatus: response.success ? 'sent' : 'failed',
        apiProvider: provider.name,
        idempotencyKey: `wa:flow:${automation._id}:${node.id}:${recipientPhone}`,
        latencyMs: 100,
      });
    } catch (error) {
      logger.error(`[WorkflowExecutionEngine] Error executing WhatsApp Action`, error);
    }
  }
}
