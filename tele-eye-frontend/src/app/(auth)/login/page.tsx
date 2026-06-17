'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/layout/AuthLayout';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { jwtDecode } from 'jwt-decode';

interface LoginForm {
  email: string;
  password: string;
}

function decodeToken(token: string) {
  try {
    return jwtDecode<{ sub: number; email: string; role: string }>(token);
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      const { accessToken, refreshToken, role } = res.data;
      const decoded = decodeToken(accessToken);
      if (!decoded) throw new Error('Invalid token');
      setAuth({ userId: decoded.sub, email: decoded.email, role: decoded.role as never }, accessToken, refreshToken);
      toast.success('Đăng nhập thành công!');
      if (role === 'DOCTOR') router.replace('/doctor/dashboard');
      else if (role === 'ADMIN') router.replace('/admin/dashboard');
      else router.replace('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Đăng nhập thất bại';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md animate-fadeIn">
        <div className="card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Mail size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Chào mừng trở lại!</h1>
            <p className="text-slate-500 text-sm">Đăng nhập để tiếp tục chăm sóc sức khoẻ mắt của bạn</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="email@example.com"
                  className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                  {...register('email', { required: 'Vui lòng nhập email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email không hợp lệ' } })}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="label">Mật khẩu</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                  {...register('password', { required: 'Vui lòng nhập mật khẩu', minLength: { value: 6, message: 'Mật khẩu ít nhất 6 ký tự' } })}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn-lg w-full mt-2">
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Đăng nhập <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Chưa có tài khoản?{' '}
            <Link href="/register" className="text-sky-500 font-semibold hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
