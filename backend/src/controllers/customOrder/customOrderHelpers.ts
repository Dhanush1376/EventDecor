export const createStatusHistoryEntry = (
  from: string,
  to: string,
  changedBy: string,
  note?: string,
) => ({
  from,
  to,
  changedBy,
  changedAt: new Date(),
  note,
});

export const createVersionSnapshot = (
  order: any,
  snapshotType: 'quotation' | 'requirements' | 'files' | 'status' | 'full',
  createdBy: string,
) => {
  const version = (order.versions?.length || 0) + 1;
  let data: Record<string, unknown> = {};

  switch (snapshotType) {
    case 'quotation':
      data = { quotation: order.quotation?.toObject?.() || order.quotation };
      break;
    case 'requirements':
      data = {
        customRequirements: order.customRequirements,
        customizationData: order.customizationData,
      };
      break;
    case 'files':
      data = {
        files: order.files,
        referenceImages: order.referenceImages,
        voiceNotes: order.voiceNotes,
        videoReferences: order.videoReferences,
      };
      break;
    case 'status':
      data = { status: order.status, priority: order.priority };
      break;
    case 'full':
      data = order.toObject ? order.toObject() : order;
      break;
  }

  return { version, snapshotType, data, createdBy, createdAt: new Date() };
};
