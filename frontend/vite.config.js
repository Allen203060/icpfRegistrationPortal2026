import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendPort = env.BACKEND_PORT || process.env.BACKEND_PORT || '5000';
  const target = env.BACKEND_URL || process.env.BACKEND_URL || `http://localhost:${backendPort}`;
  const frontendPort = parseInt(env.PORT || process.env.PORT || '5173', 10);

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            three: ['three'],
            lucide: ['lucide-react'],
          }
        }
      }
    },
    server: {
      port: frontendPort,
      proxy: {
        '/api': {
          target,
          changeOrigin: true
        }
      }
    }
  };
});

