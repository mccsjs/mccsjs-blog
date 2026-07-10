import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Icon } from '@iconify/react';

interface Badge {
  title: string;
  href: string;
  img: string;
}

interface SettingsData {
  siteTitle: string;
  siteDescription: string;
  siteLogo: string;
  favicon: string;
  icp: string;
  footerText: string;
  siteStartDate: string;
  footerTechInfo: string;
  postsPerPage: string;
  commentProvider: string;
  twikooEnvId: string;
  commentEmojiCdn: string;
  // —— 评论区博主身份（管理端配置，前端「设置」按钮登录用） ——
  adminEmail: string;
  adminName: string;
  adminPassword: string;
  adminBadge: string;
  imgbedUrl: string;
  imgbedToken: string;
  fontCssUrl: string;
  fontFamily: string;
  backgroundImage: string;
  linkMarkdown: string;
  // —— 页脚设置 ——
  showMotto: string;
  mottoTitle: string;
  mottoText: string;
  mottoCtaText: string;
  mottoCtaUrl: string;
  mottoCtaTarget: string;
  footerBadges: string;
}

const defaultValues: SettingsData = {
  siteTitle: '',
  siteDescription: '',
  siteLogo: '',
  favicon: '',
  icp: '',
  footerText: '',
  siteStartDate: '',
  footerTechInfo: '',
  postsPerPage: '10',
  commentProvider: 'twikoo',
  twikooEnvId: '',
  commentEmojiCdn: '',
  adminEmail: '',
  adminName: '',
  adminPassword: '',
  adminBadge: '',
  imgbedUrl: '',
  imgbedToken: '',
  fontCssUrl: '',
  fontFamily: '',
  backgroundImage: '',
  linkMarkdown: '',
  showMotto: 'true',
  mottoTitle: '格言🧬',
  mottoText: '',
  mottoCtaText: '',
  mottoCtaUrl: '',
  mottoCtaTarget: '_self',
  footerBadges: '',
};

export default function Settings() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'basic' | 'comment' | 'footer'>('basic');
  const [badges, setBadges] = useState<Badge[]>([]);
  const [badgesDirty, setBadgesDirty] = useState(false);

  const { data, isLoading } = useQuery<SettingsData>({
    queryKey: ['settings'],
    queryFn: () => api('/api/settings'),
  });

  const {
    register,
    reset,
    handleSubmit,
    setValue,
    watch,
    formState: { isDirty, isSubmitting },
  } = useForm<SettingsData>({ defaultValues });

  useEffect(() => {
    if (data) {
      reset({ ...defaultValues, ...data });
      try {
        setBadges(data.footerBadges ? JSON.parse(data.footerBadges) : []);
      } catch {
        setBadges([]);
      }
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (values: SettingsData) =>
      api<SettingsData>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ ...values, footerBadges: JSON.stringify(badges) }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setBadgesDirty(false);
    },
  });

  const onSubmit = (values: SettingsData) => {
    mutation.mutate(values);
  };

  const updateBadge = (i: number, key: keyof Badge, val: string) => {
    setBadges((prev) => prev.map((b, idx) => (idx === i ? { ...b, [key]: val } : b)));
    setBadgesDirty(true);
  };
  const addBadge = () => {
    setBadges((prev) => [...prev, { title: '', href: '', img: '' }]);
    setBadgesDirty(true);
  };
  const removeBadge = (i: number) => {
    setBadges((prev) => prev.filter((_, idx) => idx !== i));
    setBadgesDirty(true);
  };

  const tabBase =
    'px-4 py-1.5 text-sm font-medium rounded-md transition-colors';
  const tabActive = 'bg-[var(--accent)] text-white';
  const tabInactive = 'text-[var(--text)] hover:text-[var(--text-h)]';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-h)]">系统设置</h1>
          <p className="mt-1 text-sm text-[var(--text)]">管理网站基本信息、评论与页脚配置</p>
        </div>
        <Icon icon="lucide:settings-2" width={20} height={20} className="text-[var(--text)]" />
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab('basic')}
          className={`${tabBase} ${tab === 'basic' ? tabActive : tabInactive}`}
        >
          基本信息
        </button>
        <button
          type="button"
          onClick={() => setTab('comment')}
          className={`${tabBase} ${tab === 'comment' ? tabActive : tabInactive}`}
        >
          评论设置
        </button>
        <button
          type="button"
          onClick={() => setTab('footer')}
          className={`${tabBase} ${tab === 'footer' ? tabActive : tabInactive}`}
        >
          页脚设置
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-8 text-center text-sm text-[var(--text)]">
          加载中...
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-sm"
        >
          {tab === 'basic' && (
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="网站标题">
                <Input id="siteTitle" placeholder="My Blog" {...register('siteTitle')} />
              </Field>

              <Field label="每页文章数">
                <Input
                  id="postsPerPage"
                  type="number"
                  min={1}
                  max={100}
                  {...register('postsPerPage')}
                />
              </Field>

              <Field label="Logo URL" className="md:col-span-2">
                <Input id="siteLogo" placeholder="https://example.com/logo.png" {...register('siteLogo')} />
              </Field>

              <Field label="Favicon URL" className="md:col-span-2">
                <Input id="favicon" placeholder="https://example.com/favicon.ico" {...register('favicon')} />
              </Field>

              <Field label="字体 CSS 链接" className="md:col-span-2">
                <Input
                  id="fontCssUrl"
                  placeholder="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap"
                  {...register('fontCssUrl')}
                />
              </Field>

              <Field label="字体族名" className="md:col-span-2">
                <Input
                  id="fontFamily"
                  placeholder="'Noto Sans SC', sans-serif"
                  {...register('fontFamily')}
                />
              </Field>

              <Field label="背景图 URL" className="md:col-span-2">
                <Input
                  id="backgroundImage"
                  placeholder="https://example.com/bg.jpg"
                  {...register('backgroundImage')}
                />
              </Field>

              <Field label="ICP 备案号" className="md:col-span-2">
                <Input id="icp" placeholder="京ICP备XXXXXXXX号" {...register('icp')} />
              </Field>

              <div className="md:col-span-2 border-t border-[var(--border)] pt-2" />
              <h2 className="md:col-span-2 text-base font-semibold text-[var(--text-h)]">图床设置 (ImgBed)</h2>

              <Field label="图床地址" className="md:col-span-2">
                <Input
                  id="imgbedUrl"
                  placeholder="https://imgbed.example.com"
                  {...register('imgbedUrl')}
                />
              </Field>

              <Field label="API Token" className="md:col-span-2">
                <Input
                  id="imgbedToken"
                  type="password"
                  autoComplete="off"
                  placeholder="imgbed_xxxxxxxxxxxxxxxx"
                  {...register('imgbedToken')}
                />
              </Field>

              <Field label="网站描述" className="md:col-span-2">
                <Textarea
                  id="siteDescription"
                  rows={3}
                  placeholder="一句话介绍网站"
                  {...register('siteDescription')}
                />
              </Field>

              <Field label="自定义页脚文本" className="md:col-span-2">
                <Textarea
                  id="footerText"
                  rows={2}
                  placeholder="支持 HTML，会显示在默认页脚下方"
                  {...register('footerText')}
                />
              </Field>

              <Field label="友链页 Markdown" className="md:col-span-2">
                <Textarea
                  id="linkMarkdown"
                  rows={8}
                  placeholder="友链页顶部文本，支持 Markdown"
                  {...register('linkMarkdown')}
                />
              </Field>
            </div>
          )}

          {tab === 'comment' && (
            <div className="space-y-8">
              <section className="space-y-4">
                <h2 className="text-base font-semibold text-[var(--text-h)]">评论系统</h2>
                <p className="text-sm text-[var(--text)]">
                  选择文章页使用的评论系统。切换后前台文章页会立即生效（可能需刷新缓存）。
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label
                    className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-4 transition-colors ${
                      watch('commentProvider') === 'native'
                        ? 'border-[var(--accent)] bg-[var(--bg-soft)]'
                        : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="native"
                        checked={watch('commentProvider') === 'native'}
                        onChange={() =>
                          setValue('commentProvider', 'native', { shouldDirty: true })
                        }
                      />
                      <span className="text-sm font-medium text-[var(--text-h)]">本站自研评论区</span>
                    </div>
                    <span className="pl-6 text-xs text-[var(--text)]">
                      评论数据存储在本站数据库，无需第三方服务，支持在「评论管理」审核。
                    </span>
                  </label>

                  <label
                    className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-4 transition-colors ${
                      watch('commentProvider') === 'twikoo'
                        ? 'border-[var(--accent)] bg-[var(--bg-soft)]'
                        : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="twikoo"
                        checked={watch('commentProvider') === 'twikoo'}
                        onChange={() =>
                          setValue('commentProvider', 'twikoo', { shouldDirty: true })
                        }
                      />
                      <span className="text-sm font-medium text-[var(--text-h)]">Twikoo</span>
                    </div>
                    <span className="pl-6 text-xs text-[var(--text)]">
                      使用第三方 Twikoo 评论服务，需要在下方填写 envId。
                    </span>
                  </label>
                </div>
              </section>

              {watch('commentProvider') === 'native' && (
                <section className="space-y-4">
                  <h2 className="text-base font-semibold text-[var(--text-h)]">自研评论区配置</h2>
                  <Field label="表情包地址（owo.json）">
                    <Input
                      id="commentEmojiCdn"
                      placeholder="留空使用站点自带表情包"
                      {...register('commentEmojiCdn')}
                    />
                  </Field>
                  <p className="text-xs text-[var(--text)]">
                    表情包采用 OwO 格式，与 Twikoo 完全兼容。<b>留空</b>则使用站点自带的
                    <code className="mx-1 rounded bg-[var(--bg-soft)] px-1">/owo.json</code>
                    （含颜文字 / Emoji / QQ / 贴吧 / B站 等 13 组）；也可填入你 Twikoo 使用的
                    owo.json 地址，实现两套评论系统共用同一份表情包。
                  </p>

                  <div className="border-t border-[var(--border)] pt-4" />
                  <h2 className="text-base font-semibold text-[var(--text-h)]">博主身份（管理员）</h2>
                  <p className="text-xs text-[var(--text)]">
                    配置后，前台评论区「发表评论」旁会出现<u>设置按钮</u>（uil:setting）。点击并输入下方邮箱与密码，
                    即可以后台管理员身份发评论（带「博主」徽章）。若留空则前台不显示该按钮。
                  </p>
                  <Field label="管理员昵称（名字）">
                    <Input
                      id="adminName"
                      placeholder="如：博主 / 站长"
                      {...register('adminName')}
                    />
                  </Field>
                  <Field label="管理员邮箱">
                    <Input
                      id="adminEmail"
                      type="email"
                      placeholder="需为有效邮箱，如 admin@localhost"
                      {...register('adminEmail')}
                    />
                  </Field>
                  <Field label="管理员密码">
                    <Input
                      id="adminPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="留空表示不修改；首次请填写"
                      {...register('adminPassword')}
                    />
                  </Field>
                  <Field label="博主徽章文字">
                    <Input
                      id="adminBadge"
                      placeholder="如：博主 / 站长 / 作者"
                      {...register('adminBadge')}
                    />
                    <p className="mt-1 text-xs text-[var(--text)]">
                      显示在「博主身份」评论旁的标识文字，留空默认为「博主」。
                    </p>
                  </Field>
                </section>
              )}

              {watch('commentProvider') === 'twikoo' && (
                <section className="space-y-4">
                  <h2 className="text-base font-semibold text-[var(--text-h)]">Twikoo 配置</h2>
                  <Field label="Twikoo envId">
                    <Input
                      id="twikooEnvId"
                      placeholder="https://twikoo.xxx.vercel.app"
                      {...register('twikooEnvId')}
                    />
                  </Field>
                  <p className="text-xs text-[var(--text)]">
                    Twikoo 服务端地址（环境 ID），通常为你部署的 Twikoo 云函数或 Vercel 地址。
                  </p>
                </section>
              )}
            </div>
          )}

          {tab === 'footer' && (
            <div className="space-y-8">
              {/* 版权信息 */}
              <section className="space-y-4">
                <h2 className="text-base font-semibold text-[var(--text-h)]">版权信息</h2>
                <Field label="网站起始时间" className="md:col-span-2">
                  <Input id="siteStartDate" type="date" {...register('siteStartDate')} />
                </Field>
                <p className="text-xs text-[var(--text)]">
                  留空则版权只显示当前年份；填写后页脚版权显示为「©起始年 - 当前年 By 站点名」（如 ©2023 - 2026 By mccsjs）。
                </p>
              </section>

              {/* 框架信息 */}
              <section className="space-y-4">
                <h2 className="text-base font-semibold text-[var(--text-h)]">框架信息</h2>
                <Field label="框架信息文本" className="md:col-span-2">
                  <Textarea
                    id="footerTechInfo"
                    rows={2}
                    placeholder="留空则显示默认「由 Astro | 前端 Tailwind CSS | 后端 ElysiaJS + Bun」"
                    {...register('footerTechInfo')}
                  />
                </Field>
                <p className="text-xs text-[var(--text)]">
                  自定义页脚「框架信息」一行文案，留空使用默认内容。
                </p>
              </section>

              {/* 格言卡片 */}
              <section className="space-y-4">
                <h2 className="text-base font-semibold text-[var(--text-h)]">格言卡片</h2>

                <label className="flex w-fit cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--border-strong)]"
                    checked={watch('showMotto') === 'true'}
                    onChange={(e) =>
                      setValue('showMotto', e.target.checked ? 'true' : 'false', {
                        shouldDirty: true,
                      })
                    }
                  />
                  <span className="text-sm text-[var(--text)]">在页脚显示格言卡片与跳转按钮</span>
                </label>

                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="标题">
                    <Input id="mottoTitle" placeholder="格言🧬" {...register('mottoTitle')} />
                  </Field>

                  <Field label="按钮文本">
                    <Input id="mottoCtaText" placeholder="前往了解作者" {...register('mottoCtaText')} />
                  </Field>

                  <Field label="按钮链接" className="md:col-span-2">
                    <Input id="mottoCtaUrl" placeholder="/about/" {...register('mottoCtaUrl')} />
                  </Field>

                  <Field label="打开方式">
                    <select
                      id="mottoCtaTarget"
                      {...register('mottoCtaTarget')}
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] transition-colors focus:border-[var(--accent)] focus:outline-none"
                    >
                      <option value="_self">当前窗口</option>
                      <option value="_blank">新窗口</option>
                    </select>
                  </Field>

                  <Field label="格言正文" className="md:col-span-2">
                    <Textarea
                      id="mottoText"
                      rows={3}
                      placeholder="支持换行，会显示在格言卡片中"
                      {...register('mottoText')}
                    />
                  </Field>
                </div>
              </section>

              <div className="border-t border-[var(--border)]" />

              {/* 徽标设置 */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[var(--text-h)]">页脚徽标</h2>
                  <span className="text-xs text-[var(--text)]">显示在页脚底部（shields.io 风格）</span>
                </div>

                <div className="space-y-3">
                  {badges.length === 0 && (
                    <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-soft)] p-4 text-center text-sm text-[var(--text)]">
                      还没有徽标，点击下方按钮添加一个
                    </p>
                  )}

                  {badges.map((b, i) => (
                    <div
                      key={i}
                      className="grid items-center gap-3 rounded-lg border border-[var(--border)] p-3 md:grid-cols-[1fr_1.5fr_2fr_auto]"
                    >
                      <Input
                        placeholder="标题（如：框架 Astro）"
                        value={b.title}
                        onChange={(e) => updateBadge(i, 'title', e.target.value)}
                      />
                      <Input
                        placeholder="链接 URL"
                        value={b.href}
                        onChange={(e) => updateBadge(i, 'href', e.target.value)}
                      />
                      <Input
                        placeholder="图片 URL（shields.io 徽标地址）"
                        value={b.img}
                        onChange={(e) => updateBadge(i, 'img', e.target.value)}
                      />
                      <Button type="button" variant="secondary" onClick={() => removeBadge(i)} title="删除徽标">
                        <Icon icon="lucide:trash-2" width={16} height={16} />
                      </Button>
                    </div>
                  ))}

                  <Button type="button" variant="secondary" onClick={addBadge}>
                    <Icon icon="lucide:plus" width={16} height={16} />
                    添加徽标
                  </Button>
                </div>
              </section>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
            {mutation.isSuccess && (
              <span className="text-sm text-green-600">保存成功</span>
            )}
            {mutation.isError && (
              <span className="text-sm text-red-500">
                {mutation.error instanceof Error ? mutation.error.message : '保存失败'}
              </span>
            )}
            <Button
              type="submit"
              disabled={(!isDirty && !badgesDirty) || isSubmitting || mutation.isPending}
            >
              <Icon icon="lucide:save" width={16} height={16} />
              {mutation.isPending ? '保存中...' : '保存设置'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={label}>{label}</Label>
      {children}
    </div>
  );
}
