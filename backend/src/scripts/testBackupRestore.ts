import fs from 'fs';
import path from 'path';

/**
 * Script to verify JSON backup integrity by checking if it parses successfully.
 */
export async function verifyBackup(backupDir: string): Promise<boolean> {
  console.log(`[VerifyRestore] Checking backups in ${backupDir}`);
  if (!fs.existsSync(backupDir)) {
    console.error(`[VerifyRestore] Directory not found: ${backupDir}`);
    return false;
  }

  const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    console.warn(`[VerifyRestore] No JSON backup files found in ${backupDir}`);
    return false;
  }

  let allValid = true;

  for (const file of files) {
    const filePath = path.join(backupDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      console.log(`[VerifyRestore] ✅ ${file} - Valid JSON (${data.length} records)`);
    } catch (err: any) {
      console.error(`[VerifyRestore] ❌ ${file} - Failed to parse: ${err.message}`);
      allValid = false;
    }
  }

  if (allValid) {
    console.log('[VerifyRestore] All backup files are structurally valid.');
  } else {
    console.error('[VerifyRestore] Some backup files are corrupted.');
  }

  return allValid;
}

if (require.main === module) {
  const targetDir = process.argv[2];
  if (!targetDir) {
    console.error('Usage: ts-node testBackupRestore.ts <path-to-backup-dir>');
    process.exit(1);
  }
  verifyBackup(targetDir).then((isValid) => {
    process.exit(isValid ? 0 : 1);
  });
}
