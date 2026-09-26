import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const identifier = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
  message: '소문자 영문, 숫자, 하이픈만 사용하세요.',
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/posts' }),
  schema: z.object({
    postId: identifier,
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    slug: identifier,
    aliases: z.array(identifier).default([]),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    tags: z.array(z.string().trim().min(1)).default([]),
    draft: z.boolean().default(true),
  }),
});

export const collections = { posts };
