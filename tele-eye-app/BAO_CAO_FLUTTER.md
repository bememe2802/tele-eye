# BÁO CÁO TỔNG QUAN ỨNG DỤNG FLUTTER - TELE-EYE

## 1. TỔNG QUAN DỰ ÁN

**Tên ứng dụng:** Tele-Eye  
**Mô tả:** Ứng dụng khám mắt từ xa (Telemedicine) cho lĩnh vực nhãn khoa  
**Framework:** Flutter (Dart SDK ^3.11.5)  
**Kiến trúc:** Provider Pattern (State Management)  
**Nền tảng hỗ trợ:** Android, iOS, Web, Windows  
**Backend:** NestJS + PostgreSQL (kết nối qua REST API)

---

## 2. CÁC THƯ VIỆN SỬ DỤNG (pubspec.yaml)

| Thư viện | Phiên bản | Mục đích |
|----------|-----------|----------|
| `provider` | ^6.1.1 | Quản lý state (ChangeNotifier) |
| `http` | ^1.2.0 | Gọi REST API tới backend |
| `shared_preferences` | ^2.2.2 | Lưu token, role vào local storage |
| `google_fonts` | ^6.1.0 | Font chữ Inter cho giao diện |
| `cached_network_image` | ^3.3.1 | Cache ảnh từ mạng |
| `shimmer` | ^3.0.0 | Hiệu ứng loading skeleton |
| `pin_code_fields` | ^8.0.1 | Nhập mã OTP xác thực email |
| `webview_flutter` | ^4.5.0 | WebView thanh toán VNPAY |
| `intl` | ^0.19.0 | Format tiền tệ, ngày giờ tiếng Việt |

---

## 3. CẤU TRÚC THƯ MỤC

```
lib/
├── main.dart                          # Entry point, khởi tạo Provider, routing
├── config/                            # Cấu hình ứng dụng
│   ├── api_config.dart                # URL & endpoint API
│   ├── demo_config.dart               # Bật/tắt chế độ Demo
│   ├── mock_data.dart                 # Dữ liệu giả cho Demo mode
│   ├── routes.dart                    # Tên các route
│   └── theme.dart                     # Bảng màu, Typography, Theme
├── models/                            # Data Models
│   ├── user_model.dart                # Người dùng (Admin/Doctor/Patient)
│   ├── doctor_model.dart              # Bác sĩ
│   ├── appointment_model.dart         # Lịch hẹn
│   ├── notification_model.dart        # Thông báo
│   └── wallet_model.dart              # Ví + Giao dịch
├── services/                          # Lớp gọi API
│   ├── api_service.dart               # HTTP Client cơ sở (GET/POST/PATCH/DELETE)
│   ├── auth_service.dart              # Đăng nhập, đăng ký, logout
│   ├── storage_service.dart           # Lưu/đọc token từ SharedPreferences
│   ├── profile_service.dart           # Profile bác sĩ, bệnh nhân
│   ├── admin_service.dart             # CRUD bác sĩ, thuốc (Admin)
│   ├── booking_service.dart           # Đặt lịch, khóa slot
│   ├── notification_service.dart      # Thông báo
│   └── wallet_service.dart            # Ví điện tử
├── providers/                         # State Management (ChangeNotifier)
│   ├── auth_provider.dart             # Xác thực, phân quyền
│   ├── admin_provider.dart            # State cho Admin
│   ├── doctor_provider.dart           # Danh sách bác sĩ (Patient view)
│   ├── doctor_dashboard_provider.dart # Dashboard bác sĩ
│   ├── appointment_provider.dart      # Lịch hẹn
│   ├── wallet_provider.dart           # Ví điện tử
│   └── notification_provider.dart     # Thông báo
├── screens/                           # Giao diện màn hình
│   ├── auth/                          # Xác thực
│   │   ├── login_screen.dart
│   │   ├── register_screen.dart
│   │   └── verify_otp_screen.dart
│   ├── home/
│   │   └── home_screen.dart           # Trang chính bệnh nhân
│   ├── admin/                         # Quản trị
│   │   ├── admin_home_screen.dart
│   │   ├── admin_doctor_screen.dart
│   │   └── admin_drug_screen.dart
│   ├── doctor/                        # Bác sĩ
│   │   ├── doctor_home_screen.dart
│   │   ├── doctor_today_screen.dart
│   │   ├── doctor_schedule_screen.dart
│   │   └── doctor_profile_screen.dart
│   ├── booking/                       # Đặt lịch khám
│   │   ├── doctor_list_screen.dart
│   │   ├── doctor_detail_screen.dart
│   │   ├── book_appointment_screen.dart
│   │   └── my_appointments_screen.dart
│   ├── medical_records/
│   │   └── medical_record_screen.dart
│   ├── notifications/
│   │   └── notifications_screen.dart
│   ├── profile/
│   │   └── profile_screen.dart
│   └── wallet/
│       └── wallet_screen.dart
└── widgets/                           # Widget dùng chung
    ├── responsive_scaffold.dart       # Layout responsive (mobile/tablet)
    ├── admin_sidebar.dart             # Sidebar Admin
    ├── doctor_sidebar.dart            # Sidebar Bác sĩ
    └── app_sidebar.dart               # Sidebar Bệnh nhân
```

---

## 4. PHÂN QUYỀN (3 ROLE)

Hệ thống chia 3 vai trò, mỗi vai trò có giao diện và chức năng riêng:

| Role | Màn hình chính | Chức năng |
|------|---------------|-----------|
| **ADMIN** | `AdminHomeScreen` | Quản lý bác sĩ, quản lý thuốc, dashboard thống kê |
| **DOCTOR** | `DoctorHomeScreen` | Xem lịch hẹn hôm nay, quản lý lịch trực, hồ sơ cá nhân |
| **PATIENT** | `HomeScreen` | Tìm bác sĩ, đặt lịch khám, xem lịch hẹn, ví, hồ sơ bệnh án |

Routing phân quyền trong `_AuthGate` (main.dart):
```dart
if (role == 'ADMIN') return AdminHomeScreen();
if (role == 'DOCTOR') return DoctorHomeScreen();
return HomeScreen(); // PATIENT
```

---

## 5. CHI TIẾT TỪNG FILE

### 5.1. main.dart — Entry Point

- Khởi tạo `WidgetsFlutterBinding`, locale tiếng Việt (`vi`)
- Đăng ký **7 Provider** qua `MultiProvider`: AuthProvider, DoctorProvider, AppointmentProvider, WalletProvider, NotificationProvider, AdminProvider, DoctorDashboardProvider
- `_AuthGate`: Widget gateway kiểm tra trạng thái đăng nhập → redirect đúng màn hình theo role

---

### 5.2. config/ — Cấu hình

#### api_config.dart
- Tự động chọn `baseUrl` theo platform:
  - Web/Desktop: `http://localhost:3000/api`
  - Android Emulator: `http://10.0.2.2:3000/api`
- Định nghĩa tất cả endpoint API: Auth, Profile, Booking, Schedule, Wallet, Notifications, Drugs

#### demo_config.dart
- `isDemoMode = true/false`: bật chế độ offline dùng mock data, không cần backend
- `demoRole`: chọn role test khi ở Demo mode

#### mock_data.dart
- Chứa dữ liệu mẫu cho tất cả chức năng: danh sách bác sĩ, lịch hẹn, thuốc, profile...
- Dùng khi `isDemoMode = true` hoặc khi API bị lỗi (fallback)

#### routes.dart
- Định nghĩa hằng số tên route: `/login`, `/home`, `/doctors`, `/my-appointments`...

#### theme.dart
- `AppColors`: Bảng màu (primary Medical Blue `#0077B6`, accent, status colors)
- `AppTheme.lightTheme`: ThemeData với Google Fonts Inter, bo góc 14px, Material 3

---

### 5.3. models/ — Data Models

#### user_model.dart
- Trường: `id`, `email`, `role`, `fullName`, `phoneNumber`, `gender`, `address`, `dateOfBirth`, `avatarUrl`
- Helper: `isAdmin`, `isDoctor`, `isPatient`
- `fromJson()`: parse linh hoạt từ nhiều format response (nested `user` object hoặc flat)

#### doctor_model.dart
- Trường: `id`, `fullName`, `title`, `avatarUrl`, `consultationFee` (int), `specializations` (List<String>), `isVerified`, `licenseNumber`
- `fromJson()`: parse an toàn `consultation_fee` từ cả String lẫn int (do PostgreSQL Decimal)

#### appointment_model.dart
- Trường: `id`, `doctorName`, `specialization`, `date`, `time`, `fee`, `status`
- Status: `CONFIRMED`, `COMPLETED`, `CANCELLED`, `PENDING`

#### notification_model.dart
- Trường: `id`, `title`, `type`, `createdAt`, `isRead`
- Type: `appointment`, `payment`, `system`, `review`, `reminder`

#### wallet_model.dart
- `WalletModel`: `balance`, `totalTopUp`, `totalPayment`, `totalRefund`
- `TransactionModel`: `id`, `date`, `description`, `type`, `status`, `amount`
  - Type: `PAYMENT`, `TOP_UP`, `REFUND`, `WITHDRAW`
  - Helper: `typeLabel`, `statusLabel` (trả về text tiếng Việt)

---

### 5.4. services/ — Lớp gọi API

#### api_service.dart (Singleton)
- HTTP Client cơ sở, tất cả service khác gọi qua đây
- Phương thức: `get()`, `post()`, `patch()`, `delete()`
- Tự động gắn header `Authorization: Bearer <token>` nếu đã đăng nhập
- `_handleResponse()`: parse JSON response, throw `ApiException` khi lỗi (kèm message từ NestJS)

#### auth_service.dart
- `register()`: POST `/auth/register` (email, password, fullName)
- `login()`: POST `/auth/login` → lưu accessToken, refreshToken, role vào StorageService
- `logout()`: POST `/auth/logout` + xóa local storage
- `refreshTokens()`: POST `/auth/refresh` khi token hết hạn
- `verifyEmail()`: POST `/auth/verify-email` (email, token OTP)

#### storage_service.dart
- Dùng `SharedPreferences` lưu: `access_token`, `refresh_token`, `user_role`, `user_email`
- Phương thức static: `saveTokens()`, `getAccessToken()`, `getRefreshToken()`, `getUserRole()`, `clearAll()`, `isLoggedIn()`

#### profile_service.dart
- `getMyProfile()`: GET `/profile/patients/me` (Patient)
- `getDoctorProfile()`: GET `/profile/doctors/me` (Doctor)
- `updateMyProfile()`: PATCH `/profile/patients/me`
- `getDoctors()`: GET `/profile/doctors` (lấy danh sách bác sĩ)

#### admin_service.dart
- **Bác sĩ**: `getAllDoctors()`, `createDoctor()`, `updateDoctor()`
- **Thuốc**: `getAllDrugs()`, `createDrug()`, `updateDrug()`, `deleteDrug()`

#### booking_service.dart
- `getAvailableSlots()`: GET `/booking/schedule/calendar-slots` (filter theo date, doctorId, specialtyId)
- `lockSlot()`: PATCH lock slot tạm 15 phút
- `createAppointment()`: POST tạo lịch hẹn → nhận URL thanh toán VNPAY
- `getMedicalRecord()`: GET xem bệnh án

#### notification_service.dart & wallet_service.dart
- Gọi API thông báo và ví điện tử tương ứng

---

### 5.5. providers/ — State Management

Tất cả provider kế thừa `ChangeNotifier`, sử dụng pattern:
- `_isLoading` → hiển thị loading indicator
- `_error` → hiển thị thông báo lỗi
- `notifyListeners()` → cập nhật UI

#### auth_provider.dart
- Quản lý: đăng nhập, đăng ký, xác thực OTP, kiểm tra session, logout
- `checkAuthStatus()`: khi app khởi động, kiểm tra token → load profile → redirect
- `loadUserProfile()`: phân biệt role để gọi đúng API (Admin tự build, Doctor/Patient gọi API)
- Hỗ trợ Demo mode: login bất kỳ email nào, chọn role theo keyword trong email

#### admin_provider.dart
- `loadDoctors()` / `createDoctor()` / `updateDoctor()`: CRUD bác sĩ qua AdminService
- `loadDrugs()` / `createDrug()` / `updateDrug()` / `deleteDrug()`: CRUD thuốc
- Sau mỗi thao tác CRUD tự động `loadDoctors()` / `loadDrugs()` để refresh danh sách

#### doctor_provider.dart
- `loadDoctors()`: lấy danh sách bác sĩ cho bệnh nhân xem
- Fallback demo data khi API lỗi (6 bác sĩ mẫu)

#### doctor_dashboard_provider.dart
- `loadTodayAppointments()`: lịch hẹn hôm nay của bác sĩ
- `loadCurrentSchedule()`: lịch trực hiện tại
- `registerAvailability()`: đăng ký khung giờ trực
- `loadProfile()` / `updateProfile()`: hồ sơ bác sĩ
- Đếm: `waitingCount`, `inProgressCount`, `doneCount`

#### appointment_provider.dart
- `loadAppointments()`: GET `/booking/appointments/my`
- `_normalizeAppointment()`: chuẩn hóa JSON từ backend (nested doctor/slot) thành format flat cho model
- Fallback mock data khi API lỗi

#### wallet_provider.dart & notification_provider.dart
- Quản lý state ví điện tử (số dư, giao dịch, nạp/rút tiền)
- Quản lý thông báo (đánh dấu đã đọc, load danh sách)

---

### 5.6. screens/ — Giao diện

#### Auth (3 màn hình)

| File | Chức năng |
|------|-----------|
| `login_screen.dart` | Form đăng nhập (email + password), validation, gọi AuthProvider.login() |
| `register_screen.dart` | Form đăng ký (email + password + họ tên), gọi AuthProvider.register() |
| `verify_otp_screen.dart` | Nhập mã OTP 6 số xác thực email, dùng `pin_code_fields` |

#### Admin (3 màn hình)

| File | Chức năng |
|------|-----------|
| `admin_home_screen.dart` | Dashboard: 4 thẻ thống kê (bác sĩ, thuốc, lịch hẹn, doanh thu) + 2 card tính năng |
| `admin_doctor_screen.dart` | Danh sách bác sĩ, tìm kiếm, thêm/sửa bác sĩ qua dialog form |
| `admin_drug_screen.dart` | Danh sách thuốc, tìm kiếm, thêm/sửa/xóa thuốc |

#### Doctor (4 màn hình)

| File | Chức năng |
|------|-----------|
| `doctor_home_screen.dart` | Dashboard: thống kê lịch hẹn hôm nay (chờ/đang khám/hoàn thành) |
| `doctor_today_screen.dart` | Danh sách chi tiết lịch hẹn hôm nay, bắt đầu/hoàn thành khám |
| `doctor_schedule_screen.dart` | Quản lý lịch trực: chọn ngày + khung giờ → đăng ký availability |
| `doctor_profile_screen.dart` | Xem/sửa hồ sơ bác sĩ (tên, chức danh, số CCHN, bio, phí khám) |

#### Patient - Booking (4 màn hình)

| File | Chức năng |
|------|-----------|
| `doctor_list_screen.dart` | Danh sách bác sĩ có thể đặt khám, filter theo chuyên khoa |
| `doctor_detail_screen.dart` | Chi tiết bác sĩ: thông tin, chuyên khoa, phí khám, nút đặt lịch |
| `book_appointment_screen.dart` | Chọn ngày, slot giờ, xác nhận đặt lịch → tạo appointment |
| `my_appointments_screen.dart` | Danh sách lịch hẹn cá nhân, filter theo trạng thái |

#### Patient - Khác (4 màn hình)

| File | Chức năng |
|------|-----------|
| `home_screen.dart` | Trang chính: BottomNavigationBar (4 tab), lịch hẹn sắp tới, danh sách bác sĩ |
| `profile_screen.dart` | Hồ sơ bệnh nhân: xem/sửa thông tin cá nhân |
| `wallet_screen.dart` | Ví điện tử: số dư, nạp tiền, rút tiền, lịch sử giao dịch |
| `medical_record_screen.dart` | Hồ sơ bệnh án: chẩn đoán, đơn thuốc, ghi chú bác sĩ |
| `notifications_screen.dart` | Danh sách thông báo, đánh dấu đã đọc |

---

### 5.7. widgets/ — Widget dùng chung

#### responsive_scaffold.dart
- Layout responsive: ≥700px hiển thị sidebar + body (tablet/web), <700px hiển thị AppBar + body (mobile)
- Dùng chung cho tất cả màn hình Admin và Doctor

#### admin_sidebar.dart
- Logo Tele-Eye, 3 mục nav (Tổng quan, Quản lý bác sĩ, Danh mục thuốc)
- Footer: Cài đặt (placeholder), Đăng xuất, thông tin user
- Highlight mục đang active bằng màu brandCyan

#### doctor_sidebar.dart
- Tương tự admin_sidebar nhưng cho role Doctor
- Mục: Tổng quan, Lịch hẹn hôm nay, Lịch trực, Hồ sơ

#### app_sidebar.dart
- Sidebar cho Patient (dùng trên tablet/web)

---

## 6. LUỒNG HOẠT ĐỘNG CHÍNH

### 6.1. Luồng Đăng nhập
```
LoginScreen → AuthProvider.login() → AuthService.login()
    → POST /auth/login → Nhận token → StorageService.saveTokens()
    → AuthProvider.loadUserProfile() → Xác định role
    → _AuthGate redirect → AdminHome / DoctorHome / Home
```

### 6.2. Luồng Đặt lịch khám (Patient)
```
HomeScreen → DoctorListScreen → DoctorDetailScreen
    → BookAppointmentScreen → Chọn ngày/slot
    → BookingService.lockSlot() → Khóa slot 15 phút
    → BookingService.createAppointment() → Tạo lịch hẹn
    → Nhận VNPAY URL → Thanh toán
```

### 6.3. Luồng Admin quản lý bác sĩ
```
AdminHomeScreen → AdminDoctorScreen → Nhấn "Thêm"
    → _DoctorFormDialog → Nhập thông tin
    → AdminProvider.createDoctor() → AdminService.createDoctor()
    → POST /profile/doctors → Lưu vào database
    → AdminProvider.loadDoctors() → Refresh danh sách
```

### 6.4. Luồng Bác sĩ đăng ký lịch trực
```
DoctorHomeScreen → DoctorScheduleScreen
    → Chọn ngày trong tuần + khung giờ
    → DoctorDashboardProvider.registerAvailability()
    → POST /booking/schedule/doctor-availability
    → Reload schedule
```

---

## 7. KẾT NỐI BACKEND

| Thành phần | Chi tiết |
|------------|----------|
| Backend | NestJS + Prisma ORM |
| Database | PostgreSQL (localhost:5432, db: tele-eye) |
| API Base | `http://localhost:3000/api` |
| Xác thực | JWT (Bearer Token), access + refresh token |
| Token TTL | 1 ngày (`JWT_EXPIRATION=1d`) |

### Các nhóm API endpoint:
- **Auth**: `/auth/login`, `/auth/register`, `/auth/verify-email`, `/auth/refresh`, `/auth/logout`
- **Profile**: `/profile/doctors`, `/profile/doctors/me`, `/profile/patients/me`
- **Booking**: `/booking/schedule/*`, `/booking/appointments/*`
- **Admin**: `/admin/drugs/*`
- **Drugs**: `/drugs` (shared)

---

## 8. CHẾ ĐỘ DEMO

Ứng dụng hỗ trợ chạy offline không cần backend:
- Bật: `DemoConfig.isDemoMode = true`
- Chọn role: `DemoConfig.demoRole = 'ADMIN' | 'DOCTOR' | 'PATIENT'`
- Mọi Provider đều kiểm tra `isDemoMode` → dùng `MockData` thay vì gọi API
- Khi API lỗi, một số Provider tự fallback sang mock data

---

## 9. TỔNG KẾT

| Thống kê | Số lượng |
|----------|----------|
| Tổng số file Dart | 49 |
| Models | 5 |
| Services | 8 |
| Providers | 7 |
| Screens | 19 |
| Widgets | 4 |
| Config | 5 |
| Entry point | 1 |
