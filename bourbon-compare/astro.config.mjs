import { defineConfig } from 'astro/config';

// Served at rawkrabbit.com/bourboncompare/. Vercel builds this folder (`npm run build:vercel`,
// which nests the output under /bourboncompare) and Cloudflare forwards that path to it.
export default defineConfig({
  site: 'https://rawkrabbit.com',
  base: '/bourboncompare',
  build: { format: 'directory' },
});
