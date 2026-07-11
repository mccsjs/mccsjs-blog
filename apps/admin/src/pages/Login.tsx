import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const schema = z.object({
  email: z.string().min(1, '请输入邮箱'),
  password: z.string().min(1, '请输入密码'),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const { login, session } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await login(data.email, data.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2 className="login-title">登录</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="login-form">
          <div className="form-item">
            <Label htmlFor="email" className="form-label">邮箱</Label>
            <Input
              id="email"
              type="text"
              placeholder="邮箱"
              {...register('email')}
              className="form-input"
            />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>

          <div className="form-item">
            <Label htmlFor="password" className="form-label">密码</Label>
            <Input
              id="password"
              type="password"
              placeholder="密码"
              {...register('password')}
              className="form-input"
            />
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>

          {error && <div className="form-alert">{error}</div>}

          <Button type="submit" className="form-submit" disabled={isSubmitting}>
            {isSubmitting ? '处理中...' : '登录'}
          </Button>
        </form>
      </div>

      <style>{`
        .login-page {
          position: fixed;
          inset: 0;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-soft);
        }
        .login-card {
          width: 100%;
          max-width: 380px;
          padding: 40px 32px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 10px;
          box-shadow: 0 1px 3px 0 rgb(var(--shadow-color) / 0.05);
        }
        .login-title {
          margin: 0 0 28px;
          font-size: 20px;
          font-weight: 600;
          color: var(--text-h);
        }
        .form-item {
          margin-bottom: 18px;
        }
        .form-label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-h);
        }
        .form-input {
          width: 100%;
          height: 42px;
          padding: 0 14px;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 14px;
          color: var(--text-h);
          background: var(--bg-soft);
          outline: none;
        }
        .form-input:hover {
          border-color: var(--border-strong);
          background: var(--bg);
        }
        .form-input:focus {
          border-color: var(--accent);
          background: var(--bg);
          box-shadow: 0 0 0 3px var(--accent-bg);
        }
        .form-error {
          margin-top: 5px;
          font-size: 12px;
          color: #dc2626;
        }
        .form-alert {
          margin-bottom: 18px;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid rgba(220, 38, 38, 0.15);
          background: rgba(220, 38, 38, 0.06);
          color: #dc2626;
          font-size: 13px;
        }
        .form-submit {
          width: 100%;
          height: 42px;
          font-size: 14px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
