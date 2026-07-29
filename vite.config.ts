import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || '')
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  // Caminho base configurado para suportar tanto domínio próprio/Hostinger quanto subcaminho do GitHub Pages
  base: process.env.VITE_BASE_PATH || '/',
});