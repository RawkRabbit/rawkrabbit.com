import { defineConfig } from 'astro/config';

// Served from rawkrabbit.com/bourbon/. The main site's build copies this
// project's dist/ into its own dist/bourbon/, so it deploys with everything else.
export default defineConfig({
  site: 'https://rawkrabbit.com',
  base: '/bourbon',
  build: { format: 'directory' },
});
