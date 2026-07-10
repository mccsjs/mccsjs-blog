import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Post, Category, Tag } from '../../../shared/src/index';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import SplitMarkdownEditor from '../components/SplitMarkdownEditor';
import { Icon } from '@iconify/react';

const schema = z.object({
  title: z.string().min(1, '请输入标题'),
  slug: z.string().regex(/^[a-z0-9-]*$/i, 'slug 只能包含字母、数字和连字符').optional(),
  excerpt: z.string(),
  content: z.string().min(1, '请输入正文'),
  categoryName: z.string().min(1, '请输入分类名'),
  tagNames: z.string().optional(),
  published: z.boolean(),
  coverImage: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function slugify(text: string) {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  // 中文等非 ASCII 字符会被清空，此时用 CRC32 兜底
  if (!slug) {
    let crc = 0xffffffff;
    for (let i = 0; i < text.length; i++) {
      crc = (crc >>> 8) ^ crc32Table[(crc ^ text.charCodeAt(i)) & 0xff];
    }
    return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
  }
  return slug;
}

const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export default function PostEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(slug);
  const [uploading, setUploading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  // 编辑器页面需要撑满主区域，隐藏左侧菜单并让主内容铺满
  useEffect(() => {
    const main = document.getElementById('admin-main');
    const sidebar = document.querySelector('aside');
    const mainWrapper = main?.parentElement;
    const outerWrapper = mainWrapper?.parentElement as HTMLElement | null;

    const prevMainClass = main?.className ?? '';
    const prevMainWrapperClass = mainWrapper?.className ?? '';
    const prevOuterWrapperClass = outerWrapper?.className ?? '';

    if (main) main.className = 'h-full w-full';
    if (sidebar) sidebar.classList.add('hidden');
    if (mainWrapper) mainWrapper.className = 'flex-1 overflow-hidden';
    // 最外层容器必须用固定高度(h-screen)而非 min-h-screen，否则长文章会把容器撑开导致页脚漂移
    if (outerWrapper) outerWrapper.className = 'flex h-screen overflow-hidden bg-[var(--bg-soft)]';

    return () => {
      if (main) main.className = prevMainClass;
      if (sidebar) sidebar.classList.remove('hidden');
      if (mainWrapper) mainWrapper.className = prevMainWrapperClass;
      if (outerWrapper) outerWrapper.className = prevOuterWrapperClass;
    };
  }, []);

  const { data: post } = useQuery<Post>({
    queryKey: ['post', slug],
    queryFn: () => api(`/api/posts/${slug}?admin=true`),
    enabled: isEdit,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api('/api/categories'),
  });

  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: () => api('/api/tags'),
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      categoryName: '',
      tagNames: '',
      published: false,
      coverImage: '',
    },
  });

  useEffect(() => {
    if (post) {
      reset({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || '',
        content: post.content,
        categoryName: post.category?.name ?? '',
        tagNames: post.tags.map((t) => t.name).join(', '),
        published: post.published,
        coverImage: post.coverImage || '',
      });
    }
  }, [post, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const categoryName = data.categoryName?.trim();
      const tagNames = data.tagNames
        ? data.tagNames.split(',').map((name) => name.trim()).filter(Boolean)
        : [];

      let categoryId = '';
      if (categoryName) {
        const matched = categories.find((cat) => cat.name.toLowerCase() === categoryName.toLowerCase());
        if (matched) {
          categoryId = matched.id;
        } else {
          try {
            const category = await api<Category>('/api/categories', {
              method: 'POST',
              body: JSON.stringify({ name: categoryName, slug: slugify(categoryName) }),
            });
            categoryId = category.id;
          } catch {
            // 创建失败（可能已存在），重新拉取列表查找
            const fresh = await api<Category[]>('/api/categories');
            const found = fresh.find((cat) => cat.name.toLowerCase() === categoryName.toLowerCase());
            if (found) categoryId = found.id;
            else throw new Error(`分类「${categoryName}」创建失败`);
          }
        }
      }

      const matchedTagIds = tags
        .filter((tag) => tagNames.some((name) => name.toLowerCase() === tag.name.toLowerCase()))
        .map((tag) => tag.id);
      const newTagNames = tagNames.filter((name) => !tags.some((tag) => tag.name.toLowerCase() === name.toLowerCase()));

      const createdTags = await Promise.all(
        newTagNames.map(async (name) => {
          try {
            return await api<Tag>('/api/tags', {
              method: 'POST',
              body: JSON.stringify({ name, slug: slugify(name) }),
            });
          } catch {
            // 创建失败（可能已存在），重新拉取列表查找
            const fresh = await api<Tag[]>('/api/tags');
            const found = fresh.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
            if (found) return found;
            throw new Error(`标签「${name}」创建失败`);
          }
        })
      );

      const payload = {
        ...data,
        slug: data.slug?.trim() || undefined,
        categoryId,
        tagIds: matchedTagIds.length || createdTags.length ? [...matchedTagIds, ...createdTags.map((t) => t.id)] : undefined,
        coverImage: data.coverImage?.trim() || undefined,
      };
      if (isEdit && post) {
        return api<Post>(`/api/posts/${post.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      return api<Post>('/api/posts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['post', slug] });
      setDrawerOpen(false);
      navigate('/posts');
    },
  });

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
      const response = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) throw new Error('上传失败');
      const result = await response.json();
      setValue('coverImage', result.url);
    } catch (err) {
      alert(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="flex h-full w-full flex-col bg-white">
      {/* ===== 固定顶部工具栏 ===== */}
      <header className="z-50 flex shrink-0 items-center gap-4 border-b border-[#e5e7eb] bg-white px-5 py-3 shadow-sm">
        {/* 左：返回 + 标签 */}
        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={() => navigate('/posts')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#606266] transition-colors hover:bg-[#f5f7fa] hover:text-[#303133]"
            title="返回文章列表"
          >
            <Icon icon="lucide:arrow-left" width={17} height={17} />
          </button>
          <span className="text-sm font-medium text-[#606266] whitespace-nowrap">
            {isEdit ? '编辑文章' : '新建文章'}
          </span>
          <div className="h-4 w-px bg-[#e5e7eb]" />
        </div>

        {/* 中：标题输入 */}
        <div className="relative min-w-0 flex-1">
          <Input
            id="title"
            placeholder="请输入文章标题..."
            {...register('title')}
            className="rounded-lg border border-[#dcdfe6] bg-white px-3 py-1.5 text-lg font-medium text-[#303133] shadow-none outline-none placeholder:text-[#c0c4cc] transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
          />
          {errors.title && (
            <p className="absolute mt-0.5 text-xs text-red-500">{errors.title.message}</p>
          )}
        </div>

        {/* 右：字数/时长 + 设置 + 保存 */}
        <div className="flex shrink-0 items-center gap-4">
          <div className="hidden items-center gap-3 text-xs text-[#909399] md:flex">
            <span>字数：{wordCount}</span>
            <span>阅读时长：约 {Math.max(1, Math.ceil(wordCount / 300))} 分钟</span>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDrawerOpen(true)}
            className="px-3 py-1.5 text-xs font-normal"
          >
            <Icon icon="lucide:settings-2" width={14} height={14} className="mr-1" />
            文章设置
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || mutation.isPending}
            className="px-4 py-1.5 text-xs"
          >
            <Icon icon="lucide:save" width={14} height={14} className="mr-1" />
            {isSubmitting || mutation.isPending ? '保存中...' : '保存'}
          </Button>
        </div>
      </header>

      {/* ===== 主编辑区域（全宽） ===== */}
      <main className="relative flex w-full flex-1 overflow-hidden">
        <Controller
          name="content"
          control={control}
          render={({ field }) => (
            <SplitMarkdownEditor
              value={field.value}
              onChange={field.onChange}
              onWordCountChange={setWordCount}
            />
          )}
        />

        {(mutation.isError || errors.content) && (
          <div className="absolute bottom-14 left-1/2 z-50 max-w-lg -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 shadow-lg">
            {errors.content?.message || (mutation.error instanceof Error ? mutation.error.message : '保存失败')}
          </div>
        )}
      </main>

      {/* ===== 右侧抽屉：文章设置 ===== */}
      {drawerOpen && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-[60] bg-black/20 transition-opacity duration-200"
            onClick={() => setDrawerOpen(false)}
          />

          {/* 抽屉本体 */}
          <aside className="fixed right-0 top-0 z-[70] h-full w-full max-w-md animate-slide-in-right overflow-y-auto border-l border-[#e5e7eb] bg-white shadow-2xl">
            {/* 抽屉头部 */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e5e7eb] bg-white/95 px-6 py-4 backdrop-blur-md">
              <h2 className="text-base font-semibold text-[#303133]">文章设置</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[#909399] transition-colors hover:bg-[#f5f7fa] hover:text-[#303133]"
              >
                <Icon icon="lucide:x" width={18} height={18} />
              </button>
            </div>

            {/* 抽屉内容 */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6 pt-5">
              {/* URL 标识 */}
              <Field label="URL 标识 (Slug)">
                <Input
                  id="slug"
                  placeholder="留空自动生成"
                  {...register('slug')}
                  className="py-2 text-sm"
                />
                {errors.slug && <FieldError>{errors.slug.message}</FieldError>}
              </Field>

              {/* 摘要 */}
              <Field label="摘要">
                <Textarea
                  id="excerpt"
                  placeholder="简短描述这篇文章，留空则自动截取前150字"
                  {...register('excerpt')}
                  rows={3}
                  className="resize-none text-sm"
                />
                {errors.excerpt && <FieldError>{errors.excerpt.message}</FieldError>}
              </Field>

              {/* 分类 & 标签（同一行） */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-[#303133]">分类</Label>
                  <Input
                    id="categoryName"
                    placeholder="输入分类名，不存在将自动创建"
                    {...register('categoryName')}
                    className="py-2 text-sm"
                  />
                </div>

                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-[#303133]">标签</Label>
                  <Input
                    id="tagNames"
                    placeholder="输入标签，多个用逗号分隔"
                    {...register('tagNames')}
                    className="py-2 text-sm"
                  />
                </div>
              </div>

              {/* 封面图片 */}
              <Field label="封面图片">
                <div className="space-y-2.5">
                  <Input
                    id="coverImage"
                    placeholder="输入图片 URL 或上传"
                    {...register('coverImage')}
                    className="py-2 text-sm"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#dcdfe6] bg-[#fafafa] px-3 py-2 text-xs font-medium text-[#606266] transition-colors hover:border-[#c0c4cc] hover:bg-[#f5f7fa]">
                    <Icon icon="lucide:upload" width={14} height={14} />
                    {uploading ? '上传中...' : '上传图片'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                  </label>
                  {watch('coverImage') && (
                    <img src={watch('coverImage')} alt="cover" className="h-28 w-full rounded-lg border border-[#ebeef5] object-cover" />
                  )}
                </div>
              </Field>

              {/* 发布状态 */}
              <Field label="状态">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#dcdfe6] bg-[#fafafa] px-4 py-3 transition-colors hover:border-[#409eff]">
                  <input
                    type="checkbox"
                    {...register('published')}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  <span className="text-sm font-medium text-[#303133]">立即发布</span>
                </label>
              </Field>

              {/* 底部保存 */}
              <div className="border-t border-[#ebeef5] pt-5">
                <Button
                  type="submit"
                  disabled={isSubmitting || mutation.isPending}
                  className="w-full py-2.5 text-sm"
                >
                  {isSubmitting || mutation.isPending ? '保存中...' : '保存文章'}
                </Button>
              </div>
            </form>
          </aside>
        </>
      )}
    </div>
  );
}

/* ========= 子组件 ========= */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm font-medium text-[#303133]">{label}</Label>
      {children}
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-red-500">{children}</p>;
}
