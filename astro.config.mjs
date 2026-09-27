import { defineConfig } from 'astro/config';
import { unified, rehypeHeadingIds } from '@astrojs/markdown-remark';
import remarkDirective from 'remark-directive';
import { remarkDocument, rehypeDocument } from './src/markdown/document.mjs';

export default defineConfig({
  site: 'https://blog.miel.ing',
  output: 'static',
  image: {
    layout: 'constrained',
    responsiveStyles: true,
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkDirective, remarkDocument],
      rehypePlugins: [rehypeHeadingIds, rehypeDocument],
      remarkRehype: {
        footnoteLabel: '각주',
        footnoteLabelProperties: { className: ['footnote-heading'] },
        footnoteBackLabel: (referenceIndex, rereferenceIndex) =>
          `본문의 각주 ${referenceIndex + 1}${rereferenceIndex > 1 ? `-${rereferenceIndex}` : ''}로 돌아가기`,
      },
    }),
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
