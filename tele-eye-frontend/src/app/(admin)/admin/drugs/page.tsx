'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, X, Search, Pill } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { drugApi } from '@/lib/api';
import type { Drug } from '@/types';
import toast from 'react-hot-toast';

interface DrugForm { name: string; active_ingredient: string; unit: string; usage_instruction: string; }

export default function AdminDrugsPage() {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Drug | null>(null);
  const [search, setSearch] = useState('');
  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<DrugForm>();

  const load = (s?: string) => {
    drugApi.getAll(s).then(r => { setDrugs(r.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (data: DrugForm) => {
    try {
      if (editing) {
        await drugApi.update(editing.drug_id, data);
        toast.success('Cập nhật thuốc thành công!');
        setEditing(null);
      } else {
        await drugApi.create(data);
        toast.success('Thêm thuốc thành công!');
        setShowCreate(false);
      }
      reset();
      load(search);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Thao tác thất bại';
      toast.error(msg);
    }
  };

  const handleEdit = (drug: Drug) => {
    setEditing(drug);
    setValue('name', drug.name);
    setValue('active_ingredient', drug.active_ingredient || '');
    setValue('unit', drug.unit || '');
    setValue('usage_instruction', drug.usage_instruction || '');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận ngừng kinh doanh thuốc này?')) return;
    try {
      await drugApi.remove(id);
      toast.success('Đã xoá thuốc');
      load(search);
    } catch { toast.error('Xoá thất bại'); }
  };

  const filtered = drugs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  const FormModal = ({ isEdit = false }) => (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3 className="section-title">{isEdit ? 'Chỉnh sửa thuốc' : 'Thêm thuốc mới'}</h3>
          <button onClick={() => { isEdit ? setEditing(null) : setShowCreate(false); reset(); }} className="btn-icon btn-ghost"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modal-body space-y-4">
            <div>
              <label className="label">Tên thuốc *</label>
              <input className="input" placeholder="VD: Systane Ultra 5ml" {...register('name', { required: true })} />
            </div>
            <div>
              <label className="label">Hoạt chất</label>
              <input className="input" placeholder="VD: Polyethylene Glycol 400" {...register('active_ingredient')} />
            </div>
            <div>
              <label className="label">Đơn vị</label>
              <input className="input" placeholder="VD: Lọ, Viên, Hộp" {...register('unit')} />
            </div>
            <div>
              <label className="label">Hướng dẫn sử dụng</label>
              <textarea rows={3} className="input resize-none" placeholder="Nhỏ 1-2 giọt/lần..." {...register('usage_instruction')} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={() => { isEdit ? setEditing(null) : setShowCreate(false); reset(); }} className="btn-secondary">Huỷ</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : isEdit ? 'Lưu thay đổi' : 'Thêm thuốc'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <DashboardLayout allowedRoles={['ADMIN']}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Danh mục thuốc</h1>
          <p className="text-slate-500 text-sm mt-1">{drugs.length} loại thuốc nhãn khoa</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> Thêm thuốc
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-10 max-w-sm" placeholder="Tìm thuốc..." value={search} onChange={e => { setSearch(e.target.value); load(e.target.value); }} />
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Tên thuốc</th><th>Hoạt chất</th><th>Đơn vị</th><th>Trạng thái</th><th>Thao tác</th></tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i}><td colSpan={5}><div className="skeleton h-10 rounded" /></td></tr>)
              ) : filtered.map(drug => (
                <tr key={drug.drug_id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                        <Pill size={14} className="text-green-500" />
                      </div>
                      <span className="font-semibold text-slate-900">{drug.name}</span>
                    </div>
                  </td>
                  <td className="text-slate-500 text-sm">{drug.active_ingredient || '—'}</td>
                  <td><span className="badge-gray">{drug.unit || '—'}</span></td>
                  <td><span className={drug.is_active ? 'badge-green' : 'badge-red'}>{drug.is_active ? 'Hoạt động' : 'Ngừng'}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(drug)} className="btn-ghost btn-sm"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(drug.drug_id)} className="btn-ghost btn-sm text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <FormModal />}
      {editing && <FormModal isEdit />}
    </DashboardLayout>
  );
}
