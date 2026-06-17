'use client';
import { Users, Pill, Calendar, TrendingUp } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';

export default function AdminDashboard() {
  const stats = [
    { label: 'Tổng bác sĩ', value: '24', icon: <Users size={22} className="text-blue-500" />, bg: 'bg-blue-50', href: '/admin/doctors' },
    { label: 'Danh mục thuốc', value: '48', icon: <Pill size={22} className="text-green-500" />, bg: 'bg-green-50', href: '/admin/drugs' },
    { label: 'Lịch hẹn hôm nay', value: '12', icon: <Calendar size={22} className="text-sky-500" />, bg: 'bg-sky-50', href: '#' },
    { label: 'Doanh thu tháng', value: '18.5M', icon: <TrendingUp size={22} className="text-violet-500" />, bg: 'bg-violet-50', href: '#' },
  ];

  return (
    <DashboardLayout allowedRoles={['ADMIN']}>
      <div className="mb-8">
        <h1 className="page-title">Bảng điều khiển Admin</h1>
        <p className="text-slate-500 text-sm mt-1">Tổng quan hệ thống Tele-Eye</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map(s => (
          <Link key={s.label} href={s.href} className="card card-hover card-body flex items-center gap-4">
            <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/admin/doctors" className="card overflow-hidden hover:shadow-card-hover transition-all">
          <div className="bg-sky-600 p-6 text-white">
            <Users size={32} className="mb-3 opacity-90" />
            <h3 className="text-lg font-bold mb-1">Quản lý bác sĩ</h3>
            <p className="text-blue-100 text-sm">Thêm mới, chỉnh sửa thông tin bác sĩ và chuyên khoa</p>
          </div>
          <div className="p-5">
            <span className="btn-primary btn-sm">Vào quản lý →</span>
          </div>
        </Link>

        <Link href="/admin/drugs" className="card overflow-hidden hover:shadow-card-hover transition-all">
          <div className="bg-green-600 p-6 text-white">
            <Pill size={32} className="mb-3 opacity-90" />
            <h3 className="text-lg font-bold mb-1">Danh mục thuốc</h3>
            <p className="text-green-100 text-sm">Quản lý danh mục thuốc nhãn khoa trong hệ thống</p>
          </div>
          <div className="p-5">
            <span className="btn-primary btn-sm">Vào quản lý →</span>
          </div>
        </Link>
      </div>
    </DashboardLayout>
  );
}
