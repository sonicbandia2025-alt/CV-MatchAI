import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Mantém base relativa para funcionar em qualquer subpasta
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    // Removido manualChunks para evitar problemas de ordem de carregamento em conexões lentas ou estáticas
    // O Vite cuidará da divisão automática
  },
});