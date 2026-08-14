import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Porta dedicada deste projeto. Ha outros Vite nesta maquina ocupando
    // 5173-5176; strictPort faz o servidor FALHAR em vez de escorregar para a
    // proxima porta livre — assim o endereco e sempre o mesmo e voce nunca
    // abre o sistema errado por engano.
    port: 5190,
    strictPort: true,
    open: false,
  },
  build: {
    outDir: 'dist',
    // jspdf e firebase sao grandes; separa-los evita um bundle unico gigante
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          pdf: ['jspdf', 'jspdf-autotable'],
        },
      },
    },
  },
});
