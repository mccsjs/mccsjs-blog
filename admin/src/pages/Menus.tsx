import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Icon } from '@iconify/react';

type MenuType = 'GROUP' | 'NAV' | 'FOOTER';

interface MenuItem {
  id: string;
  label: string;
  href: string | null;
  icon: string | null;
  type: MenuType;
  parentId: string | null;
  sortOrder: number;
  visible: boolean;
  target: string | null;
  createdAt: string;
  updatedAt: string;
  children: MenuItem[];
}

interface MenuFormData {
  label: string;
  href: string;
  icon: string;
  type: MenuType;
  parentId: string;
  sortOrder: number;
  visible: boolean;
  target: string;
}

const typeLabels: Record<MenuType, string> = {
  GROUP: '图标菜单',
  NAV: '导航菜单',
  FOOTER: '页脚菜单',
};

const typeOrder: MenuType[] = ['GROUP', 'NAV', 'FOOTER'];

export default function Menus() {
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState<MenuType>('GROUP');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);

  const { data: menus = [], isLoading } = useQuery<MenuItem[]>({
    queryKey: ['menus'],
    queryFn: () => api('/api/menus'),
  });

  const filteredMenus = useMemo(() => {
    return menus.filter((m) => m.type === activeType);
  }, [menus, activeType]);

  const flatMenus = useMemo(() => {
    const result: { item: MenuItem; depth: number }[] = [];
    function walk(items: MenuItem[], depth: number) {
      for (const item of items) {
        result.push({ item, depth });
        if (expanded.has(item.id) && item.children?.length) {
          walk(item.children, depth + 1);
        }
      }
    }
    walk(filteredMenus, 0);
    return result;
  }, [filteredMenus, expanded]);

  const parentOptions = useMemo(() => {
    const result: { id: string; label: string; depth: number }[] = [];
    function walk(items: MenuItem[], depth: number) {
      for (const item of items) {
        result.push({ id: item.id, label: item.label, depth });
        if (item.children?.length) walk(item.children, depth + 1);
      }
    }
    walk(filteredMenus, 0);
    return result;
  }, [filteredMenus]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<MenuFormData>({
    defaultValues: {
      label: '',
      href: '',
      icon: '',
      type: activeType,
      parentId: '',
      sortOrder: 0,
      visible: true,
      target: '',
    },
  });

  useEffect(() => {
    setValue('type', activeType);
  }, [activeType, setValue]);

  const createMutation = useMutation({
    mutationFn: (values: MenuFormData) =>
      api('/api/menus', {
        method: 'POST',
        body: JSON.stringify(normalizeMenuData(values)),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: MenuFormData & { id: string }) =>
      api(`/api/menus/${values.id}`, {
        method: 'PATCH',
        body: JSON.stringify(normalizeMenuData(values)),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/menus/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
    reset({
      label: '',
      href: '',
      icon: '',
      type: activeType,
      parentId: '',
      sortOrder: 0,
      visible: true,
      target: '',
    });
  };

  const onSubmit = (values: MenuFormData) => {
    if (editingItem) {
      updateMutation.mutate({ ...values, id: editingItem.id });
    } else {
      createMutation.mutate(values);
    }
  };

  const startCreate = (parentId?: string) => {
    setEditingItem(null);
    setShowForm(true);
    reset({
      label: '',
      href: '',
      icon: '',
      type: activeType,
      parentId: parentId || '',
      sortOrder: 0,
      visible: true,
      target: '',
    });
  };

  const startEdit = (item: MenuItem) => {
    setEditingItem(item);
    setShowForm(true);
    reset({
      label: item.label,
      href: item.href || '',
      icon: item.icon || '',
      type: item.type,
      parentId: item.parentId || '',
      sortOrder: item.sortOrder,
      visible: item.visible,
      target: item.target || '',
    });
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-h)]">菜单管理</h1>
          <p className="mt-1 text-sm text-[var(--text)]">管理前端导航、页脚及图标菜单</p>
        </div>
        <Icon icon="lucide:menu" width={20} height={20} className="text-[var(--text)]" />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 shadow-sm">
        <div className="flex items-center gap-2">
          {typeOrder.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setActiveType(type);
                closeForm();
                setExpanded(new Set());
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeType === type
                  ? 'bg-blue-500 text-white'
                  : 'text-[var(--text)] hover:bg-gray-100'
              }`}
            >
              {typeLabels[type]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={() => startCreate()}>
            <Icon icon="lucide:plus" width={16} height={16} />
            新增菜单
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-8 text-center text-sm text-[var(--text)]">
          加载中...
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text)]">
                <th className="px-4 py-3 text-left font-medium">菜单标题</th>
                <th className="px-4 py-3 text-left font-medium">链接地址</th>
                <th className="w-24 px-4 py-3 text-center font-medium">排序</th>
                <th className="w-40 px-4 py-3 text-center font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {flatMenus.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-[var(--text)]"
                  >
                    暂无{typeLabels[activeType]}，点击右上角新增
                  </td>
                </tr>
              )}
              {flatMenus.map(({ item, depth }) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-gray-50/50"
                >
                  <td className="px-4 py-3">
                    <div
                      className="flex items-center gap-2"
                      style={{ paddingLeft: `${depth * 24}px` }}
                    >
                      {item.children?.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.id)}
                          className="text-[var(--text)] hover:text-blue-500"
                        >
                          {expanded.has(item.id) ? (
                            <Icon icon="lucide:chevron-down" width={16} height={16} />
                          ) : (
                            <Icon icon="lucide:chevron-right" width={16} height={16} />
                          )}
                        </button>
                      ) : (
                        <span className="w-4" />
                      )}
                      {item.icon ? (
                        <Icon icon={item.icon} width={16} height={16} />
                      ) : (
                        <Icon icon="lucide:grip-vertical" width={16} height={16} className="text-gray-300" />
                      )}
                      <span className="font-medium text-[var(--text-h)]">
                        {item.label}
                      </span>
                      {!item.visible && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          隐藏
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text)]">
                    {item.href || '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-[var(--text)]">
                    {item.sortOrder}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => startCreate(item.id)}
                        className="text-xs text-blue-500 hover:text-blue-600"
                      >
                        新增子菜单
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-blue-500"
                      >
                        <Icon icon="lucide:pencil" width={14} height={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('确定删除该菜单吗？子菜单会一并删除。')) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-red-500"
                      >
                        <Icon icon="lucide:trash-2" width={14} height={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-sm"
        >
          <h3 className="text-base font-semibold text-[var(--text-h)]">
            {editingItem ? '编辑菜单' : '新增菜单'}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="label">菜单标题</Label>
              <Input id="label" placeholder="首页" {...register('label', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="href">链接地址</Label>
              <Input id="href" placeholder="/ 或 https://..." {...register('href')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="icon">图标</Label>
              <Input id="icon" placeholder="emoji 或图标类名" {...register('icon')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target">打开方式</Label>
              <select
                id="target"
                {...register('target')}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-h)] outline-none focus:border-blue-500"
              >
                <option value="">当前窗口</option>
                <option value="_blank">新窗口</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="parentId">父菜单</Label>
              <select
                id="parentId"
                {...register('parentId')}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-h)] outline-none focus:border-blue-500"
              >
                <option value="">无（顶级菜单）</option>
                {parentOptions
                  .filter((p) => p.id !== editingItem?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {'　'.repeat(p.depth) + p.label}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sortOrder">排序</Label>
              <Input
                id="sortOrder"
                type="number"
                {...register('sortOrder', { valueAsNumber: true })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              id="visible"
              type="checkbox"
              {...register('visible')}
              className="h-4 w-4 rounded border-gray-300 text-blue-500"
            />
            <Label htmlFor="visible" className="!m-0 text-sm font-normal">
              显示菜单
            </Label>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
            <Button type="button" variant="ghost" onClick={closeForm}>
              取消
            </Button>
            {(createMutation.isError || updateMutation.isError) && (
              <span className="text-sm text-red-500">
                {(
                  (createMutation.error || updateMutation.error) as Error | null
                )?.message || '保存失败'}
              </span>
            )}
            <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
              {editingItem ? '保存修改' : '确认新增'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function normalizeMenuData(values: MenuFormData) {
  return {
    label: values.label,
    href: values.href?.trim() || null,
    icon: values.icon?.trim() || null,
    type: values.type,
    parentId: values.parentId?.trim() || null,
    sortOrder: Number(values.sortOrder) || 0,
    visible: values.visible,
    target: values.target?.trim() || null,
  };
}
