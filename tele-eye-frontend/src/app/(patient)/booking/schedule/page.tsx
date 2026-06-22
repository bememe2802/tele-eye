'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Clock, Calendar, ArrowRight } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { scheduleApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { CalendarSlot } from '@/types';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function BookingSchedulePage() {
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [locking, setLocking] = useState(false);
  const router = useRouter();

  // Build range from today through the end of next week.
  const today = startOfToday();
  const endOfNextWeek = addDays(today, ((7 - today.getDay()) % 7) + 7);
  const dayCount = Math.round((endOfNextWeek.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const days = [...Array(dayCount)].map((_, i) => addDays(today, i));

  // FIX: Tính offset để ngày đầu tiên rơi đúng cột trong tuần
  // date-fns getDay(): 0=CN, 1=T2, ..., 6=T7
  // Header order: CN(0), T2(1), T3(2), T4(3), T5(4), T6(5), T7(6)
  const startDayOfWeek = days[0].getDay(); // 0=CN, 1=T2, ...
  const paddingCells = Array(startDayOfWeek).fill(null);

  useEffect(() => {
    setLoading(true);
    const doctorId = sessionStorage.getItem('booking_doctor_id');
    const params: Record<string, unknown> = { date: format(selectedDate, 'yyyy-MM-dd') };
    if (doctorId) params.doctorId = doctorId;
    scheduleApi.getAvailableSlots(params)
      .then(r => setSlots(r.data))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const handleNext = async () => {
    if (!selectedSlot) return toast.error('Vui lòng chọn khung giờ');
    setLocking(true);
    try {
      await scheduleApi.lockSlot(selectedSlot.slot_id);
      sessionStorage.setItem('booking_slot', JSON.stringify(selectedSlot));
      router.push('/booking/confirm');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Không thể giữ chỗ';
      toast.error(msg);
    } finally {
      setLocking(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['PATIENT']}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <button onClick={() => router.back()} className="hover:text-sky-500 flex items-center gap-1">
          <ChevronLeft size={14} /> Chọn bác sĩ
        </button>
        <ChevronRight size={14} />
        <span className="text-sky-500 font-medium">Chọn ngày & giờ</span>
      </div>

      <h1 className="page-title mb-2">Chọn ngày & giờ khám</h1>
      <p className="text-slate-500 text-sm mb-8">Bước 2: Chọn thời gian phù hợp với lịch của bạn</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="card card-body">
          <h2 className="section-title flex items-center gap-2 mb-5">
            <Calendar size={18} className="text-sky-500" />
            Chọn ngày khám
          </h2>

          {/* Day picker */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Header */}
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
            ))}
            {/* FIX: Ô trống padding để ngày đầu tiên rơi đúng cột thứ */}
            {paddingCells.map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {/* Các ngày */}
            {days.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => { setSelectedDate(day); setSelectedSlot(null); }}
                  className={`aspect-square rounded-xl text-sm font-medium transition-all
                    ${isSelected ? 'bg-sky-500 text-white shadow-md' : 'hover:bg-sky-50 text-slate-700'}`}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          <div className="mt-5 p-3 bg-sky-50 rounded-xl">
            <p className="text-sm font-semibold text-sky-700 flex items-center gap-2">
              <Calendar size={14} />
              {format(selectedDate, 'EEEE, dd/MM/yyyy', { locale: vi })}
            </p>
          </div>
        </div>

        {/* Time slots */}
        <div className="card card-body">
          <h2 className="section-title flex items-center gap-2 mb-5">
            <Clock size={18} className="text-sky-500" />
            Chọn khung giờ
          </h2>

          {loading ? (
            <div className="grid grid-cols-2 gap-2">
              {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-10">
              <Clock size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Không có lịch trống ngày này</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {slots.map((slot) => {
                const isSelected = selectedSlot?.slot_id === slot.slot_id;
                return (
                  <button
                    key={slot.slot_id}
                    onClick={() => setSelectedSlot(isSelected ? null : slot)}
                    disabled={slot.is_locked}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all text-left
                      ${isSelected ? 'border-sky-500 bg-sky-50 text-sky-600' :
                        slot.is_locked ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed' :
                          'border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700'}`}
                  >
                    <p className="font-semibold">{slot.start_time} – {slot.end_time}</p>
                    <p className="text-xs mt-0.5 text-slate-400">{slot.is_locked ? 'Đã đặt' : formatCurrency(slot.price)}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Summary */}
          {selectedSlot && (
            <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wide">Thông tin đặt lịch</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Bác sĩ:</span>
                  <span className="font-semibold text-slate-800">{selectedSlot.doctor.full_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Ngày:</span>
                  <span className="font-semibold text-slate-800">{format(selectedDate, 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Giờ:</span>
                  <span className="font-semibold text-slate-800">{selectedSlot.start_time} – {selectedSlot.end_time}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Phí khám:</span>
                  <span className="font-bold text-sky-500">{formatCurrency(selectedSlot.price)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <button onClick={() => router.back()} className="btn-secondary flex-1">
              <ChevronLeft size={16} /> Quay lại
            </button>
            <button onClick={handleNext} disabled={!selectedSlot || locking} className="btn-primary flex-1">
              {locking ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Tiếp theo <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
