import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { PrismaService } from '../../../database/prisma.service';
import { CreateAvailabilityDto } from './dto/doctor-availability.dto'; // Đổi tên file cho chuẩn
import { CreateSystemSlotDto, GetSlotsQueryDto } from './dto/system-slot.dto';

// Kích hoạt plugin - Bây giờ sẽ không còn lỗi gạch đỏ
dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) { }

  // ==========================
  // 1. ADMIN: TẠO SLOT MẪU
  // ==========================
  async createSystemSlot(dto: CreateSystemSlotDto) {
    // Validate logic: Giờ bắt đầu phải nhỏ hơn giờ kết thúc
    if (dto.start_time >= dto.end_time) {
      throw new BadRequestException(
        'Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc',
      );
    }

    // Optional: Check trùng giờ với các slot đã có (Advanced)
    // ... logic check overlapping here

    return this.prisma.systemTimeSlot.create({
      // Lưu ý tên Model trong schema của bạn
      data: {
        shift_name: dto.slot_name,
        start_time: dto.start_time, // Đảm bảo DB field là String hoặc convert sang Date
        end_time: dto.end_time,
      },
    });
  }

  // ==========================
  // 2. BÁC SĨ: ĐĂNG KÝ LỊCH
  // ==========================
  async registerAvailability(userId: number, dto: CreateAvailabilityDto) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { user_id: userId },
    });
    if (!doctor) throw new BadRequestException('Bạn chưa có hồ sơ bác sĩ');

    const validSlots = await this.prisma.systemTimeSlot.findMany({
      where: { slot_template_id: { in: dto.system_slot_ids } },
    });

    if (validSlots.length !== dto.system_slot_ids.length) {
      throw new BadRequestException('Một số khung giờ không hợp lệ');
    }

    return this.prisma.$transaction(async (tx) => {
      // B1: Xóa lịch cũ của những ngày được gửi lên
      await tx.doctorAvailability.deleteMany({
        where: {
          doctor_id: doctor.doctor_id,
          day_of_week: { in: dto.days_of_week }, // Sửa từ day_of_week đơn lẻ sang mảng
        },
      });

      // B2: Tạo dữ liệu mới
      if (dto.system_slot_ids.length > 0 && dto.days_of_week.length > 0) {
        // SỬA TẠI ĐÂY: Khai báo type rõ ràng cho mảng data
        const data: Prisma.DoctorAvailabilityCreateManyInput[] = [];

        for (const day of dto.days_of_week) {
          dto.system_slot_ids.forEach((slotId) => {
            data.push({
              doctor_id: doctor.doctor_id,
              slot_template_id: slotId,
              day_of_week: day,
              valid_from: new Date(),
            });
          });
        }

        await tx.doctorAvailability.createMany({
          data: data,
        });
      }

      return {
        message: `Cập nhật lịch làm việc cho ${dto.days_of_week.length} ngày thành công`,
      };
    });
  }

  // ==========================
  // 3. Lấy khung giờ mẫu
  // ==========================

  async getSystemSlots() {
    const slots = await this.prisma.systemTimeSlot.findMany({
      orderBy: { start_time: 'asc' },
    });

    // Dedup bằng shift_name, fallback theo start_time+end_time khi shift_name null
    const seen = new Map<string, boolean>();
    return slots.filter((slot) => {
      const key = slot.shift_name ?? `${slot.start_time}-${slot.end_time}`;
      if (seen.has(key)) return false;
      seen.set(key, true);
      return true;
    });
  }
  // ==========================
  // 4. Bác sĩ xem lịch đã đăng ký của chính mình
  // ==========================

  async getMyAvailability(userId: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { user_id: userId },
    });

    if (!doctor) {
      throw new NotFoundException('Không tìm thấy hồ sơ bác sĩ.');
    }

    const rawData = await this.prisma.doctorAvailability.findMany({
      where: { doctor_id: doctor.doctor_id },
      include: { template: true },
      orderBy: { day_of_week: 'asc' },
    });

    // Nhóm lại theo ngày
    const grouped = rawData.reduce((acc, curr) => {
      const day = curr.day_of_week;
      if (!acc[day]) {
        acc[day] = {
          day_of_week: day,
          slots: [],
        };
      }
      acc[day].slots.push({
        availability_id: curr.availability_id,
        slot_template_id: curr.slot_template_id,
        shift_name: curr.template.shift_name,
        start_time: curr.template.start_time,
      });
      return acc;
    }, {});

    return Object.values(grouped); // Trả về mảng đã nhóm
  }

  // 5. Bác sĩ xóa một lịch cụ thể
  async deleteAvailability(userId: number, availabilityId: number) {
    // Tìm bản ghi và kiểm tra quyền sở hữu (đảm bảo BS không xóa nhầm lịch người khác)
    const availability = await this.prisma.doctorAvailability.findUnique({
      where: { availability_id: availabilityId },
      include: { doctor: true },
    });

    if (!availability) {
      throw new NotFoundException('Không tìm thấy lịch làm việc');
    }

    if (availability.doctor.user_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa lịch này');
    }

    return this.prisma.doctorAvailability.delete({
      where: { availability_id: availabilityId },
    });
  }

  // ==========================
  // 6. Tạo lịch làm việc thực tế (DoctorCalendarSlots) dựa trên template đã đăng ký
  // ==========================
  async generateSlots(startDate: Date, endDate: Date) {
    // 1. Lấy cấu hình
    const today = new Date();
    const availabilities = await this.prisma.doctorAvailability.findMany({
      where: {
        is_enabled: true,
        valid_from: { lte: today },
        OR: [{ valid_to: null }, { valid_to: { gte: today } }],
      },
      include: { template: true, doctor: true },
    });

    const dataToCreate: Prisma.DoctorCalendarSlotsCreateManyInput[] = [];

    // 2. Duyệt ngày
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      // Fix logic DayOfWeek: JS (0=Sun, 1=Mon) khớp trực tiếp với Enum của bạn
      // FIX #3: JS getDay() 0=Sun, schema 7=Sun -> convert
      const jsDay = d.getDay();
      const currentDayOfWeek = jsDay === 0 ? 7 : jsDay;

      const matches = availabilities.filter(
        (a) => a.day_of_week === currentDayOfWeek,
      );

      for (const match of matches) {
        // Chuẩn hóa date_slot về 00:00:00 UTC để đồng nhất trong DB
        const dateOnly = new Date(
          Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
        );

        // Bỏ qua slot đã trôi qua trong ngày hôm nay
        const isToday = d.toDateString() === today.toDateString();
        if (isToday) {
          const slotStartVN = dayjs(match.template.start_time).tz('Asia/Ho_Chi_Minh');
          const nowVN = dayjs().tz('Asia/Ho_Chi_Minh');
          if (slotStartVN.isBefore(nowVN)) continue;
        }

        dataToCreate.push({
          doctor_id: match.doctor_id,
          date_slot: dateOnly,
          start_time: match.template.start_time,
          end_time: match.template.end_time,
          price: match.doctor.consultation_fee || 0,
          status: 'AVAILABLE' as any,
          is_locked: false,
          locked_expires_at: null,
        });
      }
    }

    // 3. Sử dụng createMany với skipDuplicates (Cực nhanh so với upsert vòng lặp)
    // Lưu ý: Yêu cầu bảng DoctorCalendarSlots phải có Unique Constraint cho bộ 3 trường trên
    const result = await this.prisma.doctorCalendarSlots.createMany({
      data: dataToCreate,
      skipDuplicates: true,
    });

    return {
      message: `Xử lý xong ${dataToCreate.length} slots tiềm năng.`,
      insertedCount: result.count,
    };
  }

  // ==========================
  // 7. Lấy danh sách slot đang có sẵn (AVAILABLE) với filter ngày, bác sĩ, chuyên khoa
  // ==========================

  async getAvailableSlots(query: GetSlotsQueryDto, limit = 100) {
    const { date, doctorId, specialtyId } = query;

    // 1. Lấy thời gian hiện tại theo múi giờ Việt Nam
    const nowVN = dayjs().tz('Asia/Ho_Chi_Minh');
    const todayStr = nowVN.format('YYYY-MM-DD');

    const whereCondition: any = {
      status: 'AVAILABLE',
      OR: [
        { is_locked: false },
        {
          AND: [
            { is_locked: true },
            { locked_expires_at: { lt: nowVN.toDate() } },
          ],
        },
      ],
    };

    // 2. Xử lý lọc theo Ngày (Chuẩn hóa về UTC 00:00 để khớp DB)
    if (date) {
      const searchDate = dayjs(date).startOf('day');

      // Chặn nếu tìm ngày trong quá khứ
      if (searchDate.isBefore(nowVN.startOf('day'))) {
        return [];
      }

      // DB lưu date_slot là YYYY-MM-DDT00:00:00.000Z
      whereCondition.date_slot = searchDate.utc(true).toDate();
    } else {
      // Nếu không chọn ngày, lấy từ hôm nay trở đi
      whereCondition.date_slot = {
        gte: nowVN.startOf('day').utc(true).toDate(),
      };
    }

    if (doctorId) whereCondition.doctor_id = doctorId;

    if (specialtyId) {
      whereCondition.doctor = {
        specializations: { some: { spec_id: specialtyId } },
      };
    }

    const slots = await this.prisma.doctorCalendarSlots.findMany({
      where: whereCondition,
      include: {
        doctor: {
          include: {
            specializations: { include: { spec: true } },
          },
        },
      },
      orderBy: [{ date_slot: 'asc' }, { start_time: 'asc' }],
      take: Math.min(limit, 200),
    });

    // 3. Hậu xử lý: Lọc giờ và Format lại dữ liệu
    const result = slots
      .filter((slot) => {
        const slotDateStr = dayjs(slot.date_slot).format('YYYY-MM-DD');

        if (slotDateStr === todayStr) {
          // start_time trong DB là 00:00 ứng với 07:00 VN
          // Ta cộng 7 tiếng để so sánh với giờ hiện tại
          const slotStartTimeVN = dayjs(slot.start_time).tz('Asia/Ho_Chi_Minh');
          return slotStartTimeVN.isAfter(nowVN);
        }
        return true;
      })
      .map((slot) => {
        // Format lại start_time/end_time về dạng HH:mm cho đẹp
        const formatTime = (time: Date) =>
          dayjs(time).tz('Asia/Ho_Chi_Minh').format('HH:mm');

        return {
          slot_id: slot.slot_id,
          date_slot: slot.date_slot,
          start_time: formatTime(slot.start_time),
          end_time: formatTime(slot.end_time),
          price: slot.price,
          is_locked: slot.is_locked,
          doctor: {
            doctor_id: slot.doctor.doctor_id,
            full_name: slot.doctor.full_name,
            title: slot.doctor.title,
            avatar_url: slot.doctor.avatar_url,
            specialties: slot.doctor.specializations.map((s) => s.spec.name),
          },
        };
      });

    return result;
  }

  // ==========================
  // 8. Giữ chỗ tạm thời một slot (LOCKED) trong 15 phút để thực hiện thanh toán
  // ==========================

  async lockCalendarSlot(slotId: number, userId: number) {
    const LOCK_DURATION_MINUTES = 15;
    const nowVN = dayjs().tz('Asia/Ho_Chi_Minh');
    const expiresAt = nowVN.add(LOCK_DURATION_MINUTES, 'minute').toDate();

    return await this.prisma.$transaction(async (tx) => {
      const slot = await tx.doctorCalendarSlots.findUnique({
        where: { slot_id: slotId },
      });

      if (!slot)
        throw new NotFoundException('Không tìm thấy khung giờ khám này.');

      // --- 2. KIỂM TRA THỜI GIAN QUÁ KHỨ ---
      const slotStartTimeVN = dayjs(slot.start_time).tz('Asia/Ho_Chi_Minh');
      const fullSlotDateTime = dayjs(slot.date_slot)
        .tz('Asia/Ho_Chi_Minh')
        .hour(slotStartTimeVN.hour())
        .minute(slotStartTimeVN.minute())
        .second(0);

      if (fullSlotDateTime.isBefore(nowVN)) {
        throw new BadRequestException(
          'Không thể đặt lịch cho khung giờ đã trôi qua.',
        );
      }

      // --- 3. KIỂM TRA ĐIỀU KIỆN TRỐNG (Cập nhật logic lock) ---
      const isActuallyAvailable =
        slot.status === 'AVAILABLE' &&
        (!slot.is_locked ||
          (slot.is_locked &&
            slot.locked_expires_at &&
            dayjs(slot.locked_expires_at).isBefore(nowVN)));

      if (!isActuallyAvailable) {
        throw new ConflictException('Khung giờ này đã có người khác đang đặt.');
      }

      // --- 4. Thực hiện khóa slot kèm User ID ---
      const updatedSlot = await tx.doctorCalendarSlots.update({
        where: { slot_id: slotId },
        data: {
          is_locked: true,
          locked_expires_at: expiresAt,
          locked_by_user_id: userId, // [Suy luận]: Lưu vết ai là người đang giữ chỗ
        },
      });

      return {
        message: 'Giữ chỗ thành công trong 15 phút.',
        slot_id: updatedSlot.slot_id,
        expires_at: updatedSlot.locked_expires_at,
      };
    });
  }

  // ==========================
  // 9. Cron Job: Mở khóa tự động các slot đã hết hạn giữ chỗ
  // ==========================
  async unlockExpiredSlots(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.doctorCalendarSlots.updateMany({
      where: {
        status: 'AVAILABLE',
        is_locked: true,
        locked_expires_at: { lt: now },
      },
      data: {
        is_locked: false,
        locked_expires_at: null,
        locked_by_user_id: null, // [Suy luận]: Xóa sạch ID người dùng khi hết hạn lock
      },
    });
    return result.count;
  }

  // ==========================
  // 10. Cron Job: Hủy các Appointment quá hạn thanh toán (Mới thêm)
  // ==========================
  async cancelExpiredAppointments() {
    // FIX #5: lock 15p + gia hạn 15p = tối đa 30p, hủy sau 35p để có biên an toàn
    const expiredThreshold = new Date(Date.now() - 35 * 60000);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Tìm danh sách các Appointment hết hạn
      const expiredApps = await tx.appointment.findMany({
        where: {
          status: 'PENDING_PAYMENT', //
          created_at: { lt: expiredThreshold },
        },
      });

      if (expiredApps.length === 0) return 0;

      for (const app of expiredApps) {
        // 2. Chuyển trạng thái sang CANCELLED
        await tx.appointment.update({
          where: { appointment_id: app.appointment_id },
          data: { status: 'CANCELLED' }, //
        });

        // 3. Đảm bảo Slot tương ứng được mở khóa hoàn toàn
        await tx.doctorCalendarSlots.update({
          where: { slot_id: app.slot_id },
          data: {
            status: 'AVAILABLE', // Đưa về trạng thái sẵn sàng cho người mới [Suy luận]
            is_locked: false,
            locked_by_user_id: null,
            locked_expires_at: null,
          },
        });
      }

      return expiredApps.length;
    });
  }
}
