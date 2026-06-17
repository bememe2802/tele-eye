'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Calendar, Wallet, Bell, User,
  Settings, LogOut, Eye, Stethoscope, Users,
  Pill, ClipboardList, Clock,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import { cn, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const patientNav: NavItem[] = [
  { label: 'Tổng quan', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Đặt lịch khám', href: '/booking', icon: <Calendar size={18} /> },
  { label: 'Lịch hẹn của tôi', href: '/appointments', icon: <ClipboardList size={18} /> },
  { label: 'Thông báo', href: '/notifications', icon: <Bell size={18} /> },
  { label: 'Hồ sơ cá nhân', href: '/profile', icon: <User size={18} /> },
];

const doctorNav: NavItem[] = [
  { label: 'Tổng quan', href: '/doctor/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Lịch hôm nay', href: '/doctor/appointments', icon: <Clock size={18} /> },
  { label: 'Lịch làm việc', href: '/doctor/schedule', icon: <Calendar size={18} /> },
  { label: 'Hồ sơ bác sĩ', href: '/doctor/profile', icon: <Stethoscope size={18} /> },
];

const adminNav: NavItem[] = [
  { label: 'Tổng quan', href: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Quản lý bác sĩ', href: '/admin/doctors', icon: <Users size={18} /> },
  { label: 'Danh mục thuốc', href: '/admin/drugs', icon: <Pill size={18} /> },
];

export default function Sidebar() {
  const { user, logout, refreshToken } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  const navItems =
    user?.role === 'DOCTOR' ? doctorNav :
      user?.role === 'ADMIN' ? adminNav :
        patientNav;

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch { }
    logout();
    router.replace('/login');
    toast.success('Đã đăng xuất');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-white border-r border-slate-100 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100">
        <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center shadow-sm">
          <Eye size={18} className="text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-slate-900">Tele-Eye</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'sidebar-item',
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'sidebar-item-active'
                : ''
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-100 p-3 space-y-0.5">
        <button className="sidebar-item w-full">
          <Settings size={18} />
          <span>Cài đặt</span>
        </button>
        <button onClick={handleLogout} className="sidebar-item w-full text-red-500 hover:bg-red-50 hover:text-red-600">
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </button>
        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl bg-slate-50">
          <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.email ? getInitials(user.email) : 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{user?.email}</p>
            <p className="text-xs text-slate-400">{
              user?.role === 'DOCTOR' ? 'Bác sĩ' :
                user?.role === 'ADMIN' ? 'Quản trị viên' :
                  'Bệnh nhân'
            }</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
