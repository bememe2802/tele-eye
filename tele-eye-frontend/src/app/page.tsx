'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user?.role === 'PATIENT') router.replace('/dashboard');
    else if (user?.role === 'DOCTOR') router.replace('/doctor/dashboard');
    else if (user?.role === 'ADMIN') router.replace('/admin/dashboard');
    else router.replace('/login');
  }, [isAuthenticated, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-sky-500 border-t-transparent animate-spin" />
        <p className="text-slate-500 text-sm">Đang tải...</p>
      </div>
    </div>
  );
}
