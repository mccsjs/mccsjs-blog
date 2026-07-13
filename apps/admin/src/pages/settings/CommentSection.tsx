import type { UseFormReturn } from 'react-hook-form';
import type { SettingsData } from './types';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import Button from '../../components/ui/button';
import { Icon } from '@iconify/react';
import { Field, OptionCard } from '../../components/settings/ui';

interface TestEmailState {
  showTestEmail: boolean;
  setShowTestEmail: (v: boolean) => void;
  testEmail: string;
  setTestEmail: (v: string) => void;
  testResult: { ok: boolean; message: string } | null;
  setTestResult: (v: { ok: boolean; message: string } | null) => void;
  testLoading: boolean;
  handleTestEmail: () => Promise<void>;
}

export function CommentSection({ form, ...t }: { form: UseFormReturn<SettingsData> } & TestEmailState) {
  const { register, watch, setValue } = form;
  const {
    showTestEmail,
    setShowTestEmail,
    testEmail,
    setTestEmail,
    testResult,
    setTestResult,
    testLoading,
    handleTestEmail,
  } = t;
  return (
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
              onClick={() => setShowTestEmail(!showTestEmail)}
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
  );
}
