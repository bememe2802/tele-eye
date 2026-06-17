'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, X, Search, CheckCircle2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { doctorApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Doctor } from '@/types';
import toast from 'react-hot-toast';

interface CreateForm {
  email: string; password: string; full_name: string; title: string;
  license_number: string; consultation_fee: number;
}

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<CreateForm>();

  const load = () => {
    doctorApi.getAll().then(r => { setDoctors(r.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (data: CreateForm) => {
    try {
      await doctorApi.create({ ...data, consultation_fee: +data.consultation_fee });
      toast.success('Tạo bác sĩ thành công!');
      setShowCreate(false);
      reset();
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Tạo thất bại';
      toast.error(msg);
    }
  };

  const filtered = doctors.filter(d =>
    d.full_name.toLowerCase().includes(search.toLowerCase()) ||
    d.specializations.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout allowedRoles={['ADMIN']}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Quản lý bác sĩ</h1>
          <p className="text-slate-500 text-sm mt-1">{doctors.length} bác sĩ trong hệ thống</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> Thêm bác sĩ
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-10 max-w-sm" placeholder="Tìm theo tên hoặc chuyên khoa..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Bác sĩ</th><th>Chuyên khoa</th><th>Phí khám</th><th>Trạng thái</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={5}><div className="skeleton h-10 rounded-lg" /></td></tr>
                ))
              ) : filtered.map(doc => (
                <tr key={doc.doctor_id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-sky-100 rounded-xl flex items-center justify-center text-sky-700 font-bold text-sm shrink-0">
                        {doc.full_name.split(' ').pop()?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{doc.full_name}</p>
                        {doc.title && <p className="text-xs text-slate-400">{doc.title}</p>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {doc.specializations.slice(0, 2).map(s => <span key={s} className="badge-blue text-xs">{s}</span>)}
                      {doc.specializations.length > 2 && <span className="badge-gray">+{doc.specializations.length - 2}</span>}
                    </div>
                  </td>
                  <td className="font-semibold text-sky-500">{formatCurrency(doc.consultation_fee)}</td>
                  <td>
                    {doc.is_verified
                      ? <span className="badge-green flex items-center gap-1 w-fit"><CheckCircle2 size={12} />Đã xác minh</span>
                      : <span className="badge-yellow">Chờ xác minh</span>}
                  </td>
                  <td>
                    <button className="btn-ghost btn-sm"><Pencil size={14} /> Sửa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-backdrop">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="section-title">Thêm bác sĩ mới</h3>
              <button onClick={() => setShowCreate(false)} className="btn-icon btn-ghost"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal-body grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Họ và tên *</label>
                  <input className={`input ${errors.full_name ? 'input-error' : ''}`} placeholder="BS. Nguyễn Văn A" {...register('full_name', { required: true })} />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input type="email" className={`input ${errors.email ? 'input-error' : ''}`} {...register('email', { required: true })} />
                </div>
                <div>
                  <label className="label">Mật khẩu *</label>
                  <input type="password" className={`input ${errors.password ? 'input-error' : ''}`} {...register('password', { required: true, minLength: 6 })} />
                </div>
                <div>
                  <label className="label">Chức danh</label>
                  <input className="input" placeholder="VD: ThS.BS" {...register('title')} />
                </div>
                <div>
                  <label className="label">Số CCHN</label>
                  <input className="input" placeholder="CCHN-123456" {...register('license_number')} />
                </div>
                <div className="col-span-2">
                  <label className="label">Phí khám (VNĐ) *</label>
                  <input type="number" className={`input ${errors.consultation_fee ? 'input-error' : ''}`} placeholder="500000" {...register('consultation_fee', { required: true, min: 0 })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Huỷ</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Tạo bác sĩ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
