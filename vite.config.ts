import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // MUDANÇA CRÍTICA PARA ESTRUTURA ESTÁTICA:
  // O uso de './' torna os caminhos dos assets relativos ao arquivo HTML atual.
  // Isso permite que o site funcione em QUALQUER pasta, subdomínio ou até localmente,
  // eliminando o erro de "Tela Branca" no GitHub Pages independentemente do nome do repo.
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Otimização para arquivos estáticos
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});