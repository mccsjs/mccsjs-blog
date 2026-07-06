import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { prisma } from './db';
import { auth } from './auth';
import { withRequestId, logger } from './utils/logger';

// 路由模块
import { registerPostRoutes } from './routes/posts';
import { registerCategoryRoutes } from './routes/categories';
import { registerTagRoutes } from './routes/tags';
import { registerCommentRoutes } from './routes/comments';
import { registerSettingsRoutes } from './routes/settings';
import { registerMenuRoutes } from './routes/menus';
import { registerVisitorLogRoutes } from './routes/visitor-logs';
import { registerUploadRoutes } from './routes/upload';
import { registerFriendRoutes } from './routes/friends';
import { registerFriendCheckRoutes, scheduleFriendAutoCheck } from './routes/friends/check';
import { registerRssRoutes, scheduleRssRefresh } from './routes/friends/rss';

// Seed 函数
import { seedDefaultMenus, seedDefaultAggregateMenus, seedDefaultFriends } from './seed';

const app = new Elysia()
  .use(withRequestId)
  .use(cors())
  .use(staticPlugin({ assets: 'uploads', prefix: 'uploads' }))
  .get('/', () => ({ status: 'ok', service: 'elysiajs-blog' }))
  .get('/health', () => ({ status: 'ok' }));

// 注册所有路由
registerPostRoutes(app);
registerCategoryRoutes(app);
registerTagRoutes(app);
registerCommentRoutes(app);
registerSettingsRoutes(app);
registerMenuRoutes(app);
registerVisitorLogRoutes(app);
registerUploadRoutes(app);
registerFriendRoutes(app);
registerFriendCheckRoutes(app);
registerRssRoutes(app);

// 启动
app.listen(process.env.PORT || 4000);

logger.info(`🦊 Backend running at ${app.server?.hostname}:${app.server?.port}`);

// 初始化默认数据
seedDefaultMenus();
seedDefaultAggregateMenus();
seedDefaultFriends();

// 启动定时任务
scheduleFriendAutoCheck();
scheduleRssRefresh();

export type App = typeof app;
