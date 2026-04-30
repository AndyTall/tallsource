import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    type: z.enum(['editorial', 'announcement']),
    brands: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    published: z.date(),
    updated: z.date().optional(),
    author: z.string(),
    excerpt: z.string(),
  }),
});

export const collections = { blog };
