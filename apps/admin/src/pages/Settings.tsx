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
  siteUrl: string;
  favicon: string;
  icp: string;
  footerText: string;
  siteStartDate: string;
  footerTechInfo: string;
  postsPerPage: string;
  commentProvider: string;
  twikooEnvId: string;
  commentEmojiCdn: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
  adminBadge: string;
  mailEnabled: string;
  mailSmtpHost: string;
  mailSmtpPort: string;
  mailSmtpUser: string;
  mailSmtpPass: string;
  mailSmtpSecure: string;
  mailProvider: string;
  mailApiKey: string;
  mailGatewayUrl: string;
  mailGatewayToken: string;
  mailFromEmail: string;
  mailFromName: string;
  mailTemplateReply: string;
  mailTemplateAdmin: string;
  imgbedUrl: string;
  imgbedToken: string;
  fontCssUrl: string;
  fontFamily: string;
  backgroundImage: string;
  heroType: string;
  heroImage: string;
  heroVideo: string;
  linkMarkdown: string;
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
  siteUrl: '',
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
  mailEnabled: 'false',
  mailSmtpHost: 'smtp.qq.com',
  mailSmtpPort: '465',
  mailSmtpUser: '',
  mailSmtpPass: '',
  mailSmtpSecure: 'ssl',
  mailProvider: 'none',
  mailApiKey: '',
  mailGatewayUrl: '',
  mailGatewayToken: '',
  mailFromEmail: '',
  mailFromName: '',
  mailTemplateReply: '',
  mailTemplateAdmin: '',
  imgbedUrl: '',
  imgbedToken: '',
  fontCssUrl: '',
  fontFamily: '',
  backgroundImage: '',
  heroType: 'image',
  heroImage: '/hero.webp',
  heroVideo: '',
  linkMarkdown: '',
  showMotto: 'true',
  mottoTitle: '格言',
  mottoText: '',
  mottoCtaText: '',
  mottoCtaUrl: '',
  mottoCtaTarget: '_self',
  footerBadges: '',
};

const TAB_LIST = [
  { key: 'basic', label: '基本信息' },
  { key: 'comment', label: '评论' },
  { key: 'footer', label: '页脚' },
] as const;

export default function Settings() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'basic' | 'comment' | 'footer'>('basic');
  const [badges, setBadges] = useState<Badge[]>([]);
  const [badgesDirty, setBadgesDirty] = useState(false);

  // 邮件通知测试状态
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const handleTestEmail = async () => {
    const to = testEmail.trim();
    if (!to) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await api<{ ok: boolean; message: string }>('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: to }),
      });
      setTestResult({ ok: !!res.ok, message: res.message || (res.ok ? '发送成功' : '发送失败') });
    } catch (e: any) {
      setTestResult({ ok: false, message: e?.message || '网络请求失败' });
    } finally {
      setTestLoading(false);
    }
  };

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1>系统设置</h1>
          <p className="text-sm text-[var(--text)]">网站基本信息、评论与页脚配置</p>
        </div>
        <Icon icon="lucide:settings-2" width={20} height={20} className="text-[var(--text)]" />
      </div>

      {/* Tab 切换 */}
      <div className="flex w-fit gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-1">
        {TAB_LIST.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === t.key
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text)] hover:text-[var(--text-h)]'
            }`}
          >
            {t.label}
          </button>
        ))}
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
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="网站标题">
                <Input id="siteTitle" placeholder="My Blog" {...register('siteTitle')} />
              </Field>

              <Field label="每页文章数">
                <Input id="postsPerPage" type="number" min={1} max={100} {...register('postsPerPage')} />
              </Field>

              <Field label="站点地址" helper="用于邮件链接与 RSS，留空则使用请求域名">
                <Input id="siteUrl" placeholder="https://your-domain.com" {...register('siteUrl')} />
              </Field>

              <Field label="ICP 备案号">
                <Input id="icp" placeholder="京ICP备XXXXXXXX号" {...register('icp')} />
              </Field>

              <Field label="Logo URL" className="md:col-span-2">
                <Input id="siteLogo" placeholder="https://example.com/logo.png" {...register('siteLogo')} />
              </Field>

              <Field label="Favicon URL" className="md:col-span-2">
                <Input id="favicon" placeholder="https://example.com/favicon.ico" {...register('favicon')} />
              </Field>

              <Field label="字体 CSS 链接" helper="Google Fonts 等在线字体样式地址" className="md:col-span-2">
                <Input
                  id="fontCssUrl"
                  placeholder="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap"
                  {...register('fontCssUrl')}
                />
              </Field>

              <Field label="字体族名" className="md:col-span-2">
                <Input id="fontFamily" placeholder="'Noto Sans SC', sans-serif" {...register('fontFamily')} />
              </Field>

              <Field label="背景图 URL" helper="首页背景图，留空使用默认背景" className="md:col-span-2">
                <Input id="backgroundImage" placeholder="https://example.com/bg.jpg" {...register('backgroundImage')} />
              </Field>

              <SectionTitle className="md:col-span-2">首页 Hero 背景</SectionTitle>

              <Field label="背景类型" className="md:col-span-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <OptionCard
                    active={watch('heroType') === 'image'}
                    onClick={() => setValue('heroType', 'image', { shouldDirty: true })}
                    title="图片"
                    desc="使用静态图片作为首页顶部背景，稳定且兼容性好。"
                  />
                  <OptionCard
                    active={watch('heroType') === 'video'}
                    onClick={() => setValue('heroType', 'video', { shouldDirty: true })}
                    title="视频"
                    desc="循环自动播放的视频背景（手机端静音自动播放），加载前显示图片封面。"
                  />
                </div>
              </Field>

              <Field label="背景图片 URL" helper="图片模式使用；视频模式作为视频加载前的封面" className="md:col-span-2">
                <Input id="heroImage" placeholder="/hero.webp 或 https://example.com/hero.jpg" {...register('heroImage')} />
              </Field>

              {watch('heroType') === 'video' && (
                <Field label="背景视频 URL" helper="仅支持 mp4；留空则回退到图片" className="md:col-span-2">
                  <Input id="heroVideo" placeholder="/hero.mp4 或 https://example.com/hero.mp4" {...register('heroVideo')} />
                </Field>
              )}

              <SectionTitle className="md:col-span-2">图床</SectionTitle>

              <Field label="图床地址" className="md:col-span-2">
                <Input id="imgbedUrl" placeholder="https://imgbed.example.com" {...register('imgbedUrl')} />
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

              <SectionTitle className="md:col-span-2">内容</SectionTitle>

              <Field label="网站描述" className="md:col-span-2">
                <Textarea id="siteDescription" rows={3} placeholder="一句话介绍网站" {...register('siteDescription')} />
              </Field>

              <Field label="自定义页脚文本" helper="支持 HTML" className="md:col-span-2">
                <Textarea id="footerText" rows={2} placeholder="显示在默认页脚下方" {...register('footerText')} />
              </Field>

              <Field label="友链页 Markdown" className="md:col-span-2">
                <Textarea id="linkMarkdown" rows={8} placeholder="友链页顶部文本，支持 Markdown" {...register('linkMarkdown')} />
              </Field>
            </div>
          )}

          {tab === 'comment' && (
            <div className="space-y-8">
              <section className="space-y-3">
                <h2>评论系统</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <OptionCard
                    active={watch('commentProvider') === 'native'}
                    onClick={() => setValue('commentProvider', 'native', { shouldDirty: true })}
                    title="本站评论区"
                    desc="评论数据存储在本地数据库，无需第三方服务。"
                  />
                  <OptionCard
                    active={watch('commentProvider') === 'twikoo'}
                    onClick={() => setValue('commentProvider', 'twikoo', { shouldDirty: true })}
                    title="Twikoo"
                    desc="使用第三方 Twikoo 服务，需填写 envId。"
                  />
                </div>
              </section>

              {watch('commentProvider') === 'native' && (
                <section className="space-y-5">
                  <div>
                    <h2>评论区</h2>
                    <p className="text-xs text-[var(--text)]">评论可在「评论管理」中审核。</p>
                  </div>

                  <Field label="表情包地址" helper="OwO 格式，与 Twikoo 兼容。留空使用 /owo.json">
                    <Input
                      id="commentEmojiCdn"
                      placeholder="https://example.com/owo.json"
                      {...register('commentEmojiCdn')}
                    />
                  </Field>

                  <div className="border-t border-[var(--border)]" />

                  <div>
                    <h2>博主身份</h2>
                    <p className="text-xs text-[var(--text)]">
                      配置后前台评论区显示设置按钮，登录后可带博主徽章发表评论。
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="管理员昵称">
                      <Input id="adminName" placeholder="博主" {...register('adminName')} />
                    </Field>
                    <Field label="博主徽章">
                      <Input id="adminBadge" placeholder="博主" {...register('adminBadge')} />
                    </Field>
                    <Field label="管理员邮箱">
                      <Input id="adminEmail" type="email" placeholder="admin@localhost" {...register('adminEmail')} />
                    </Field>
                    <Field label="管理员密码" helper="留空表示不修改">
                      <Input
                        id="adminPassword"
                        type="password"
                        autoComplete="new-password"
                        placeholder="首次请填写"
                        {...register('adminPassword')}
                      />
                    </Field>
                  </div>

                  <div className="border-t border-[var(--border)]" />

                  <div>
                    <h2>邮件通知</h2>
                    <p className="text-xs text-[var(--text)]">有新评论或回复时自动发送邮件提醒。</p>
                  </div>

                  <label className="flex w-fit cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--border-strong)]"
                      checked={watch('mailEnabled') === 'true'}
                      onChange={(e) =>
                        setValue('mailEnabled', e.target.checked ? 'true' : 'false', { shouldDirty: true })
                      }
                    />
                    <span className="text-sm text-[var(--text)]">启用评论邮件提醒</span>
                  </label>

                  <h3 className="text-sm font-semibold text-[var(--text-h)]">SMTP 直连</h3>
                  <p className="text-xs text-[var(--text)]">SMTP 发送失败后自动回退到备用网关。</p>

                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="SMTP 服务器">
                      <Input id="mailSmtpHost" placeholder="smtp.qq.com" {...register('mailSmtpHost')} />
                    </Field>
                    <Field label="SMTP 端口">
                      <Input id="mailSmtpPort" type="number" placeholder="465" {...register('mailSmtpPort')} />
                    </Field>
                    <Field label="SMTP 邮箱">
                      <Input id="mailSmtpUser" type="email" placeholder="xxxx@qq.com" {...register('mailSmtpUser')} />
                    </Field>
                    <Field label="SMTP 授权码" helper="留空表示不修改">
                      <Input
                        id="mailSmtpPass"
                        type="password"
                        autoComplete="off"
                        placeholder="16 位授权码"
                        {...register('mailSmtpPass')}
                      />
                    </Field>
                  </div>

                  <Field label="加密方式">
                    <select
                      id="mailSmtpSecure"
                      {...register('mailSmtpSecure')}
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] transition-colors focus:border-[var(--accent)] focus:outline-none"
                    >
                      <option value="ssl">SSL/TLS（端口 465）</option>
                      <option value="starttls">STARTTLS（端口 587）</option>
                      <option value="none">无加密（端口 25，不推荐）</option>
                    </select>
                  </Field>

                  <div className="border-t border-[var(--border)]" />

                  <h3 className="text-sm font-semibold text-[var(--text-h)]">备用网关</h3>
                  <p className="text-xs text-[var(--text)]">SMTP 失败时自动回退。</p>

                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="发件人名称">
                      <Input id="mailFromName" placeholder="站点名" {...register('mailFromName')} />
                    </Field>
                    <Field label="备用网关类型">
                      <select
                        id="mailProvider"
                        {...register('mailProvider')}
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] transition-colors focus:border-[var(--accent)] focus:outline-none"
                      >
                        <option value="none">无（仅 SMTP 发信）</option>
                        <option value="resend">Resend</option>
                        <option value="gateway">通用 HTTP 网关</option>
                      </select>
                    </Field>
                  </div>

                  {watch('mailProvider') === 'resend' && (
                    <Field label="Resend API Key" helper="留空表示不修改">
                      <Input
                        id="mailApiKey"
                        type="password"
                        autoComplete="off"
                        placeholder="re_xxxxxxxxxxxxxxxx"
                        {...register('mailApiKey')}
                      />
                    </Field>
                  )}

                  {watch('mailProvider') === 'gateway' && (
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="网关地址">
                        <Input id="mailGatewayUrl" placeholder="https://mail.example.com/send" {...register('mailGatewayUrl')} />
                      </Field>
                      <Field label="网关 Token" helper="留空表示不修改">
                        <Input
                          id="mailGatewayToken"
                          type="password"
                          autoComplete="off"
                          placeholder="鉴权 Token"
                          {...register('mailGatewayToken')}
                        />
                      </Field>
                    </div>
                  )}

                  <div className="border-t border-[var(--border)]" />

                  <h3 className="text-sm font-semibold text-[var(--text-h)]">邮件模板</h3>

                  <Field label="回复通知模板" helper="可用变量见 placeholder">
                    <Textarea
                      id="mailTemplateReply"
                      rows={5}
                      placeholder="{{siteTitle}} {{postTitle}} {{author}} {{email}} {{content}} {{parentAuthor}} {{parentContent}} {{commentUrl}}"
                      {...register('mailTemplateReply')}
                    />
                  </Field>
                  <Field label="新评论通知模板" helper="可用变量见 placeholder">
                    <Textarea
                      id="mailTemplateAdmin"
                      rows={5}
                      placeholder="{{siteTitle}} {{postTitle}} {{author}} {{email}} {{content}} {{commentUrl}}"
                      {...register('mailTemplateAdmin')}
                    />
                  </Field>

                  {/* 邮件通知测试 */}
                  <div className="border-t border-[var(--border)] pt-3">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-sm font-semibold text-[var(--text-h)] hover:text-[var(--accent)] transition-colors"
                      onClick={() => setShowTestEmail((v) => !v)}
                    >
                      <Icon icon={showTestEmail ? 'lucide:chevron-down' : 'lucide:chevron-right'} width={16} height={16} />
                      邮件通知测试
                      {testResult && (
                        <span
                          className={`ml-1 inline-block h-2 w-2 rounded-full ${testResult.ok ? 'bg-green-500' : 'bg-red-500'}`}
                          title={testResult.ok ? '成功' : '失败'}
                        />
                      )}
                    </button>

                    {showTestEmail && (
                      <div className="mt-4 space-y-4 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5">
                        <p className="text-sm text-[var(--text)]">输入一个邮箱地址，发送测试邮件</p>
                        <div className="flex gap-3">
                          <input
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="example@qq.com"
                            className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] transition-colors focus:border-[var(--accent)] focus:outline-none"
                            disabled={testLoading}
                          />
                          <Button
                            type="button"
                            variant="primary"
                            disabled={!testEmail.trim() || testLoading}
                            onClick={handleTestEmail}
                          >
                            {testLoading ? '发送中...' : '发送测试邮件'}
                          </Button>
                        </div>

                        {testResult && (
                          <div>
                            <p className="text-xs font-medium text-[var(--text-h)] mb-2">测试结果：</p>
                            <pre className={`whitespace-pre-wrap break-words rounded-md p-3 text-xs leading-relaxed ${
                              testResult.ok
                                ? 'bg-green-100/80 text-green-900'
                                : 'bg-red-100/80 text-red-900'
                            }`}>
                              {testResult.message}
                            </pre>
                            <div className="mt-2 flex gap-2">
                              <Button type="button" variant="ghost"
                                onClick={() => navigator.clipboard.writeText(testResult.message)}
                              >
                                复制
                              </Button>
                              <Button type="button" variant="ghost"
                                onClick={() => { setTestResult(null); setTestEmail(''); }}
                              >
                                重置
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {watch('commentProvider') === 'twikoo' && (
                <section className="space-y-3">
                  <h2>Twikoo 配置</h2>
                  <Field label="Twikoo envId">
                    <Input
                      id="twikooEnvId"
                      placeholder="https://twikoo.xxx.vercel.app"
                      {...register('twikooEnvId')}
                    />
                  </Field>
                </section>
              )}
            </div>
          )}

          {tab === 'footer' && (
            <div className="space-y-8">
              <section className="space-y-4">
                <h2>版权</h2>
                <Field label="网站起始时间" helper="留空只显示当前年份">
                  <Input id="siteStartDate" type="date" {...register('siteStartDate')} />
                </Field>
              </section>

              <section className="space-y-4">
                <h2>框架信息</h2>
                <Field label="框架信息文本" helper="留空显示默认文案">
                  <Textarea
                    id="footerTechInfo"
                    rows={2}
                    placeholder="由 Astro | Tailwind CSS | ElysiaJS + Bun 驱动"
                    {...register('footerTechInfo')}
                  />
                </Field>
              </section>

              <section className="space-y-4">
                <div>
                  <h2>格言卡片</h2>
                  <p className="text-xs text-[var(--text)]">配置后显示在页脚。</p>
                </div>

                <label className="flex w-fit cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--border-strong)]"
                    checked={watch('showMotto') === 'true'}
                    onChange={(e) =>
                      setValue('showMotto', e.target.checked ? 'true' : 'false', { shouldDirty: true })
                    }
                  />
                  <span className="text-sm text-[var(--text)]">显示格言卡片</span>
                </label>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="标题">
                    <Input id="mottoTitle" placeholder="格言" {...register('mottoTitle')} />
                  </Field>
                  <Field label="按钮文本">
                    <Input id="mottoCtaText" placeholder="了解作者" {...register('mottoCtaText')} />
                  </Field>
                  <Field label="按钮链接">
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
                    <Textarea id="mottoText" rows={3} placeholder="支持换行" {...register('mottoText')} />
                  </Field>
                </div>
              </section>

              <section className="space-y-4">
                <h2>页脚徽标</h2>
                <p className="text-xs text-[var(--text)]">显示在页脚底部，支持 shields.io 风格图片。</p>

                <div className="space-y-3">
                  {badges.length === 0 && (
                    <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-soft)] p-4 text-center text-sm text-[var(--text)]">
                      还没有徽标
                    </p>
                  )}

                  {badges.map((b, i) => (
                    <div
                      key={i}
                      className="grid items-center gap-3 rounded-lg border border-[var(--border)] p-3 md:grid-cols-[1fr_1.5fr_2fr_auto]"
                    >
                      <Input
                        placeholder="标题"
                        value={b.title}
                        onChange={(e) => updateBadge(i, 'title', e.target.value)}
                      />
                      <Input
                        placeholder="链接 URL"
                        value={b.href}
                        onChange={(e) => updateBadge(i, 'href', e.target.value)}
                      />
                      <Input
                        placeholder="图片 URL"
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
            {mutation.isSuccess && <span className="text-sm text-green-600">保存成功</span>}
            {mutation.isError && (
              <span className="text-sm text-red-500">
                {mutation.error instanceof Error ? mutation.error.message : '保存失败'}
              </span>
            )}
            <Button type="submit" disabled={(!isDirty && !badgesDirty) || isSubmitting || mutation.isPending}>
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
  helper,
  children,
  className = '',
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={label}>{label}</Label>
      {children}
      {helper && <p className="text-xs text-[var(--text)]">{helper}</p>}
    </div>
  );
}

function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`mt-2 border-t border-[var(--border)] pt-5 text-base font-semibold text-[var(--text-h)] ${className}`}>
      {children}
    </h2>
  );
}

function OptionCard({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
    return (
      <label
        className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-4 transition-colors ${
          active
            ? 'border-[var(--accent)] bg-[var(--bg-soft)]'
            : 'border-[var(--border)] hover:border-[var(--border-strong)]'
        }`}
      >
      <div className="flex items-center gap-2">
        <input type="radio" checked={active} onChange={onClick} />
        <span className="text-sm font-medium text-[var(--text-h)]">{title}</span>
      </div>
      <span className="pl-6 text-xs text-[var(--text)]">{desc}</span>
    </label>
  );
}
