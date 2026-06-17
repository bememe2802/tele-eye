'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Mail, ShieldCheck, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/layout/AuthLayout';
import { authApi } from '@/lib/api';

function VerifyEmailContent() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const router = useRouter();

  const { register, handleSubmit, formState: { errors } } = useForm<{ token: string }>();

  const onSubmit = async (data: { token: string }) => {
    setLoading(true);
    try {
      await authApi.verifyEmail({ email, token: data.token });
      toast.success('Xác thực thành công! Vui lòng đăng nhập.');
      router.push('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Mã xác thực không đúng';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md animate-fadeIn">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Mail size={32} className="text-sky-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Xác thực email</h1>
          <p className="text-slate-500 text-sm mb-2">
            Chúng tôi đã gửi mã OTP 6 chữ số đến
          </p>
          <p className="text-sky-500 font-semibold text-sm mb-8">{email}</p>

          <form onSubmit={handleSubmit(onSubmit)} className="text-left space-y-5">
            <div>
              <label className="label">Mã xác thực OTP</label>
              <input
                placeholder="Nhập 6 chữ số"
                maxLength={6}
                className={`input text-center text-2xl font-bold tracking-widest ${errors.token ? 'input-error' : ''}`}
                {...register('token', {
                  required: 'Vui lòng nhập mã OTP',
                  minLength: { value: 6, message: 'Mã OTP gồm 6 ký tự' },
                  maxLength: { value: 6, message: 'Mã OTP gồm 6 ký tự' },
                })}
              />
              {errors.token && <p className="text-red-500 text-xs mt-1">{errors.token.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
              {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><ShieldCheck size={18} /> Xác thực<ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthLayout><div className="w-full max-w-md animate-fadeIn" /></AuthLayout>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
