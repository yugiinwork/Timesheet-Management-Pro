/// <reference types="node" />

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



import fs from 'fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      https: {
        key: fs.readFileSync('./key.pem'),
        cert: fs.readFileSync('./cert.pem'),
      },
      proxy: {
        '/api': {
          target: 'http://10.53.14.50:3001',
          changeOrigin: true,
          secure: false,
        }
      },
    },
    plugins: [
      react(),
      tailwindcss(),
    ],
    define: {
      'process.env.SERVER_URL': JSON.stringify(env.SERVER_URL),
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, '.'),
      }
    }
  };
});
