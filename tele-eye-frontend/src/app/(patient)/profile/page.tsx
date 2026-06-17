'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Phone, MapPin, Calendar, Save } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { patientApi } from '@/lib/api';
import type { Patient } from '@/types';
import toast from 'react-hot-toast';

interface ProfileForm {
  full_name: string;
  phone_number: string;
  gender: string;
  date_of_birth: string;
  address: string;
  avatar_url: string;
}

export default function PatientProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Patient | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>();

  useEffect(() => {
    patientApi.getProfile().then(r => {
      setProfile(r.data);
      reset({
        full_name: r.data.full_name || '',
        phone_number: r.data.phone_number || '',
        gender: r.data.gender || '',
        date_of_birth: r.data.date_of_birth ? r.data.date_of_birth.split('T')[0] : '',
        address: r.data.address || '',
        avatar_url: r.data.avatar_url || '',
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (data: ProfileForm) => {
    setSaving(true);
    try {
      await patientApi.updateProfile(data);
      toast.success('Cập nhật hồ sơ thành công!');
    } catch {
      toast.error('Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['PATIENT']}>
      <h1 className="page-title mb-8">Hồ sơ cá nhân</h1>

      {loading ? (
        <div className="card card-body space-y-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Avatar card */}
            <div className="card card-body text-center">
              <div className="w-24 h-24 mx-auto rounded-2xl bg-sky-500 flex items-center justify-center text-white text-3xl font-bold mb-4">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <p className="font-bold text-slate-900">{profile?.full_name}</p>
              <p className="text-sm text-slate-400">{profile?.user?.email}</p>
              <span className="badge-blue mt-2 mx-auto">Bệnh nhân</span>

              <div className="mt-5">
                <label className="label">URL ảnh đại diện</label>
                <input placeholder="https://..." className="input text-sm" {...register('avatar_url')} />
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2 card card-body space-y-5">
              <h2 className="section-title">Thông tin cá nhân</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="label flex items-center gap-1.5">
                    <User size={14} className="text-slate-400" /> Họ và tên *
                  </label>
                  <input className={`input ${errors.full_name ? 'input-error' : ''}`} placeholder="Nguyễn Văn A" {...register('full_name', { required: 'Vui lòng nhập tên' })} />
                  {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
                </div>

                <div>
                  <label className="label flex items-center gap-1.5">
                    <Phone size={14} className="text-slate-400" /> Số điện thoại
                  </label>
                  <input className="input" placeholder="0901234567" {...register('phone_number')} />
                </div>

                <div>
                  <label className="label">Giới tính</label>
                  <select className="input" {...register('gender')}>
                    <option value="">-- Chọn --</option>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="label flex items-center gap-1.5">
                    <Calendar size={14} className="text-slate-400" /> Ngày sinh
                  </label>
                  <input type="date" className="input" {...register('date_of_birth')} />
                </div>

                <div className="md:col-span-2">
                  <label className="label flex items-center gap-1.5">
                    <MapPin size={14} className="text-slate-400" /> Địa chỉ
                  </label>
                  <input className="input" placeholder="123 Đường Lê Lợi, TP.HCM" {...register('address')} />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={16} /> Lưu thay đổi</>}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </DashboardLayout>
  );
}
