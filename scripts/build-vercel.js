const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Installing frontend dependencies...');
  execSync('npm install', { 
    cwd: path.join(__dirname, 'frontend'), 
    stdio: 'inherit',
    env: { ...process.env, CI: 'false' }
  });

  console.log('Building frontend static assets...');
  execSync('npm run build', { 
    cwd: path.join(__dirname, 'frontend'), 
    stdio: 'inherit',
    env: { ...process.env, CI: 'false' }
  });

  console.log('Preparing root deployment directory...');
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
  }

  // Copy frontend/dist to root/dist using cpSync to satisfy both root dist and frontend/dist expectations
  console.log('Copying build assets to root...');
  fs.cpSync(path.join(__dirname, 'frontend', 'dist'), distPath, { recursive: true });
  
  console.log('Retaining frontend/dist folder for Vercel output directory fallback.');

  // Vercel project uses Root Directory = frontend; keep vercel.json only in frontend/
  const legacyRootVercel = path.join(__dirname, 'vercel.json');
  if (fs.existsSync(legacyRootVercel)) {
    fs.unlinkSync(legacyRootVercel);
    console.log('Removed legacy root vercel.json (frontend/vercel.json is canonical).');
  }

  console.log('Build completed successfully for Vercel deployment!');
} catch (error) {
  console.error('Build failed with error:', error);
  if (error.stdout) console.error('stdout:', error.stdout.toString());
  if (error.stderr) console.error('stderr:', error.stderr.toString());
  process.exit(1);
}
