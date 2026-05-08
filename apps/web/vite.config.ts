import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (normalized.includes('/src/features/ai-brew/')) {
            if (normalized.includes('/src/features/ai-brew/AiBrewPanel.tsx')) return;
            if (
              normalized.includes('/planner') ||
              normalized.includes('/beanPlanner') ||
              normalized.includes('/waterPlanner') ||
              normalized.includes('/grindPlanner') ||
              normalized.includes('/stepPlanner') ||
              normalized.includes('/workflowGuide') ||
              normalized.includes('/cupProfile') ||
              normalized.includes('/plannerCalibration') ||
              normalized.includes('/optimizerGuard')
            ) {
              return 'ai-brew-core';
            }
            if (
              normalized.includes('/catalog') ||
              normalized.includes('/catalogTrust') ||
              normalized.includes('/localization') ||
              normalized.includes('/experience') ||
              normalized.includes('/coachGuard') ||
              normalized.includes('/antiHallucination') ||
              normalized.includes('/coachNotes')
            ) {
              return 'ai-brew-support';
            }
          }
          if (!id.includes('node_modules')) return;
          if (
            id.includes('/react/') ||
            id.includes('\\react\\') ||
            id.includes('/react-dom/') ||
            id.includes('\\react-dom\\') ||
            id.includes('/react-router-dom/') ||
            id.includes('\\react-router-dom\\')
          ) {
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
    },
  },
});
