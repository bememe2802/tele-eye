'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { scheduleApi } from '@/lib/api';
import type { SystemTimeSlot } from '@/types';
import toast from 'react-hot-toast';

const DAY_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

interface AvailDay { day_of_week: number; slots: { availability_id: number; shift_name: string; start_time: string }[]; }

export default function DoctorSchedulePage() {
  const [systemSlots, setSystemSlots] = useState<SystemTimeSlot[]>([]);
  const [myAvail, setMyAvail] = useState<AvailDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [sRes, mRes] = await Promise.all([scheduleApi.getSystemSlots(), scheduleApi.getMyAvailability()]);
      setSystemSlots(sRes.data);
      setMyAvail(mRes.data);
    } catch { }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleDay = (d: number) => setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  const toggleSlot = (id: number) => setSelectedSlots(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = async () => {
    if (selectedDays.length === 0 || selectedSlots.length === 0) return toast.error('Chọn ít nhất 1 ngày và 1 khung giờ');
    setSaving(true);
    try {
      await scheduleApi.registerAvailability({ days_of_week: selectedDays, system_slot_ids: selectedSlots });
      // FIX: Sinh slot thực tế ngay sau khi lưu lịch, không cần chờ cron 0 giờ
      await scheduleApi.generateSlots();
      toast.success('Cập nhật lịch làm việc thành công!');
      setSelectedDays([]); setSelectedSlots([]);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Lỗi khi lưu lịch';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await scheduleApi.deleteAvailability(id);
      toast.success('Đã xoá khung giờ');
      load();
    } catch { toast.error('Xoá thất bại'); }
  };

  return (
    <DashboardLayout allowedRoles={['DOCTOR']}>
      <h1 className="page-title mb-8">Quản lý lịch làm việc</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Register availability */}
        <div className="card card-body space-y-5">
          <h2 className="section-title flex items-center gap-2">
            <Plus size={18} className="text-sky-500" /> Đăng ký lịch mới
          </h2>

          <div>
            <label className="label">Chọn ngày trong tuần</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 0].map(d => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`py-2 rounded-xl text-sm font-medium border transition-all
                    ${selectedDays.includes(d) ? 'border-sky-500 bg-sky-50 text-sky-600' : 'border-slate-200 text-slate-600 hover:border-sky-300'}`}>
                  {DAY_NAMES[d].replace('Thứ ', 'T')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Chọn khung giờ</label>
            {loading ? <div className="skeleton h-32 rounded-xl" /> : (
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {systemSlots.filter((slot, idx, arr) =>
                  arr.findIndex(s => s.shift_name === slot.shift_name) === idx
                ).map(slot => (
                  <button key={slot.slot_template_id} type="button" onClick={() => toggleSlot(slot.slot_template_id)}
                    className={`p-3 rounded-xl border text-sm text-left transition-all
                      ${selectedSlots.includes(slot.slot_template_id) ? 'border-sky-500 bg-sky-50 text-sky-600' : 'border-slate-200 hover:border-sky-300'}`}>
                    <p className="font-semibold">{slot.shift_name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Lưu lịch làm việc'}
          </button>
        </div>

        {/* Current schedule */}
        <div className="card card-body">
          <h2 className="section-title flex items-center gap-2 mb-5">
            <Calendar size={18} className="text-sky-500" /> Lịch làm việc hiện tại
          </h2>
          {loading ? <div className="skeleton h-40 rounded-xl" /> :
            myAvail.length === 0 ? (
              <div className="text-center py-10">
                <Calendar size={36} className="text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Chưa có lịch làm việc</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myAvail.map((day: AvailDay) => (
                  <div key={day.day_of_week} className="bg-slate-50 rounded-xl p-4">
                    <p className="font-semibold text-slate-800 mb-3">{DAY_NAMES[day.day_of_week]}</p>
                    <div className="space-y-1.5">
                      {day.slots.map(slot => (
                        <div key={slot.availability_id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
                          <span className="text-sm text-slate-600">{slot.shift_name}</span>
                          <button onClick={() => handleDelete(slot.availability_id)} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>
    </DashboardLayout>
  );
}