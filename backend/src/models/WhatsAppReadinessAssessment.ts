import mongoose, { Schema, Document } from 'mongoose';

export interface IAssessmentFinding {
  phase: string;
  category:
    | 'architecture'
    | 'security'
    | 'performance'
    | 'reliability'
    | 'scalability'
    | 'maintainability'
    | 'documentation'
    | 'operational';
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Pass';
  confidence: 'High' | 'Medium' | 'Low';
  evidence: string;
  rootCause?: string;
  remediation?: string;
  sourceType: 'Static Analysis' | 'Runtime Validation' | 'Configuration Validation' | 'Heuristic';
}

export interface IWhatsAppReadinessAssessment extends Document {
  assessmentId: string;
  executedAt: Date;
  overallScore: number;
  riskScores: {
    operational: number;
    security: number;
    reliability: number;
    scalability: number;
    maintainability: number;
  };
  findings: IAssessmentFinding[];
  isPassed: boolean;
}

const AssessmentFindingSchema = new Schema(
  {
    phase: { type: String, required: true },
    category: { type: String, required: true },
    severity: { type: String, required: true },
    confidence: { type: String, required: true },
    evidence: { type: String, required: true },
    rootCause: { type: String },
    remediation: { type: String },
    sourceType: { type: String, required: true },
  },
  { _id: false },
);

const WhatsAppReadinessAssessmentSchema = new Schema(
  {
    assessmentId: { type: String, required: true, unique: true },
    executedAt: { type: Date, default: Date.now },
    overallScore: { type: Number, required: true },
    riskScores: {
      operational: { type: Number, required: true },
      security: { type: Number, required: true },
      reliability: { type: Number, required: true },
      scalability: { type: Number, required: true },
      maintainability: { type: Number, required: true },
    },
    findings: [AssessmentFindingSchema],
    isPassed: { type: Boolean, required: true },
  },
  { timestamps: true },
);

export default mongoose.models.WhatsAppReadinessAssessment ||
  mongoose.model<IWhatsAppReadinessAssessment>(
    'WhatsAppReadinessAssessment',
    WhatsAppReadinessAssessmentSchema,
  );
