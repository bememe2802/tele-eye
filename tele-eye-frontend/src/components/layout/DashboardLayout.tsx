'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Sidebar from './Sidebar';

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function DashboardLayout({ children, allowedRoles }: Props) {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.replace('/');
    }
  }, [isAuthenticated, user, allowedRoles, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 ml-[240px] min-h-screen">
        <div className="p-8 max-w-6xl mx-auto animate-fadeIn">
          {children}
        </div>
      </main>
    </div>
  );
}
