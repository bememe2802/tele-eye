'use client';
import { useForm } from 'react-hook-form';
import { Save, Stethoscope } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { doctorApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface DoctorProfileForm {
  phone_number: string;
  bio: string;
  experience_years: number;
  avatar_url: string;
}

export default function DoctorProfilePage() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<DoctorProfileForm>();

  const onSubmit = async (data: DoctorProfileForm) => {
    try {
      await doctorApi.updateSelf(data);
      toast.success('Cập nhật hồ sơ thành công!');
    } catch { toast.error('Cập nhật thất bại'); }
  };

  return (
    <DashboardLayout allowedRoles={['DOCTOR']}>
      <h1 className="page-title mb-8">Hồ sơ bác sĩ</h1>
      <div className="card card-body max-w-2xl">
        <h2 className="section-title flex items-center gap-2 mb-6">
          <Stethoscope size={18} className="text-sky-500" /> Cập nhật thông tin
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="label">Số điện thoại</label>
            <input className="input" placeholder="0901234567" {...register('phone_number')} />
          </div>
          <div>
            <label className="label">Giới thiệu bản thân</label>
            <textarea rows={4} className="input resize-none" placeholder="Mô tả kinh nghiệm và chuyên môn..." {...register('bio')} />
          </div>
          <div>
            <label className="label">Số năm kinh nghiệm</label>
            <input type="number" min={0} className="input" placeholder="10" {...register('experience_years', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="label">URL ảnh đại diện</label>
            <input className="input" placeholder="https://..." {...register('avatar_url')} />
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={16} /> Lưu thay đổi</>}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
