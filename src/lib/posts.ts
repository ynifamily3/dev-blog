import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

export function postUrl(post: Pick<Post['data'], 'postId' | 'slug'>): string {
  return `/posts/${post.postId}/${post.slug}/`;
}

export function tagSlug(tag: string): string {
  return tag
    .trim()
    .toLocaleLowerCase('ko')
    .replace(/\+/g, '-plus')
    .replace(/#/g, '-sharp')
    .replace(/&/g, '-and-')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function tagUrl(tag: string): string {
  return `/tags/${encodeURIComponent(tagSlug(tag))}/`;
}

export async function getAllPosts(): Promise<Post[]> {
  const posts = await getCollection('posts');
  const ids = new Set<string>();
  const paths = new Set<string>();

  for (const post of posts) {
    const { postId, slug, aliases, tags, publishedAt, updatedAt } = post.data;

    if (ids.has(postId)) throw new Error(`중복 postId: ${postId}`);
    ids.add(postId);

    if (updatedAt && updatedAt < publishedAt) {
      throw new Error(`${postId}: updatedAt은 publishedAt보다 빠를 수 없습니다.`);
    }

    for (const path of [slug, ...aliases]) {
      if (paths.has(`${postId}/${path}`)) {
        throw new Error(`${postId}: 중복 slug 또는 alias: ${path}`);
      }
      paths.add(`${postId}/${path}`);
    }

    for (const tag of tags) {
      if (!tagSlug(tag)) throw new Error(`${postId}: URL로 만들 수 없는 태그: ${tag}`);
    }
  }

  return posts.sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
}

export async function getPublishedPosts(): Promise<Post[]> {
  return (await getAllPosts()).filter(({ data }) => !data.draft);
}

export type TagGroup = { slug: string; label: string; posts: Post[] };

export function groupTags(posts: Post[]): TagGroup[] {
  const groups = new Map<string, TagGroup>();

  for (const post of posts) {
    for (const label of post.data.tags) {
      const slug = tagSlug(label);
      const group = groups.get(slug) ?? { slug, label, posts: [] };
      if (group.label.toLocaleLowerCase('ko') !== label.toLocaleLowerCase('ko')) {
        throw new Error(`태그 URL 충돌: "${group.label}" / "${label}"`);
      }
      if (!group.posts.includes(post)) group.posts.push(post);
      groups.set(slug, group);
    }
  }

  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, 'ko'));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  }).format(date);
}
