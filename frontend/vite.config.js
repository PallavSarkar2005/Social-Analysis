import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function manualChunks(id) {
  if (!id.includes('node_modules')) return;

  if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router')) {
    return 'vendor-react';
  }
  if (id.includes('@tanstack/react-query')) {
    return 'vendor-query';
  }
  if (id.includes('framer-motion')) {
    return 'vendor-motion';
  }
  if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) {
    return 'vendor-charts';
  }
  if (id.includes('axios') || id.includes('dayjs')) {
    return 'vendor-utils';
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    minify: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  server: {
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  preview: {
    headers: {
      'Cache-Control': 'public, max-age=600',
    },
  },
})
