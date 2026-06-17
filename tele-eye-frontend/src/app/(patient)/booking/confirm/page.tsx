'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  Copy,
  FileText,
  Loader2,
  QrCode,
  Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { appointmentApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { CalendarSlot } from '@/types';

const BANK_ID = process.env.NEXT_PUBLIC_SEPAY_BANK_ID || 'TPB';
const ACCOUNT_NO = process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_NO || '28220051308';
const ACCOUNT_NAME =
  process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_NAME || 'NGUYEN HUYNH DUC';
const SLOT_STORAGE_KEY = 'booking_slot';
const DOCTOR_STORAGE_KEY = 'booking_doctor_id';
const APPOINTMENT_STORAGE_KEY = 'booking_appointment_id';

interface ConfirmForm {
  description: string;
}

export default function BookingConfirmPage() {
  const [slot, setSlot] = useState<CalendarSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [appointmentId, setAppointmentId] = useState<number | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [copied, setCopied] = useState<'account' | 'content' | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConfirmForm>();

  useEffect(() => {
    const storedSlot = sessionStorage.getItem(SLOT_STORAGE_KEY);
    const storedAppointmentId = sessionStorage.getItem(APPOINTMENT_STORAGE_KEY);

    if (storedSlot) {
      setSlot(JSON.parse(storedSlot));
    }

    if (storedAppointmentId) {
      setAppointmentId(Number(storedAppointmentId));
    }

    if (!storedSlot && !storedAppointmentId) {
      router.replace('/booking');
    }
  }, [router]);

  const clearBookingSession = () => {
    sessionStorage.removeItem(SLOT_STORAGE_KEY);
    sessionStorage.removeItem(DOCTOR_STORAGE_KEY);
    sessionStorage.removeItem(APPOINTMENT_STORAGE_KEY);
  };

  const checkPaymentStatus = async (
    currentAppointmentId: number,
    manual = false,
  ) => {
    if (manual) {
      setCheckingPayment(true);
    }

    try {
      const res = await appointmentApi.getPaymentStatus(currentAppointmentId);
      if (res.data.paid) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
        clearBookingSession();
        setPaymentDone(true);
        toast.success(
          `Thanh toán thành công cho lịch hẹn #${currentAppointmentId}.`,
        );
        return true;
      }

      if (manual) {
        toast('Hệ thống chưa ghi nhận thanh toán. Tôi sẽ tiếp tục kiểm tra.');
      }
      return false;
    } catch {
      if (manual) {
        toast.error('Không kiểm tra được trạng thái thanh toán lúc này.');
      }
      return false;
    } finally {
      if (manual) {
        setCheckingPayment(false);
      }
    }
  };

  useEffect(() => {
    if (!appointmentId) return;

    pollingRef.current = setInterval(async () => {
      await checkPaymentStatus(appointmentId);
    }, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [appointmentId]);

  useEffect(() => {
    if (!paymentDone) return;

    const redirectTimer = setTimeout(() => {
      router.replace('/appointments');
    }, 1800);

    return () => clearTimeout(redirectTimer);
  }, [paymentDone, router]);

  const transferContent = appointmentId
    ? `TELEEYE ${appointmentId}`
    : 'TELEEYE LICHKHAM';

  const qrUrl = slot
    ? `https://qr.sepay.vn/img?acc=${ACCOUNT_NO}&bank=${BANK_ID}&amount=${Math.round(Number(slot.price))}&des=${encodeURIComponent(transferContent)}&template=compact&download=false`
    : null;

  const onSubmit = async (data: ConfirmForm) => {
    if (!slot) return;

    setLoading(true);
    try {
      const res = await appointmentApi.create({
        slot_id: slot.slot_id,
        description: data.description,
      });
      setAppointmentId(res.data.appointment_id);
      sessionStorage.setItem(
        APPOINTMENT_STORAGE_KEY,
        String(res.data.appointment_id),
      );
      toast.success('Đặt lịch thành công. Vui lòng quét QR để thanh toán.');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Đặt lịch thất bại';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, type: 'account' | 'content') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!slot && !appointmentId) {
    return null;
  }

  if (paymentDone) {
    return (
      <DashboardLayout allowedRoles={['PATIENT']}>
        <div className="max-w-md mx-auto pt-8">
          <div className="card card-body text-center space-y-5">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={44} className="text-green-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 mb-1">
                Thanh toán thành công
              </h1>
              <p className="text-slate-500 text-sm">
                Lịch hẹn{' '}
                <span className="font-semibold text-sky-500">
                  #{appointmentId}
                </span>{' '}
                đã được xác nhận.
              </p>
            </div>
            <div className="bg-sky-50 rounded-xl p-4 text-sm text-sky-700">
              Link phòng khám đã được tạo. Hệ thống đang chuyển ông sang mục
              lịch hẹn của mình.
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              Đang chuyển sang Lịch hẹn của tôi...
            </div>
            <button
              onClick={() => router.replace('/appointments')}
              className="btn-primary w-full"
            >
              Xem lịch hẹn của tôi
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (appointmentId && !slot) {
    return (
      <DashboardLayout allowedRoles={['PATIENT']}>
        <div className="max-w-md mx-auto pt-4">
          <div className="card card-body text-center space-y-5">
            <div className="flex items-center justify-center gap-2">
              <QrCode size={20} className="text-sky-500" />
              <h1 className="text-lg font-bold text-slate-800">
                Đang khôi phục phiên thanh toán
              </h1>
            </div>
            <p className="text-sm text-slate-500">
              Hệ thống đang kiểm tra lịch hẹn{' '}
              <span className="font-semibold text-sky-500">
                #{appointmentId}
              </span>
              .
            </p>
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Đang chờ xác nhận thanh toán...
            </div>
            <button
              onClick={() => void checkPaymentStatus(appointmentId, true)}
              disabled={checkingPayment}
              className="btn-primary w-full"
            >
              {checkingPayment
                ? 'Đang kiểm tra...'
                : 'Tôi đã chuyển khoản, kiểm tra lại'}
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (appointmentId) {
    const paymentSlot = slot;

    return (
      <DashboardLayout allowedRoles={['PATIENT']}>
        <div className="max-w-md mx-auto pt-4">
          <div className="card card-body text-center space-y-5">
            <div className="flex items-center justify-center gap-2">
              <QrCode size={20} className="text-sky-500" />
              <h1 className="text-lg font-bold text-slate-800">
                Quét QR SePay để thanh toán
              </h1>
            </div>

            {qrUrl && (
              <div className="flex justify-center">
                <div className="p-3 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrUrl}
                    alt="QR chuyển khoản"
                    className="w-56 h-56 object-contain"
                  />
                </div>
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2.5 text-left">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Ngân hàng</span>
                <span className="font-semibold text-slate-800">TPBank</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Số tài khoản</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800">
                    {ACCOUNT_NO}
                  </span>
                  <button
                    onClick={() => handleCopy(ACCOUNT_NO, 'account')}
                    className="text-sky-400 hover:text-sky-600"
                  >
                    {copied === 'account' ? (
                      <Check size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Chủ tài khoản</span>
                <span className="font-semibold text-slate-800">
                  {ACCOUNT_NAME}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Số tiền</span>
                <span className="font-bold text-sky-500 text-base">
                  {paymentSlot ? formatCurrency(paymentSlot.price) : '—'}
                </span>
              </div>
              <div className="flex justify-between items-start border-t border-slate-200 pt-2.5">
                <span className="text-slate-500 shrink-0">Nội dung CK</span>
                <div className="flex items-center gap-1.5 ml-4">
                  <span className="font-semibold text-slate-800 text-right">
                    {transferContent}
                  </span>
                  <button
                    onClick={() => handleCopy(transferContent, 'content')}
                    className="text-sky-400 hover:text-sky-600 shrink-0"
                  >
                    {copied === 'content' ? (
                      <Check size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              Quét mã bằng SePay và chuyển đúng nội dung thanh toán để hệ thống
              tự xác nhận.
            </p>

            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Đang chờ xác nhận thanh toán...
            </div>

            <button
              onClick={() => void checkPaymentStatus(appointmentId, true)}
              disabled={checkingPayment}
              className="btn-primary w-full"
            >
              {checkingPayment
                ? 'Đang kiểm tra...'
                : 'Tôi đã chuyển khoản, kiểm tra lại'}
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const currentSlot = slot;
  if (!currentSlot) {
    return null;
  }

  return (
    <DashboardLayout allowedRoles={['PATIENT']}>
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <button
          onClick={() => router.back()}
          className="hover:text-sky-500 flex items-center gap-1"
        >
          <ChevronLeft size={14} /> Chọn giờ
        </button>
        <span className="text-sky-500 font-medium">
          / Xác nhận & Thanh toán
        </span>
      </div>
      <h1 className="page-title mb-8">Xác nhận đặt lịch khám</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="card card-body">
            <h2 className="section-title mb-4">Thông tin bác sĩ</h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-xl">
                {currentSlot.doctor.full_name.split(' ').pop()?.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-slate-900">
                  {currentSlot.doctor.full_name}
                </p>
                {currentSlot.doctor.title && (
                  <p className="text-sm text-slate-400">
                    {currentSlot.doctor.title}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {currentSlot.doctor.specialties.map((specialty) => (
                    <span key={specialty} className="badge-blue">
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card card-body">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <FileText size={18} className="text-sky-500" />
              Triệu chứng & Lý do khám
            </h2>
            <form id="confirm-form" onSubmit={handleSubmit(onSubmit)}>
              <label className="label">Mô tả triệu chứng của bạn *</label>
              <textarea
                rows={4}
                placeholder="Ví dụ: Mắt phải bị đỏ và ngứa sau khi đi bơi, nhìn mờ buổi sáng..."
                className={`input resize-none ${
                  errors.description ? 'input-error' : ''
                }`}
                {...register('description', {
                  required: 'Vui lòng mô tả triệu chứng',
                })}
              />
              {errors.description && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.description.message}
                </p>
              )}
            </form>
          </div>

          <div className="card card-body">
            <h2 className="section-title mb-4">Hình thức khám</h2>
            <div className="p-4 bg-sky-50 rounded-xl border-2 border-sky-300 flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
                <Video size={18} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-sky-700">
                  Khám trực tuyến qua Video
                </p>
                <p className="text-xs text-sky-500">
                  Link phòng khám sẽ hiện trong lịch hẹn sau khi thanh toán.
                </p>
              </div>
              <CheckCircle2
                className="ml-auto text-sky-500 shrink-0"
                size={20}
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card card-body sticky top-6">
            <h2 className="section-title mb-5">Tóm tắt đặt lịch</h2>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Bác sĩ', value: currentSlot.doctor.full_name },
                {
                  label: 'Ngày khám',
                  value: currentSlot.date_slot
                    ? new Date(currentSlot.date_slot).toLocaleDateString(
                        'vi-VN',
                      )
                    : '—',
                },
                {
                  label: 'Giờ khám',
                  value: `${currentSlot.start_time} – ${currentSlot.end_time}`,
                },
                { label: 'Hình thức', value: 'Khám online' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="font-semibold text-slate-800 text-right ml-4">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 mt-5 pt-5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Tổng thanh toán</span>
                <span className="text-xl font-bold text-sky-500">
                  {formatCurrency(currentSlot.price)}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <QrCode size={12} /> Thanh toán qua chuyển khoản ngân hàng
              </p>
            </div>

            <button
              type="submit"
              form="confirm-form"
              disabled={loading}
              className="btn-primary btn-lg w-full mt-5"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <QrCode size={16} /> Tiếp tục & Xem QR thanh toán
                </>
              )}
            </button>
            <button onClick={() => router.back()} className="btn-ghost w-full mt-2">
              <ChevronLeft size={16} /> Quay lại
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
