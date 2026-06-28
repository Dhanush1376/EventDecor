import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { BackupService } from '../services/backupService';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const testGithubBackup = async () => {
  console.log('Testing GitHub Offsite Backup Integration...');

  const owner = process.env.GITHUB_BACKUP_OWNER;
  const repo = process.env.GITHUB_BACKUP_REPO;
  const token = process.env.GITHUB_BACKUP_TOKEN;

  if (!owner || !repo || !token) {
    console.error('Missing GitHub credentials in .env file.');
    console.error('Make sure you have:');
    console.error('GITHUB_BACKUP_OWNER=your-username');
    console.error('GITHUB_BACKUP_REPO=your-private-repo-name');
    console.error('GITHUB_BACKUP_TOKEN=ghp_your_personal_access_token');
    process.exit(1);
  }

  try {
    const testUri = process.env.MONGO_URI!;
    await mongoose.connect(testUri);
    console.log('Connected to MongoDB');

    // Create a dummy JSON file to test the push logic without pulling real data
    const backupService = new BackupService();
    const tempDir = path.resolve(__dirname, '../../../backups/test');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    fs.writeFileSync(
      path.join(tempDir, 'test-connection.json'),
      JSON.stringify(
        { message: 'GitHub API Connection Successful', timestamp: new Date() },
        null,
        2,
      ),
    );

    console.log(`� Pushing test payload to GitHub (${owner}/${repo})...`);

    // We bypass createJsonBackup to just test the GitHub push logic directly
    await backupService.pushToGithub(tempDir, 'test');

    console.log(
      'Test complete. Check your GitHub repository for a "test"folder containing "test-connection.json".',
    );

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('GitHub Backup test failed:', error);
    process.exit(1);
  }
};

testGithubBackup();
