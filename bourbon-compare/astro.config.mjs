import { defineConfig } from 'astro/config';

// Served from rawkrabbit.com/bourboncompare/. The main site's build copies this
// project's dist/ into its own dist/bourboncompare/, so it deploys with everything else.
export default defineConfig({
  site: 'https://rawkrabbit.com',
  base: '/bourboncompare',
  build: { format: 'directory' },
});
