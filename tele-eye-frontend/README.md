# Tele-Eye Frontend

Nền tảng khám mắt từ xa — Frontend NextJS 14 + TailwindCSS + Zustand

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State**: Zustand + persist
- **Forms**: React Hook Form
- **HTTP**: Axios (auto token refresh)
- **UI**: Lucide React icons + React Hot Toast

## Cài đặt

```bash
npm install
# hoặc
yarn install
# hoặc
pnpm install
```

## Biến môi trường

Tạo file `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Chạy dev

```bash
npm run dev
```

Truy cập: http://localhost:3001

## Tính năng

### Bệnh nhân (PATIENT)
- Đăng ký / Đăng nhập / Xác thực OTP email
- Trang tổng quan (Dashboard)
- **Đặt lịch khám** (3 bước: chọn bác sĩ → chọn ngày giờ → xác nhận & thanh toán VNPAY)
- Lịch hẹn của tôi + xem bệnh án sau khi hoàn thành
- Ví điện tử (xem số dư, lịch sử giao dịch, nạp tiền, rút tiền)
- Thông báo
- Hồ sơ cá nhân

### Bác sĩ (DOCTOR)
- Dashboard xem lịch hôm nay
- Bắt đầu / Kết thúc ca khám
- Lập bệnh án (chẩn đoán OD/OS, ICD-10, đơn thuốc, đơn kính)
- Đăng ký lịch làm việc hàng tuần
- Cập nhật hồ sơ bác sĩ

### Admin (ADMIN)
- Dashboard tổng quan
- Quản lý bác sĩ (tạo, sửa, xem danh sách)
- Quản lý danh mục thuốc (CRUD)

## Cấu trúc dự án

```
src/
├── app/
│   ├── (auth)/      # Login, Register, Verify Email
│   ├── (patient)/   # Dashboard, Booking, Profile, Wallet...
│   ├── (doctor)/    # Dashboard, Schedule, Profile
│   └── (admin)/     # Dashboard, Doctors, Drugs
├── components/
│   ├── layout/      # Sidebar, DashboardLayout, AuthLayout
│   └── doctor/      # CompleteModal
├── lib/
│   ├── api.ts       # Axios instance + all API calls
│   └── utils.ts     # Helpers
├── store/
│   └── authStore.ts # Zustand auth state
└── types/
    └── index.ts     # TypeScript types
```

## Kết nối Backend

Backend NestJS chạy ở `http://localhost:3000`.
Swagger docs: `http://localhost:3000/api`

Tài khoản admin mặc định: `admin@test.com` / `admin123`
