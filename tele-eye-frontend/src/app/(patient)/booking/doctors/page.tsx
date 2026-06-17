'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Star, ChevronRight, Filter } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { doctorApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Doctor } from '@/types';

export default function BookingDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    doctorApi.getAll().then(r => { setDoctors(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = doctors.filter(d =>
    d.full_name.toLowerCase().includes(search.toLowerCase()) ||
    d.specializations.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = (doctorId: number) => {
    sessionStorage.setItem('booking_doctor_id', String(doctorId));
    router.push('/booking/schedule');
  };

  return (
    <DashboardLayout allowedRoles={['PATIENT']}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
          <span>Đặt lịch</span>
          <ChevronRight size={14} />
          <span className="text-sky-500 font-medium">Chọn bác sĩ</span>
        </div>
        <h1 className="page-title">Chọn bác sĩ khám mắt</h1>
        <p className="text-slate-500 text-sm mt-1">Tìm chuyên gia phù hợp với nhu cầu của bạn</p>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên bác sĩ hoặc chuyên khoa..."
            className="input pl-10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-secondary gap-2">
          <Filter size={16} />
          Lọc
        </button>
      </div>

      {/* Doctor grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-16 w-16 rounded-full" />
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-9 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 text-sm">Không tìm thấy bác sĩ phù hợp</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((doc) => (
            <div key={doc.doctor_id} className="card-hover overflow-hidden cursor-pointer" onClick={() => handleSelect(doc.doctor_id)}>
              <div className="p-5">
                {/* Avatar */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-xl shrink-0 overflow-hidden">
                    {doc.avatar_url ? (
                      <img src={doc.avatar_url} alt={doc.full_name} className="w-full h-full object-cover" />
                    ) : (
                      doc.full_name.split(' ').pop()?.charAt(0) || 'D'
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm leading-tight">{doc.full_name}</p>
                    {doc.title && <p className="text-xs text-slate-400 mt-0.5">{doc.title}</p>}
                    <div className="flex items-center gap-1 mt-1.5">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs text-slate-500">
                        {doc.experience_years ? `${doc.experience_years} năm kinh nghiệm` : 'Bác sĩ chuyên khoa'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Specializations */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {doc.specializations.slice(0, 2).map((s) => (
                    <span key={s} className="badge-blue text-xs">{s}</span>
                  ))}
                  {doc.specializations.length > 2 && (
                    <span className="badge-gray">+{doc.specializations.length - 2}</span>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400">Phí khám</p>
                    <p className="text-sky-500 font-bold text-base">{formatCurrency(doc.consultation_fee)}</p>
                  </div>
                  <button className="btn-primary btn-sm" onClick={e => { e.stopPropagation(); handleSelect(doc.doctor_id); }}>
                    Chọn
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
