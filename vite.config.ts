import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the API is reached through this proxy, so the browser sees one origin
// and the HttpOnly session cookie works without any cross-site configuration.
// In production vercel.json does the same job.
const api = process.env.VITE_DEV_API ?? 'http://localhost:5080';
const proxy = {
  '/api': { target: api, changeOrigin: false },
  '/media': { target: api, changeOrigin: false },
};

// "npm run preview" serves the production build with the same security policy as the live site,
// so anything the policy would block shows up before deploying.
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
  headers: { headers: { key: string; value: string }[] }[];
};
const policy = vercel.headers.flatMap((rule) => rule.headers).find((header) => header.key === 'Content-Security-Policy');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, proxy },
  preview: {
    port: 4173,
    proxy,
    headers: policy ? { [policy.key]: policy.value } : {},
  },
});
