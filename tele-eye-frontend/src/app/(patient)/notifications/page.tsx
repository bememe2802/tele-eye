'use client';
import { useState } from 'react';
import { Calendar, Wallet, Bell, Star, CheckCircle2, Clock } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { cn } from '@/lib/utils';

const mockNotifications = [
  { id: 1, type: 'appointment', title: 'Lịch hẹn với BS. Nguyễn Văn A đã được xác nhận lúc 14:00', time: '10 phút trước', read: false, icon: Calendar },
  { id: 2, type: 'payment', title: 'Bạn đã nạp thành công 500,000đ vào ví Tele-Eye', time: '1 giờ trước', read: false, icon: Wallet },
  { id: 3, type: 'system', title: 'Vui lòng cập nhật thông tin hồ sơ để nhận dịch vụ tốt hơn', time: 'Hôm qua', read: true, icon: Bell },
  { id: 4, type: 'review', title: 'Bạn nhận được đánh giá 5 sao từ bác sĩ sau ca khám', time: '2 ngày trước', read: true, icon: Star },
  { id: 5, type: 'payment', title: 'Thanh toán lịch hẹn #12345 đã được xử lý thành công', time: '4 ngày trước', read: false, icon: CheckCircle2 },
  { id: 6, type: 'reminder', title: 'Nhắc nhở: Lịch khám của bạn sẽ bắt đầu trong 30 phút nữa', time: '5 ngày trước', read: true, icon: Clock },
];

const iconColors: Record<string, string> = {
  appointment: 'bg-blue-100 text-blue-600',
  payment: 'bg-green-100 text-green-600',
  system: 'bg-slate-100 text-slate-500',
  review: 'bg-amber-100 text-amber-600',
  reminder: 'bg-purple-100 text-purple-600',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const unread = notifications.filter(n => !n.read).length;

  const markAll = () => setNotifications(ns => ns.map(n => ({ ...n, read: true })));
  const markOne = (id: number) => setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Thông báo</h1>
          {unread > 0 && <p className="text-sm text-slate-500 mt-1">{unread} thông báo chưa đọc</p>}
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="text-sky-500 text-sm font-semibold hover:underline">
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map(n => {
          const Icon = n.icon;
          return (
            <div
              key={n.id}
              onClick={() => markOne(n.id)}
              className={cn(
                'card card-body flex items-start gap-4 cursor-pointer transition-all hover:shadow-card-hover',
                !n.read && 'border-l-4 border-l-sky-400 bg-sky-50/50'
              )}
            >
              {!n.read && <div className="w-2 h-2 rounded-full bg-sky-500 shrink-0 mt-1" />}
              {n.read && <div className="w-2 shrink-0" />}
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconColors[n.type] || 'bg-slate-100 text-slate-500')}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm', !n.read ? 'font-semibold text-slate-900' : 'text-slate-700')}>{n.title}</p>
                <p className="text-xs text-slate-400 mt-1">{n.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
