'use client';
import { useEffect, useState } from 'react';
import { Video, FileText, Calendar } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { appointmentApi } from '@/lib/api';
import type { Appointment } from '@/types';
import Link from 'next/link';

const statusMap: Record<string, { label: string; cls: string }> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', cls: 'badge-yellow' },
  CONFIRMED:       { label: 'Đã xác nhận',    cls: 'badge-blue' },
  IN_PROGRESS:     { label: 'Đang khám',       cls: 'badge-teal' },
  COMPLETED:       { label: 'Hoàn thành',      cls: 'badge-green' },
  CANCELLED:       { label: 'Đã huỷ',          cls: 'badge-red' },
  REFUNDED:        { label: 'Đã hoàn tiền',    cls: 'badge-gray' },
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const filters = ['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
  const filterLabels: Record<string, string> = {
    ALL: 'Tất cả',
    CONFIRMED: 'Sắp tới',
    COMPLETED: 'Đã hoàn thành',
    CANCELLED: 'Đã huỷ',
  };

  useEffect(() => {
    appointmentApi.getMyAppointments()
      .then(r => setAppointments(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = appointments.filter(
    a => filter === 'ALL' || a.status === filter,
  );

  return (
    <DashboardLayout allowedRoles={['PATIENT']}>
      <h1 className="page-title mb-6">Lịch hẹn của tôi</h1>

      <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              filter === f
                ? 'bg-white text-sky-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card card-body h-24 animate-pulse bg-slate-100 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card card-body text-center py-16">
          <Calendar size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Không có lịch hẹn nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(appt => {
            const s = statusMap[appt.status] || { label: appt.status, cls: 'badge-gray' };
            const dateStr = appt.slot?.date_slot
              ? new Date(appt.slot.date_slot).toLocaleDateString('vi-VN')
              : '—';
            const timeStr = appt.slot
              ? `${appt.slot.start_time} – ${appt.slot.end_time}`
              : '—';
            const doctorName = appt.doctor?.full_name ?? '—';
            const specializations: any[] = (appt.doctor as any)?.specializations ?? [];
            const specNames = specializations
              .map((s: any) => s.spec?.name ?? s)
              .join(', ');

            return (
              <div key={appt.appointment_id} className="card card-body">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center text-sky-700 font-bold text-lg shrink-0">
                      {doctorName.split(' ').pop()?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{doctorName}</p>
                      <p className="text-sm text-slate-400">{specNames}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-sky-400" />
                          {dateStr}
                        </span>
                        <span className="text-slate-300">|</span>
                        <span>{timeStr}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={s.cls}>{s.label}</span>

                    {appt.status === 'CONFIRMED' && appt.meeting_link && (
                      <a
                        href={appt.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5"
                      >
                        <Video size={13} /> Vào phòng khám
                      </a>
                    )}

                    {appt.status === 'COMPLETED' && (
                      <Link
                        href={`/booking/appointments/${appt.appointment_id}/medical-record`}
                        className="btn-secondary text-xs flex items-center gap-1 px-3 py-1.5"
                      >
                        <FileText size={13} /> Xem bệnh án
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
