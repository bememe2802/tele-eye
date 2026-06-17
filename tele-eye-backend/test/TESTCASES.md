# 📋 Tele-Eye - Danh sách Test Cases (Đầy đủ)

> **Dự án:** Tele-Eye - Nền tảng khám mắt từ xa  
> **Công nghệ:** NestJS (Backend) + Next.js (Frontend) + PostgreSQL + Prisma ORM  
> **Mục đích:** Tài liệu test cases phục vụ kiểm thử toàn bộ hệ thống

---

## 📑 Mục lục

1. [Module Auth (Xác thực)](#1-module-auth-xác-thực)
2. [Module Profile - Doctors (Bác sĩ)](#2-module-profile---doctors-bác-sĩ)
3. [Module Profile - Patients (Bệnh nhân)](#3-module-profile---patients-bệnh-nhân)
4. [Module Schedule (Lịch làm việc)](#4-module-schedule-lịch-làm-việc)
5. [Module Appointments (Đặt lịch & Khám)](#5-module-appointments-đặt-lịch--khám)
6. [Module Payment (Thanh toán)](#6-module-payment-thanh-toán)
7. [Module Medical Record (Hồ sơ bệnh án)](#7-module-medical-record-hồ-sơ-bệnh-án)
8. [Module Drugs (Danh mục thuốc)](#8-module-drugs-danh-mục-thuốc)
9. [Frontend Integration Tests](#9-frontend-integration-tests)
10. [End-to-End (E2E) Flow Tests](#10-end-to-end-e2e-flow-tests)

---

## 1. Module Auth (Xác thực)

### 1.1. Đăng ký (Register)

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| AUTH-001 | Đăng ký thành công với dữ liệu hợp lệ | `{ email: "new@test.com", password: "123456", fullName: "Nguyễn Văn A" }` | HTTP 201, trả về message "Đăng ký thành công", email, nextStep: "VERIFY_EMAIL" | Positive |
| AUTH-002 | Đăng ký với email đã tồn tại | `{ email: "existing@test.com", password: "123456", fullName: "Test" }` | HTTP 400, "Email already exists" | Negative |
| AUTH-003 | Đăng ký với email không hợp lệ | `{ email: "invalid", password: "123456", fullName: "Test" }` | HTTP 400, Validation error (class-validator) | Negative |
| AUTH-004 | Đăng ký với password < 6 ký tự | `{ email: "a@b.com", password: "123", fullName: "Test" }` | HTTP 400, "Password must be at least 6 characters" | Negative |
| AUTH-005 | Đăng ký thiếu fullName | `{ email: "a@b.com", password: "123456" }` | HTTP 400, Validation error | Negative |
| AUTH-006 | Transaction rollback khi tạo user thành công nhưng tạo patient thất bại | Mock lỗi DB ở bước tạo Patient | Rollback hoàn toàn, không có user nào trong DB | Negative |
| AUTH-007 | Gửi mail OTP thất bại nhưng không ảnh hưởng đăng ký | Mock mailerService.sendMail throw error | Vẫn trả về 201, log lỗi ra console.error | Negative |

### 1.2. Xác thực Email (Verify Email)

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| AUTH-008 | Xác thực email thành công với OTP đúng | `{ email: "test@test.com", token: "123456" }` | HTTP 201, "Xác thực email thành công!", user.is_email_verified = true | Positive |
| AUTH-009 | Xác thực với OTP sai | `{ email: "test@test.com", token: "000000" }` | HTTP 400, "Mã xác thực không đúng hoặc đã được sử dụng." | Negative |
| AUTH-010 | Xác thực với OTP đã hết hạn | Token có expires_at < now | HTTP 400, "Mã xác thực đã hết hạn", token bị xóa khỏi DB | Negative |
| AUTH-011 | Xác thực với email không tồn tại | `{ email: "nonexist@test.com", token: "123456" }` | HTTP 400, "Mã xác thực không đúng" | Negative |
| AUTH-012 | Xác thực với token không đúng 6 ký tự | `{ email: "test@test.com", token: "12" }` | HTTP 400, "Mã xác thực phải đúng 6 ký tự" | Negative |

### 1.3. Đăng nhập (Login)

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| AUTH-013 | Đăng nhập thành công với thông tin đúng | `{ email: "verified@test.com", password: "123456" }` | HTTP 201, trả về accessToken, refreshToken, role, message | Positive |
| AUTH-014 | Đăng nhập với email không tồn tại | `{ email: "no@exist.com", password: "123456" }` | HTTP 401, "Thông tin đăng nhập không chính xác" | Negative |
| AUTH-015 | Đăng nhập với sai mật khẩu | `{ email: "test@test.com", password: "wrong" }` | HTTP 401, "Thông tin đăng nhập không chính xác" | Negative |
| AUTH-016 | Đăng nhập khi tài khoản bị khóa (is_active = false) | User có is_active = false | HTTP 401, "Tài khoản của bạn đã bị khóa" | Negative |
| AUTH-017 | Đăng nhập khi email chưa xác thực | User có is_email_verified = false | HTTP 401, "Vui lòng xác thực email trước khi đăng nhập" | Negative |
| AUTH-018 | Đăng nhập ghi nhận đúng user-agent và IP | Gửi header User-Agent và có IP | Session được tạo với đúng user_agent và ip_address | Positive |
| AUTH-019 | Đăng nhập không gửi User-Agent | Không gửi header User-Agent | Session lưu "Unknown Device" | Positive |

### 1.4. Refresh Token

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| AUTH-020 | Refresh token thành công | Refresh token hợp lệ, chưa hết hạn | HTTP 201, trả về accessToken + refreshToken mới | Positive |
| AUTH-021 | Refresh với token đã hết hạn (JWT expired) | Token JWT hết hạn | HTTP 403, "Refresh token không hợp lệ hoặc đã hết hạn" | Negative |
| AUTH-022 | Refresh với session đã bị thu hồi (revoked) | Session có is_revoked = true | HTTP 403, "Session đã bị thu hồi (Revoked)" | Negative |
| AUTH-023 | Refresh với session đã hết hạn (expires_at < now) | Session có expires_at trong quá khứ | HTTP 403, "Session đã hết hạn, vui lòng đăng nhập lại" | Negative |
| AUTH-024 | Refresh với token rỗng | `{ refreshToken: "" }` | HTTP 400, Validation error | Negative |

### 1.5. Đăng xuất (Logout)

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| AUTH-025 | Đăng xuất thành công | Refresh token hợp lệ | HTTP 201, "Đăng xuất thành công", session.is_revoked = true | Positive |
| AUTH-026 | Đăng xuất với token không tồn tại | Refresh token không có trong DB | HTTP 404, "Refresh token không hợp lệ hoặc không tồn tại." | Negative |
| AUTH-027 | Đăng xuất khi đã logout trước đó | Session đã is_revoked = true | HTTP 201, "Tài khoản đã được đăng xuất trước đó." | Positive |

---

## 2. Module Profile - Doctors (Bác sĩ)

### 2.1. Admin tạo bác sĩ

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| DOC-001 | Tạo bác sĩ thành công với đầy đủ thông tin | `{ email, password, full_name, title, license_number, consultation_fee, specializationIds }` | HTTP 201, "Tạo bác sĩ thành công", doctorId | Positive |
| DOC-002 | Tạo bác sĩ với email đã tồn tại | Email đã có user khác dùng | HTTP 400, "Email đã tồn tại trong hệ thống" | Negative |
| DOC-003 | Tạo bác sĩ với specializationIds không hợp lệ | `specializationIds: [999]` (ID không tồn tại) | HTTP 400, "Một hoặc nhiều ID chuyên khoa không tồn tại" | Negative |
| DOC-004 | Tạo bác sĩ không có chuyên khoa | `specializationIds: []` | HTTP 201, tạo thành công không có specialization | Positive |
| DOC-005 | Tạo bác sĩ với role không phải ADMIN | Gọi API với token DOCTOR hoặc PATIENT | HTTP 403, Forbidden | Negative |

### 2.2. Xem danh sách bác sĩ

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| DOC-006 | Xem danh sách không filter | Không có query params | HTTP 200, trả về mảng doctors với specializations đã map | Positive |
| DOC-007 | Xem danh sách với filter theo tên | `?keyword=Nguyen` | HTTP 200, chỉ trả về bác sĩ có tên chứa "Nguyen" | Positive |
| DOC-008 | Xem danh sách với filter theo chuyên khoa | `?specialtyId=1` | HTTP 200, chỉ trả về bác sĩ thuộc chuyên khoa đó | Positive |
| DOC-009 | Xem danh sách không cần token | Không gửi Authorization header | HTTP 200 (public endpoint) | Positive |

### 2.3. Bác sĩ tự cập nhật profile

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| DOC-010 | Cập nhật profile thành công | `{ full_name: "BS Mới", phone_number: "0909123456" }` | HTTP 200, dữ liệu được cập nhật | Positive |
| DOC-011 | Bác sĩ không tồn tại tự update | User ID không có doctor profile | HTTP 404, "Không tìm thấy hồ sơ bác sĩ" | Negative |
| DOC-012 | Patient role gọi API update doctor | Token PATIENT | HTTP 403, Forbidden | Negative |

### 2.4. Admin cập nhật bác sĩ

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| DOC-013 | Admin update specialization thành công | `{ specializationIds: [1,2,3] }` | HTTP 200, chuyên khoa cũ bị xóa, thay bằng mới | Positive |
| DOC-014 | Admin update với specializationIds không hợp lệ | `specializationIds: [999]` | HTTP 400, "Một hoặc nhiều chuyên khoa không hợp lệ" | Negative |
| DOC-015 | Admin update bác sĩ không tồn tại | doctor_id = 9999 | HTTP 404, "Bác sĩ không tồn tại" | Negative |

---

## 3. Module Profile - Patients (Bệnh nhân)

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| PAT-001 | Xem profile bệnh nhân thành công | Token PATIENT hợp lệ | HTTP 200, trả về patient info + user email | Positive |
| PAT-002 | Xem profile khi chưa có hồ sơ | User chưa có Patient record | HTTP 404, "Hồ sơ bệnh nhân chưa được khởi tạo" | Negative |
| PAT-003 | Cập nhật profile thành công (upsert) | `{ full_name: "New Name", phone_number: "0909123456" }` | HTTP 200, dữ liệu được upsert | Positive |
| PAT-004 | Cập nhật với số điện thoại đã tồn tại | SĐT đã có patient khác dùng | HTTP 409, "Số điện thoại này đã được sử dụng bởi người khác" | Negative |
| PAT-005 | Cập nhật với date_of_birth không hợp lệ | `{ date_of_birth: "invalid-date" }` | HTTP 400, Validation error | Negative |

---

## 4. Module Schedule (Lịch làm việc)

### 4.1. Admin tạo khung giờ mẫu (System Slot)

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| SCH-001 | Tạo system slot thành công | `{ slot_name: "Sáng 1", start_time: "07:00", end_time: "09:00" }` | HTTP 201, trả về systemTimeSlot | Positive |
| SCH-002 | Tạo slot với start_time >= end_time | `{ start_time: "10:00", end_time: "09:00" }` | HTTP 400, "Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc" | Negative |
| SCH-003 | Non-admin tạo system slot | Token DOCTOR | HTTP 403, Forbidden | Negative |

### 4.2. Bác sĩ đăng ký lịch làm việc

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| SCH-004 | Đăng ký lịch thành công | `{ system_slot_ids: [1,2], days_of_week: [2,3,4] }` | HTTP 201, lịch cũ bị xóa, tạo mới | Positive |
| SCH-005 | Đăng ký với system_slot_ids không hợp lệ | `system_slot_ids: [999]` | HTTP 400, "Một số khung giờ không hợp lệ" | Negative |
| SCH-006 | User không có doctor profile đăng ký | Token PATIENT | HTTP 400, "Bạn chưa có hồ sơ bác sĩ" | Negative |
| SCH-007 | Đăng ký với mảng rỗng | `{ system_slot_ids: [], days_of_week: [] }` | HTTP 201, xóa sạch lịch cũ, không tạo mới | Positive |

### 4.3. Xem lịch đã đăng ký

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| SCH-008 | Xem lịch đã đăng ký thành công | Token DOCTOR hợp lệ | HTTP 200, trả về grouped theo day_of_week | Positive |
| SCH-009 | Xem lịch khi chưa đăng ký gì | Doctor mới, chưa có availability | HTTP 200, mảng rỗng | Positive |

### 4.4. Xóa lịch đã đăng ký

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| SCH-010 | Xóa availability thành công | availability_id hợp lệ, đúng chủ sở hữu | HTTP 200, bản ghi bị xóa | Positive |
| SCH-011 | Xóa availability không tồn tại | availability_id = 9999 | HTTP 404, "Không tìm thấy lịch làm việc" | Negative |
| SCH-012 | Xóa availability của bác sĩ khác | availability_id thuộc doctor khác | HTTP 403, "Bạn không có quyền xóa lịch này" | Negative |

### 4.5. Sinh lịch thực tế (Generate Slots)

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| SCH-013 | Generate slots cho 14 ngày | startDate = today, endDate = today+14 | HTTP 201, trả về insertedCount | Positive |
| SCH-014 | Generate slots bị skip duplicate | Gọi 2 lần liên tiếp | Lần 2: insertedCount = 0 (skipDuplicates) | Positive |
| SCH-015 | Generate slots khi chưa có availability | Doctor chưa đăng ký lịch | HTTP 201, insertedCount = 0 | Positive |

### 4.6. Xem slot trống (Available Slots)

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| SCH-016 | Xem slot trống không filter | Không query params | HTTP 200, trả về slots từ hôm nay trở đi | Positive |
| SCH-017 | Xem slot trống theo ngày | `?date=2026-05-21` | HTTP 200, chỉ slot của ngày đó | Positive |
| SCH-018 | Xem slot trống theo bác sĩ | `?doctorId=1` | HTTP 200, chỉ slot của bác sĩ đó | Positive |
| SCH-019 | Xem slot trống theo chuyên khoa | `?specialtyId=1` | HTTP 200, chỉ slot của bác sĩ thuộc chuyên khoa | Positive |
| SCH-020 | Xem slot trống với ngày trong quá khứ | `?date=2020-01-01` | HTTP 200, mảng rỗng | Positive |
| SCH-021 | Slot đã hết giờ trong ngày hôm nay bị filter | Slot có start_time < now VN | Slot bị loại khỏi kết quả | Positive |
| SCH-022 | Slot đang bị lock nhưng đã hết hạn vẫn hiển thị | is_locked=true, locked_expires_at < now | Slot vẫn xuất hiện trong danh sách | Positive |

### 4.7. Giữ chỗ (Lock Slot)

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| SCH-023 | Lock slot thành công | slot_id hợp lệ, slot đang AVAILABLE | HTTP 200, "Giữ chỗ thành công trong 15 phút", is_locked=true | Positive |
| SCH-024 | Lock slot không tồn tại | slot_id = 9999 | HTTP 404, "Không tìm thấy khung giờ khám này." | Negative |
| SCH-025 | Lock slot đã hết giờ | Slot có start_time trong quá khứ | HTTP 400, "Không thể đặt lịch cho khung giờ đã trôi qua." | Negative |
| SCH-026 | Lock slot đã bị người khác lock | is_locked=true, locked_expires_at > now | HTTP 409, "Khung giờ này đã có người khác đang đặt." | Negative |
| SCH-027 | Lock slot đã BOOKED | status = BOOKED | HTTP 409, "Khung giờ này đã có người khác đang đặt." | Negative |
| SCH-028 | Patient lock slot thành công ghi nhận locked_by_user_id | Token PATIENT | locked_by_user_id = userId của patient | Positive |

### 4.8. Cron Job: Mở khóa slot hết hạn

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| SCH-029 | Unlock expired slots thành công | Có slot is_locked=true, locked_expires_at < now | is_locked=false, locked_by_user_id=null, locked_expires_at=null | Positive |
| SCH-030 | Unlock khi không có slot nào hết hạn | Tất cả slot còn hạn hoặc không locked | result.count = 0 | Positive |

---

## 5. Module Appointments (Đặt lịch & Khám)

### 5.1. Tạo Appointment

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| APP-001 | Tạo appointment thành công | `{ slot_id: 1, description: "Đau mắt", medical_files: ["url1"] }` | HTTP 201, status PENDING_PAYMENT, appointment_id | Positive |
| APP-002 | Tạo appointment khi không có patient profile | User chưa có Patient record | HTTP 400, "Không tìm thấy hồ sơ bệnh nhân" | Negative |
| APP-003 | Tạo appointment với slot không tồn tại | slot_id = 9999 | HTTP 404, "Khung giờ không tồn tại" | Negative |
| APP-004 | Tạo appointment khi không phải chủ sở hữu lock | locked_by_user_id khác userId | HTTP 409, "Lượt giữ chỗ đã hết hạn hoặc không hợp lệ" | Negative |
| APP-005 | Tạo appointment khi lock đã hết hạn | locked_expires_at < now | HTTP 409, "Lượt giữ chỗ đã hết hạn hoặc không hợp lệ" | Negative |
| APP-006 | Tạo appointment khi slot đã có appointment active | Slot đã có PENDING_PAYMENT hoặc CONFIRMED | HTTP 409, "Khung giờ này đang được người khác giữ hoặc đã thanh toán!" | Negative |
| APP-007 | Tạo appointment không có medical_files | `{ slot_id: 1, description: "Test" }` | HTTP 201, tạo thành công không có files | Positive |
| APP-008 | Doctor role tạo appointment | Token DOCTOR | HTTP 403, Forbidden | Negative |

### 5.2. Xem danh sách lịch hẹn

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| APP-009 | Patient xem lịch hẹn của mình | Token PATIENT | HTTP 200, trả về appointments kèm slot, doctor, medical_record | Positive |
| APP-010 | Patient chưa có lịch hẹn nào | Patient mới | HTTP 200, mảng rỗng | Positive |
| APP-011 | Doctor xem lịch hôm nay | Token DOCTOR | HTTP 200, chỉ CONFIRMED + IN_PROGRESS, sắp xếp theo giờ | Positive |
| APP-012 | Doctor không có lịch hôm nay | Doctor không có appointment hôm nay | HTTP 200, mảng rỗng | Positive |
| APP-013 | Doctor không tồn tại xem lịch | User không có doctor profile | HTTP 400, "Không tìm thấy thông tin bác sĩ." | Positive |

### 5.3. Bắt đầu ca khám (Start Appointment)

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| APP-014 | Bắt đầu ca khám thành công | appointment_id hợp lệ, status CONFIRMED, đúng giờ | HTTP 200, status IN_PROGRESS, actual_start_at | Positive |
| APP-015 | Bắt đầu ca khám không tồn tại | appointment_id = 9999 | HTTP 404, "Không tìm thấy lịch hẹn." | Negative |
| APP-016 | Bắt đầu ca khám của bác sĩ khác | appointment.doctor_id != doctor.doctor_id | HTTP 403, "Bạn không có quyền thao tác trên ca khám của bác sĩ khác." | Negative |
| APP-017 | Bắt đầu ca khám không ở trạng thái CONFIRMED | status = PENDING_PAYMENT | HTTP 400, "Chỉ có thể bắt đầu ca khám khi trạng thái là CONFIRMED." | Negative |
| APP-018 | Bắt đầu ca khám khi đang có ca IN_PROGRESS khác | Đã có appointment IN_PROGRESS của cùng doctor | HTTP 409, "Bạn đang có ca khám #... đang diễn ra." | Negative |
| APP-019 | Bắt đầu ca khám trước giờ cho phép (>15 phút trước) | now < slotStart - 15 phút | HTTP 400, "Chưa đến giờ khám." | Negative |
| APP-020 | Bắt đầu ca khám quá muộn (>30 phút sau giờ hẹn) | now > slotStart + 30 phút | HTTP 400, "Ca khám đã quá hạn 30 phút." | Negative |

### 5.4. Kết thúc ca khám (Complete Appointment)

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| APP-021 | Kết thúc ca khám thành công (có đơn thuốc) | `{ diagnosis_od, diagnosis_os, icd_10_code, drug_prescription: [...] }` | HTTP 200, status COMPLETED, actual_end_at, gửi mail | Positive |
| APP-022 | Kết thúc ca khám không có đơn thuốc | Chỉ có diagnosis, không có drug_prescription | HTTP 200, hoàn tất không có prescription | Positive |
| APP-023 | Kết thúc ca khám với drug_id không tồn tại | `drug_prescription: [{ drug_id: 999, quantity: 1 }]` | HTTP 400, "Một hoặc nhiều loại thuốc không tồn tại" | Negative |
| APP-024 | Kết thúc ca khám không ở IN_PROGRESS | status = CONFIRMED | HTTP 400, "Chỉ có thể kết thúc ca khám đang ở trạng thái IN_PROGRESS." | Negative |
| APP-025 | Kết thúc ca khám của bác sĩ khác | appointment.doctor_id != doctor.doctor_id | HTTP 403, "Bạn không có quyền thao tác trên ca khám này." | Negative |
| APP-026 | Kết thúc ca khám có glasses_prescription | `{ glasses_prescription: { od_sphere: -1.5, os_sphere: -1.25 } }` | HTTP 200, glasses_prescription được upsert | Positive |
| APP-027 | Gửi mail bệnh án thất bại không ảnh hưởng API | mailService.sendMedicalRecordEmail throw error | Vẫn trả về 200, log lỗi | Negative |

---

## 6. Module Payment (Thanh toán)

### 6.1. VNPay Callback

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| PAY-001 | VNPay thanh toán thành công | `isSuccess=true, vnpayTranNo="12345", amountPaid=200000` | HTTP 200, status SUCCESS, appointment CONFIRMED, meeting_link generated | Positive |
| PAY-002 | VNPay thanh toán thất bại | `isSuccess=false` | HTTP 200, status FAILED, transaction FAILED | Positive |
| PAY-003 | VNPay thanh toán cho appointment không tồn tại | appointment_id = 9999 | HTTP 404, "Không tìm thấy lịch hẹn" | Negative |
| PAY-004 | VNPay thanh toán cho appointment đã CONFIRMED | appointment.status = CONFIRMED, isSuccess=true | Trả về appointment cũ, không tạo transaction mới | Positive |

### 6.2. SePay Webhook

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| PAY-005 | SePay webhook xác nhận thanh toán thành công | `{ content: "TELEEYE 1", transferAmount: 200000 }` | HTTP 201, success=true, appointment CONFIRMED | Positive |
| PAY-006 | SePay webhook với nội dung không đúng format | `{ content: "Noi dung bat ky" }` | success=false, "Nội dung không khớp định dạng TELEEYE {id}" | Negative |
| PAY-007 | SePay webhook với appointment không tồn tại | `{ content: "TELEEYE 9999", transferAmount: 200000 }` | success=false, "Không tìm thấy lịch hẹn #9999" | Negative |
| PAY-008 | SePay webhook với số tiền không khớp | `{ content: "TELEEYE 1", transferAmount: 1000 }` | success=false, "Số tiền chuyển khoản không khớp" | Negative |
| PAY-009 | SePay webhook idempotency (đã CONFIRMED) | appointment.status = CONFIRMED | success=true, "Đã xác nhận trước đó" | Positive |
| PAY-010 | SePay webhook thiếu authorization header | Không gửi Authorization | HTTP 401, Unauthorized | Negative |
| PAY-011 | SePay webhook sai token | Authorization: Bearer wrong-token | HTTP 401, Unauthorized | Negative |

### 6.3. Kiểm tra trạng thái thanh toán (Payment Status)

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| PAY-012 | Kiểm tra payment status khi đã thanh toán | appointment CONFIRMED | paid=true, meeting_link có giá trị | Positive |
| PAY-013 | Kiểm tra payment status khi chưa thanh toán | appointment PENDING_PAYMENT | paid=false, meeting_link=null | Positive |
| PAY-014 | Kiểm tra payment status của appointment không thuộc về mình | appointment.patient.user_id != userId | HTTP 403, "Bạn không có quyền xem lịch hẹn này" | Negative |
| PAY-015 | Kiểm tra payment status với appointment không tồn tại | appointment_id = 9999 | HTTP 404, "Không tìm thấy lịch hẹn" | Negative |
| PAY-016 | Polling payment status tự động reconcile SePay | PENDING_PAYMENT, có giao dịch SePay khớp | Tự động chuyển sang CONFIRMED, paid=true | Positive |

### 6.4. Cron Job: Hủy appointment quá hạn thanh toán

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| PAY-017 | Hủy appointment PENDING_PAYMENT quá 35 phút | created_at > 35 phút trước | status = CANCELLED, slot AVAILABLE, is_locked=false | Positive |
| PAY-018 | Không có appointment nào quá hạn | Tất cả đều < 35 phút | return 0 | Positive |

---

## 7. Module Medical Record (Hồ sơ bệnh án)

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| MED-001 | Patient xem hồ sơ bệnh án của mình (COMPLETED) | appointment_id hợp lệ, role=PATIENT, status=COMPLETED | HTTP 200, đầy đủ medical_record, drug_prescription, glasses_prescription | Positive |
| MED-002 | Patient xem hồ sơ khi chưa COMPLETED | status=CONFIRMED | HTTP 400, "Hồ sơ bệnh án ... chỉ khả dụng khi ca khám đã hoàn tất." | Negative |
| MED-003 | Doctor xem hồ sơ khi đang IN_PROGRESS | role=DOCTOR, status=IN_PROGRESS | HTTP 200, xem được dữ liệu đang cập nhật | Positive |
| MED-004 | Doctor xem hồ sơ khi chưa có dữ liệu | status=PENDING_PAYMENT | HTTP 400, "Hồ sơ bệnh án chưa có dữ liệu để hiển thị." | Negative |
| MED-005 | Patient xem hồ sơ của người khác | appointment.patient.user_id != userId | HTTP 403, "Bạn không có quyền xem hồ sơ bệnh án này." | Negative |
| MED-006 | Admin xem hồ sơ bất kỳ | role=ADMIN | HTTP 200, bypass ownership check | Positive |
| MED-007 | Xem hồ sơ không tồn tại | appointment_id = 9999 | HTTP 404, "Không tìm thấy ca khám này." | Negative |

---

## 8. Module Drugs (Danh mục thuốc)

| ID | Test Case | Input | Expected Result | Loại |
|---|---|---|---|---|
| DRG-001 | Xem danh sách thuốc không search | Không query | HTTP 200, trả về tất cả thuốc | Positive |
| DRG-002 | Xem danh sách thuốc có search | `?search=Paracetamol` | HTTP 200, chỉ thuốc có tên chứa "Paracetamol" | Positive |
| DRG-003 | Admin tạo thuốc mới | `{ name: "Thuốc mới", unit: "Viên" }` | HTTP 201, tạo thành công | Positive |
| DRG-004 | Admin tạo thuốc trùng tên | Tên đã tồn tại | HTTP 409, Conflict | Negative |
| DRG-005 | Admin cập nhật thuốc | `{ unit: "Lọ" }` | HTTP 200, cập nhật thành công | Positive |
| DRG-006 | Admin xóa thuốc | drug_id hợp lệ | HTTP 200, xóa thành công | Positive |
| DRG-007 | Non-admin tạo thuốc | Token DOCTOR | HTTP 403, Forbidden | Negative |

---

## 9. Frontend Integration Tests

### 9.1. Auth Pages

| ID | Test Case | Steps | Expected Result | Loại |
|---|---|---|---|---|
| FE-001 | Hiển thị form đăng nhập | Vào /login | Hiển thị email input, password input, nút Login | UI |
| FE-002 | Đăng nhập thành công redirect | Nhập đúng email/password, submit | Redirect đến dashboard theo role | Integration |
| FE-003 | Đăng nhập thất bại hiển thị lỗi | Nhập sai password | Hiển thị thông báo lỗi từ API | Integration |
| FE-004 | Hiển thị form đăng ký | Vào /register | Hiển thị email, password, fullName, nút Register | UI |
| FE-005 | Đăng ký thành công redirect | Nhập đúng thông tin, submit | Redirect đến /verify-email với email params | Integration |
| FE-006 | Đăng ký thất bại hiển thị lỗi | Nhập email đã tồn tại | Hiển thị thông báo lỗi từ API | Integration |
| FE-007 | Xác thực email thành công | Nhập mã OTP, submit | Redirect đến /login, thông báo thành công | Integration |
| FE-008 | Xác thực email thất bại | Nhập sai OTP | Hiển thị lỗi "Mã xác thực không đúng" | Integration |
| FE-009 | Auto-refresh token khi 401 | Gọi API, token hết hạn, có refreshToken | Tự động refresh, retry request thành công | Integration |
| FE-010 | Auto-refresh token thất bại | Token hết hạn, refreshToken cũng hết hạn | Redirect về /login, xóa localStorage | Integration |

### 9.2. Patient Pages

| ID | Test Case | Steps | Expected Result | Loại |
|---|---|---|---|---|
| FE-011 | Hiển thị danh sách bác sĩ | Vào /patient/booking | Hiển thị danh sách bác sĩ kèm chuyên khoa | UI |
| FE-012 | Lọc bác sĩ theo chuyên khoa | Chọn chuyên khoa từ dropdown | Danh sách bác sĩ được lọc | Integration |
| FE-013 | Chọn bác sĩ xem lịch trống | Click vào bác sĩ | Hiển thị lịch trống của bác sĩ đó | Integration |
| FE-014 | Chọn ngày xem lịch trống | Chọn ngày trên calendar | Hiển thị slot trống của ngày đó | Integration |
| FE-015 | Lock slot thành công | Click vào slot trống | Slot chuyển sang trạng thái "đang giữ", hiển thị nút "Xác nhận đặt hẹn" | Integration |
| FE-016 | Lock slot thất bại (đã có người giữ) | Click vào slot đang bị lock | Hiển thị thông báo "Khung giờ này đã có người khác đang đặt" | Integration |
| FE-017 | Tạo appointment thành công | Nhập mô tả, submit form | Redirect đến trang chờ thanh toán | Integration |
| FE-018 | Hiển thị danh sách lịch hẹn | Vào /patient/appointments | Hiển thị danh sách lịch hẹn kèm trạng thái | UI |
| FE-019 | Xem chi tiết lịch hẹn | Click vào một lịch hẹn | Hiển thị chi tiết: bác sĩ, giờ, trạng thái, nút xem hồ sơ | UI |
| FE-020 | Xem hồ sơ bệnh án | Click "Xem hồ sơ" trên lịch COMPLETED | Hiển thị đầy đủ chẩn đoán, đơn thuốc, đơn kính | Integration |
| FE-021 | Polling payment status | Ở trang chờ thanh toán | Tự động kiểm tra mỗi 5s, khi CONFIRMED thì redirect | Integration |
| FE-022 | Hiển thị số dư ví | Vào /patient/wallet | Hiển thị số dư, lịch sử giao dịch | UI |

### 9.3. Doctor Pages

| ID | Test Case | Steps | Expected Result | Loại |
|---|---|---|---|---|
| FE-023 | Hiển thị danh sách lịch hôm nay | Vào /doctor | Hiển thị danh sách lịch hẹn hôm nay, sắp xếp theo giờ | UI |
| FE-024 | Bắt đầu ca khám | Click "Bắt đầu" trên lịch CONFIRMED | Chuyển sang IN_PROGRESS, mở form khám | Integration |
| FE-025 | Nhập chẩn đoán và kê đơn | Nhập diagnosis, chọn thuốc, số lượng | Form hiển thị đúng dữ liệu nhập | UI |
| FE-026 | Tìm kiếm thuốc khi kê đơn | Gõ tên thuốc vào ô search | Hiển thị danh sách thuốc gợi ý | Integration |
| FE-027 | Kết thúc ca khám | Click "Kết thúc", xác nhận | Chuyển về danh sách, lịch chuyển COMPLETED | Integration |
| FE-028 | Đăng ký lịch làm việc | Vào /doctor/schedule | Hiển thị form chọn khung giờ và ngày trong tuần | UI |
| FE-029 | Lưu lịch làm việc | Chọn khung giờ, submit | Lưu thành công, gọi generate-slots | Integration |
| FE-030 | Xem hồ sơ bệnh án trong ca khám | Click "Hồ sơ" khi đang IN_PROGRESS | Hiển thị dữ liệu đã nhập (nếu có) | Integration |

### 9.4. Admin Pages

| ID | Test Case | Steps | Expected Result | Loại |
|---|---|---|---|---|
| FE-031 | Tạo bác sĩ mới | Vào /admin/doctors/create, nhập thông tin | Tạo thành công, redirect về danh sách | Integration |
| FE-032 | Tạo system slot | Vào /admin/schedule, nhập khung giờ | Tạo thành công, hiển thị trong danh sách | Integration |
| FE-033 | Quản lý danh mục thuốc | Vào /admin/drugs | Hiển thị CRUD danh mục thuốc | UI |
| FE-034 | Xóa thuốc | Click xóa, xác nhận | Thuốc bị xóa khỏi danh sách | Integration |

---

## 10. End-to-End (E2E) Flow Tests

| ID | Test Case | Steps | Expected Result | Loại |
|---|---|---|---|---|
| E2E-001 | **Luồng đặt lịch hoàn chỉnh (Patient)** | 1. Đăng ký → 2. Xác thực email → 3. Đăng nhập → 4. Xem danh sách bác sĩ → 5. Chọn bác sĩ → 6. Lock slot → 7. Tạo appointment → 8. Thanh toán (mock) → 9. Xem lịch hẹn → 10. Xem hồ sơ sau khám | Toàn bộ luồng hoàn tất, dữ liệu nhất quán | E2E |
| E2E-002 | **Luồng khám bệnh hoàn chỉnh (Doctor)** | 1. Admin tạo bác sĩ → 2. Bác sĩ đăng nhập → 3. Đăng ký lịch làm việc → 4. Generate slots → 5. Xem lịch hôm nay → 6. Bắt đầu ca khám → 7. Nhập chẩn đoán → 8. Kê đơn thuốc → 9. Kết thúc ca khám | Toàn bộ luồng hoàn tất, mail gửi thành công | E2E |
| E2E-003 | **Luồng thanh toán qua SePay** | 1. Patient tạo appointment (PENDING_PAYMENT) → 2. SePay gửi webhook → 3. Appointment chuyển CONFIRMED → 4. Patient polling thấy paid=true → 5. Meeting link được tạo | Thanh toán tự động, không cần can thiệp | E2E |
| E2E-004 | **Luồng thanh toán qua VNPay** | 1. Patient tạo appointment → 2. Redirect VNPay → 3. VNPay callback thành công → 4. Appointment CONFIRMED → 5. Transaction SUCCESS | Thanh toán qua VNPay hoàn tất | E2E |
| E2E-005 | **Luồng hết hạn giữ chỗ** | 1. Patient lock slot → 2. Không tạo appointment trong 15 phút → 3. Cron unlock → 4. Patient khác lock được slot | Slot tự động mở khóa sau 15 phút | E2E |
| E2E-006 | **Luồng hết hạn thanh toán** | 1. Patient tạo appointment (PENDING_PAYMENT) → 2. Không thanh toán trong 35 phút → 3. Cron hủy appointment → 4. Slot trở lại AVAILABLE | Appointment tự động hủy, slot free | E2E |
| E2E-007 | **Luồng bắt đầu ca khám sai giờ** | 1. Patient đặt lịch → 2. Thanh toán → 3. Doctor cố gắng start >30 phút sau giờ hẹn | HTTP 400, "Ca khám đã quá hạn 30 phút." | E2E |
| E2E-008 | **Luồng bác sĩ đang khám không thể start ca khác** | 1. Doctor start ca A (IN_PROGRESS) → 2. Doctor cố gắng start ca B | HTTP 409, "Bạn đang có ca khám đang diễn ra." | E2E |
| E2E-009 | **Luồng patient xem hồ sơ của người khác** | 1. Patient A đặt lịch → 2. Patient B login → 3. Patient B cố gắng xem hồ sơ của Patient A | HTTP 403, "Bạn không có quyền xem hồ sơ bệnh án này." | E2E |
| E2E-010 | **Luồng refresh token tự động** | 1. Patient login → 2. Đợi accessToken hết hạn → 3. Gọi API bất kỳ → 4. Frontend tự động refresh → 5. API thành công | Token được refresh, user không bị logout | E2E |

---

## 📊 Thống kê Test Cases

| Module | Số lượng Test Cases |
|---|---|
| Auth | 27 |
| Profile - Doctors | 15 |
| Profile - Patients | 5 |
| Schedule | 30 |
| Appointments | 27 |
| Payment | 18 |
| Medical Record | 7 |
| Drugs | 7 |
| Frontend Integration | 34 |
| E2E Flows | 10 |
| **Tổng cộng** | **180** |

---

## 🏷️ Chú thích

- **Positive**: Test case mong đợi thành công (happy path)
- **Negative**: Test case mong đợi thất bại (error handling, validation)
- **UI**: Kiểm thử giao diện người dùng
- **Integration**: Kiểm thử tích hợp frontend-backend
- **E2E**: Kiểm thử end-to-end toàn luồng

## 🛠️ Gợi ý công cụ kiểm thử

| Loại | Công cụ đề xuất |
|---|---|
| Unit Test (Service) | Jest + ts-mockito |
| E2E API Test | Supertest (NestJS built-in) |
| Frontend Unit Test | Jest + React Testing Library |
| Frontend E2E | Playwright / Cypress |
| API Contract Test | Postman / Newman |
| Load Test | k6 / Artillery |
