import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    date: z.string(),
    fl: z.string().optional(),
    tags: z.array(z.string()).default([]),
    zy: z.string().default(''),
    fm: z.string().default(''),
    zz: z.string().default(''),
    cg: z.boolean().default(false),
    hide: z.boolean().default(false),
  }),
});

export const collections = { posts };
