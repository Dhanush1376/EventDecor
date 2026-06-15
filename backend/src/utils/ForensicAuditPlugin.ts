import { Schema } from 'mongoose';
import fs from 'fs';
import path from 'path';

const getLogPath = () => {
  const dateStr = new Date().toISOString().split('T')[0];
  return path.resolve(__dirname, `../../../logs/forensic-${dateStr}.log`);
};

const writeForensicLog = (data: any) => {
  try {
    const logPath = getLogPath();
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logEntry = `[${new Date().toISOString()}] FORENSIC EVENT:\n${JSON.stringify(data, null, 2)}\n\n`;
    fs.appendFileSync(logPath, logEntry);
  } catch (err) {
    console.error('Failed to write forensic log', err);
  }
};

const getStackTrace = () => {
  const stack = new Error().stack || '';
  const cleanStack = stack.split('\n').slice(3).join('\n');
  return cleanStack;
};

const extractContext = (options: any) => ({
  user: options?.user || 'Unknown',
  ip: options?.ip || 'Unknown',
  requestId: options?.requestId || 'Unknown',
});

const ForensicAuditPlugin = (schema: Schema) => {
  const deleteMethods = ['deleteOne', 'deleteMany', 'findOneAndDelete', 'remove'];
  const updateMethods = ['updateOne', 'updateMany', 'findOneAndUpdate'];

  // Track Deletes
  deleteMethods.forEach((method) => {
    schema.pre(method as any, async function (this: any) {
      const collectionName =
        this.model?.collection?.collectionName || this.collection?.collectionName || 'Unknown';
      const filter = this.getFilter ? this.getFilter() : this._conditions || {};

      const auditData = {
        operation: method,
        collection: collectionName,
        filter: filter,
        stackTrace: getStackTrace(),
        processId: process.pid,
        ...extractContext(
          typeof (this as any).getOptions === 'function'
            ? (this as any).getOptions()
            : (this as any).options,
        ),
      };

      writeForensicLog(auditData);
    });
  });

  // Track Updates
  updateMethods.forEach((method) => {
    schema.pre(method as any, async function (this: any) {
      const collectionName =
        this.model?.collection?.collectionName || this.collection?.collectionName || 'Unknown';
      const filter = this.getFilter ? this.getFilter() : this._conditions || {};
      const update = this.getUpdate ? this.getUpdate() : {};

      const auditData = {
        operation: method,
        collection: collectionName,
        filter: filter,
        updatePayload: update,
        stackTrace: getStackTrace(),
        processId: process.pid,
        ...extractContext(
          typeof (this as any).getOptions === 'function'
            ? (this as any).getOptions()
            : (this as any).options,
        ),
      };

      writeForensicLog(auditData);
    });
  });

  // Track Creates
  schema.pre('save', async function (this: any) {
    if (this.isNew) {
      const collectionName = this.collection?.collectionName || 'Unknown';
      const auditData = {
        operation: 'create',
        collection: collectionName,
        documentId: this._id,
        stackTrace: getStackTrace(),
        processId: process.pid,
        ...extractContext((this as any).$locals || {}),
      };
      writeForensicLog(auditData);
    }
  });
};

export default ForensicAuditPlugin;
