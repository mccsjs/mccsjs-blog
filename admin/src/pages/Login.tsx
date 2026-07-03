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
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(8, '密码至少 8 位'),
  name: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, signup, session } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', name: '' },
  });

  useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      if (isSignUp) {
        await signup(data.email, data.password, data.name || data.email);
      } else {
        await login(data.email, data.password);
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2 className="login-title">管理系统</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="login-form">
          {isSignUp && (
            <div className="form-item">
              <Label htmlFor="name" className="form-label">昵称</Label>
              <Input id="name" placeholder="昵称" {...register('name')} className="form-input" />
            </div>
          )}

          <div className="form-item">
            <Label htmlFor="email" className="form-label">邮箱</Label>
            <Input
              id="email"
              type="email"
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
            {isSubmitting ? '处理中...' : isSignUp ? '注 册' : '登 录'}
          </Button>

          <div className="login-switch">
            {isSignUp ? '已有账号？' : '还没有账号？'}
            <button
              type="button"
              onClick={() => {
                setIsSignUp((v) => !v);
                setError(null);
              }}
              className="switch-link"
            >
              {isSignUp ? '去登录' : '去注册'}
            </button>
          </div>
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
          background: #f0f2f5;
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 40px 32px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        }
        .login-title {
          text-align: center;
          margin: 0 0 32px;
          font-size: 22px;
          font-weight: 600;
          color: #303133;
        }
        .login-form {
          margin-top: 8px;
        }
        .form-item {
          margin-bottom: 18px;
        }
        .form-label {
          display: block;
          margin-bottom: 6px;
          font-size: 14px;
          font-weight: 500;
          color: #303133;
        }
        .form-input {
          width: 100%;
          height: 40px;
          padding: 0 15px;
          border: 1px solid #dcdfe6;
          border-radius: 6px;
          font-size: 14px;
          color: #303133;
          background: #fff;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-input:hover {
          border-color: #c0c4cc;
        }
        .form-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
        }
        .form-error {
          margin-top: 4px;
          font-size: 12px;
          color: #f56c6c;
        }
        .form-alert {
          margin-bottom: 18px;
          padding: 8px 12px;
          border-radius: 6px;
          background: #fef0f0;
          color: #f56c6c;
          font-size: 13px;
        }
        .form-submit {
          width: 100%;
          height: 40px;
          font-size: 14px;
          font-weight: 500;
        }
        .login-switch {
          margin-top: 16px;
          text-align: center;
          font-size: 14px;
          color: #909399;
        }
        .switch-link {
          margin-left: 4px;
          background: none;
          border: none;
          padding: 0;
          font-size: 14px;
          color: #6366f1;
          cursor: pointer;
        }
        .switch-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
