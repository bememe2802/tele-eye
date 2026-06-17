import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import * as bcrypt from 'bcrypt';
import { execSync } from 'child_process';

/**
 * Tele-Eye E2E Test Suite
 *
 * Covers all major modules based on TESTCASES.md:
 *  - Auth (Register, Verify Email, Login, Refresh Token, Logout)
 *  - Profile (Doctors, Patients)
 *  - Schedule (System Slots, Availability, Calendar Slots, Lock)
 *  - Appointments (Create, Start, Complete, Medical Records)
 *  - Payment (VNPay, SePay Webhook, Payment Status)
 *  - Drugs (CRUD)
 *  - Admin operations
 */

describe('Tele-Eye E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Shared state across tests
  const testUser = {
    email: 'e2e-patient@test.com',
    password: '123456',
    fullName: 'Nguyễn Văn A (E2E)',
  };
  const adminUser = {
    email: 'e2e-admin@test.com',
    password: '123456',
    fullName: 'Admin E2E',
  };
  const doctorUser = {
    email: 'e2e-doctor@test.com',
    password: '123456',
    fullName: 'BS. Nguyễn Văn B (E2E)',
  };

  let patientAccessToken: string;
  let patientRefreshToken: string;
  let adminAccessToken: string;
  let doctorAccessToken: string;
  let doctorId: number;
  let patientId: number;
  let systemSlotId: number;
  let calendarSlotId: number;
  let appointmentId: number;
  let drugId: number;
  let verificationToken: string;

  beforeAll(async () => {
    // Ensure test database is migrated
    try {
      execSync('npx prisma migrate deploy', {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        stdio: 'pipe',
      });
    } catch {
      // Migration may already be applied
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    // Clean up any leftover test data
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function cleanupTestData() {
    const testEmails = [
      testUser.email,
      adminUser.email,
      doctorUser.email,
    ];

    for (const email of testEmails) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        // Delete in reverse dependency order
        await prisma.appointmentPayment.deleteMany({
          where: { appointment: { patient: { user_id: user.user_id } } },
        }).catch(() => { });
        await prisma.appointment.deleteMany({
          where: { patient: { user_id: user.user_id } },
        }).catch(() => { });
        await prisma.appointment.deleteMany({
          where: { doctor: { user_id: user.user_id } },
        }).catch(() => { });
        await prisma.doctorCalendarSlots.deleteMany({
          where: { doctor: { user_id: user.user_id } },
        }).catch(() => { });
        await prisma.doctorAvailability.deleteMany({
          where: { doctor: { user_id: user.user_id } },
        }).catch(() => { });
        await prisma.doctorSpecialization.deleteMany({
          where: { doctor: { user_id: user.user_id } },
        }).catch(() => { });
        await prisma.patient.deleteMany({ where: { user_id: user.user_id } }).catch(() => { });
        await prisma.doctor.deleteMany({ where: { user_id: user.user_id } }).catch(() => { });
        await prisma.userSession.deleteMany({ where: { user_id: user.user_id } }).catch(() => { });
        await prisma.verificationToken.deleteMany({ where: { email } }).catch(() => { });
        await prisma.user.delete({ where: { email } }).catch(() => { });
      }
    }

    // Clean up system slots
    await prisma.systemTimeSlot.deleteMany({
      where: { shift_name: { contains: 'E2E' } },
    }).catch(() => { });

    // Clean up drugs
    await prisma.drug.deleteMany({
      where: { name: { contains: 'E2E' } },
    }).catch(() => { });

    // Clean up specializations
    await prisma.specialization.deleteMany({
      where: { name: { contains: 'E2E' } },
    }).catch(() => { });
  }

  // ====================================================================
  // 1. AUTH MODULE
  // ====================================================================

  describe('Auth Module', () => {
    // AUTH-001: Register successfully
    it('AUTH-001: should register a new patient successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body.message).toContain('Đăng ký thành công');
      expect(res.body.email).toBe(testUser.email);
      expect(res.body.nextStep).toBe('VERIFY_EMAIL');

      // Retrieve the verification token for later use
      const tokenRecord = await prisma.verificationToken.findFirst({
        where: { email: testUser.email },
        orderBy: { created_at: 'desc' },
      });
      expect(tokenRecord).toBeDefined();
      verificationToken = tokenRecord!.token;
    });

    // AUTH-002: Register with existing email
    it('AUTH-002: should reject duplicate email registration', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Email already exists');
        });
    });

    // AUTH-003: Register with invalid email
    it('AUTH-003: should reject invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'invalid', password: '123456', fullName: 'Test' })
        .expect(400);
    });

    // AUTH-004: Register with short password
    it('AUTH-004: should reject password < 6 characters', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'short@test.com', password: '123', fullName: 'Test' })
        .expect(400);
    });

    // AUTH-005: Register missing fullName
    it('AUTH-005: should reject registration without fullName', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'nofullname@test.com', password: '123456' })
        .expect(400);
    });

    // AUTH-008: Verify email successfully
    it('AUTH-008: should verify email with correct OTP', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email: testUser.email, token: verificationToken })
        .expect(201);

      expect(res.body.message).toContain('Xác thực email thành công');

      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      expect(user?.is_email_verified).toBe(true);
    });

    // AUTH-009: Verify with wrong OTP
    it('AUTH-009: should reject wrong OTP', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email: testUser.email, token: '000000' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Mã xác thực không đúng');
        });
    });

    // AUTH-011: Verify with non-existent email
    it('AUTH-011: should reject verify for non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email: 'nonexist@test.com', token: '123456' })
        .expect(400);
    });

    // AUTH-012: Verify with wrong length token
    it('AUTH-012: should reject token not 6 characters', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email: testUser.email, token: '12' })
        .expect(400);
    });

    // AUTH-013: Login successfully
    it('AUTH-013: should login with correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.role).toBe('PATIENT');

      patientAccessToken = res.body.accessToken;
      patientRefreshToken = res.body.refreshToken;
    });

    // AUTH-014: Login with non-existent email
    it('AUTH-014: should reject login with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'no@exist.com', password: '123456' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Thông tin đăng nhập không chính xác');
        });
    });

    // AUTH-015: Login with wrong password
    it('AUTH-015: should reject login with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'wrong' })
        .expect(401);
    });

    // AUTH-016: Login with inactive account
    it('AUTH-016: should reject login for inactive account', async () => {
      // Create a user and deactivate
      const hashedPwd = await bcrypt.hash('123456', 10);
      const inactiveUser = await prisma.user.create({
        data: {
          email: 'inactive@test.com',
          password_hash: hashedPwd,
          role: 'PATIENT',
          is_active: false,
          is_email_verified: true,
        },
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'inactive@test.com', password: '123456' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Tài khoản của bạn đã bị khóa');
        });

      await prisma.user.delete({ where: { user_id: inactiveUser.user_id } }).catch(() => { });
    });

    // AUTH-017: Login with unverified email
    it('AUTH-017: should reject login for unverified email', async () => {
      const hashedPwd = await bcrypt.hash('123456', 10);
      const unverifiedUser = await prisma.user.create({
        data: {
          email: 'unverified@test.com',
          password_hash: hashedPwd,
          role: 'PATIENT',
          is_email_verified: false,
        },
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'unverified@test.com', password: '123456' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Vui lòng xác thực email');
        });

      await prisma.user.delete({ where: { user_id: unverifiedUser.user_id } }).catch(() => { });
    });

    // AUTH-020: Refresh token
    it('AUTH-020: should refresh token successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: patientRefreshToken })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();

      // Update tokens
      patientAccessToken = res.body.accessToken;
      patientRefreshToken = res.body.refreshToken;
    });

    // AUTH-024: Refresh with empty token
    it('AUTH-024: should reject empty refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: '' })
        .expect(400);
    });

    // AUTH-025: Logout successfully
    it('AUTH-025: should logout successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: patientRefreshToken })
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .expect(201);

      expect(res.body.message).toContain('Đăng xuất thành công');

      // Verify session is revoked
      const session = await prisma.userSession.findFirst({
        where: { refresh_token: patientRefreshToken },
      });
      expect(session?.is_revoked).toBe(true);
    });

    // AUTH-026: Logout with non-existent token
    it('AUTH-026: should reject logout with non-existent token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: 'non-existent-token' })
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .expect(404);
    });

    // Re-login for subsequent tests
    it('should re-login patient for subsequent tests', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(201);

      patientAccessToken = res.body.accessToken;
      patientRefreshToken = res.body.refreshToken;
    });
  });

  // ====================================================================
  // 2. PROFILE - PATIENTS
  // ====================================================================

  describe('Patient Profile Module', () => {
    // PAT-001: Get patient profile
    it('PAT-001: should get patient profile successfully', async () => {
      const res = await request(app.getHttpServer())
        .get('/profile/patients/me')
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .expect(200);

      expect(res.body.full_name).toBe(testUser.fullName);
      expect(res.body.user.email).toBe(testUser.email);
      patientId = res.body.patient_id;
    });

    // PAT-003: Update patient profile
    it('PAT-003: should update patient profile successfully', async () => {
      const res = await request(app.getHttpServer())
        .patch('/profile/patients/me')
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .send({ full_name: 'Nguyễn Văn A (Updated)', phone_number: '0909123456' })
        .expect(200);

      expect(res.body.full_name).toBe('Nguyễn Văn A (Updated)');
    });

    // PAT-005: Update with invalid date_of_birth
    it('PAT-005: should reject invalid date_of_birth', async () => {
      await request(app.getHttpServer())
        .patch('/profile/patients/me')
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .send({ date_of_birth: 'invalid-date' })
        .expect(400);
    });
  });

  // ====================================================================
  // 3. PROFILE - DOCTORS (Admin creates doctor)
  // ====================================================================

  describe('Doctor Profile Module', () => {
    // First register admin
    it('should register and setup admin user', async () => {
      // Create admin user directly in DB
      const hashedPwd = await bcrypt.hash(adminUser.password, 10);
      await prisma.user.create({
        data: {
          email: adminUser.email,
          password_hash: hashedPwd,
          role: 'ADMIN',
          is_email_verified: true,
        },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: adminUser.email, password: adminUser.password })
        .expect(201);

      adminAccessToken = res.body.accessToken;
    });

    // DOC-001: Create doctor successfully
    it('DOC-001: should create a doctor successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/profile/doctors')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          email: doctorUser.email,
          password: doctorUser.password,
          full_name: doctorUser.fullName,
          title: 'ThS.BS',
          license_number: 'LIC-E2E-001',
          consultation_fee: 200000,
          specializationIds: [],
        })
        .expect(201);

      expect(res.body.message).toContain('Tạo bác sĩ thành công');
      expect(res.body.doctorId).toBeDefined();
      doctorId = res.body.doctorId;
    });

    // DOC-002: Create doctor with existing email
    it('DOC-002: should reject creating doctor with existing email', async () => {
      await request(app.getHttpServer())
        .post('/profile/doctors')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          email: doctorUser.email,
          password: doctorUser.password,
          full_name: 'Another Doctor',
          consultation_fee: 150000,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Email đã tồn tại');
        });
    });

    // DOC-005: Non-admin cannot create doctor
    it('DOC-005: should reject non-admin from creating doctor', async () => {
      await request(app.getHttpServer())
        .post('/profile/doctors')
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .send({
          email: 'unauth@test.com',
          password: '123456',
          full_name: 'Unauthorized',
          consultation_fee: 100000,
        })
        .expect(403);
    });

    // DOC-006: Get all doctors
    it('DOC-006: should list all doctors', async () => {
      const res = await request(app.getHttpServer())
        .get('/profile/doctors')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const createdDoctor = res.body.find((d: any) => d.doctor_id === doctorId);
      expect(createdDoctor).toBeDefined();
      expect(createdDoctor.full_name).toBe(doctorUser.fullName);
    });

    // Login as doctor for subsequent tests
    it('should login as doctor for subsequent tests', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: doctorUser.email, password: doctorUser.password })
        .expect(201);

      doctorAccessToken = res.body.accessToken;
    });

    // DOC-010: Doctor updates own profile
    it('DOC-010: should allow doctor to update own profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/profile/doctors/me')
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .send({ phone_number: '0909123999' })
        .expect(200);

      expect(res.body.phone_number).toBe('0909123999');
    });
  });

  // ====================================================================
  // 4. SCHEDULE MODULE
  // ====================================================================

  describe('Schedule Module', () => {
    // SCH-001: Admin creates system slot
    it('SCH-001: should create a system time slot', async () => {
      const res = await request(app.getHttpServer())
        .post('/booking/schedule/system-slots')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          slot_name: 'Sáng 1 (E2E)',
          start_time: '07:00',
          end_time: '09:00',
        })
        .expect(201);

      expect(res.body.slot_template_id).toBeDefined();
      systemSlotId = res.body.slot_template_id;
    });

    // SCH-002: Create slot with invalid time range
    it('SCH-002: should reject slot with start_time >= end_time', async () => {
      await request(app.getHttpServer())
        .post('/booking/schedule/system-slots')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          slot_name: 'Invalid Slot (E2E)',
          start_time: '10:00',
          end_time: '09:00',
        })
        .expect(400);
    });

    // SCH-003: Non-admin cannot create system slot
    it('SCH-003: should reject non-admin from creating system slot', async () => {
      await request(app.getHttpServer())
        .post('/booking/schedule/system-slots')
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .send({
          slot_name: 'Unauthorized Slot',
          start_time: '07:00',
          end_time: '09:00',
        })
        .expect(403);
    });

    // SCH-004: Doctor registers availability
    it('SCH-004: should register doctor availability', async () => {
      const res = await request(app.getHttpServer())
        .post('/booking/schedule/doctor-availability')
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .send({
          system_slot_ids: [systemSlotId],
          days_of_week: [2, 3, 4], // Mon, Tue, Wed
        })
        .expect(201);

      expect(res.body.message).toContain('Đăng ký lịch làm việc thành công');
    });

    // SCH-005: Register with invalid system slot
    it('SCH-005: should reject availability with invalid system slot', async () => {
      await request(app.getHttpServer())
        .post('/booking/schedule/doctor-availability')
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .send({
          system_slot_ids: [99999],
          days_of_week: [2],
        })
        .expect(400);
    });

    // SCH-008: Get doctor's availability
    it('SCH-008: should get doctor availability', async () => {
      const res = await request(app.getHttpServer())
        .get('/booking/schedule/doctor-availability/me')
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    // SCH-013: Generate calendar slots
    it('SCH-013: should generate calendar slots for 14 days', async () => {
      const res = await request(app.getHttpServer())
        .post('/booking/schedule/generate-slots')
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .expect(201);

      expect(res.body.insertedCount).toBeDefined();
    });

    // SCH-016: Get available slots
    it('SCH-016: should get available calendar slots', async () => {
      const res = await request(app.getHttpServer())
        .get('/booking/schedule/calendar-slots')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);

      // Find a slot for our doctor
      const doctorSlot = res.body.find(
        (s: any) => s.doctor?.doctor_id === doctorId,
      );
      if (doctorSlot) {
        calendarSlotId = doctorSlot.slot_id;
      }
    });

    // SCH-023: Lock a slot
    it('SCH-023: should lock a calendar slot successfully', async () => {
      if (!calendarSlotId) {
        // Find any available slot for our doctor
        const res = await request(app.getHttpServer())
          .get('/booking/schedule/calendar-slots')
          .expect(200);

        const doctorSlot = res.body.find(
          (s: any) => s.doctor?.doctor_id === doctorId,
        );
        if (!doctorSlot) {
          // Generate slots again if none found
          await request(app.getHttpServer())
            .post('/booking/schedule/generate-slots')
            .set('Authorization', `Bearer ${doctorAccessToken}`);

          const res2 = await request(app.getHttpServer())
            .get('/booking/schedule/calendar-slots')
            .expect(200);

          const doctorSlot2 = res2.body.find(
            (s: any) => s.doctor?.doctor_id === doctorId,
          );
          if (!doctorSlot2) {
            throw new Error('No available slots found for doctor');
          }
          calendarSlotId = doctorSlot2.slot_id;
        } else {
          calendarSlotId = doctorSlot.slot_id;
        }
      }

      const res = await request(app.getHttpServer())
        .patch(`/booking/schedule/calendar-slots/${calendarSlotId}/lock`)
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .expect(200);

      expect(res.body.message).toContain('Giữ chỗ thành công');
    });

    // SCH-024: Lock non-existent slot
    it('SCH-024: should reject locking non-existent slot', async () => {
      await request(app.getHttpServer())
        .patch('/booking/schedule/calendar-slots/99999/lock')
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .expect(404);
    });

    // SCH-026: Lock already locked slot
    it('SCH-026: should reject locking already locked slot', async () => {
      await request(app.getHttpServer())
        .patch(`/booking/schedule/calendar-slots/${calendarSlotId}/lock`)
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .expect(409);
    });
  });

  // ====================================================================
  // 5. APPOINTMENTS MODULE
  // ====================================================================

  describe('Appointments Module', () => {
    // APP-001: Create appointment
    it('APP-001: should create an appointment successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/booking/appointments')
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .send({
          slot_id: calendarSlotId,
          description: 'Mắt trái bị đỏ và ngứa sau khi đi bơi',
          medical_files: [],
        })
        .expect(201);

      expect(res.body.appointment_id).toBeDefined();
      expect(res.body.message).toContain('Đặt lịch thành công');
      appointmentId = res.body.appointment_id;
    });

    // APP-002: Create appointment without patient profile
    it('APP-002: should reject appointment without patient profile', async () => {
      // Register a new user without patient profile
      const newUserRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'noprofile-e2e@test.com',
          password: '123456',
          fullName: 'No Profile User',
        });

      // Verify email
      const tokenRecord = await prisma.verificationToken.findFirst({
        where: { email: 'noprofile-e2e@test.com' },
        orderBy: { created_at: 'desc' },
      });
      if (tokenRecord) {
        await request(app.getHttpServer())
          .post('/auth/verify-email')
          .send({ email: 'noprofile-e2e@test.com', token: tokenRecord.token });
      }

      // Login
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'noprofile-e2e@test.com', password: '123456' });

      const noProfileToken = loginRes.body.accessToken;

      // Try to create appointment - should fail because no patient profile
      await request(app.getHttpServer())
        .post('/booking/appointments')
        .set('Authorization', `Bearer ${noProfileToken}`)
        .send({
          slot_id: calendarSlotId,
          description: 'Test without profile',
        })
        .expect(400);

      // Cleanup
      const user = await prisma.user.findUnique({
        where: { email: 'noprofile-e2e@test.com' },
      });
      if (user) {
        await prisma.userSession.deleteMany({ where: { user_id: user.user_id } });
        await prisma.verificationToken.deleteMany({ where: { email: 'noprofile-e2e@test.com' } });
        await prisma.user.delete({ where: { user_id: user.user_id } });
      }
    });

    // APP-003: Create appointment with non-existent slot
    it('APP-003: should reject appointment with non-existent slot', async () => {
      await request(app.getHttpServer())
        .post('/booking/appointments')
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .send({
          slot_id: 99999,
          description: 'Test non-existent slot',
        })
        .expect(404);
    });

    // APP-008: Doctor cannot create appointment
    it('APP-008: should reject doctor from creating appointment', async () => {
      await request(app.getHttpServer())
        .post('/booking/appointments')
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .send({
          slot_id: calendarSlotId,
          description: 'Doctor trying to book',
        })
        .expect(403);
    });

    // APP-009: Patient views their appointments
    it('APP-009: should get patient appointments', async () => {
      const res = await request(app.getHttpServer())
        .get('/booking/appointments/patient/my')
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].appointment_id).toBe(appointmentId);
    });

    // APP-011: Doctor views today's appointments
    it('APP-011: should get doctor today appointments', async () => {
      const res = await request(app.getHttpServer())
        .get('/booking/appointments/doctor/today')
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ====================================================================
  // 6. PAYMENT MODULE
  // ====================================================================

  describe('Payment Module', () => {
    // PAY-001: VNPay payment success
    it('PAY-001: should handle VNPay payment success', async () => {
      const res = await request(app.getHttpServer())
        .post(`/booking/appointments/${appointmentId}/vnpay-callback`)
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .send({
          vnp_TransactionNo: 'E2E-TXN-001',
          vnp_Amount: 20000000, // VND * 100
          vnp_ResponseCode: '00',
          vnp_TxnRef: `REF-${appointmentId}`,
        })
        .expect(201);

      expect(res.body.status).toBe('SUCCESS');
    });

    // PAY-002: VNPay payment failure
    it('PAY-002: should handle VNPay payment failure', async () => {
      // Create another appointment for failure test
      const slotRes = await request(app.getHttpServer())
        .get('/booking/schedule/calendar-slots')
        .expect(200);

      const anotherSlot = slotRes.body.find(
        (s: any) => s.doctor?.doctor_id === doctorId && s.slot_id !== calendarSlotId,
      );

      if (anotherSlot) {
        // Lock the slot
        await request(app.getHttpServer())
          .patch(`/booking/schedule/calendar-slots/${anotherSlot.slot_id}/lock`)
          .set('Authorization', `Bearer ${patientAccessToken}`);

        // Create appointment
        const appRes = await request(app.getHttpServer())
          .post('/booking/appointments')
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .send({
            slot_id: anotherSlot.slot_id,
            description: 'Test failure payment',
          });

        const failAppointmentId = appRes.body.appointment_id;

        // VNPay failure callback
        const res = await request(app.getHttpServer())
          .post(`/booking/appointments/${failAppointmentId}/vnpay-callback`)
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .send({
            vnp_TransactionNo: 'E2E-TXN-FAIL',
            vnp_Amount: 20000000,
            vnp_ResponseCode: '01',
            vnp_TxnRef: `REF-FAIL-${failAppointmentId}`,
          })
          .expect(201);

        expect(res.body.status).toBe('FAILED');
      }
    });

    // PAY-003: VNPay payment for non-existent appointment
    it('PAY-003: should reject VNPay callback for non-existent appointment', async () => {
      await request(app.getHttpServer())
        .post('/booking/appointments/99999/vnpay-callback')
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .send({
          vnp_TransactionNo: 'E2E-TXN-999',
          vnp_Amount: 20000000,
          vnp_ResponseCode: '00',
          vnp_TxnRef: 'REF-99999',
        })
        .expect(404);
    });

    // PAY-012: Check payment status
    it('PAY-012: should return paid=true for confirmed appointment', async () => {
      const res = await request(app.getHttpServer())
        .get(`/booking/appointments/${appointmentId}/payment-status`)
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .expect(200);

      expect(res.body.paid).toBe(true);
      expect(res.body.status).toBe('CONFIRMED');
      expect(res.body.meeting_link).toBeDefined();
    });

    // PAY-014: Check payment status of other's appointment
    it('PAY-014: should reject payment status check for other appointment', async () => {
      await request(app.getHttpServer())
        .get(`/booking/appointments/${appointmentId}/payment-status`)
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .expect(403);
    });

    // PAY-015: Check payment status for non-existent appointment
    it('PAY-015: should reject payment status for non-existent appointment', async () => {
      await request(app.getHttpServer())
        .get('/booking/appointments/99999/payment-status')
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .expect(404);
    });
  });

  // ====================================================================
  // 7. MEDICAL RECORD & APPOINTMENT FLOW
  // ====================================================================

  describe('Medical Record & Appointment Flow', () => {
    // APP-014: Start appointment
    it('APP-014: should start an appointment successfully', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/booking/appointments/${appointmentId}/start`)
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .expect(200);

      expect(res.body.status).toBe('IN_PROGRESS');
      expect(res.body.actual_start_at).toBeDefined();
    });

    // APP-015: Start non-existent appointment
    it('APP-015: should reject starting non-existent appointment', async () => {
      await request(app.getHttpServer())
        .patch('/booking/appointments/99999/start')
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .expect(404);
    });

    // APP-016: Patient cannot start appointment
    it('APP-016: should reject patient from starting appointment', async () => {
      await request(app.getHttpServer())
        .patch(`/booking/appointments/${appointmentId}/start`)
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .expect(403);
    });

    // APP-017: Complete appointment
    it('APP-017: should complete an appointment successfully', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/booking/appointments/${appointmentId}/complete`)
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .expect(200);

      expect(res.body.status).toBe('COMPLETED');
      expect(res.body.actual_end_at).toBeDefined();
    });

    // APP-018: Complete non-existent appointment
    it('APP-018: should reject completing non-existent appointment', async () => {
      await request(app.getHttpServer())
        .patch('/booking/appointments/99999/complete')
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .expect(404);
    });

    // MED-001: Create medical record
    it('MED-001: should create a medical record successfully', async () => {
      const res = await request(app.getHttpServer())
        .post(`/medical/records/${appointmentId}`)
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .send({
          chief_complaint: 'Mắt trái đỏ và ngứa sau khi đi bơi',
          history_of_present_illness: 'Bệnh nhân nam 25 tuổi, đi bơi hôm qua, sáng nay thấy mắt trái đỏ và ngứa nhiều',
          diagnosis_od: 'Bình thường',
          diagnosis_os: 'Viêm kết mạc cấp',
          icd_10_code: 'H10.9',
          management_plan: 'Nhỏ thuốc kháng sinh, tái khám sau 5 ngày',
          doctor_notes: 'Cần vệ sinh mắt hàng ngày',
        })
        .expect(201);

      expect(res.body.record_id).toBeDefined();
      expect(res.body.chief_complaint).toContain('Mắt trái đỏ');
    });

    // MED-002: Create medical record for non-existent appointment
    it('MED-002: should reject medical record for non-existent appointment', async () => {
      await request(app.getHttpServer())
        .post('/medical/records/99999')
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .send({
          chief_complaint: 'Test',
          diagnosis_od: 'Normal',
          diagnosis_os: 'Normal',
        })
        .expect(404);
    });

    // MED-003: Patient cannot create medical record
    it('MED-003: should reject patient from creating medical record', async () => {
      await request(app.getHttpServer())
        .post(`/medical/records/${appointmentId}`)
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .send({
          chief_complaint: 'Test',
          diagnosis_od: 'Normal',
          diagnosis_os: 'Normal',
        })
        .expect(403);
    });

    // MED-004: Get medical record
    it('MED-004: should get medical record for appointment', async () => {
      const res = await request(app.getHttpServer())
        .get(`/medical/records/${appointmentId}`)
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .expect(200);

      expect(res.body.chief_complaint).toContain('Mắt trái đỏ');
      expect(res.body.diagnosis_os).toBe('Viêm kết mạc cấp');
    });

    // MED-005: Get medical record for non-existent appointment
    it('MED-005: should reject getting medical record for non-existent appointment', async () => {
      await request(app.getHttpServer())
        .get('/medical/records/99999')
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .expect(404);
    });

    // MED-006: Unauthorized user cannot view medical record
    it('MED-006: should reject unauthorized user from viewing medical record', async () => {
      // Register another patient
      const otherRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'other-patient-e2e@test.com',
          password: '123456',
          fullName: 'Other Patient E2E',
        });

      const tokenRecord = await prisma.verificationToken.findFirst({
        where: { email: 'other-patient-e2e@test.com' },
        orderBy: { created_at: 'desc' },
      });
      if (tokenRecord) {
        await request(app.getHttpServer())
          .post('/auth/verify-email')
          .send({ email: 'other-patient-e2e@test.com', token: tokenRecord.token });
      }

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'other-patient-e2e@test.com', password: '123456' });

      const otherToken = loginRes.body.accessToken;

      await request(app.getHttpServer())
        .get(`/medical/records/${appointmentId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      // Cleanup
      const user = await prisma.user.findUnique({
        where: { email: 'other-patient-e2e@test.com' },
      });
      if (user) {
        await prisma.userSession.deleteMany({ where: { user_id: user.user_id } });
        await prisma.verificationToken.deleteMany({ where: { email: 'other-patient-e2e@test.com' } });
        await prisma.patient.deleteMany({ where: { user_id: user.user_id } });
        await prisma.user.delete({ where: { user_id: user.user_id } });
      }
    });

    // MED-007: Update medical record
    it('MED-007: should update medical record successfully', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/medical/records/${appointmentId}`)
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .send({
          doctor_notes: 'Đã kê đơn thuốc kháng sinh, hẹn tái khám sau 5 ngày',
        })
        .expect(200);

      expect(res.body.doctor_notes).toContain('Đã kê đơn thuốc kháng sinh');
    });

    // MED-008: Update non-existent medical record
    it('MED-008: should reject updating non-existent medical record', async () => {
      await request(app.getHttpServer())
        .patch('/medical/records/99999')
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .send({ doctor_notes: 'Test' })
        .expect(404);
    });
  });

  // ====================================================================
  // 8. DRUGS MODULE
  // ====================================================================

  describe('Drugs Module', () => {
    // DRG-001: Create drug
    it('DRG-001: should create a drug successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/medical/drugs')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Tobramycin (E2E)',
          active_ingredient: 'Tobramycin',
          unit: 'Lọ 5ml',
          usage_instruction: 'Nhỏ 2 giọt/lần, 4 lần/ngày',
        })
        .expect(201);

      expect(res.body.drug_id).toBeDefined();
      drugId = res.body.drug_id;
    });

    // DRG-002: Create drug with existing name
    it('DRG-002: should reject creating drug with existing name', async () => {
      await request(app.getHttpServer())
        .post('/medical/drugs')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Tobramycin (E2E)',
          active_ingredient: 'Tobramycin',
          unit: 'Lọ 5ml',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Tên thuốc đã tồn tại');
        });
    });

    // DRG-003: Non-admin cannot create drug
    it('DRG-003: should reject non-admin from creating drug', async () => {
      await request(app.getHttpServer())
        .post('/medical/drugs')
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .send({
          name: 'Unauthorized Drug (E2E)',
          active_ingredient: 'Test',
          unit: 'Viên',
        })
        .expect(403);
    });

    // DRG-004: Get all drugs
    it('DRG-004: should list all drugs', async () => {
      const res = await request(app.getHttpServer())
        .get('/medical/drugs')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const createdDrug = res.body.find((d: any) => d.drug_id === drugId);
      expect(createdDrug).toBeDefined();
      expect(createdDrug.name).toBe('Tobramycin (E2E)');
    });

    // DRG-005: Get drug by ID
    it('DRG-005: should get drug by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/medical/drugs/${drugId}`)
        .expect(200);

      expect(res.body.name).toBe('Tobramycin (E2E)');
    });

    // DRG-006: Get non-existent drug
    it('DRG-006: should return 404 for non-existent drug', async () => {
      await request(app.getHttpServer())
        .get('/medical/drugs/99999')
        .expect(404);
    });

    // DRG-007: Update drug
    it('DRG-007: should update drug successfully', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/medical/drugs/${drugId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ usage_instruction: 'Nhỏ 1 giọt/lần, 3 lần/ngày' })
        .expect(200);

      expect(res.body.usage_instruction).toContain('1 giọt/lần');
    });

    // DRG-008: Update non-existent drug
    it('DRG-008: should reject updating non-existent drug', async () => {
      await request(app.getHttpServer())
        .patch('/medical/drugs/99999')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ usage_instruction: 'Test' })
        .expect(404);
    });

    // DRG-009: Non-admin cannot update drug
    it('DRG-009: should reject non-admin from updating drug', async () => {
      await request(app.getHttpServer())
        .patch(`/medical/drugs/${drugId}`)
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .send({ usage_instruction: 'Test' })
        .expect(403);
    });

    // DRG-010: Delete drug
    it('DRG-010: should delete drug successfully', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/medical/drugs/${drugId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.message).toContain('Xóa thuốc thành công');
    });

    // DRG-011: Delete non-existent drug
    it('DRG-011: should reject deleting non-existent drug', async () => {
      await request(app.getHttpServer())
        .delete('/medical/drugs/99999')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);
    });

    // DRG-012: Non-admin cannot delete drug
    it('DRG-012: should reject non-admin from deleting drug', async () => {
      await request(app.getHttpServer())
        .delete(`/medical/drugs/${drugId}`)
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .expect(403);
    });
  });

  // ====================================================================
  // 9. ADMIN MODULE
  // ====================================================================

  describe('Admin Module', () => {
    // ADM-001: Admin views all users
    it('ADM-001: should list all users for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const testUserFound = res.body.find((u: any) => u.email === testUser.email);
      expect(testUserFound).toBeDefined();
    });

    // ADM-002: Non-admin cannot view users
    it('ADM-002: should reject non-admin from listing users', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .expect(403);
    });

    // ADM-003: Admin deactivates user
    it('ADM-003: should deactivate a user successfully', async () => {
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${user!.user_id}/deactivate`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.message).toContain('Vô hiệu hóa tài khoản thành công');

      const updatedUser = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      expect(updatedUser?.is_active).toBe(false);
    });

    // ADM-004: Deactivate non-existent user
    it('ADM-004: should reject deactivating non-existent user', async () => {
      await request(app.getHttpServer())
        .patch('/admin/users/99999/deactivate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);
    });

    // ADM-005: Admin reactivates user
    it('ADM-005: should reactivate a user successfully', async () => {
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${user!.user_id}/reactivate`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.message).toContain('Kích hoạt tài khoản thành công');

      const updatedUser = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      expect(updatedUser?.is_active).toBe(true);
    });

    // ADM-006: Reactivate non-existent user
    it('ADM-006: should reject reactivating non-existent user', async () => {
      await request(app.getHttpServer())
        .patch('/admin/users/99999/reactivate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);
    });

    // ADM-007: Non-admin cannot deactivate user
    it('ADM-007: should reject non-admin from deactivating user', async () => {
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      await request(app.getHttpServer())
        .patch(`/admin/users/${user!.user_id}/deactivate`)
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .expect(403);
    });

    // ADM-008: Admin views all appointments
    it('ADM-008: should list all appointments for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/appointments')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const testAppointment = res.body.find(
        (a: any) => a.appointment_id === appointmentId,
      );
      expect(testAppointment).toBeDefined();
    });

    // ADM-009: Admin views all transactions
    it('ADM-009: should list all transactions for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/transactions')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    // ADM-010: Admin views dashboard stats
    it('ADM-010: should get dashboard statistics', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.totalUsers).toBeDefined();
      expect(res.body.totalAppointments).toBeDefined();
      expect(res.body.totalRevenue).toBeDefined();
    });

    // ADM-011: Non-admin cannot view dashboard
    it('ADM-011: should reject non-admin from viewing dashboard', async () => {
      await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .expect(403);
    });
  });

  // ====================================================================
  // 10. SPECIALIZATIONS MODULE
  // ====================================================================

  describe('Specializations Module', () => {
    let specId: number;

    // SPEC-001: Create specialization
    it('SPEC-001: should create a specialization successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/profile/specializations')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Khúc xạ (E2E)',
          description: 'Khám và điều trị các tật khúc xạ',
        })
        .expect(201);

      expect(res.body.spec_id).toBeDefined();
      specId = res.body.spec_id;
    });

    // SPEC-002: Create specialization with existing name
    it('SPEC-002: should reject creating specialization with existing name', async () => {
      await request(app.getHttpServer())
        .post('/profile/specializations')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Khúc xạ (E2E)',
          description: 'Duplicate',
        })
        .expect(400);
    });

    // SPEC-003: Get all specializations
    it('SPEC-003: should list all specializations', async () => {
      const res = await request(app.getHttpServer())
        .get('/profile/specializations')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const createdSpec = res.body.find((s: any) => s.spec_id === specId);
      expect(createdSpec).toBeDefined();
    });

    // SPEC-004: Assign specialization to doctor
    it('SPEC-004: should assign specialization to doctor', async () => {
      const res = await request(app.getHttpServer())
        .post(`/profile/doctors/${doctorId}/specializations`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ specializationIds: [specId] })
        .expect(201);

      expect(res.body.message).toContain('Cập nhật chuyên khoa thành công');
    });

    // SPEC-005: Assign specialization to non-existent doctor
    it('SPEC-005: should reject assigning specialization to non-existent doctor', async () => {
      await request(app.getHttpServer())
        .post('/profile/doctors/99999/specializations')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ specializationIds: [specId] })
        .expect(404);
    });

    // SPEC-006: Non-admin cannot assign specialization
    it('SPEC-006: should reject non-admin from assigning specialization', async () => {
      await request(app.getHttpServer())
        .post(`/profile/doctors/${doctorId}/specializations`)
        .set('Authorization', `Bearer ${doctorAccessToken}`)
        .send({ specializationIds: [specId] })
        .expect(403);
    });

    // SPEC-007: Get doctors by specialization
    it('SPEC-007: should get doctors by specialization', async () => {
      const res = await request(app.getHttpServer())
        .get(`/profile/specializations/${specId}/doctors`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const doctorInSpec = res.body.find((d: any) => d.doctor_id === doctorId);
      expect(doctorInSpec).toBeDefined();
    });
  });

  // ====================================================================
  // 11. REVIEWS MODULE
  // ====================================================================

  describe('Reviews Module', () => {
    // REV-001: Create review
    it('REV-001: should create a review successfully', async () => {
      const res = await request(app.getHttpServer())
        .post(`/booking/appointments/${appointmentId}/review`)
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .send({
          rating: 5,
          comment: 'Bác sĩ rất nhiệt tình và chuyên nghiệp',
        })
        .expect(201);

      expect(res.body.review_id).toBeDefined();
      expect(res.body.rating).toBe(5);
    });

    // REV-002: Create review for non-existent appointment
    it('REV-002: should reject review for non-existent appointment', async () => {
      await request(app.getHttpServer())
        .post('/booking/appointments/99999/review')
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .send({ rating: 4, comment: 'Test' })
        .expect(404);
    });

    // REV-003: Create duplicate review
    it('REV-003: should reject duplicate review', async () => {
      await request(app.getHttpServer())
        .post(`/booking/appointments/${appointmentId}/review`)
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .send({ rating: 4, comment: 'Duplicate review' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Bạn đã đánh giá lịch hẹn này rồi');
        });
    });

    // REV-004: Create review with invalid rating
    it('REV-004: should reject review with invalid rating', async () => {
      await request(app.getHttpServer())
        .post(`/booking/appointments/${appointmentId}/review`)
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .send({ rating: 6, comment: 'Invalid rating' })
        .expect(400);
    });

    // REV-005: Get reviews for doctor
    it('REV-005: should get reviews for a doctor', async () => {
      const res = await request(app.getHttpServer())
        .get(`/profile/doctors/${doctorId}/reviews`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].rating).toBe(5);
    });

    // REV-006: Get reviews for non-existent doctor
    it('REV-006: should return empty array for non-existent doctor', async () => {
      const res = await request(app.getHttpServer())
        .get('/profile/doctors/99999/reviews')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });

  // ====================================================================
  // 12. AUTH - RESEND VERIFICATION & FORGOT PASSWORD
  // ====================================================================

  describe('Auth - Resend & Forgot Password', () => {
    // AUTH-010: Resend verification email
    it('AUTH-010: should resend verification email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: testUser.email })
        .expect(201);

      expect(res.body.message).toContain('Mã xác thực mới đã được gửi');
    });

    // AUTH-010-ERR: Resend for non-existent email
    it('AUTH-010-ERR: should reject resend for non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: 'nonexist@test.com' })
        .expect(400);
    });

    // AUTH-018: Forgot password
    it('AUTH-018: should send forgot password email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(201);

      expect(res.body.message).toContain('Mã đặt lại mật khẩu đã được gửi');
    });

    // AUTH-018-ERR: Forgot password for non-existent email
    it('AUTH-018-ERR: should reject forgot password for non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nonexist@test.com' })
        .expect(400);
    });

    // AUTH-019: Reset password
    it('AUTH-019: should reset password successfully', async () => {
      // Get the reset token from DB
      const tokenRecord = await prisma.verificationToken.findFirst({
        where: { email: testUser.email },
        orderBy: { created_at: 'desc' },
      });
      expect(tokenRecord).toBeDefined();

      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          email: testUser.email,
          token: tokenRecord!.token,
          newPassword: '654321',
        })
        .expect(201);

      expect(res.body.message).toContain('Đặt lại mật khẩu thành công');

      // Verify can login with new password
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: '654321' })
        .expect(201);

      expect(loginRes.body.accessToken).toBeDefined();

      // Reset password back for other tests
      const tokenRecord2 = await prisma.verificationToken.findFirst({
        where: { email: testUser.email },
        orderBy: { created_at: 'desc' },
      });

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          email: testUser.email,
          token: tokenRecord2!.token,
          newPassword: testUser.password,
        })
        .expect(201);
    });

    // AUTH-019-ERR: Reset password with wrong token
    it('AUTH-019-ERR: should reject reset password with wrong token', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          email: testUser.email,
          token: '000000',
          newPassword: '123456',
        })
        .expect(400);
    });
  });

  // ====================================================================
  // 13. APPOINTMENT CANCELLATION
  // ====================================================================

  describe('Appointment Cancellation', () => {
    let cancelAppointmentId: number;
    let cancelSlotId: number;

    // Setup: Create a new appointment for cancellation tests
    it('should setup appointment for cancellation tests', async () => {
      // Re-login patient
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(201);
      patientAccessToken = loginRes.body.accessToken;

      // Find an available slot
      const slotRes = await request(app.getHttpServer())
        .get('/booking/schedule/calendar-slots')
        .expect(200);

      const availableSlot = slotRes.body.find(
        (s: any) => s.doctor?.doctor_id === doctorId && s.status === 'AVAILABLE',
      );

      if (!availableSlot) {
        // Generate new slots
        await request(app.getHttpServer())
          .post('/booking/schedule/generate-slots')
          .set('Authorization', `Bearer ${doctorAccessToken}`);

        const slotRes2 = await request(app.getHttpServer())
          .get('/booking/schedule/calendar-slots')
          .expect(200);

        const availableSlot2 = slotRes2.body.find(
          (s: any) => s.doctor?.doctor_id === doctorId && s.status === 'AVAILABLE',
        );

        if (!availableSlot2) {
          throw new Error('No available slots for cancellation test');
        }
        cancelSlotId = availableSlot2.slot_id;
      } else {
        cancelSlotId = availableSlot.slot_id;
      }

      // Lock slot
      await request(app.getHttpServer())
        .patch(`/booking/schedule/calendar-slots/${cancelSlotId}/lock`)
        .set('Authorization', `Bearer ${patientAccessToken}`);

      // Create appointment
      const appRes = await request(app.getHttpServer())
        .post('/booking/appointments')
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .send({
          slot_id: cancelSlotId,
          description: 'Appointment for cancellation test',
        });

      cancelAppointmentId = appRes.body.appointment_id;
    });

    // APP-004: Cancel appointment before payment
    it('APP-004: should cancel appointment before payment', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/booking/appointments/${cancelAppointmentId}/cancel`)
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .send({ cancel_reason: 'Bệnh nhân bận đột xuất' })
        .expect(200);

      expect(res.body.status).toBe('CANCELLED');
      expect(res.body.cancel_reason).toContain('bận đột xuất');
    });

    // APP-005: Cancel non-existent appointment
    it('APP-005: should reject cancelling non-existent appointment', async () => {
      await request(app.getHttpServer())
        .patch('/booking/appointments/99999/cancel')
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .send({ cancel_reason: 'Test' })
        .expect(404);
    });

    // APP-006: Cancel already cancelled appointment
    it('APP-006: should reject cancelling already cancelled appointment', async () => {
      await request(app.getHttpServer())
        .patch(`/booking/appointments/${cancelAppointmentId}/cancel`)
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .send({ cancel_reason: 'Cancel again' })
        .expect(400);
    });

    // APP-007: Doctor cannot cancel patient's appointment
    it('APP-007: should reject doctor from cancelling patient appointment', async () => {
      // Create another appointment for this test
      const slotRes = await request(app.getHttpServer())
        .get('/booking/schedule/calendar-slots')
        .expect(200);

      const anotherSlot = slotRes.body.find(
        (s: any) => s.doctor?.doctor_id === doctorId && s.status === 'AVAILABLE',
      );

      if (anotherSlot) {
        await request(app.getHttpServer())
          .patch(`/booking/schedule/calendar-slots/${anotherSlot.slot_id}/lock`)
          .set('Authorization', `Bearer ${patientAccessToken}`);

        const appRes = await request(app.getHttpServer())
          .post('/booking/appointments')
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .send({
            slot_id: anotherSlot.slot_id,
            description: 'Test doctor cancel',
          });

        const tempAppId = appRes.body.appointment_id;

        await request(app.getHttpServer())
          .patch(`/booking/appointments/${tempAppId}/cancel`)
          .set('Authorization', `Bearer ${doctorAccessToken}`)
          .send({ cancel_reason: 'Doctor cancels' })
          .expect(403);
      }
    });
  });

  // ====================================================================
  // 14. UNAUTHORIZED ACCESS
  // ====================================================================

  describe('Unauthorized Access', () => {
    // SEC-001: Access without token
    it('SEC-001: should reject requests without token', async () => {
      await request(app.getHttpServer())
        .get('/profile/patients/me')
        .expect(401);
    });

    // SEC-002: Access with invalid token
    it('SEC-002: should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/profile/patients/me')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);
    });

    // SEC-003: Access with expired token
    it('SEC-003: should reject requests with expired token', async () => {
      await request(app.getHttpServer())
        .get('/profile/patients/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9rtC0u2Viw5s')
        .expect(401);
    });

    // SEC-004: Access without Bearer prefix
    it('SEC-004: should reject requests without Bearer prefix', async () => {
      await request(app.getHttpServer())
        .get('/profile/patients/me')
        .set('Authorization', patientAccessToken)
        .expect(401);
    });
  });
});
