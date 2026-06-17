'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Eye, FileText, ArrowRight, CheckCircle2, AlertCircle, Video } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { patientApi, appointmentApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Patient, Appointment } from '@/types';
import Link from 'next/link';

const statusLabel: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  CONFIRMED: 'Đã xác nhận',
  IN_PROGRESS: 'Đang khám',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã huỷ',
  REFUNDED: 'Đã hoàn tiền',
};

export default function PatientDashboard() {
  const [profile, setProfile] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, aRes] = await Promise.all([
          patientApi.getProfile(),
          appointmentApi.getMyAppointments(),
        ]);
        setProfile(pRes.data);
        setAppointments(aRes.data);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const upcomingCount = appointments.filter(a => a.status === 'CONFIRMED').length;
  const completedCount = appointments.filter(a => a.status === 'COMPLETED').length;

  return (
    <DashboardLayout allowedRoles={['PATIENT']}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="page-title">Xin chào, {profile?.full_name || user?.email?.split('@')[0]} 👋</h1>
        <p className="text-slate-500 text-sm mt-1">Chúc bạn một ngày tốt lành. Hãy chăm sóc đôi mắt của bạn mỗi ngày.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {[
          { icon: <Calendar className="text-sky-500" size={22} />, label: 'Lịch sắp tới', value: upcomingCount, color: 'bg-sky-50' },
          { icon: <CheckCircle2 className="text-green-500" size={22} />, label: 'Đã hoàn thành', value: completedCount, color: 'bg-green-50' },
          { icon: <Eye className="text-teal-500" size={22} />, label: 'Hồ sơ bệnh án', value: completedCount, color: 'bg-teal-50' },
        ].map((stat) => (
          <div key={stat.label} className="card card-body flex items-center gap-4">
            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center shrink-0`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="card overflow-hidden">
          <div className="bg-sky-500 p-6 text-white">
            <Calendar size={32} className="mb-3 opacity-90" />
            <h3 className="text-lg font-bold mb-1">Đặt lịch khám mắt</h3>
            <p className="text-sky-100 text-sm">Tìm bác sĩ phù hợp và đặt lịch ngay hôm nay</p>
          </div>
          <div className="p-5">
            <Link href="/booking" className="btn-primary w-full justify-center">
              Đặt lịch ngay <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="bg-violet-600 p-6 text-white">
            <FileText size={32} className="mb-3 opacity-90" />
            <h3 className="text-lg font-bold mb-1">Hồ sơ sức khoẻ</h3>
            <p className="text-violet-200 text-sm">Xem thông tin cá nhân và lịch sử khám</p>
          </div>
          <div className="p-5">
            <Link href="/profile" className="btn-secondary w-full justify-center">
              Xem hồ sơ <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Profile card */}
      {profile && (
        <div className="card card-body">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title">Thông tin cá nhân</h2>
            <Link href="/profile" className="text-sky-500 text-sm font-semibold hover:underline flex items-center gap-1">
              Chỉnh sửa <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Email', value: profile.user?.email },
              { label: 'Số điện thoại', value: profile.phone_number || '—' },
              { label: 'Giới tính', value: profile.gender === 'MALE' ? 'Nam' : profile.gender === 'FEMALE' ? 'Nữ' : '—' },
              { label: 'Ngày sinh', value: profile.date_of_birth ? formatDate(profile.date_of_birth) : '—' },
              { label: 'Địa chỉ', value: profile.address || '—' },
            ].map((row) => (
              <div key={row.label} className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">{row.label}</p>
                <p className="text-sm font-semibold text-slate-800">{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
