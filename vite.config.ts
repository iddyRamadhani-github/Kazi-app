import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

// Automatically ensure the public directory and the social/metadata logo exist
try {
  const srcLogo = path.join(__dirname, 'src', 'assets', 'images', 'kazitz_logo_1781527950413.jpg');
  const publicDir = path.join(__dirname, 'public');
  const destLogo = path.join(publicDir, 'kazitz_logo.jpg');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  if (fs.existsSync(srcLogo)) {
    fs.copyFileSync(srcLogo, destLogo);
    console.log('✅ KaziTZ branding logo copied to public directory successfully.');
  }
} catch (err) {
  console.error('Error copying logo asset to public, continuing...', err);
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
