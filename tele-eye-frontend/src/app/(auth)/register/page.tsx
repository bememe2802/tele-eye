'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/layout/AuthLayout';
import { authApi } from '@/lib/api';

interface RegisterForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>();
  const router = useRouter();

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await authApi.register({ email: data.email, password: data.password, fullName: data.fullName });
      toast.success('Đăng ký thành công!');
      router.push('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Đăng ký thất bại';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md animate-fadeIn">
        <div className="card p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-sky-500 mb-1">Tạo tài khoản Tele-Eye</h1>
            <p className="text-slate-500 text-sm">Bắt đầu hành trình chăm sóc sức khoẻ mắt của bạn</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="label">Họ và tên</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="Nguyễn Văn A"
                  className={`input pl-10 ${errors.fullName ? 'input-error' : ''}`}
                  {...register('fullName', { required: 'Vui lòng nhập họ tên' })}
                />
              </div>
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
            </div>

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
                  placeholder="Ít nhất 6 ký tự"
                  className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                  {...register('password', { required: 'Vui lòng nhập mật khẩu', minLength: { value: 6, message: 'Mật khẩu ít nhất 6 ký tự' } })}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label className="label">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu"
                  className={`input pl-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                  {...register('confirmPassword', {
                    required: 'Vui lòng xác nhận mật khẩu',
                    validate: (v) => v === watch('password') || 'Mật khẩu không khớp',
                  })}
                />
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn-lg w-full mt-2">
              {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Đăng ký <ArrowRight size={18} /></>}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Đã có tài khoản?{' '}
            <Link href="/login" className="text-sky-500 font-semibold hover:underline">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
