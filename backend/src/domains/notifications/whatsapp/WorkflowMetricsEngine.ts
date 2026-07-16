import WorkflowExecutionLog from '../../../models/WorkflowExecutionLog';
import mongoose from 'mongoose';

export class WorkflowMetricsEngine {
  /**
   * Generates a Funnel view for a specific Automation DAG.
   * Calculates how many executions hit each node and the average latency.
   */
  static async getFunnelAnalytics(automationId: string) {
    const objectId = new mongoose.Types.ObjectId(automationId);

    const pipeline = [
      { $match: { automationId: objectId } },
      { $unwind: '$nodeTrace' },
      {
        $group: {
          _id: {
            nodeId: '$nodeTrace.nodeId',
            nodeType: '$nodeTrace.nodeType',
            status: '$nodeTrace.status',
          },
          count: { $sum: 1 },
          avgLatencyMs: { $avg: '$nodeTrace.latencyMs' },
        },
      },
      {
        $group: {
          _id: '$_id.nodeId',
          nodeType: { $first: '$_id.nodeType' },
          totalHits: { $sum: '$count' },
          avgLatencyMs: { $avg: '$avgLatencyMs' },
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count',
            },
          },
        },
      },
    ];

    const results = await WorkflowExecutionLog.aggregate(pipeline);
    return results;
  }

  /**
   * Generates Executive KPI Metrics across all automations.
   */
  static async getExecutiveOverview() {
    const pipeline = [
      {
        $group: {
          _id: null,
          totalExecutions: { $sum: 1 },
          completedExecutions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          failedExecutions: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
          },
          pausedExecutions: {
            $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] },
          },
        },
      },
    ];

    const results = await WorkflowExecutionLog.aggregate(pipeline);
    if (results.length === 0) {
      return {
        totalExecutions: 0,
        completedExecutions: 0,
        failedExecutions: 0,
        pausedExecutions: 0,
        completionRate: 0,
      };
    }

    const data = results[0];
    const completionRate =
      data.totalExecutions > 0
        ? ((data.completedExecutions / data.totalExecutions) * 100).toFixed(1)
        : 0;

    return {
      ...data,
      completionRate: Number(completionRate),
    };
  }

  /**
   * Generates A/B Test analytics for a specific experiment node.
   */
  static async getExperimentAnalytics(automationId: string, experimentNodeId: string) {
    const objectId = new mongoose.Types.ObjectId(automationId);

    // This pipeline counts how many times the experiment node was hit,
    // and how many of those executions successfully reached a terminal state (or a downstream action).
    // For simplicity, we just count how many executions went down each edge, and how many of those were globally completed.
    const pipeline = [
      { $match: { automationId: objectId } },
      // Check if this execution hit the experiment node
      {
        $addFields: {
          experimentTrace: {
            $filter: {
              input: '$nodeTrace',
              as: 'trace',
              cond: { $eq: ['$$trace.nodeId', experimentNodeId] },
            },
          },
        },
      },
      { $match: { 'experimentTrace.0': { $exists: true } } },
      // Group by the evaluatedEdge of the experiment node
      {
        $group: {
          _id: { $arrayElemAt: ['$experimentTrace.evaluatedEdge', 0] },
          totalHits: { $sum: 1 },
          completedHits: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          edge: '$_id',
          totalHits: 1,
          completedHits: 1,
          conversionRate: {
            $cond: [
              { $gt: ['$totalHits', 0] },
              { $multiply: [{ $divide: ['$completedHits', '$totalHits'] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { edge: 1 } },
    ];

    const results = await WorkflowExecutionLog.aggregate(pipeline as any[]);

    // Calculate Winner logic (simplified Frequentist approach: highest conversion rate)
    let winner = null;
    if (results.length > 0) {
      const best = [...results].sort((a, b) => b.conversionRate - a.conversionRate)[0];
      // Only declare winner if statistically relevant sample size (mocked as > 50 hits)
      if (best.totalHits > 50) {
        winner = best.edge;
      }
    }

    return {
      experimentNodeId,
      branches: results,
      statisticalWinner: winner,
    };
  }
}
