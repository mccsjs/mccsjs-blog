import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

const now = () => Date.now()

// ============ 用户 / 会话（自研鉴权，仅需 users + sessions） ============

export const users = sqliteTable(
  'user',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name'),
    email: text('email').unique(),
    emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
    image: text('image'),
    password: text('password'),
    createdAt: integer('created_at').notNull().$defaultFn(now),
    updatedAt: integer('updated_at').notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex('user_email_idx').on(t.email)]
)

export const sessions = sqliteTable(
  'session',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()), // 即 session token (randomUUID)
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: integer('created_at').notNull().$defaultFn(now),
  },
  (t) => [index('session_user_idx').on(t.userId)]
)

// ============ 文章相关 ============

export const posts = sqliteTable(
  'post',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    content: text('content').notNull(),
    excerpt: text('excerpt').notNull().default(''),
    coverImage: text('cover_image'),
    published: integer('published', { mode: 'boolean' }).default(false),
    views: integer('views').default(0),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    createdAt: integer('created_at').notNull().$defaultFn(now),
    updatedAt: integer('updated_at').notNull().$defaultFn(now),
  },
  (t) => [index('post_slug_idx').on(t.slug), index('post_category_idx').on(t.categoryId)]
)

export const categories = sqliteTable('category', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
})

export const tags = sqliteTable('tag', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
})

// 文章 <-> 标签 多对多关联表
export const postTags = sqliteTable(
  'post_tags',
  {
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] })]
)

export const comments = sqliteTable(
  'comment',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    author: text('author').notNull(),
    email: text('email').notNull(),
    website: text('website'),
    content: text('content').notNull(),
    ip: text('ip'),
    region: text('region'),
    os: text('os'),
    browser: text('browser'),
    parentId: text('parent_id'),
    likes: integer('likes').default(0),
    visible: integer('visible', { mode: 'boolean' }).default(true),
    isAdmin: integer('is_admin', { mode: 'boolean' }).default(false),
    createdAt: integer('created_at').notNull().$defaultFn(now),
  },
  (t) => [index('comment_post_idx').on(t.postId), index('comment_parent_idx').on(t.parentId)]
)

// ============ 站点设置 ============

export const siteSettings = sqliteTable(
  'site_setting',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    key: text('key').notNull().unique(),
    value: text('value').notNull(),
    createdAt: integer('created_at').notNull().$defaultFn(now),
    updatedAt: integer('updated_at').notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex('site_setting_key_idx').on(t.key)]
)

// ============ 菜单 ============

export const menus = sqliteTable(
  'menu',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    label: text('label').notNull(),
    href: text('href'),
    icon: text('icon'),
    type: text('type').notNull(),
    parentId: text('parent_id'),
    sortOrder: integer('sort_order').default(0),
    visible: integer('visible', { mode: 'boolean' }).default(true),
    target: text('target'),
    createdAt: integer('created_at').notNull().$defaultFn(now),
    updatedAt: integer('updated_at').notNull().$defaultFn(now),
  },
  (t) => [index('menu_type_idx').on(t.type), index('menu_parent_idx').on(t.parentId)]
)

// ============ 友链 ============

export const friendTypes = sqliteTable('friend_type', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  sort: integer('sort').default(0),
  isVisible: integer('is_visible', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at').notNull().$defaultFn(now),
  updatedAt: integer('updated_at').notNull().$defaultFn(now),
})

export const friends = sqliteTable(
  'friend',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    url: text('url').notNull(),
    description: text('description').default(''),
    avatar: text('avatar').default(''),
    screenshot: text('screenshot').default(''),
    sort: integer('sort').default(5),
    isInvalid: integer('is_invalid', { mode: 'boolean' }).default(false),
    recommended: integer('recommended', { mode: 'boolean' }).default(false),
    typeId: text('type_id'),
    accessible: integer('accessible').default(0),
    latency: integer('latency').default(0),
    rssUrl: text('rss_url'),
    rssLatime: integer('rss_latime'),
    createdAt: integer('created_at').notNull().$defaultFn(now),
    updatedAt: integer('updated_at').notNull().$defaultFn(now),
  },
  (t) => [index('friend_sort_idx').on(t.sort)]
)

export const rssArticles = sqliteTable(
  'rss_article',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    friendId: text('friend_id')
      .notNull()
      .references(() => friends.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    link: text('link').notNull().unique(),
    publishedAt: integer('published_at'),
    createdAt: integer('created_at').notNull().$defaultFn(now),
  },
  (t) => [index('rss_article_friend_idx').on(t.friendId), index('rss_article_published_idx').on(t.publishedAt)]
)

// ============ 访客日志 ============

export const visitorLogs = sqliteTable(
  'visitor_log',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    visitorId: text('visitor_id').notNull(),
    ip: text('ip'),
    page: text('page').notNull(),
    region: text('region'),
    os: text('os'),
    browser: text('browser'),
    referrer: text('referrer'),
    createdAt: integer('created_at').notNull().$defaultFn(now),
  },
  (t) => [
    index('visitor_log_visitor_idx').on(t.visitorId),
    index('visitor_log_page_idx').on(t.page),
    index('visitor_log_created_idx').on(t.createdAt),
  ]
)

// ============ 关系 ============

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  posts: many(posts),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  category: one(categories, { fields: [posts.categoryId], references: [categories.id] }),
  tags: many(postTags),
  comments: many(comments),
}))

export const categoriesRelations = relations(categories, ({ many }) => ({
  posts: many(posts),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  posts: many(postTags),
}))

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
  tag: one(tags, { fields: [postTags.tagId], references: [tags.id] }),
}))

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
}))

export const menusRelations = relations(menus, ({ one, many }) => ({
  parent: one(menus, { fields: [menus.parentId], references: [menus.id] }),
  children: many(menus),
}))

export const friendTypesRelations = relations(friendTypes, ({ many }) => ({
  friends: many(friends),
}))

export const friendsRelations = relations(friends, ({ one, many }) => ({
  type: one(friendTypes, { fields: [friends.typeId], references: [friendTypes.id] }),
  rssArticles: many(rssArticles),
}))

export const rssArticlesRelations = relations(rssArticles, ({ one }) => ({
  friend: one(friends, { fields: [rssArticles.friendId], references: [friends.id] }),
}))
