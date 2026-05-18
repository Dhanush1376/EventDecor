const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('📦 Installing frontend dependencies...');
  execSync('npm install', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });

  console.log('🚀 Building frontend static assets...');
  execSync('npm run build', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });

  console.log('🧹 Preparing root deployment directory...');
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
  }

  // Move frontend/dist to root/dist
  fs.renameSync(path.join(__dirname, 'frontend', 'dist'), distPath);

  // Copy frontend/vercel.json to root/vercel.json
  const vercelConfigSrc = path.join(__dirname, 'frontend', 'vercel.json');
  const vercelConfigDst = path.join(__dirname, 'vercel.json');
  if (fs.existsSync(vercelConfigSrc)) {
    fs.copyFileSync(vercelConfigSrc, vercelConfigDst);
    console.log('📄 Copied vercel.json configuration to root for routing.');
  }

  console.log('✨ Build completed successfully for Vercel deployment!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
