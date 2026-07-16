import { randomUUID as uuidv4 } from 'crypto';
import WhatsAppReadinessAssessment, {
  IAssessmentFinding,
} from '../../../models/WhatsAppReadinessAssessment';
import WhatsAppProviderConfig from '../../../models/WhatsAppProviderConfig';
import WhatsAppAutomation from '../../../models/WhatsAppAutomation';
import WhatsAppRole from '../../../models/WhatsAppRole';
import logger from '../../../config/logger';
import * as fs from 'fs';
import * as path from 'path';

export class ProductionCertificationEngine {
  private findings: IAssessmentFinding[] = [];

  constructor() {}

  /**
   * Main entry point to run the full certification suite
   */
  public async generateFullAssessment() {
    logger.info('[ProductionCertificationEngine] Starting Full Production Readiness Assessment...');
    this.findings = [];

    await this.runArchitectureCertification();
    await this.runSecurityCertification();
    await this.runPerformanceCertification();
    await this.runDisasterRecoveryCertification();
    await this.runOperationalReadinessCertification();
    await this.runDocumentationCertification();

    const riskScores = this.calculateRiskScores();

    // Overall score is an average of risk categories, mapped 0-100 (where 100 is lowest risk/best readiness)
    const overallScore = Math.round(
      (riskScores.operational +
        riskScores.security +
        riskScores.reliability +
        riskScores.scalability +
        riskScores.maintainability) /
        5,
    );

    // Passed if no Critical findings and overall score > 70
    const hasCritical = this.findings.some((f) => f.severity === 'Critical');
    const isPassed = !hasCritical && overallScore >= 70;

    const assessment = await WhatsAppReadinessAssessment.create({
      assessmentId: `assmnt_${Date.now()}_${uuidv4().substring(0, 6)}`,
      overallScore,
      riskScores,
      findings: this.findings,
      isPassed,
    });

    return assessment;
  }

  private addFinding(
    finding: Omit<IAssessmentFinding, 'confidence'> & { confidence?: 'High' | 'Medium' | 'Low' },
  ) {
    this.findings.push({
      ...finding,
      confidence: finding.confidence || 'High',
    });
  }

  // Phase 1: Architecture
  private async runArchitectureCertification() {
    const automations = await WhatsAppAutomation.find({ isActive: true });

    if (automations.length === 0) {
      this.addFinding({
        phase: 'Architecture',
        category: 'architecture',
        severity: 'Medium',
        evidence: 'No active WhatsApp Automations found in the database.',
        rootCause: 'System has not been fully configured for automated routing.',
        remediation: 'Create and activate at least one automation workflow.',
        sourceType: 'Configuration Validation',
      });
    } else {
      this.addFinding({
        phase: 'Architecture',
        category: 'architecture',
        severity: 'Pass',
        evidence: `${automations.length} active automations detected.`,
        sourceType: 'Configuration Validation',
      });
    }

    // Check DAG nodes for unknown types (simulated static check)
    let unknownNodes = 0;
    for (const auto of automations) {
      for (const node of auto.nodes) {
        if (
          !['trigger', 'condition', 'delay', 'action', 'experiment'].includes(node.type) &&
          !node.id.startsWith('experiment')
        ) {
          unknownNodes++;
        }
      }
    }
    if (unknownNodes > 0) {
      this.addFinding({
        phase: 'Architecture',
        category: 'architecture',
        severity: 'High',
        evidence: `Found ${unknownNodes} unknown node types in active workflows.`,
        remediation: 'Update WorkflowExecutionEngine to support all deployed node types.',
        sourceType: 'Runtime Validation',
      });
    }
  }

  // Phase 2: Security
  private async runSecurityCertification() {
    const roles = await WhatsAppRole.find({});
    if (roles.length === 0) {
      this.addFinding({
        phase: 'Security',
        category: 'security',
        severity: 'Critical',
        evidence: 'No RBAC roles defined for WhatsApp module.',
        rootCause: 'RBAC system is uninitialized, potentially allowing default open access.',
        remediation: 'Run RBAC initialization scripts to create Admin and Manager roles.',
        sourceType: 'Configuration Validation',
      });
    } else {
      this.addFinding({
        phase: 'Security',
        category: 'security',
        severity: 'Pass',
        evidence: `Found ${roles.length} RBAC roles enforcing access control.`,
        sourceType: 'Configuration Validation',
      });
    }

    // Check Four-Eyes Principle (At least one role requires approval for execution)
    const fourEyesEnforced = roles.some(
      (r) => r.requiresApprovalFor && r.requiresApprovalFor.length > 0,
    );
    if (!fourEyesEnforced) {
      this.addFinding({
        phase: 'Security',
        category: 'security',
        severity: 'High',
        evidence: 'No roles have the Four-Eyes principle configured for high-risk actions.',
        remediation:
          'Update role configurations to require approval for campaigns:execute or tools:execute.',
        sourceType: 'Configuration Validation',
      });
    }
  }

  // Phase 3: Performance & Load
  private async runPerformanceCertification() {
    // Check Queue Configuration (simulated env check)
    if (!process.env.REDIS_URL && process.env.REQUIRE_REDIS !== 'false') {
      this.addFinding({
        phase: 'Performance',
        category: 'scalability',
        severity: 'High',
        evidence: 'REDIS_URL is not defined and REQUIRE_REDIS is not false.',
        rootCause: 'System will default to in-memory queues which cannot scale horizontally.',
        remediation: 'Provision a Redis cluster and configure REDIS_URL.',
        sourceType: 'Configuration Validation',
      });
    } else {
      this.addFinding({
        phase: 'Performance',
        category: 'scalability',
        severity: 'Pass',
        evidence: 'Queue engine configuration is valid.',
        sourceType: 'Configuration Validation',
      });
    }
  }

  // Phase 4: Disaster Recovery
  private async runDisasterRecoveryCertification() {
    const providers = await WhatsAppProviderConfig.find({ isEnabled: true });
    if (providers.length < 2) {
      this.addFinding({
        phase: 'Disaster Recovery',
        category: 'reliability',
        severity: 'Medium',
        evidence: `Only ${providers.length} provider(s) active.`,
        rootCause: 'Lack of provider redundancy.',
        remediation:
          'Configure at least one backup provider (e.g. Twilio + Gupshup) for circuit breaker failover.',
        sourceType: 'Configuration Validation',
      });
    } else {
      this.addFinding({
        phase: 'Disaster Recovery',
        category: 'reliability',
        severity: 'Pass',
        evidence: 'Multiple messaging providers configured for redundancy.',
        sourceType: 'Configuration Validation',
      });
    }
  }

  // Phase 5: Operational Readiness
  private async runOperationalReadinessCertification() {
    const requiredEnv = ['JWT_SECRET', 'MONGO_URI', 'WHATSAPP_PROVIDER'];
    const missing = requiredEnv.filter((e) => !process.env[e]);

    if (missing.length > 0) {
      this.addFinding({
        phase: 'Operational Readiness',
        category: 'operational',
        severity: 'Critical',
        evidence: `Missing critical environment variables: ${missing.join(', ')}`,
        remediation: 'Update production environment configuration.',
        sourceType: 'Configuration Validation',
      });
    } else {
      this.addFinding({
        phase: 'Operational Readiness',
        category: 'operational',
        severity: 'Pass',
        evidence: 'All core environment variables are present.',
        sourceType: 'Configuration Validation',
      });
    }
  }

  // Phase 6: Documentation
  private async runDocumentationCertification() {
    const docsPath = path.join(process.cwd(), 'docs');
    const hasDocs = fs.existsSync(docsPath);

    if (!hasDocs) {
      this.addFinding({
        phase: 'Documentation',
        category: 'documentation',
        severity: 'Low',
        evidence: 'No /docs folder found in the project root.',
        remediation: 'Create runbooks and architectural documentation for operational support.',
        sourceType: 'Static Analysis',
      });
    } else {
      this.addFinding({
        phase: 'Documentation',
        category: 'documentation',
        severity: 'Pass',
        evidence: 'Documentation directory is present.',
        sourceType: 'Static Analysis',
      });
    }
  }

  private calculateRiskScores() {
    // Start at 100, deduct based on severity. Critical=30, High=15, Medium=5, Low=1
    const scores = {
      operational: 100,
      security: 100,
      reliability: 100,
      scalability: 100,
      maintainability: 100, // documentation impacts this
    };

    const deductions = { Critical: 30, High: 15, Medium: 5, Low: 1, Pass: 0 };

    this.findings.forEach((f) => {
      const deduction = deductions[f.severity] || 0;
      if (f.category === 'architecture') scores.maintainability -= deduction;
      if (f.category === 'security') scores.security -= deduction;
      if (f.category === 'performance' || f.category === 'scalability')
        scores.scalability -= deduction;
      if (f.category === 'reliability') scores.reliability -= deduction;
      if (f.category === 'operational') scores.operational -= deduction;
      if (f.category === 'documentation') scores.maintainability -= deduction;
    });

    // Ensure floor of 0
    return {
      operational: Math.max(0, scores.operational),
      security: Math.max(0, scores.security),
      reliability: Math.max(0, scores.reliability),
      scalability: Math.max(0, scores.scalability),
      maintainability: Math.max(0, scores.maintainability),
    };
  }
}
