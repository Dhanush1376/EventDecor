import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import logger from './logger';

const MAX_LOG_SIZE_MB = 50;
const MAX_LOG_FILES = 5;

const getLogFilePath = (index: number = 0) => {
  const baseDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return index === 0
    ? path.join(baseDir, 'forensic.log')
    : path.join(baseDir, `forensic.${index}.log`);
};

const rotateLogs = () => {
  try {
    const mainLogPath = getLogFilePath(0);
    if (!fs.existsSync(mainLogPath)) return;

    const stats = fs.statSync(mainLogPath);
    const sizeInMB = stats.size / (1024 * 1024);

    if (sizeInMB > MAX_LOG_SIZE_MB) {
      // Shift older logs
      for (let i = MAX_LOG_FILES - 1; i > 0; i--) {
        const oldFile = getLogFilePath(i);
        const newFile = getLogFilePath(i + 1);
        if (fs.existsSync(oldFile)) {
          if (i === MAX_LOG_FILES - 1) {
            fs.unlinkSync(oldFile); // Delete oldest
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }
      // Move current to .1
      fs.renameSync(mainLogPath, getLogFilePath(1));
    }
  } catch (err) {
    logger.error('Failed to rotate forensic logs', err);
  }
};

export const writeForensicLog = (data: any) => {
  try {
    rotateLogs();
    const logPath = getLogFilePath(0);
    const logEntry = `[${new Date().toISOString()}] FORENSIC DELETE EVENT:\n${JSON.stringify(data, null, 2)}\n\n`;
    fs.appendFileSync(logPath, logEntry);
  } catch (err) {
    logger.error('Failed to write forensic log', err);
  }
};

export const startDbAuditor = () => {
  try {
    if (!mongoose.connection || !mongoose.connection.db) {
      logger.error('[DB AUDITOR] Cannot start. No active database connection.');
      return;
    }

    const changeStream = mongoose.connection.db.watch([], { fullDocument: 'default' });

    changeStream.on('change', (change) => {
      if (
        change.operationType === 'delete' ||
        change.operationType === 'drop' ||
        change.operationType === 'dropDatabase'
      ) {
        const auditData = {
          source: 'MongoDB Change Stream',
          operationType: change.operationType,
          namespace: change.ns,
          documentKey: (change as any).documentKey,
          processId: process.pid,
        };
        writeForensicLog(auditData);
      }
    });

    changeStream.on('error', (err) => {
      logger.error(`[DB AUDITOR] Change stream error: ${err.message}`);
    });

    logger.info('� [DB AUDITOR] Forensic Change Stream Watcher started.');
  } catch (err: any) {
    logger.error(`[DB AUDITOR] Failed to start change stream: ${err.message}`);
  }
};
