import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getPublishedPosts, postUrl } from '../lib/posts';
import { site } from '../site';

export const GET: APIRoute = async (context) => {
  const posts = await getPublishedPosts();

  return rss({
    title: site.title,
    description: site.description,
    site: context.site ?? site.url,
    items: posts.map(({ data }) => ({
      title: data.title,
      description: data.description,
      pubDate: data.publishedAt,
      link: postUrl(data),
    })),
    customData: '<language>ko</language>',
  });
};
