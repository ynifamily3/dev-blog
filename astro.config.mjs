import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://blog.miel.ing',
  output: 'static',
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
