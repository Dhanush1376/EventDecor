const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('📦 Installing frontend dependencies...');
  execSync('npm install', { 
    cwd: path.join(__dirname, 'frontend'), 
    stdio: 'inherit',
    env: { ...process.env, CI: 'false' }
  });

  console.log('🚀 Building frontend static assets...');
  execSync('npm run build', { 
    cwd: path.join(__dirname, 'frontend'), 
    stdio: 'inherit',
    env: { ...process.env, CI: 'false' }
  });

  console.log('🧹 Preparing root deployment directory...');
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
  }

  // Copy frontend/dist to root/dist using cpSync to satisfy both root dist and frontend/dist expectations
  console.log('🚚 Copying build assets to root...');
  fs.cpSync(path.join(__dirname, 'frontend', 'dist'), distPath, { recursive: true });
  
  console.log('ℹ️ Retaining frontend/dist folder for Vercel output directory fallback.');

  // Copy frontend/vercel.json to root/vercel.json
  const vercelConfigSrc = path.join(__dirname, 'frontend', 'vercel.json');
  const vercelConfigDst = path.join(__dirname, 'vercel.json');
  if (fs.existsSync(vercelConfigSrc)) {
    fs.copyFileSync(vercelConfigSrc, vercelConfigDst);
    console.log('📄 Copied vercel.json configuration to root for routing.');
  }

  console.log('✨ Build completed successfully for Vercel deployment!');
} catch (error) {
  console.error('❌ Build failed with error:', error);
  if (error.stdout) console.error('stdout:', error.stdout.toString());
  if (error.stderr) console.error('stderr:', error.stderr.toString());
  process.exit(1);
}
