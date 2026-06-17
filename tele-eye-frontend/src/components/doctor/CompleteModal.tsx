'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Plus, Trash2 } from 'lucide-react';
import { appointmentApi, drugApi } from '@/lib/api';
import type { Appointment, Drug } from '@/types';
import toast from 'react-hot-toast';

interface Props {
  appointment: Appointment;
  onClose: () => void;
  onDone: () => void;
}

interface PrescItem { drug_id: number; quantity: number; dosage: string; note: string; }

export default function CompleteModal({ appointment, onClose, onDone }: Props) {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [items, setItems] = useState<PrescItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm();

  useEffect(() => {
    drugApi.getAll().then(r => setDrugs(r.data)).catch(() => {});
  }, []);

  const addItem = () => setItems(prev => [...prev, { drug_id: 0, quantity: 1, dosage: '', note: '' }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof PrescItem, val: string | number) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const onSubmit = async (data: Record<string, unknown>) => {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { ...data };
      if (items.length > 0) {
        payload.drug_prescription = items.filter(i => i.drug_id > 0);
      }
      await appointmentApi.completeAppointment(appointment.appointment_id, payload);
      toast.success('Ca khám hoàn tất! Email đã gửi cho bệnh nhân.');
      onDone();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Lỗi khi kết thúc ca khám';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal modal-lg max-h-[90vh] overflow-y-auto">
        <div className="modal-header sticky top-0 bg-white z-10">
          <h3 className="section-title">Kết thúc ca khám & Lập bệnh án</h3>
          <button onClick={onClose} className="btn-icon btn-ghost"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modal-body space-y-5">
            <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-600">
              Bệnh nhân: <strong>{appointment.patient?.full_name}</strong> |
              Triệu chứng: <em>{appointment.medical_record?.chief_complaint}</em>
            </div>

            {/* Diagnosis */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Chẩn đoán mắt phải (OD)</label>
                <input className="input" placeholder="VD: Viêm kết mạc" {...register('diagnosis_od')} />
              </div>
              <div>
                <label className="label">Chẩn đoán mắt trái (OS)</label>
                <input className="input" placeholder="VD: Bình thường" {...register('diagnosis_os')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Mã ICD-10</label>
                <input className="input" placeholder="VD: H10.9" {...register('icd_10_code')} />
              </div>
              <div>
                <label className="label">Kế hoạch điều trị</label>
                <input className="input" placeholder="VD: Nhỏ thuốc theo đơn" {...register('management_plan')} />
              </div>
            </div>

            <div>
              <label className="label">Ghi chú bác sĩ</label>
              <textarea rows={2} className="input resize-none" placeholder="Các ghi chú thêm..." {...register('doctor_notes')} />
            </div>

            {/* Drug prescription */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="label mb-0">Kê đơn thuốc</label>
                <button type="button" onClick={addItem} className="btn-secondary btn-sm">
                  <Plus size={14} /> Thêm thuốc
                </button>
              </div>
              {items.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4 bg-slate-50 rounded-xl">Chưa có đơn thuốc</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center p-3 bg-slate-50 rounded-xl">
                      <div className="col-span-4">
                        <select className="input text-xs" value={item.drug_id} onChange={e => updateItem(i, 'drug_id', +e.target.value)}>
                          <option value={0}>-- Chọn thuốc --</option>
                          {drugs.map(d => <option key={d.drug_id} value={d.drug_id}>{d.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input type="number" min={1} className="input text-xs" placeholder="SL" value={item.quantity} onChange={e => updateItem(i, 'quantity', +e.target.value)} />
                      </div>
                      <div className="col-span-3">
                        <input className="input text-xs" placeholder="Liều dùng" value={item.dosage} onChange={e => updateItem(i, 'dosage', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <input className="input text-xs" placeholder="Ghi chú" value={item.note} onChange={e => updateItem(i, 'note', e.target.value)} />
                      </div>
                      <button type="button" onClick={() => removeItem(i)} className="col-span-1 text-red-400 hover:text-red-600 p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Glasses prescription */}
            <div>
              <label className="label mb-3">Đơn kính (tuỳ chọn)</label>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-slate-500 mb-2">
                  <span>Mắt</span><span>Sphere</span><span>Cylinder</span><span>Axis</span><span>PD</span>
                </div>
                {['od', 'os'].map(eye => (
                  <div key={eye} className="grid grid-cols-5 gap-2 mb-2">
                    <div className="flex items-center text-xs font-bold text-slate-600">{eye.toUpperCase()}</div>
                    {['sphere', 'cylinder', 'axis', 'pd'].map(f => (
                      <input key={f} type="number" step="0.25" className="input text-xs" placeholder="0" {...register(`glasses_prescription.${eye}_${f}` as never)} />
                    ))}
                  </div>
                ))}
                <textarea rows={1} className="input resize-none text-xs mt-2" placeholder="Ghi chú đơn kính..." {...register('glasses_prescription.notes')} />
              </div>
            </div>
          </div>

          <div className="modal-footer sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="btn-secondary">Huỷ</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Lưu & Kết thúc ca khám'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
