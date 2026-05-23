import { execSync } from 'child_process';

if (process.env.VERCEL === '1') {
  console.log('Skipping react-snap during Vercel build because the build environment lacks Chromium shared libraries (libnss3.so).');
  console.log('If you need SEO pre-rendering on Vercel, consider using a Vercel-native solution like Next.js or an external prerendering service.');
} else {
  console.log('Running react-snap...');
  execSync('react-snap', { stdio: 'inherit' });
}
