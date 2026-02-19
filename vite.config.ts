import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // CRUCIAL PARA GITHUB PAGES:
  // 'base: "./"' garante que os assets (JS/CSS) sejam linkados relativamente.
  // Isso permite que o site funcione em https://usuario.github.io/nome-do-repo/ sem erros 404.
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Desabilitado para economizar banda e ocultar código fonte original
    minify: 'esbuild', // Minificação rápida e eficiente
    rollupOptions: {
      output: {
        // Separa bibliotecas grandes em arquivos diferentes para carregamento mais rápido (Cache)
        manualChunks: {
          vendor: ['react', 'react-dom', 'recharts'],
          pdf: ['pdfjs-dist'],
          ai: ['@google/genai']
        },
      },
    },
  },
});