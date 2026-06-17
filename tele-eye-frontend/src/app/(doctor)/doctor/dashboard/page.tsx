'use client';
import { useEffect, useState } from 'react';
import { Clock, CheckCircle2, Video, User, FileText, Play } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { appointmentApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Appointment } from '@/types';
import toast from 'react-hot-toast';
import CompleteModal from '@/components/doctor/CompleteModal';

const statusMap: Record<string, { label: string; cls: string }> = {
  CONFIRMED:   { label: 'Đã xác nhận', cls: 'badge-blue' },
  IN_PROGRESS: { label: 'Đang khám',   cls: 'badge-teal' },
  COMPLETED:   { label: 'Hoàn thành',  cls: 'badge-green' },
};

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<Appointment | null>(null);
  const { user } = useAuthStore();

  const load = async () => {
    try {
      const r = await appointmentApi.getTodayForDoctor();
      setAppointments(r.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleStart = async (id: number) => {
    try {
      await appointmentApi.startAppointment(id);
      toast.success('Ca khám đã bắt đầu!');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Không thể bắt đầu ca khám';
      toast.error(msg);
    }
  };

  const confirmed = appointments.filter(a => a.status === 'CONFIRMED').length;
  const inProgress = appointments.filter(a => a.status === 'IN_PROGRESS').length;
  const completed = appointments.filter(a => a.status === 'COMPLETED').length;

  return (
    <DashboardLayout allowedRoles={['DOCTOR']}>
      <div className="mb-8">
        <h1 className="page-title">Lịch khám hôm nay</h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Chờ khám', value: confirmed, icon: <Clock size={20} className="text-blue-500" />, bg: 'bg-blue-50' },
          { label: 'Đang khám', value: inProgress, icon: <Video size={20} className="text-teal-500" />, bg: 'bg-teal-50' },
          { label: 'Đã xong', value: completed, icon: <CheckCircle2 size={20} className="text-green-500" />, bg: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className="card card-body flex items-center gap-4">
            <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-sm text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Appointment list */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="card card-body"><div className="skeleton h-20 rounded-xl" /></div>)}
        </div>
      ) : appointments.length === 0 ? (
        <div className="card card-body text-center py-16">
          <Clock size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Không có lịch khám nào hôm nay</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map(appt => {
            const s = statusMap[appt.status] || { label: appt.status, cls: 'badge-gray' };
            return (
              <div key={appt.appointment_id} className="card card-body">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center text-violet-700 font-bold shrink-0">
                      {appt.patient?.full_name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{appt.patient?.full_name || 'Bệnh nhân'}</p>
                      <p className="text-sm text-slate-400 mt-0.5">
                        <Clock size={12} className="inline mr-1" />
                        {appt.slot?.start_time} – {appt.slot?.end_time}
                      </p>
                      {appt.medical_record?.chief_complaint && (
                        <p className="text-sm text-slate-500 mt-2 bg-slate-50 rounded-lg px-3 py-2 max-w-lg">
                          <FileText size={12} className="inline mr-1 text-slate-400" />
                          {appt.medical_record.chief_complaint}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={s.cls}>{s.label}</span>
                    {appt.status === 'CONFIRMED' && (
                      <button onClick={() => handleStart(appt.appointment_id)} className="btn-primary btn-sm">
                        <Play size={14} /> Bắt đầu
                      </button>
                    )}
                    {appt.status === 'IN_PROGRESS' && (
                      <>
                        {appt.meeting_link && (
                          <a href={appt.meeting_link} target="_blank" rel="noopener" className="btn-secondary btn-sm">
                            <Video size={14} /> Vào phòng
                          </a>
                        )}
                        <button onClick={() => setCompleting(appt)} className="btn-primary btn-sm">
                          <CheckCircle2 size={14} /> Kết thúc
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {completing && (
        <CompleteModal
          appointment={completing}
          onClose={() => setCompleting(null)}
          onDone={() => { setCompleting(null); load(); }}
        />
      )}
    </DashboardLayout>
  );
}
