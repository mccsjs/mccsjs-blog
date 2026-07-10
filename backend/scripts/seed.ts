import { prisma } from '../src/db';

/**
 * Seed sample blog content for development/demo.
 *
 * NOTE: This creates a non-login "system" author so sample posts satisfy the
 * required author relation. To create an admin user, start the backend and
 * use the admin panel login page to sign up (or call /api/auth/sign-up/email).
 */
async function seed() {
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@example.com' },
    update: {},
    create: {
      email: 'system@example.com',
      name: 'System',
    },
  });

  const category = await prisma.category.upsert({
    where: { slug: 'tech' },
    update: {},
    create: {
      name: '技术',
      slug: 'tech',
    },
  });

  const tag = await prisma.tag.upsert({
    where: { slug: 'astro' },
    update: {},
    create: {
      name: 'Astro',
      slug: 'astro',
    },
  });

  await prisma.post.upsert({
    where: { slug: 'hello-world' },
    update: {},
    create: {
      title: 'Hello World',
      slug: 'hello-world',
      excerpt: '欢迎来到我们的博客，这是一篇示例文章。',
      content:
        '<p>欢迎来到我们的博客！这是一篇使用 <strong>Astro + React + Tailwind CSS</strong> 构建的示例文章。</p><p>后端使用 Elysia 与 Prisma，内容来自 TipTap 编辑器。</p><h2>特性</h2><ul><li>响应式设计</li><li>服务端数据获取</li><li>评论系统</li></ul><blockquote><p>愿代码与你同在。</p></blockquote>',
      published: true,
      views: 42,
      authorId: systemUser.id,
      categoryId: category.id,
      tags: { connect: { id: tag.id } },
    },
  });

  await prisma.post.upsert({
    where: { slug: 'second-post' },
    update: {},
    create: {
      title: '第二篇文章',
      slug: 'second-post',
      excerpt: '这是另一篇示例文章，用于测试列表和详情页。',
      content:
        '<p>这是第二篇文章的内容。</p><p>你可以在这里看到分类、标签、阅读数等元信息的展示。</p>',
      published: true,
      views: 18,
      authorId: systemUser.id,
      categoryId: category.id,
      tags: { connect: { id: tag.id } },
    },
  });

  console.log('Seeded sample posts successfully.');
  console.log('Create an admin account via the admin login page sign-up form.');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
