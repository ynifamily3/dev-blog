import type { APIRoute } from 'astro';
import { getPublishedPosts, groupTags, postUrl, tagUrl } from '../lib/posts';
import { site } from '../site';

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character] ?? character);
}

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const paths = ['/', '/tags/', ...groupTags(posts).map(({ label }) => tagUrl(label))];
  const entries: { path: string; lastmod?: string }[] = [
    ...paths.map((path) => ({ path })),
    ...posts.map(({ data }) => ({
      path: postUrl(data),
      lastmod: (data.updatedAt ?? data.publishedAt).toISOString().slice(0, 10),
    })),
  ];
  const urls = entries.map(({ path, lastmod }) => {
    const loc = escapeXml(new URL(path, site.url).toString());
    return `<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
  }).join('');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
