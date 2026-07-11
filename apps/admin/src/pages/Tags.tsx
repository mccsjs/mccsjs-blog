import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../lib/api';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Icon } from '@iconify/react';

interface Tag {
  id: string;
  name: string;
  slug: string;
}

const schema = z.object({
  name: z.string().min(1, '请输入名称'),
  slug: z.string().min(1, '请输入 slug'),
});

type FormData = z.infer<typeof schema>;

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function Tags() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Tag | null>(null);

  const { data: tags = [], isLoading } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: () => api('/api/tags'),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slug: '' },
  });

  const name = watch('name');

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api<Tag>('/api/tags', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData & { id: string }) =>
      api<Tag>(`/api/tags/${data.id}`, { method: 'PATCH', body: JSON.stringify({ name: data.name, slug: data.slug }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setEditing(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<void>(`/api/tags/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  });

  const onSubmit = (data: FormData) => {
    if (editing) {
      updateMutation.mutate({ ...data, id: editing.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const startEdit = (tag: Tag) => {
    setEditing(tag);
    reset({ name: tag.name, slug: tag.slug });
  };

  const cancelEdit = () => {
    setEditing(null);
    reset();
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-[var(--text)]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>标签管理</h1>
        <p className="text-sm text-[var(--text)]">共 {tags.length} 个标签</p>
      </div>

      {/* 表单 */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="card flex flex-col gap-4 p-5 md:flex-row md:items-end"
      >
        <div className="flex-1">
          <Label htmlFor="name">名称</Label>
          <Input
            id="name"
            placeholder="标签名称"
            {...register('name')}
            onBlur={() => {
              const currentSlug = watch('slug');
              if (!currentSlug && name) setValue('slug', slugify(name));
            }}
            className="mt-1.5"
          />
          {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="flex-1">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" placeholder="tag-slug" {...register('slug')} className="mt-1.5" />
          {errors.slug && <p className="mt-1.5 text-xs text-red-500">{errors.slug.message}</p>}
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {editing ? <Icon icon="lucide:pencil" width={15} height={15} /> : <Icon icon="lucide:plus" width={15} height={15} />}
            {editing ? '更新' : '添加'}
          </Button>
          {editing && (
            <Button type="button" variant="secondary" onClick={cancelEdit}>
              <Icon icon="lucide:x" width={15} height={15} />
            </Button>
          )}
        </div>
      </form>

      {/* 标签云 + 表格 */}
      <div className="table-wrap overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)]">名称</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--text)]">Slug</th>
              <th className="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr key={tag.id}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-bg)] text-[var(--accent)]">
                      <Icon icon="lucide:tag" width={15} height={15} />
                    </div>
                    <span className="font-medium text-[var(--text-h)]">{tag.name}</span>
                  </div>
                </td>
                <td>
                  <code>{tag.slug}</code>
                </td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => startEdit(tag)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--accent)] transition-colors hover:bg-[var(--accent-bg)]"
                      title="编辑"
                    >
                      <Icon icon="lucide:pencil" width={15} height={15} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('确定删除该标签？')) deleteMutation.mutate(tag.id);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50"
                      title="删除"
                    >
                      <Icon icon="lucide:trash-2" width={15} height={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tags.length === 0 && (
              <tr>
                <td colSpan={3} className="py-16 text-center text-[var(--text)]">
                  暂无标签，使用上方表单添加
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
